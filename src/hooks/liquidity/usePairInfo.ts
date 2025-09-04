import { useState, useEffect } from "react";

export interface PairInfo {
  pair: {
    id: number;
    pairAddress: string;
    token0Address: string;
    token1Address: string;
    totalSupply: string;
    reserve0: string;
    reserve1: string;
    tvlUsd: number;
    volume24h: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  token0: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: string;
    priceUsd: number;
    marketCap: number;
    volume24h: number;
    description: string;
    logoUri: string;
    twitterAddress: string;
    telegramAddress: string;
    websiteAddress: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: string;
    priceUsd: number;
    marketCap: number;
    volume24h: number;
    description: string;
    logoUri: string;
    twitterAddress: string;
    telegramAddress: string;
    websiteAddress: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UsePairInfoResult {
  pairInfo: PairInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 通过pair地址获取交易对和token信息的hook
 */
export function usePairInfo(pairAddress: string): UsePairInfoResult {
  const [pairInfo, setPairInfo] = useState<PairInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPairInfo = async () => {
    if (!pairAddress) {
      setError("Pair地址不能为空");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/liquidity?pairAddress=${encodeURIComponent(pairAddress)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPairInfo(data.data);
      } else {
        throw new Error("获取数据失败");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "获取交易对信息失败";
      setError(errorMessage);
      console.error("Error fetching pair info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairInfo();
  }, [pairAddress]);

  const refetch = () => {
    fetchPairInfo();
  };

  return {
    pairInfo,
    loading,
    error,
    refetch,
  };
}
