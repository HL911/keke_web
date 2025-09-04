import { useState, useEffect } from "react";
import { Token } from "../../app/api/utils/db-core";

import KekeToken_ABI from "../../abi/KekeToken.json" with { type: "json" };
import WETH9_ABI from "../../abi/WETH9.json" with { type: "json" };
import MockUSDC_ABI from "../../abi/MockUSDC.json" with { type: "json" };
import MockUSDT_ABI from "../../abi/MockUSDT.json" with { type: "json" };
import MockWBNB_ABI from "../../abi/MockWBNB.json" with { type: "json" };
import MockWBTC_ABI from "../../abi/MockWBTC.json" with { type: "json" };
import KekeMockERC20_ABI from "../../abi/KekeMockERC20.json" with { type: "json" };
import { useContractAddress } from "../useContract";

// token 合约名称映射
export const CONTRACT_SYMBOLS = {
  KEKE: "KEKE",
  WETH: "WETH",
  USDT: "USDT",
  USDC: "USDC",
  WBNB: "WBNB",
  WBTC: "WBTC",
} as const;

// 代币 ABI 映射
export const TOKEN_ABIS = {
  KEKE: KekeToken_ABI,
  WETH: WETH9_ABI,
  USDT: MockUSDT_ABI,
  USDC: MockUSDC_ABI,
  WBNB: MockWBNB_ABI,
  WBTC: MockWBTC_ABI,
  ERC20: KekeMockERC20_ABI, // 通用 ERC20 ABI
} as const;

interface TokenConfigHook {
  tokenInfo: Token | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 获取代币配置
 * @param symbol 代币符号
 */
export function getTokenContractConfig(symbol: string) {
  const tokenInfo = useTokenConfig(symbol);
  if (!tokenInfo) {
    throw new Error(`未找到代币配置: ${symbol}`);
  }
  
  const abi = TOKEN_ABIS[symbol as keyof typeof TOKEN_ABIS] || TOKEN_ABIS.ERC20;
  
  return createContractConfig(tokenInfo.tokenInfo!, abi);
}

// 获取 KEKE 代币配置
export function getKekeTokenConfig() {
  return getTokenContractConfig(CONTRACT_SYMBOLS.KEKE);
}

// 获取 WETH 配置
export function getWeth9Config() {
  const symbol = CONTRACT_SYMBOLS.WETH;
  const address = useContractAddress("wethAddress");

  const abi = TOKEN_ABIS[symbol as keyof typeof TOKEN_ABIS] || TOKEN_ABIS.ERC20;
  return {
    address: address as `0x${string}`,
    abi,
  };
}

// 获取 USDT 配置
export function getUSDTConfig() {
  return getTokenContractConfig(CONTRACT_SYMBOLS.USDT);
}

// 获取 USDC 配置
export function getUSDCConfig() {
  return getTokenContractConfig(CONTRACT_SYMBOLS.USDC);
}

// 获取 WBNB 配置
export function getWBNBConfig() {
  return getTokenContractConfig(CONTRACT_SYMBOLS.WBNB);
}

// 获取 WBTC 配置
export function getWBTCConfig() {
  return getTokenContractConfig(CONTRACT_SYMBOLS.WBTC);
}

// 获取所有代币配置
export function getAllTokenContractConfigs() {
  const tokenConfigs = useAllTokenConfigs();
  const contractConfigs: Record<string, any> = {};
  
  for (const [symbol, tokenInfo] of Object.entries(tokenConfigs)) {
    const abi = TOKEN_ABIS[symbol as keyof typeof TOKEN_ABIS] || TOKEN_ABIS.ERC20;
    contractConfigs[symbol] = createContractConfig(tokenInfo.tokenInfo!, abi);
  }
  
  return contractConfigs;
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
      const response = await fetch(`/api/tokens?action=get&symbol=${symbol}`);
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
    tokenInfo: tokenConfig,
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
      const response = await fetch("/api/tokens");
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
export function createContractConfig(token: Token, abi: any) {
  return {
    address: token.address as `0x${string}`,
    abi,
  };
}
