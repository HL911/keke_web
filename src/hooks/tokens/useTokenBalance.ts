"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatUnits, erc20Abi } from "viem";

export interface TokenBalanceState {
  balance: bigint;
  formatted: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseTokenBalanceProps {
  tokenAddress: string;
  decimals: number;
  symbol: string;
}

/**
 * 单个代币余额Hook
 */
export function useTokenBalance({
  tokenAddress,
  decimals,
  symbol,
}: UseTokenBalanceProps): TokenBalanceState {
  const { address: userAddress } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // 读取代币余额
  const {
    data: balance = BigInt(0),
    isLoading,
    refetch,
    error: contractError,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!tokenAddress,
    },
  });

  // 格式化余额显示
  const formatted = useMemo(() => {
    if (balance === BigInt(0)) return "0";

    try {
      const balanceFormatted = formatUnits(balance, decimals);
      const balanceNum = parseFloat(balanceFormatted);

      if (balanceNum === 0) return "0";

      // 根据decimals调整最小显示阈值
      const minThreshold = Math.pow(10, -Math.min(6, decimals));
      if (balanceNum < minThreshold) return `< ${minThreshold}`;

      // 对于6位小数的代币，如果余额正好是最小单位，也显示为小于阈值
      if (decimals === 6 && balanceNum === minThreshold)
        return `< ${minThreshold}`;

      if (balanceNum < 0.01) return balanceNum.toFixed(6);
      if (balanceNum < 1) return balanceNum.toFixed(4);
      if (balanceNum < 1000) return balanceNum.toFixed(2);
      if (balanceNum < 1000000) return `${(balanceNum / 1000).toFixed(2)}K`;
      return `${(balanceNum / 1000000).toFixed(2)}M`;
    } catch (err) {
      return "0";
    }
  }, [balance, decimals]);

  // 手动刷新
  const refresh = useCallback(async () => {
    try {
      setError(null);
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取余额失败";
      setError(errorMessage);
      console.error(`获取 ${symbol} 余额失败:`, err);
    }
  }, [refetch, symbol]);

  // 处理合约错误
  useEffect(() => {
    if (contractError) {
      setError(contractError.message);
    } else {
      setError(null);
    }
  }, [contractError]);

  return {
    balance,
    formatted,
    isLoading,
    error,
    refresh,
  };
}

/**
 * 多代币余额Hook
 */
export function useMultiTokenBalance(
  tokens: Array<{
    address: string;
    symbol: string;
    decimals: number;
  }>
) {
  const { address: userAddress } = useAccount();

  // 为了遵循React Hooks规则，我们固定调用最多2个代币的Hook
  const tokenA = tokens[0];
  const tokenB = tokens[1];

  const balanceA = useTokenBalance({
    tokenAddress: tokenA?.address || "",
    decimals: tokenA?.decimals || 18,
    symbol: tokenA?.symbol || "",
  });

  const balanceB = useTokenBalance({
    tokenAddress: tokenB?.address || "",
    decimals: tokenB?.decimals || 18,
    symbol: tokenB?.symbol || "",
  });

  const balances = [
    tokenA ? { ...tokenA, ...balanceA } : null,
    tokenB ? { ...tokenB, ...balanceB } : null,
  ].filter(Boolean) as Array<{
    address: string;
    symbol: string;
    decimals: number;
    balance: bigint;
    formatted: string;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  }>;

  // 聚合状态
  const aggregatedState = useMemo(() => {
    const isAnyLoading = balances.some((balance) => balance.isLoading);
    const errors = balances
      .filter((balance) => balance.error)
      .map((balance) => balance.error);
    const hasError = errors.length > 0;

    return {
      isLoading: isAnyLoading,
      error: hasError ? errors[0] : null,
      balances: balances.map((balance, index) => ({
        ...tokens[index],
        ...balance,
      })),
    };
  }, [balances, tokens]);

  // 批量刷新
  const refreshAll = useCallback(async () => {
    try {
      await Promise.all(balances.map((balance) => balance.refresh()));
    } catch (err) {
      console.error("批量获取余额失败:", err);
    }
  }, [balances]);

  return {
    ...aggregatedState,
    refreshAll,
  };
}

/**
 * 原生代币余额Hook (ETH/BNB等)
 */
export function useNativeBalance() {
  const { address: userAddress } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // 使用 wagmi 的 useBalance hook 获取原生代币余额
  const {
    data: balanceData,
    isLoading,
    refetch,
    error: balanceError,
  } = useBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress,
    },
  });

  // 格式化显示
  const formatted = useMemo(() => {
    if (!balanceData?.value || balanceData.value === BigInt(0)) return "0";

    try {
      const balanceFormatted = formatUnits(
        balanceData.value,
        balanceData.decimals
      );
      const balanceNum = parseFloat(balanceFormatted);

      if (balanceNum === 0) return "0";

      // 根据decimals调整最小显示阈值
      const minThreshold = Math.pow(10, -Math.min(6, balanceData.decimals));
      if (balanceNum < minThreshold) return `< ${minThreshold}`;

      // 对于6位小数的代币，如果余额正好是最小单位，也显示为小于阈值
      if (balanceData.decimals === 6 && balanceNum === minThreshold)
        return `< ${minThreshold}`;

      if (balanceNum < 0.01) return balanceNum.toFixed(6);
      if (balanceNum < 1) return balanceNum.toFixed(4);
      if (balanceNum < 1000) return balanceNum.toFixed(2);
      if (balanceNum < 1000000) return `${(balanceNum / 1000).toFixed(2)}K`;
      return `${(balanceNum / 1000000).toFixed(2)}M`;
    } catch (err) {
      return "0";
    }
  }, [balanceData]);

  // 手动刷新
  const refresh = useCallback(async () => {
    try {
      setError(null);
      await refetch();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "获取原生代币余额失败";
      setError(errorMessage);
      console.error("获取原生代币余额失败:", err);
    }
  }, [refetch]);

  // 处理余额错误
  useEffect(() => {
    if (balanceError) {
      setError(balanceError.message);
    } else {
      setError(null);
    }
  }, [balanceError]);

  return {
    balance: balanceData?.value || BigInt(0),
    formatted,
    isLoading,
    error,
    refresh,
  };
}

/**
 * 格式化余额工具函数
 */
export function formatBalance(
  balance: string | bigint,
  decimals: number = 18,
  precision: number = 6
): string {
  try {
    const balanceBigInt =
      typeof balance === "string" ? BigInt(balance) : balance;
    if (balanceBigInt === BigInt(0)) return "0";

    const balanceFormatted = formatUnits(balanceBigInt, decimals);
    const balanceNum = parseFloat(balanceFormatted);

    if (balanceNum === 0) return "0";
    if (balanceNum < Math.pow(10, -precision))
      return `< ${Math.pow(10, -precision)}`;

    return balanceNum.toFixed(precision);
  } catch (err) {
    return "0";
  }
}

/**
 * 检查余额是否足够
 */
export function isBalanceSufficient(
  balance: bigint,
  requiredAmount: string,
  decimals: number
): boolean {
  try {
    if (!requiredAmount || requiredAmount === "0") return true;

    const requiredBigInt = BigInt(
      Math.floor(parseFloat(requiredAmount) * Math.pow(10, decimals))
    );

    return balance >= requiredBigInt;
  } catch (err) {
    return false;
  }
}

/**
 * 获取最大可用余额
 */
export function getMaxAvailableBalance(
  balance: bigint,
  decimals: number,
  reserveForGas: boolean = true
): string {
  try {
    if (balance === BigInt(0)) return "0";

    // 为原生代币预留gas费用 (约0.01 ETH/BNB)
    const gasReserve = reserveForGas
      ? BigInt(Math.floor(0.01 * Math.pow(10, decimals)))
      : BigInt(0);
    const availableBalance =
      balance > gasReserve ? balance - gasReserve : BigInt(0);

    return formatUnits(availableBalance, decimals);
  } catch (err) {
    return "0";
  }
}
