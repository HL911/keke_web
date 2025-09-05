"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useKekeswapFactoryAddress } from "@/hooks/useContract";
import { usePublicClient } from "wagmi";

export interface LiquidityToken {
  address: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
}

export interface LiquidityCalculationParams {
  tokenA: LiquidityToken | null;
  tokenB: LiquidityToken | null;
  amountA: string;
  amountB: string;
  activeInput: "A" | "B";
}

export interface LiquidityCalculationResult {
  calculatedAmountA: string;
  calculatedAmountB: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  // 储备量信息
  reserves: {
    reserve0: string;
    reserve1: string;
    ratio: number; // tokenA/tokenB 的比例
  } | null;
  // 交易对地址
  pairAddress: string | null;
}

// 获取交易对地址
const getPairAddress = async (
  tokenA: string,
  tokenB: string,
  factoryAddress: string,
  publicClient: any
): Promise<string | null> => {
  try {
    if (!publicClient) return null;

    const pairAddress = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: [
        {
          name: "getPair",
          type: "function",
          stateMutability: "view",
          inputs: [
            { name: "tokenA", type: "address" },
            { name: "tokenB", type: "address" },
          ],
          outputs: [{ name: "pair", type: "address" }],
        },
      ],
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

export function useLiquidityCalculation({
  tokenA,
  tokenB,
  amountA,
  amountB,
  activeInput,
}: LiquidityCalculationParams): LiquidityCalculationResult {
  const [error, setError] = useState<string | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [isLoadingPair, setIsLoadingPair] = useState(false);

  const publicClient = usePublicClient();
  const factoryAddress = useKekeswapFactoryAddress();

  // 获取交易对地址
  useEffect(() => {
    const fetchPairAddress = async () => {
      if (!tokenA || !tokenB || !factoryAddress || !publicClient) {
        setPairAddress(null);
        return;
      }

      setIsLoadingPair(true);
      try {
        const address = await getPairAddress(
          tokenA.address,
          tokenB.address,
          factoryAddress,
          publicClient
        );
        setPairAddress(address);
      } catch (err) {
        console.error("获取交易对地址失败:", err);
        setPairAddress(null);
      } finally {
        setIsLoadingPair(false);
      }
    };

    fetchPairAddress();
  }, [tokenA, tokenB, factoryAddress, publicClient]);

  // 获取交易对储备量
  const {
    data: reserves,
    isLoading: isLoadingReserves,
    refetch,
  } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: [
      {
        name: "getReserves",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [
          { name: "reserve0", type: "uint112" },
          { name: "reserve1", type: "uint112" },
          { name: "blockTimestampLast", type: "uint32" },
        ],
      },
    ],
    functionName: "getReserves",
    query: {
      enabled:
        !!pairAddress &&
        pairAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // 计算储备量比例和代币数量
  const calculationResult = useMemo(() => {
    if (
      !tokenA ||
      !tokenB ||
      !reserves ||
      !Array.isArray(reserves) ||
      reserves.length < 2
    ) {
      return {
        calculatedAmountA: amountA,
        calculatedAmountB: amountB,
        reserves: null,
      };
    }

    try {
      const [reserve0, reserve1] = reserves as [bigint, bigint, number];

      // 格式化储备量
      const reserve0Formatted = formatUnits(reserve0, tokenA.decimals);
      const reserve1Formatted = formatUnits(reserve1, tokenB.decimals);

      // 计算比例：tokenA/tokenB = reserve0/reserve1
      const ratio =
        parseFloat(reserve0Formatted) / parseFloat(reserve1Formatted);

      let calculatedAmountA = amountA;
      let calculatedAmountB = amountB;

      // 根据活跃输入和储备量比例计算另一个代币的数量
      if (activeInput === "A" && amountA && parseFloat(amountA) > 0) {
        // 输入A，计算B：B = A / ratio
        calculatedAmountB = (parseFloat(amountA) / ratio).toString();
      } else if (activeInput === "B" && amountB && parseFloat(amountB) > 0) {
        // 输入B，计算A：A = B * ratio
        calculatedAmountA = (parseFloat(amountB) * ratio).toString();
      }

      return {
        calculatedAmountA,
        calculatedAmountB,
        reserves: {
          reserve0: reserve0Formatted,
          reserve1: reserve1Formatted,
          ratio,
        },
      };
    } catch (err) {
      console.error("计算流动性比例失败:", err);
      return {
        calculatedAmountA: amountA,
        calculatedAmountB: amountB,
        reserves: null,
      };
    }
  }, [tokenA, tokenB, reserves, amountA, amountB, activeInput]);

  // 刷新函数
  const refresh = useCallback(() => {
    setError(null);
    refetch();
  }, [refetch]);

  // 错误处理
  useEffect(() => {
    if (!tokenA || !tokenB) {
      setError("代币信息不完整");
      return;
    }

    if (
      tokenA.address === tokenB.address &&
      !tokenA.isNative &&
      !tokenB.isNative
    ) {
      setError("不能计算相同代币之间的流动性");
      return;
    }

    if (
      (amountA && parseFloat(amountA) < 0) ||
      (amountB && parseFloat(amountB) < 0)
    ) {
      setError("输入金额不能为负数");
      return;
    }

    if (!pairAddress && !isLoadingPair) {
      setError("交易对不存在，请先创建交易对");
      return;
    }

    setError(null);
  }, [tokenA, tokenB, amountA, amountB, pairAddress, isLoadingPair]);

  const isLoading = isLoadingPair || isLoadingReserves;

  return {
    calculatedAmountA: calculationResult.calculatedAmountA,
    calculatedAmountB: calculationResult.calculatedAmountB,
    isLoading,
    error,
    refresh,
    reserves: calculationResult.reserves,
    pairAddress,
  };
}
