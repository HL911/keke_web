import { useCallback, useMemo } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { decodeEventLog, getContract } from "viem";
import { simulateContract } from "viem/actions";
import KekeswapRouterABI from "../../abi/KekeswapRouter.json";
import KekeswapPairABI from "../../abi/KekeswapPair.json";
import { useKekeswapRouterAddress } from "../useContract";

// 类型定义
export interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  to: string;
  deadline: bigint;
}

export interface AddLiquidityETHParams {
  token: string;
  amountTokenDesired: string;
  amountTokenMin: string;
  amountETHMin: string;
  to: string;
  deadline: bigint;
  value: bigint; // ETH amount
}

export interface RemoveLiquidityParams {
  tokenA: string;
  tokenB: string;
  liquidity: string;
  amountAMin: string;
  amountBMin: string;
  to: string;
  deadline: bigint;
}

export interface RemoveLiquidityETHParams {
  token: string;
  liquidity: string;
  amountTokenMin: string;
  amountETHMin: string;
  to: string;
  deadline: bigint;
}

export interface SwapExactTokensForTokensParams {
  amountIn: string;
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: bigint;
}

export interface SwapExactETHForTokensParams {
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: bigint;
  value: bigint;
}

export interface SwapExactTokensForETHParams {
  amountIn: string;
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: bigint;
}

export interface AddLiquidityResult {
  amountA: bigint;
  amountB: bigint;
  liquidity: bigint;
  hash: `0x${string}`;
}

export interface RemoveLiquidityResult {
  amountA: bigint;
  amountB: bigint;
  hash: `0x${string}`;
}

export interface RemoveLiquidityETHResult {
  amountToken: bigint;
  amountETH: bigint;
  hash: `0x${string}`;
}

export interface SwapResult {
  amounts: bigint[];
  hash: `0x${string}`;
}

/**
 * KekeswapRouter 合约交互 Hook
 */
export function useSwapRouter() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const routerAddress = useKekeswapRouterAddress();

  // 获取合约实例
  const contract = useMemo(() => {
    if (!publicClient || !routerAddress) return null;
    return getContract({
      address: routerAddress as `0x${string}`,
      abi: KekeswapRouterABI,
      client: publicClient,
    });
  }, [publicClient, routerAddress]);

  // 获取写合约实例
  const writeContract = useMemo(() => {
    if (!walletClient || !routerAddress) return null;
    return getContract({
      address: routerAddress as `0x${string}`,
      abi: KekeswapRouterABI,
      client: walletClient,
    });
  }, [walletClient, routerAddress]);

  // 检查连接状态
  const isConnected = useMemo(() => {
    return !!(address && contract && writeContract);
  }, [address, contract, writeContract]);

  // ==================== 添加流动性 ====================

  /**
   * 添加流动性 (ERC20/ERC20)
   */
  const addLiquidity = useCallback(
    async (params: AddLiquidityParams): Promise<AddLiquidityResult> => {
      if (!writeContract || !publicClient) throw new Error("合约未连接");

      const {
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        to,
        deadline,
      } = params;

      // 先模拟获取预期返回值
      const { result: simulatedResult } = await simulateContract(publicClient, {
        address: routerAddress as `0x${string}`,
        abi: KekeswapRouterABI,
        functionName: "addLiquidity",
        args: [
          tokenA as `0x${string}`,
          tokenB as `0x${string}`,
          safeBigInt(amountADesired),
          safeBigInt(amountBDesired),
          safeBigInt(amountAMin),
          safeBigInt(amountBMin),
          to as `0x${string}`,
          deadline,
        ],
        account: address,
      });

      const hash = await writeContract.write.addLiquidity([
        tokenA as `0x${string}`,
        tokenB as `0x${string}`,
        safeBigInt(amountADesired),
        safeBigInt(amountBDesired),
        safeBigInt(amountAMin),
        safeBigInt(amountBMin),
        to as `0x${string}`,
        deadline,
      ]);

      // // 等待交易确认
      // if (publicClient) {
      //   const receipt = await publicClient.waitForTransactionReceipt({ hash });
      //   return {
      //     amountA: BigInt(amountADesired),
      //     amountB: BigInt(amountBDesired),
      //     liquidity: BigInt(0), // 实际值需要从事件中解析
      //     hash,
      //   };
      // }

      // throw new Error("无法获取交易结果");

      // 直接返回模拟结果，提供即时反馈
      // 模拟执行的结果通常很准确，不需要等待交易确认
      return {
        amountA: simulatedResult[0],
        amountB: simulatedResult[1],
        liquidity: simulatedResult[2],
        hash,
      };
    },
    [writeContract, publicClient, routerAddress, address]
  );

  /**
   * 添加流动性 (ERC20/ETH)
   */
  const addLiquidityETH = useCallback(
    async (params: AddLiquidityETHParams): Promise<AddLiquidityResult> => {
      if (!writeContract) throw new Error("合约未连接");

      const {
        token,
        amountTokenDesired,
        amountTokenMin,
        amountETHMin,
        to,
        deadline,
        value,
      } = params;

      const hash = await writeContract.write.addLiquidityETH(
        [
          token as `0x${string}`,
          safeBigInt(amountTokenDesired),
          safeBigInt(amountTokenMin),
          safeBigInt(amountETHMin),
          to as `0x${string}`,
          deadline,
        ],
        {
          value,
        }
      );

      // 等待交易确认
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return {
          amountA: BigInt(amountTokenDesired),
          amountB: value,
          liquidity: BigInt(0), // 实际值需要从事件中解析
          hash,
        };
      }

      throw new Error("无法获取交易结果");
    },
    [writeContract, publicClient]
  );

  // ==================== 移除流动性 ====================

  /**
   * 安全地将字符串转换为 BigInt，处理科学计数法
   */
  const safeBigInt = (value: string): bigint => {
    // 如果是科学计数法格式，先转换为普通数字字符串
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }
    // 使用 toFixed(0) 确保不产生科学计数法
    return BigInt(num.toFixed(0));
  };

  /**
   * 移除流动性 (ERC20/ERC20)
   */
  const removeLiquidity = useCallback(
    async (params: RemoveLiquidityParams): Promise<RemoveLiquidityResult> => {
      if (!writeContract || !publicClient) throw new Error("合约未连接");

      const {
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        to,
        deadline,
      } = params;

      // 先模拟获取预期返回值
      const { result: simulatedResult } = await simulateContract(publicClient, {
        address: routerAddress as `0x${string}`,
        abi: KekeswapRouterABI,
        functionName: "removeLiquidity",
        args: [
          tokenA as `0x${string}`,
          tokenB as `0x${string}`,
          safeBigInt(liquidity),
          safeBigInt(amountAMin),
          safeBigInt(amountBMin),
          to as `0x${string}`,
          deadline,
        ],
        account: address,
      });

      const hash = await writeContract.write.removeLiquidity([
        tokenA as `0x${string}`,
        tokenB as `0x${string}`,
        safeBigInt(liquidity),
        safeBigInt(amountAMin),
        safeBigInt(amountBMin),
        to as `0x${string}`,
        deadline,
      ]);

      // 等待交易确认
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return {
          amountA: simulatedResult[0] as bigint,
          amountB: simulatedResult[1] as bigint,
          hash,
        };
      }

      throw new Error("无法获取交易结果");
    },
    [writeContract, publicClient, routerAddress, address]
  );

  /**
   * 移除流动性 (ERC20/ETH)
   */
  const removeLiquidityETH = useCallback(
    async (
      params: RemoveLiquidityETHParams
    ): Promise<RemoveLiquidityETHResult> => {
      if (!writeContract || !publicClient) throw new Error("合约未连接");

      const { token, liquidity, amountTokenMin, amountETHMin, to, deadline } =
        params;

      // 先模拟获取预期返回值
      const { result: simulatedResult } = await simulateContract(publicClient, {
        address: routerAddress as `0x${string}`,
        abi: KekeswapRouterABI,
        functionName: "removeLiquidityETH",
        args: [
          token as `0x${string}`,
          safeBigInt(liquidity),
          safeBigInt(amountTokenMin),
          safeBigInt(amountETHMin),
          to as `0x${string}`,
          deadline,
        ],
        account: address,
      });

      const hash = await writeContract.write.removeLiquidityETH([
        token as `0x${string}`,
        safeBigInt(liquidity),
        safeBigInt(amountTokenMin),
        safeBigInt(amountETHMin),
        to as `0x${string}`,
        deadline,
      ]);

      // 等待交易确认
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return {
          amountToken: simulatedResult[0] as bigint,
          amountETH: simulatedResult[1] as bigint,
          hash,
        };
      }

      throw new Error("无法获取交易结果");
    },
    [writeContract, publicClient, routerAddress, address]
  );

  // ==================== 交换 ====================

  /**
   * 精确输入代币交换
   */
  const swapExactTokensForTokens = useCallback(
    async (params: SwapExactTokensForTokensParams): Promise<SwapResult> => {
      if (!writeContract || !publicClient) throw new Error("合约未连接");

      const { amountIn, amountOutMin, path, to, deadline } = params;

      // 先模拟获取预期返回值
      const { result: simulatedResult } = await simulateContract(publicClient, {
        address: routerAddress as `0x${string}`,
        abi: KekeswapRouterABI,
        functionName: "swapExactTokensForTokens",
        args: [
          safeBigInt(amountIn),
          safeBigInt(amountOutMin),
          path as `0x${string}`[],
          to as `0x${string}`,
          deadline,
        ],
        account: address,
      });

      const hash = await writeContract.write.swapExactTokensForTokens([
        safeBigInt(amountIn),
        safeBigInt(amountOutMin),
        path as `0x${string}`[],
        to as `0x${string}`,
        deadline,
      ]);

      // // 等待交易确认
      // if (publicClient) {
      //   const receipt = await publicClient.waitForTransactionReceipt({ hash });
      //   return {
      //     amounts: [], // 实际值需要从事件中解析
      //     hash,
      //   };
      // }
      // throw new Error("无法获取交易结果");

      // 直接返回模拟结果，提供即时反馈
      // 模拟执行的结果通常很准确，不需要等待交易确认
      return {
        amounts: simulatedResult,
        hash,
      };
    },
    [writeContract, publicClient, routerAddress, address]
  );

  /**
   * 精确输入 ETH 交换代币
   */
  const swapExactETHForTokens = useCallback(
    async (params: SwapExactETHForTokensParams): Promise<SwapResult> => {
      if (!writeContract) throw new Error("合约未连接");

      const { amountOutMin, path, to, deadline, value } = params;

      const hash = await writeContract.write.swapExactETHForTokens(
        [
          safeBigInt(amountOutMin),
          path as `0x${string}`[],
          to as `0x${string}`,
          deadline,
        ],
        {
          value,
        }
      );

      // 等待交易确认
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return {
          amounts: [], // 实际值需要从事件中解析
          hash,
        };
      }

      throw new Error("无法获取交易结果");
    },
    [writeContract, publicClient]
  );

  /**
   * 精确输入代币交换 ETH
   */
  const swapExactTokensForETH = useCallback(
    async (params: SwapExactTokensForETHParams): Promise<SwapResult> => {
      if (!writeContract) throw new Error("合约未连接");

      const { amountIn, amountOutMin, path, to, deadline } = params;

      const hash = await writeContract.write.swapExactTokensForETH([
        safeBigInt(amountIn),
        safeBigInt(amountOutMin),
        path as `0x${string}`[],
        to as `0x${string}`,
        deadline,
      ]);

      // 等待交易确认
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return {
          amounts: [], // 实际值需要从事件中解析
          hash,
        };
      }

      throw new Error("无法获取交易结果");
    },
    [writeContract, publicClient]
  );

  // ==================== 查询方法 ====================

  /**
   * 获取输出数量
   */
  const getAmountOut = useCallback(
    async (
      amountIn: string,
      reserveIn: string,
      reserveOut: string
    ): Promise<bigint> => {
      if (!contract) throw new Error("合约未连接");

      const result = await contract.read.getAmountOut([
        safeBigInt(amountIn),
        safeBigInt(reserveIn),
        safeBigInt(reserveOut),
      ]);

      return result as bigint;
    },
    [contract]
  );

  /**
   * 获取输入数量
   */
  const getAmountIn = useCallback(
    async (
      amountOut: string,
      reserveIn: string,
      reserveOut: string
    ): Promise<bigint> => {
      if (!contract) throw new Error("合约未连接");

      const result = await contract.read.getAmountIn([
        safeBigInt(amountOut),
        safeBigInt(reserveIn),
        safeBigInt(reserveOut),
      ]);

      return result as bigint;
    },
    [contract]
  );

  /**
   * 获取输出数量数组
   */
  const getAmountsOut = useCallback(
    async (amountIn: string, path: string[]): Promise<bigint[]> => {
      if (!contract) throw new Error("合约未连接");

      const result = await contract.read.getAmountsOut([
        safeBigInt(amountIn),
        path as `0x${string}`[],
      ]);

      return result as bigint[];
    },
    [contract]
  );

  /**
   * 获取输入数量数组
   */
  const getAmountsIn = useCallback(
    async (amountOut: string, path: string[]): Promise<bigint[]> => {
      if (!contract) throw new Error("合约未连接");

      const result = await contract.read.getAmountsIn([
        safeBigInt(amountOut),
        path as `0x${string}`[],
      ]);

      return result as bigint[];
    },
    [contract]
  );

  /**
   * 计算报价
   */
  const quote = useCallback(
    async (
      amountA: string,
      reserveA: string,
      reserveB: string
    ): Promise<bigint> => {
      if (!contract) throw new Error("合约未连接");

      const result = await contract.read.quote([
        safeBigInt(amountA),
        safeBigInt(reserveA),
        safeBigInt(reserveB),
      ]);

      return result as bigint;
    },
    [contract]
  );

  /**
   * 获取工厂地址
   */
  const getFactory = useCallback(async (): Promise<string> => {
    if (!contract) throw new Error("合约未连接");

    const result = await contract.read.factory();
    return result as string;
  }, [contract]);

  /**
   * 获取 WETH 地址
   */
  const getWETH = useCallback(async (): Promise<string> => {
    if (!contract) throw new Error("合约未连接");

    const result = await contract.read.WETH();
    return result as string;
  }, [contract]);

  // ==================== 工具方法 ====================

  /**
   * 计算截止时间
   */
  const getDeadline = useCallback((minutes: number = 20): bigint => {
    return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
  }, []);

  /**
   * 计算滑点后的最小数量
   */
  const calculateMinAmount = useCallback(
    (amount: string, slippagePercent: number): string => {
      const amountBigInt = safeBigInt(amount);
      const slippageBigInt = BigInt(Math.floor(slippagePercent * 100)); // 转换为基点
      const minAmount =
        (amountBigInt * (BigInt(10000) - slippageBigInt)) / BigInt(10000);
      return minAmount.toString();
    },
    []
  );

  return {
    // 状态
    isConnected,
    routerAddress,

    // 添加流动性
    addLiquidity,
    addLiquidityETH,

    // 移除流动性
    removeLiquidity,
    removeLiquidityETH,

    // 交换
    swapExactTokensForTokens,
    swapExactETHForTokens,
    swapExactTokensForETH,

    // 查询方法
    getAmountOut,
    getAmountIn,
    getAmountsOut,
    getAmountsIn,
    quote,
    getFactory,
    getWETH,

    // 工具方法
    getDeadline,
    calculateMinAmount,
  };
}

// ==================== 解析事件的相关方法 ====================

// KekeswapPair 事件解析结果类型
export interface MintEventData {
  sender: string;
  amount0: bigint;
  amount1: bigint;
}

export interface BurnEventData {
  sender: string;
  amount0: bigint;
  amount1: bigint;
  to: string;
}

export interface SwapEventData {
  sender: string;
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
  to: string;
}

/**
 * 解析 KekeswapPair 事件的工具函数
 * @param receipt 交易回执
 * @param targetContractAddress 可选的合约地址过滤
 * @returns 解析后的事件数据
 */
export const parsePairEventLogs = (
  receipt: any,
  targetContractAddress?: string
) => {
  const events = {
    mint: [] as MintEventData[],
    burn: [] as BurnEventData[],
    swap: [] as SwapEventData[],
  };

  for (const log of receipt.logs) {
    // 如果指定了目标合约地址，只解析该合约的事件
    if (
      targetContractAddress &&
      log.address.toLowerCase() !== targetContractAddress.toLowerCase()
    ) {
      continue;
    }

    try {
      // 尝试解析Mint事件
      try {
        const decoded = decodeEventLog({
          abi: KekeswapPairABI,
          data: log.data,
          topics: log.topics,
          eventName: "Mint",
        });

        if (decoded.eventName === "Mint" && decoded.args) {
          const args = decoded.args as any;
          events.mint.push({
            sender: args.sender as string,
            amount0: args.amount0 as bigint,
            amount1: args.amount1 as bigint,
          });
        }
      } catch {
        // 不是Mint事件，继续尝试其他事件
      }

      // 尝试解析Burn事件
      try {
        const decoded = decodeEventLog({
          abi: KekeswapPairABI,
          data: log.data,
          topics: log.topics,
          eventName: "Burn",
        });

        if (decoded.eventName === "Burn" && decoded.args) {
          const args = decoded.args as any;
          events.burn.push({
            sender: args.sender as string,
            amount0: args.amount0 as bigint,
            amount1: args.amount1 as bigint,
            to: args.to as string,
          });
        }
      } catch {
        // 不是Burn事件，继续尝试其他事件
      }

      // 尝试解析Swap事件
      try {
        const decoded = decodeEventLog({
          abi: KekeswapPairABI,
          data: log.data,
          topics: log.topics,
          eventName: "Swap",
        });

        if (decoded.eventName === "Swap" && decoded.args) {
          const args = decoded.args as any;
          events.swap.push({
            sender: args.sender as string,
            amount0In: args.amount0In as bigint,
            amount1In: args.amount1In as bigint,
            amount0Out: args.amount0Out as bigint,
            amount1Out: args.amount1Out as bigint,
            to: args.to as string,
          });
        }
      } catch {
        // 不是Swap事件，忽略
      }
    } catch (error) {
      // 忽略无法解析的日志
      console.warn("Failed to decode log:", error);
    }
  }

  return events;
};
