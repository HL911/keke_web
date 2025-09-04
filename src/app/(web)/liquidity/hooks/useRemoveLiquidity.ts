import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Token } from "../components/TokenSelector";
import { PairInfo } from "@/hooks/liquidity/usePairInfo";
import { PositionData } from "../[pairAddress]/manage/components/UserPositionCard";
import { useTokenApproval } from "@/hooks/tokens/useTokenApproval";
import {
  useKekeswapRouterAddress,
  useKekeswapFactoryAddress,
} from "@/hooks/useContract";
import { useSwapRouter } from "@/hooks/swap/useSwapRouter";
import { parseUnits, formatUnits } from "viem";

// API调用辅助函数
const updatePoolsAPI = async (poolData: {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvlUsd?: number;
  volume24h?: string;
}) => {
  try {
    const response = await fetch("/api/pools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(poolData),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "更新流动性池失败");
    }
    return result;
  } catch (error) {
    console.error("调用pools API失败:", error);
    throw error;
  }
};

const updatePositionsAPI = async (positionData: {
  userAddress: string;
  pairAddress: string;
  lpBalance: string;
  token0Balance: string;
  token1Balance: string;
  transactionHash?: string;
}) => {
  try {
    const response = await fetch("/api/positions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(positionData),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "更新用户持仓失败");
    }
    return result;
  } catch (error) {
    console.error("调用positions API失败:", error);
    throw error;
  }
};

// 获取pair地址的辅助函数
const getPairAddress = async (
  tokenA: string,
  tokenB: string,
  factoryAddress: string,
  publicClient: any
): Promise<string | null> => {
  try {
    const pairAddress = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: "tokenA", type: "address" },
            { name: "tokenB", type: "address" },
          ],
          name: "getPair",
          outputs: [{ name: "pair", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getPair",
      args: [tokenA as `0x${string}`, tokenB as `0x${string}`],
    });
    return pairAddress;
  } catch (error) {
    console.error("获取pair地址失败:", error);
    return null;
  }
};

// 移除流动性状态接口
export interface RemoveLiquidityState {
  // 用户持仓数据（从 UserPositionCard 传入）
  positionData: (PositionData & { lpTokenBalance: string }) | null;

  // 移除设置
  removePercentage: number; // 移除百分比 (0-100)
  customPercentage: string; // 自定义百分比输入

  // 计算出的移除数量
  removeAmounts: {
    token0Amount: string;
    token1Amount: string;
    lpTokenAmount: string;
    token0ValueUSD: number;
    token1ValueUSD: number;
    totalValueUSD: number;
  } | null;

  // 滑点设置
  slippage: string;
  customSlippage: string;

  // 最小接收数量（考虑滑点）
  minAmounts: {
    minToken0Amount: string;
    minToken1Amount: string;
    slippagePercent: string;
  } | null;

  // 状态标志
  isLoading: boolean;
  isValidInput: boolean;
  error: string | null;

  // 授权状态
  isApproved: boolean;
  isApproving: boolean;
}

// 移除流动性操作接口
export interface RemoveLiquidityActions {
  // 设置移除百分比
  setRemovePercentage: (percentage: number) => void;
  setCustomPercentage: (percentage: string) => void;

  // 滑点设置
  setSlippage: (slippage: string) => void;
  setCustomSlippage: (slippage: string) => void;
  handleSlippagePreset: (preset: string) => void;
  handleCustomSlippageChange: (value: string) => void;

  // 授权和交易
  approveLPToken: () => Promise<void>;
  removeLiquidity: () => Promise<void>;
}

export interface UseRemoveLiquidityResult {
  state: RemoveLiquidityState;
  actions: RemoveLiquidityActions;
}

/**
 * 移除流动性Hook
 */
export function useRemoveLiquidity(
  token0: Token | null,
  token1: Token | null,
  pairAddress: string,
  pairInfo: PairInfo | null,
  positionData: (PositionData & { lpTokenBalance: string }) | null
): UseRemoveLiquidityResult {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const routerAddress = useKekeswapRouterAddress();
  const factoryAddress = useKekeswapFactoryAddress();
  const {
    removeLiquidity,
    removeLiquidityETH,
    getDeadline,
    calculateMinAmount,
  } = useSwapRouter();

  // 状态管理
  const [state, setState] = useState<RemoveLiquidityState>({
    positionData: positionData,
    removePercentage: 0,
    customPercentage: "",
    removeAmounts: null,
    slippage: "0.5",
    customSlippage: "",
    minAmounts: null,
    isLoading: false,
    isValidInput: positionData
      ? parseFloat(positionData.lpTokenBalance || "0") > 0
      : false,
    error: null,
    isApproved: false,
    isApproving: false,
  });

  // 计算需要授权的LP代币数量
  const lpTokenAmount = state.removeAmounts?.lpTokenAmount || "0";

  // 使用useTokenApproval处理LP代币授权
  const lpTokenApproval = useTokenApproval({
    tokenAddress: pairAddress, // LP代币地址就是pair地址
    spenderAddress: routerAddress || "",
    requiredAmount: lpTokenAmount,
    decimals: 18, // LP代币通常使用18位小数
    enabled: !!(
      isConnected &&
      pairAddress &&
      routerAddress &&
      lpTokenAmount &&
      parseFloat(lpTokenAmount) > 0
    ),
  });

  // 同步useTokenApproval的状态变化
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isApproved: lpTokenApproval.isApproved,
      isApproving: lpTokenApproval.isApproving,
      error: lpTokenApproval.error || prev.error,
    }));
  }, [
    lpTokenApproval.isApproved,
    lpTokenApproval.isApproving,
    lpTokenApproval.error,
  ]);

  // 计算移除数量
  const calculateRemoveAmounts = useCallback(
    (
      positionData: (PositionData & { lpTokenBalance: string }) | null,
      removePercentage: number
    ) => {
      if (!positionData || removePercentage === 0) {
        setState((prev) => ({ ...prev, removeAmounts: null }));
        return;
      }

      const percentage = removePercentage / 100;
      const token0Amount = (
        parseFloat(positionData.token0Balance) * percentage
      ).toString();
      const token1Amount = (
        parseFloat(positionData.token1Balance) * percentage
      ).toString();
      const lpTokenAmount = (
        parseFloat(positionData.lpTokenBalance) * percentage
      ).toString();

      const token0ValueUSD =
        parseFloat(token0Amount) * positionData.token0Price;
      const token1ValueUSD =
        parseFloat(token1Amount) * positionData.token1Price;
      const totalValueUSD = token0ValueUSD + token1ValueUSD;

      setState((prev) => ({
        ...prev,
        removeAmounts: {
          token0Amount,
          token1Amount,
          lpTokenAmount,
          token0ValueUSD,
          token1ValueUSD,
          totalValueUSD,
        },
      }));
    },
    []
  );

  // 计算最小接收数量
  const calculateMinAmounts = useCallback(
    (
      removeAmounts: RemoveLiquidityState["removeAmounts"],
      slippage: string,
      customSlippage: string
    ) => {
      if (!removeAmounts) {
        setState((prev) => ({ ...prev, minAmounts: null }));
        return;
      }

      const slippagePercent = customSlippage || slippage;
      const slippageMultiplier = 1 - parseFloat(slippagePercent) / 100;

      const minToken0Amount = (
        parseFloat(removeAmounts.token0Amount) * slippageMultiplier
      ).toString();
      const minToken1Amount = (
        parseFloat(removeAmounts.token1Amount) * slippageMultiplier
      ).toString();

      setState((prev) => ({
        ...prev,
        minAmounts: {
          minToken0Amount,
          minToken1Amount,
          slippagePercent,
        },
      }));
    },
    []
  );

  // 监听移除百分比变化，重新计算数量
  useEffect(() => {
    calculateRemoveAmounts(state.positionData, state.removePercentage);
  }, [state.positionData, state.removePercentage, calculateRemoveAmounts]);

  // 监听移除数量变化，重新计算最小数量
  useEffect(() => {
    calculateMinAmounts(
      state.removeAmounts,
      state.slippage,
      state.customSlippage
    );
  }, [
    state.removeAmounts,
    state.slippage,
    state.customSlippage,
    calculateMinAmounts,
  ]);

  // 监听 positionData 变化，更新状态
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      positionData: positionData,
      isValidInput: positionData
        ? parseFloat(positionData.lpTokenBalance || "0") > 0
        : false,
    }));
  }, [positionData]);

  // 操作函数
  const actions: RemoveLiquidityActions = {
    setRemovePercentage: (percentage: number) => {
      setState((prev) => ({
        ...prev,
        removePercentage: percentage,
        customPercentage: percentage.toString(),
      }));
      // 立即计算移除数量
      calculateRemoveAmounts(state.positionData, percentage);
    },

    setCustomPercentage: (percentage: string) => {
      const num = parseFloat(percentage);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        setState((prev) => ({
          ...prev,
          removePercentage: num,
          customPercentage: percentage,
        }));
        // 立即计算移除数量
        calculateRemoveAmounts(state.positionData, num);
      } else {
        setState((prev) => ({ ...prev, customPercentage: percentage }));
      }
    },

    setSlippage: (slippage: string) => {
      setState((prev) => ({
        ...prev,
        slippage: slippage,
        customSlippage: "",
      }));
    },

    setCustomSlippage: (slippage: string) => {
      setState((prev) => ({ ...prev, customSlippage: slippage }));
    },

    handleSlippagePreset: (preset: string) => {
      setState((prev) => ({
        ...prev,
        slippage: preset,
        customSlippage: "",
      }));
    },

    handleCustomSlippageChange: (value: string) => {
      setState((prev) => ({ ...prev, customSlippage: value }));
    },

    approveLPToken: async () => {
      if (!isConnected || !address) {
        setState((prev) => ({ ...prev, error: "请先连接钱包" }));
        return;
      }

      if (!routerAddress) {
        setState((prev) => ({ ...prev, error: "Router地址未配置" }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, error: null }));
        await lpTokenApproval.approve();
      } catch (error) {
        console.error("授权失败:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "授权失败，请重试",
        }));
      }
    },

    removeLiquidity: async () => {
      if (
        !isConnected ||
        !address ||
        !state.removeAmounts ||
        !state.minAmounts ||
        !token0 ||
        !token1
      ) {
        setState((prev) => ({ ...prev, error: "参数不完整" }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const deadline = getDeadline(20); // 20分钟截止时间

        // 将数值转换为整数（考虑代币小数位数）
        // 使用 toFixed(0) 确保不产生科学计数法
        const lpTokenAmount = parseFloat(
          state.removeAmounts.lpTokenAmount
        ).toFixed(0);
        const minToken0Amount = parseFloat(
          state.minAmounts.minToken0Amount
        ).toFixed(0);
        const minToken1Amount = parseFloat(
          state.minAmounts.minToken1Amount
        ).toFixed(0);

        console.log("移除流动性...", {
          token0: token0.address,
          token1: token1.address,
          lpTokenAmount,
          minToken0Amount,
          minToken1Amount,
          deadline: deadline.toString(),
        });

        let result = await removeLiquidity({
          tokenA: token0.address,
          tokenB: token1.address,
          liquidity: lpTokenAmount,
          amountAMin: minToken0Amount,
          amountBMin: minToken1Amount,
          to: address,
          deadline,
        });

        console.log("移除流动性成功:", result);

        // 获取交易哈希
        const transactionHash = result.hash;

        // 移除流动性成功后，更新数据库中的流动性池和用户持仓信息
        try {
          // 获取pair地址
          const pairAddress = await getPairAddress(
            token0.address,
            token1.address,
            factoryAddress!,
            publicClient
          );

          if (!pairAddress) {
            console.warn("无法获取pair地址，跳过数据库更新");
            return;
          }

          // 计算移除后的剩余余额
          const currentLpBalance = BigInt(
            state.positionData?.lpTokenBalance || "0"
          );
          const removedLpAmount = BigInt(lpTokenAmount);
          const remainingLpBalance = currentLpBalance - removedLpAmount;

          // 计算移除后的代币余额（这里需要根据实际移除的代币数量计算）
          const removedToken0Amount = result.amountA;
          const removedToken1Amount = result.amountB;

          // 假设用户还有剩余流动性，计算剩余代币余额
          // 这里简化处理，实际应该根据LP代币比例计算
          const currentToken0Balance = BigInt(
            state.positionData?.token0Balance || "0"
          );
          const currentToken1Balance = BigInt(
            state.positionData?.token1Balance || "0"
          );

          const remainingToken0Balance =
            currentToken0Balance - removedToken0Amount;
          const remainingToken1Balance =
            currentToken1Balance - removedToken1Amount;

          // 计算总价值（USD）
          const totalValueUSD = state.removeAmounts?.totalValueUSD || 0;

          // 调用pools API更新流动性池信息
          await updatePoolsAPI({
            pairAddress,
            token0Address: token0.address,
            token1Address: token1.address,
            reserve0: remainingToken0Balance.toString(),
            reserve1: remainingToken1Balance.toString(),
            totalSupply: remainingLpBalance.toString(),
            tvlUsd: totalValueUSD,
            volume24h: "0", // 移除流动性不增加交易量
          });

          // 调用positions API更新用户持仓信息
          await updatePositionsAPI({
            userAddress: address!,
            pairAddress,
            lpBalance: remainingLpBalance.toString(),
            token0Balance: remainingToken0Balance.toString(),
            token1Balance: remainingToken1Balance.toString(),
            transactionHash,
          });

          console.log("数据库更新成功");
        } catch (dbError) {
          console.error("数据库更新失败:", dbError);
          // 数据库更新失败不影响主流程，只记录错误
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          removePercentage: 0,
          customPercentage: "",
          removeAmounts: null,
          minAmounts: null,
        }));
      } catch (error) {
        console.error("移除流动性失败:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "移除流动性失败，请重试",
          isLoading: false,
        }));
      }
    },
  };

  return { state, actions };
}
