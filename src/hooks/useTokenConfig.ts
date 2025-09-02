import { useState, useEffect } from "react";
import { Token } from "../app/api/utils/sqlite-db";

interface TokenConfigHook {
  tokenConfig: Token | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 获取单个代币配置的 Hook
 */
export function useTokenConfig(symbol?: string): TokenConfigHook {
  const [tokenConfig, setTokenConfig] = useState<Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenConfig = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts?symbol=${symbol}`);
      const result = await response.json();

      if (result.success) {
        setTokenConfig(result.data);
      } else {
        setError(result.error || "获取代币配置失败");
      }
    } catch (err) {
      setError("网络请求失败");
      console.error("获取代币配置失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenConfig();
  }, [symbol]);

  return {
    tokenConfig,
    loading,
    error,
    refetch: fetchTokenConfig,
  };
}

interface AllTokenConfigsHook {
  tokenConfigs: Record<string, Token>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 获取所有代币配置的 Hook
 */
export function useAllTokenConfigs(): AllTokenConfigsHook {
  const [tokenConfigs, setTokenConfigs] = useState<Record<string, Token>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTokenConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contracts");
      const result = await response.json();

      if (result.success) {
        setTokenConfigs(result.data);
      } else {
        setError(result.error || "获取代币配置失败");
      }
    } catch (err) {
      setError("网络请求失败");
      console.error("获取所有代币配置失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTokenConfigs();
  }, []);

  return {
    tokenConfigs,
    loading,
    error,
    refetch: fetchAllTokenConfigs,
  };
}

/**
 * 生成合约配置对象
 */
export function createContractConfig(token: Token, abi: any, chain: any) {
  return {
    address: token.address as `0x${string}`,
    abi,
    chain,
  };
}
