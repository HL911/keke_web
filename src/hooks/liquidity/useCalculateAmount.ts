"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import KekeswapRouterABI from "@/abi/KekeswapRouter.json" with { type: "json" };
import { useKekeswapRouterAddress } from "@/hooks/useContract";
import { getWeth9Config } from "@/hooks/tokens/useTokenConfig";

export interface CalculateToken {
  address: string;
  symbol: string;
  decimals: number;
  isNative?: boolean; // 是否为原生代币 (ETH/BNB等)
}

export interface CalculateAmountParams {
  inputToken: CalculateToken;
  outputToken: CalculateToken;
  inputAmount: string;
}

export interface BidirectionalCalculateParams {
  tokenA: CalculateToken;
  tokenB: CalculateToken;
  amountA: string;
  amountB: string;
  activeInput: 'A' | 'B'; // 当前活跃的输入字段
}

export interface CalculateAmountResult {
  outputAmount: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface BidirectionalCalculateResult {
  calculatedAmountA: string;
  calculatedAmountB: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * 计算交易池中token数量对应的另一种token数量
 * 通过调用KekeswapRouter合约的getAmountsOut方法获取实时价格
 */
export function useCalculateAmount({
  inputToken,
  outputToken,
  inputAmount,
}: CalculateAmountParams): CalculateAmountResult {
  const [error, setError] = useState<string | null>(null);

  const wethConfig = getWeth9Config();

  // 构建交易路径
  const path = useMemo(() => {
    if (!inputToken || !outputToken) return [];

    const inputAddr = inputToken.isNative ? wethConfig.address : inputToken.address;
    const outputAddr = outputToken.isNative ? wethConfig.address : outputToken.address;

    // 如果是同一个代币，直接返回空数组
    if (inputAddr === outputAddr) return [];

    return [inputAddr, outputAddr] as `0x${string}`[];
  }, [inputToken, outputToken, wethConfig.address]);

  // 转换输入金额为合约格式
  const inputAmountWei = useMemo(() => {
    if (!inputAmount || inputAmount === "0" || !inputToken) return BigInt(0);

    try {
      return parseUnits(inputAmount, inputToken.decimals);
    } catch (err) {
      console.error("解析输入金额失败:", err);
      return BigInt(0);
    }
  }, [inputAmount, inputToken]);

  const routerAddress = useKekeswapRouterAddress();

  // 调用合约获取输出数量
  const {
    data: amounts,
    isLoading,
    refetch,
    error: contractError,
  } = useReadContract({
    address: routerAddress as `0x${string}`,
    abi: KekeswapRouterABI,
    functionName: "getAmountsOut",
    args: [inputAmountWei, path],
    query: {
      enabled: !!inputAmountWei && path.length === 2 && inputAmount !== "0",
    },
  });

  // 计算输出金额
  const outputAmount = useMemo(() => {
    if (!amounts || !Array.isArray(amounts) || amounts.length < 2) {
      return "0";
    }

    try {
      const outputAmountWei = amounts[1] as bigint;
      return formatUnits(outputAmountWei, outputToken.decimals);
    } catch (err) {
      console.error("格式化输出金额失败:", err);
      return "0";
    }
  }, [amounts, outputToken]);

  // 手动刷新
  const refresh = useCallback(() => {
    setError(null);
    refetch();
  }, [refetch]);

  // 处理错误
  useEffect(() => {
    if (contractError) {
      const errorMessage = contractError.message || "获取价格失败";
      setError(errorMessage);
    } else {
      setError(null);
    }
  }, [contractError]);

  // 验证输入参数
  useEffect(() => {
    if (!inputToken || !outputToken) {
      setError("代币信息不完整");
      return;
    }

    if (!routerAddress || !wethConfig.address) {
      setError("合约地址配置错误");
      return;
    }

    if (
      inputToken.address === outputToken.address &&
      !inputToken.isNative &&
      !outputToken.isNative
    ) {
      setError("不能计算相同代币之间的兑换");
      return;
    }

    if (inputAmount && parseFloat(inputAmount) < 0) {
      setError("输入金额不能为负数");
      return;
    }

    setError(null);
  }, [inputToken, outputToken, routerAddress, wethConfig.address, inputAmount]);

  return {
    outputAmount,
    isLoading,
    error,
    refresh,
  };
}

/**
 * 批量计算多个代币对的兑换数量
 */
export function useBatchCalculateAmount(
  pairs: Array<{
    inputToken: CalculateToken;
    outputToken: CalculateToken;
    inputAmount: string;
  }>,
) {
  const results = pairs.map((pair) =>
    useCalculateAmount({
      ...pair,
    })
  );

  const isLoading = results.some((result) => result.isLoading);
  const errors = results
    .map((result) => result.error)
    .filter(Boolean) as string[];

  const refreshAll = useCallback(() => {
    results.forEach((result) => result.refresh());
  }, [results]);

  return {
    results,
    isLoading,
    errors,
    refreshAll,
  };
}

/**
 * 计算代币价格比例
 */
export function useTokenPriceRatio(
  tokenA: CalculateToken,
  tokenB: CalculateToken,
) {
  const { outputAmount, isLoading, error } = useCalculateAmount({
    inputToken: tokenA,
    outputToken: tokenB,
    inputAmount: "1", // 使用1个代币作为基准
  });

  return {
    ratio: outputAmount,
    isLoading,
    error,
  };
}

/**
 * 双向计算代币数量
 * 支持输入 tokenA 计算 tokenB，或输入 tokenB 计算 tokenA
 */
export function useBidirectionalCalculateAmount({
  tokenA,
  tokenB,
  amountA,
  amountB,
  activeInput,
}: BidirectionalCalculateParams): BidirectionalCalculateResult {
  const [error, setError] = useState<string | null>(null);

  // 根据活跃输入字段决定使用哪个计算结果
  const isCalculatingA = activeInput === 'A' && amountA && parseFloat(amountA) > 0;
  const isCalculatingB = activeInput === 'B' && amountB && parseFloat(amountB) > 0;

  // 计算 A -> B
  const calculateAToB = useCalculateAmount({
    inputToken: tokenA,
    outputToken: tokenB,
    inputAmount: amountA,
  });

  // 计算 B -> A
  const calculateBToA = useCalculateAmount({
    inputToken: tokenB,
    outputToken: tokenA,
    inputAmount: amountB,
  });

  // 确定当前使用的计算结果
  const currentCalculation = isCalculatingA ? calculateAToB : calculateBToA;
  const otherCalculation = isCalculatingA ? calculateBToA : calculateAToB;

  // 计算最终结果
  const calculatedAmountA = useMemo(() => {
    if (isCalculatingB && currentCalculation.outputAmount) {
      return currentCalculation.outputAmount;
    }
    return amountA;
  }, [isCalculatingB, currentCalculation.outputAmount, amountA]);

  const calculatedAmountB = useMemo(() => {
    if (isCalculatingA && currentCalculation.outputAmount) {
      return currentCalculation.outputAmount;
    }
    return amountB;
  }, [isCalculatingA, currentCalculation.outputAmount, amountB]);

  // 合并加载状态
  const isLoading = currentCalculation.isLoading || otherCalculation.isLoading;

  // 合并错误状态
  const combinedError = useMemo(() => {
    if (currentCalculation.error) return currentCalculation.error;
    if (otherCalculation.error) return otherCalculation.error;
    return error;
  }, [currentCalculation.error, otherCalculation.error, error]);

  // 刷新函数
  const refresh = useCallback(() => {
    setError(null);
    calculateAToB.refresh();
    calculateBToA.refresh();
  }, [calculateAToB.refresh, calculateBToA.refresh]);

  // 验证输入参数
  useEffect(() => {
    if (!tokenA || !tokenB) {
      setError("代币信息不完整");
      return;
    }

    if (tokenA.address === tokenB.address && !tokenA.isNative && !tokenB.isNative) {
      setError("不能计算相同代币之间的兑换");
      return;
    }

    if ((amountA && parseFloat(amountA) < 0) || (amountB && parseFloat(amountB) < 0)) {
      setError("输入金额不能为负数");
      return;
    }

    setError(null);
  }, [tokenA, tokenB, amountA, amountB]);

  return {
    calculatedAmountA,
    calculatedAmountB,
    isLoading,
    error: combinedError,
    refresh,
  };
}
