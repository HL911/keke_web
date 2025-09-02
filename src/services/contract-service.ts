import {
  getTokenByAddress,
  getAllTokens,
} from "../app/api/utils/token-queries";
import { Token } from "@/app/api/utils/db-core";

// 合约类型定义
export interface ContractConfig {
  address: string;
  abi: any;
  chain: any;
}

// 合约名称映射
export const CONTRACT_SYMBOLS = {
  KEKE: "KEKE",
  WETH: "WETH",
  USDT: "USDT",
  USDC: "USDC",
  WBNB: "WBNB",
  WBTC: "WBTC",
} as const;

// 系统合约地址（这些通常是固定的）
export const SYSTEM_CONTRACTS = {
  KEKESWAP_ROUTER: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  KEKESWAP_FACTORY: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
} as const;

/**
 * 从数据库获取代币配置
 */
export async function getTokenConfig(symbol: string): Promise<Token | null> {
  try {
    const tokens = await getAllTokens();
    return tokens.find((token) => token.symbol === symbol) || null;
  } catch (error) {
    console.error(`获取代币配置失败 (${symbol}):`, error);
    return null;
  }
}

/**
 * 获取所有代币配置
 */
export async function getAllTokenConfigs(): Promise<Record<string, Token>> {
  try {
    const tokens = await getAllTokens();
    const configMap: Record<string, Token> = {};

    tokens.forEach((token) => {
      configMap[token.symbol] = token;
    });

    return configMap;
  } catch (error) {
    console.error("获取所有代币配置失败:", error);
    return {};
  }
}

/**
 * 根据地址获取代币配置
 */
export async function getTokenByAddressConfig(
  address: string
): Promise<Token | null> {
  try {
    return await getTokenByAddress(address);
  } catch (error) {
    console.error(`根据地址获取代币配置失败 (${address}):`, error);
    return null;
  }
}

/**
 * 创建合约配置对象
 */
export function createContractConfig(
  address: string,
  abi: any,
  chain: any
): ContractConfig {
  return {
    address: address as `0x${string}`,
    abi,
    chain,
  };
}

/**
 * 验证地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 获取验证过的代币列表
 */
export async function getVerifiedTokens(): Promise<Token[]> {
  try {
    const tokens = await getAllTokens();
    return tokens.filter((token) => token.is_verified);
  } catch (error) {
    console.error("获取验证代币列表失败:", error);
    return [];
  }
}
