import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { useTokenApproval } from "@/hooks/tokens/useTokenApproval";
import { useSwapRouter } from "@/hooks/swap/useSwapRouter";
import {
  useKekeswapRouterAddress,
  useKekeswapFactoryAddress,
} from "@/hooks/useContract";
import { useAllTokenConfigs } from "@/hooks/tokens/useTokenConfig";
import {
  useLiquidityCalculation,
  LiquidityToken,
} from "@/hooks/liquidity/useLiquidityCalculation";
import { Token } from "../components/TokenSelector";
import KekeswapFactoryABI from "@/abi/KekeswapFactory.json";

export interface AddLiquidityParams {
  tokenA: Token | null;
  tokenB: Token | null;
  amountA: string;
  amountB: string;
  slippage: string;
  customSlippage: string;
}

export interface AddLiquidityState {
  // 基础状态
  tokenA: Token | null;
  tokenB: Token | null;
  amountA: string;
  amountB: string;
  slippage: string;
  customSlippage: string;
  isLoading: boolean;
  error: string | null;

  // 计算值
  isValidInput: boolean;
  priceRatio: { ratioAtoB: number; ratioBtoA: number } | null;
  totalValue: number;
  minAmounts: {
    minAmountA: number;
    minAmountB: number;
    slippagePercent: number;
  } | null;

  // 实时计算状态
  isCalculating: boolean;
  calculationError: string | null;
  calculatedAmountA: string;
  calculatedAmountB: string;
  isAutoCalculating: boolean; // 是否正在自动计算

  // 储备量信息
  reserves: {
    reserve0: string;
    reserve1: string;
    ratio: number;
  } | null;
  pairAddress: string | null;

  // 授权状态
  approvals: Record<string, boolean>;
  allApproved: boolean;
  anyApproving: boolean;
  approvalError: string | null;
}

export interface AddLiquidityActions {
  // 代币选择
  setTokenA: (token: Token | null) => void;
  setTokenB: (token: Token | null) => void;
  handleTokenASelect: (token: Token) => void;
  handleTokenBSelect: (token: Token) => void;

  // 数量设置
  setAmountA: (amount: string) => void;
  setAmountB: (amount: string) => void;
  setActiveInput: (input: "A" | "B") => void;

  // 实时计算
  enableAutoCalculation: () => void;
  disableAutoCalculation: () => void;
  calculateAmountB: () => void;
  calculateAmountA: () => void;

  // 滑点设置
  setSlippage: (slippage: string) => void;
  setCustomSlippage: (slippage: string) => void;
  handleSlippagePreset: (preset: string) => void;
  handleCustomSlippageChange: (value: string) => void;

  // 授权操作
  approveAll: () => Promise<void>;

  // 添加流动性
  handleAddLiquidity: () => Promise<void>;

  // 重置
  resetForm: () => void;
  setError: (error: string | null) => void;
}

// 转换Token类型为LiquidityToken类型的辅助函数
const convertToLiquidityToken = (
  token: Token | null
): LiquidityToken | null => {
  if (!token) return null;
  return {
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
    isNative: token.symbol === "ETH",
  };
};

// 获取pair地址的辅助函数
const getPairAddress = async (
  tokenA: string,
  tokenB: string,
  factoryAddress: string,
  publicClient: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<string | null> => {
  try {
    if (!publicClient) {
      console.error("Public client not available");
      return null;
    }

    const pairAddress = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: KekeswapFactoryABI,
      functionName: "getPair",
      args: [tokenA as `0x${string}`, tokenB as `0x${string}`],
    });

    return pairAddress === "0x0000000000000000000000000000000000000000"
      ? null
      : pairAddress;
  } catch (error) {
    console.error("获取pair地址失败:", error);
    return null;
  }
};

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

export function useAddLiquidity(
  initialTokenA?: Token | null,
  initialTokenB?: Token | null
) {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const searchParams = useSearchParams();

  const tokenAAddress = searchParams.get("tokenA");
  const tokenBAddress = searchParams.get("tokenB");
  const allTokenConfigs = useAllTokenConfigs();

  // 基础状态
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 实时计算状态
  const [isAutoCalculating, setIsAutoCalculating] = useState(true);
  const [calculatedAmountA, setCalculatedAmountA] = useState("");
  const [calculatedAmountB, setCalculatedAmountB] = useState("");
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<"A" | "B">("A"); // 当前活跃的输入字段

  // 初始化token状态 - 优先使用传入的参数
  useEffect(() => {
    if (initialTokenA) {
      setTokenA(initialTokenA);
    } else if (
      tokenAAddress &&
      allTokenConfigs &&
      allTokenConfigs.tokenConfigs
    ) {
      const tokenAConfig = Object.values(allTokenConfigs.tokenConfigs).find(
        (token) => token.address.toLowerCase() === tokenAAddress.toLowerCase()
      );
      if (tokenAConfig) {
        setTokenA({
          address: tokenAConfig.address,
          symbol: tokenAConfig.symbol,
          decimals: tokenAConfig.decimals,
          name: tokenAConfig.name,
          logoURI: tokenAConfig.logo_uri,
        });
      }
    }

    if (initialTokenB) {
      setTokenB(initialTokenB);
    } else if (
      tokenBAddress &&
      allTokenConfigs &&
      allTokenConfigs.tokenConfigs
    ) {
      const tokenBConfig = Object.values(allTokenConfigs.tokenConfigs).find(
        (token) => token.address.toLowerCase() === tokenBAddress.toLowerCase()
      );
      if (tokenBConfig) {
        setTokenB({
          address: tokenBConfig.address,
          symbol: tokenBConfig.symbol,
          decimals: tokenBConfig.decimals,
          name: tokenBConfig.name,
          logoURI: tokenBConfig.logo_uri,
        });
      }
    }
  }, [
    initialTokenA,
    initialTokenB,
    tokenAAddress,
    tokenBAddress,
    allTokenConfigs,
  ]);

  // 获取swap router实例
  const { addLiquidity, getDeadline, calculateMinAmount } = useSwapRouter();

  // 流动性计算（基于储备量比例）
  const calculateTokenA = convertToLiquidityToken(tokenA);
  const calculateTokenB = convertToLiquidityToken(tokenB);

  const {
    calculatedAmountA: calculatedAmountAFromHook,
    calculatedAmountB: calculatedAmountBFromHook,
    isLoading: isCalculating,
    error: calculationErrorFromHook,
    refresh: refreshCalculation,
    reserves: pairReserves,
    pairAddress: liquidityPairAddress,
  } = useLiquidityCalculation({
    tokenA: calculateTokenA,
    tokenB: calculateTokenB,
    amountA,
    amountB,
    activeInput,
  });

  // 处理实时计算结果
  useEffect(() => {
    if (isAutoCalculating && !isCalculating) {
      // 检查当前输入是否为空或为0，如果是则不进行自动计算
      const isCurrentInputEmpty =
        (activeInput === "A" &&
          (!amountA ||
            amountA === "0" ||
            amountA === "0." ||
            amountA === "0.0" ||
            amountA === "0.00")) ||
        (activeInput === "B" &&
          (!amountB ||
            amountB === "0" ||
            amountB === "0." ||
            amountB === "0.0" ||
            amountB === "0.00"));

      if (isCurrentInputEmpty) {
        // 如果当前输入为空，清空另一个输入框
        if (activeInput === "A") {
          setAmountB("");
        } else if (activeInput === "B") {
          setAmountA("");
        }
        setCalculationError(null);
        return;
      }

      if (activeInput === "A" && calculatedAmountBFromHook) {
        setCalculatedAmountB(calculatedAmountBFromHook);
        setAmountB(calculatedAmountBFromHook);
      } else if (activeInput === "B" && calculatedAmountAFromHook) {
        setCalculatedAmountA(calculatedAmountAFromHook);
        setAmountA(calculatedAmountAFromHook);
      }
      setCalculationError(null);
    }
  }, [
    calculatedAmountAFromHook,
    calculatedAmountBFromHook,
    isCalculating,
    isAutoCalculating,
    activeInput,
    amountA,
    amountB,
  ]);

  // 处理计算错误
  useEffect(() => {
    if (calculationErrorFromHook) {
      setCalculationError(calculationErrorFromHook);
    }
  }, [calculationErrorFromHook]);

  // 验证输入
  const isValidInput = useMemo(() => {
    return !!(
      tokenA &&
      tokenB &&
      amountA &&
      amountB &&
      parseFloat(amountA) > 0 &&
      parseFloat(amountB) > 0 &&
      tokenA.address !== tokenB.address
    );
  }, [tokenA, tokenB, amountA, amountB]);

  // 获取router地址和factory地址
  const routerAddress = useKekeswapRouterAddress();
  const factoryAddress = useKekeswapFactoryAddress();

  // 获取代币授权状态 - 为每个token单独授权
  const tokenAApproval = useTokenApproval({
    tokenAddress: tokenA?.address || "",
    spenderAddress:
      routerAddress || "0x0000000000000000000000000000000000000000",
    requiredAmount: amountA || "0",
    decimals: tokenA?.decimals || 18,
    enabled: !!(isValidInput && isConnected && tokenA && amountA),
  });

  const tokenBApproval = useTokenApproval({
    tokenAddress: tokenB?.address || "",
    spenderAddress:
      routerAddress || "0x0000000000000000000000000000000000000000",
    requiredAmount: amountB || "0",
    decimals: tokenB?.decimals || 18,
    enabled: !!(isValidInput && isConnected && tokenB && amountB),
  });

  // 计算组合授权状态
  const approvals = [tokenAApproval, tokenBApproval];
  const allApproved = approvals.every((approval) => approval.isApproved);
  const anyApproving = approvals.some((approval) => approval.isApproving);
  const approvalError =
    approvals.find((approval) => approval.error)?.error || null;

  // 授权所有代币的函数
  const approveAll = useCallback(async () => {
    const approvalPromises = [];

    if (tokenA && amountA && !tokenAApproval.isApproved) {
      approvalPromises.push(tokenAApproval.approve(amountA));
    }

    if (tokenB && amountB && !tokenBApproval.isApproved) {
      approvalPromises.push(tokenBApproval.approve(amountB));
    }

    if (approvalPromises.length > 0) {
      await Promise.all(approvalPromises);
    }
  }, [tokenA, tokenB, amountA, amountB, tokenAApproval, tokenBApproval]);

  // 计算价格比率
  const priceRatio = useMemo(() => {
    if (!tokenA || !tokenB || !amountA || !amountB) return null;
    const ratioAtoB = parseFloat(amountB) / parseFloat(amountA);
    const ratioBtoA = parseFloat(amountA) / parseFloat(amountB);
    return { ratioAtoB, ratioBtoA };
  }, [tokenA, tokenB, amountA, amountB]);

  // 计算总价值
  // todo: 根据token的实际价格计算
  const totalValue = useMemo(() => {
    let total = 0;
    if (tokenA && amountA && tokenA.price) {
      total += parseFloat(amountA) * tokenA.price;
    }
    if (tokenB && amountB && tokenB.price) {
      total += parseFloat(amountB) * tokenB.price;
    }
    return total;
  }, [tokenA, tokenB, amountA, amountB]);

  // 计算最小数量（考虑滑点）
  const minAmounts = useMemo(() => {
    if (!tokenA || !tokenB || !amountA || !amountB) return null;

    const currentSlippage = customSlippage
      ? parseFloat(customSlippage)
      : parseFloat(slippage);
    const slippageMultiplier = 1 - currentSlippage / 100;

    const minAmountA = parseFloat(amountA) * slippageMultiplier;
    const minAmountB = parseFloat(amountB) * slippageMultiplier;

    return {
      minAmountA,
      minAmountB,
      slippagePercent: currentSlippage,
    };
  }, [tokenA, tokenB, amountA, amountB, slippage, customSlippage]);

  // 代币选择处理函数
  const handleTokenASelect = useCallback(
    (token: Token) => {
      setTokenA(token);
      if (tokenB && token.address === tokenB.address) {
        setTokenB(null);
        setAmountB("");
      }
    },
    [tokenB]
  );

  const handleTokenBSelect = useCallback(
    (token: Token) => {
      setTokenB(token);
      if (tokenA && token.address === tokenA.address) {
        setTokenA(null);
        setAmountA("");
      }
    },
    [tokenA]
  );

  // 数量设置处理函数
  const handleAmountAChange = useCallback((amount: string) => {
    setAmountA(amount);
    setActiveInput("A");
  }, []);

  const handleAmountBChange = useCallback((amount: string) => {
    setAmountB(amount);
    setActiveInput("B");
  }, []);

  // 滑点处理函数
  const handleSlippagePreset = useCallback((preset: string) => {
    setSlippage(preset);
    setCustomSlippage("");
  }, []);

  const handleCustomSlippageChange = useCallback((value: string) => {
    setCustomSlippage(value);
    if (value) {
      setSlippage("");
    }
  }, []);

  // 计算相关actions
  const enableAutoCalculation = useCallback(() => {
    setIsAutoCalculating(true);
  }, []);

  const disableAutoCalculation = useCallback(() => {
    setIsAutoCalculating(false);
  }, []);

  const calculateAmountB = useCallback(() => {
    if (calculateTokenA && calculateTokenB && amountA) {
      refreshCalculation();
    }
  }, [calculateTokenA, calculateTokenB, amountA, refreshCalculation]);

  const calculateAmountA = useCallback(() => {
    if (calculateTokenA && calculateTokenB && amountB) {
      refreshCalculation();
    }
  }, [calculateTokenA, calculateTokenB, amountB, refreshCalculation]);

  // 重置表单
  const resetForm = useCallback(() => {
    setAmountA("");
    setAmountB("");
    setCalculatedAmountA("");
    setCalculatedAmountB("");
    setCalculationError(null);
    // setTokenA(null);
    // setTokenB(null);
    setError(null);
  }, []);

  // 添加流动性处理函数
  const handleAddLiquidity = useCallback(async (): Promise<void> => {
    if (!isValidInput || !isConnected || !routerAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const deadline = getDeadline(20); // 20分钟截止时间
      const currentSlippage = customSlippage
        ? parseFloat(customSlippage)
        : parseFloat(slippage);

      // 计算最小数量
      const minAmountA = calculateMinAmount(
        parseUnits(amountA, tokenA!.decimals).toString(),
        currentSlippage
      );
      const minAmountB = calculateMinAmount(
        parseUnits(amountB, tokenB!.decimals).toString(),
        currentSlippage
      );

      // 检查是否需要授权
      if (!allApproved) {
        setError("请先授权代币");
        return;
      }

      // 调用添加流动性
      const result = await addLiquidity({
        tokenA: tokenA!.address,
        tokenB: tokenB!.address,
        amountADesired: parseUnits(amountA, tokenA!.decimals).toString(),
        amountBDesired: parseUnits(amountB, tokenB!.decimals).toString(),
        amountAMin: minAmountA,
        amountBMin: minAmountB,
        to: address!,
        deadline,
      });

      console.log("添加流动性成功:", result);

      // 获取交易哈希（从addLiquidity的返回值中获取）
      const transactionHash = result.hash;

      // 添加流动性成功后，更新数据库中的流动性池和用户持仓信息
      try {
        // 获取pair地址
        const pairAddress = await getPairAddress(
          tokenA!.address,
          tokenB!.address,
          factoryAddress!,
          publicClient
        );

        if (!pairAddress) {
          console.warn("无法获取pair地址，跳过数据库更新");
          return;
        }

        // 计算总价值（USD）
        const totalValueUSD = totalValue;

        // 调用pools API更新流动性池信息
        await updatePoolsAPI({
          pairAddress,
          token0Address: tokenA!.address,
          token1Address: tokenB!.address,
          reserve0: parseUnits(amountA, tokenA!.decimals).toString(),
          reserve1: parseUnits(amountB, tokenB!.decimals).toString(),
          totalSupply: result.liquidity?.toString() || "0", // 使用实际添加的流动性作为总供应量
          tvlUsd: totalValueUSD,
          volume24h: "0", // 新池子初始交易量为0
        });

        // 调用positions API更新用户持仓信息
        await updatePositionsAPI({
          userAddress: address!,
          pairAddress,
          lpBalance: result.liquidity?.toString() || "0", // 使用实际添加的流动性
          token0Balance: parseUnits(amountA, tokenA!.decimals).toString(),
          token1Balance: parseUnits(amountB, tokenB!.decimals).toString(),
          transactionHash,
        });

        console.log("数据库更新成功");
      } catch (apiError) {
        console.error("更新数据库失败:", apiError);
        // 不抛出错误，因为链上交易已经成功
        // 可以选择显示一个警告消息
      }

      // 重置表单
      resetForm();
    } catch (error: unknown) {
      console.error("添加流动性失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "添加流动性失败，请重试";
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    isValidInput,
    isConnected,
    routerAddress,
    factoryAddress,
    publicClient,
    customSlippage,
    slippage,
    amountA,
    amountB,
    tokenA,
    tokenB,
    allApproved,
    address,
    totalValue,
    getDeadline,
    calculateMinAmount,
    addLiquidity,
    resetForm,
  ]);

  // 状态对象
  const state: AddLiquidityState = {
    tokenA,
    tokenB,
    amountA,
    amountB,
    slippage,
    customSlippage,
    isLoading,
    error,
    isValidInput,
    priceRatio,
    totalValue,
    minAmounts,
    isCalculating,
    calculationError,
    calculatedAmountA,
    calculatedAmountB,
    isAutoCalculating,
    reserves: pairReserves,
    pairAddress: liquidityPairAddress,
    approvals: {
      [tokenA?.address || "tokenA"]: tokenAApproval.isApproved,
      [tokenB?.address || "tokenB"]: tokenBApproval.isApproved,
    },
    allApproved: allApproved || false,
    anyApproving: anyApproving || false,
    approvalError: approvalError || null,
  };

  // 操作对象
  const actions: AddLiquidityActions = {
    setTokenA,
    setTokenB,
    handleTokenASelect,
    handleTokenBSelect,
    setAmountA: handleAmountAChange,
    setAmountB: handleAmountBChange,
    setActiveInput,
    enableAutoCalculation,
    disableAutoCalculation,
    calculateAmountB,
    calculateAmountA,
    setSlippage,
    setCustomSlippage,
    handleSlippagePreset,
    handleCustomSlippageChange,
    approveAll,
    handleAddLiquidity,
    resetForm,
    setError,
  };

  return {
    state,
    actions,
  };
}
