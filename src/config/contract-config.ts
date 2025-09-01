"use client";

import { sepolia, foundry } from "viem/chains";
import KekeToken_ABI from "../abi/KekeToken.json" with { type: "json" };
import KekeswapRouter_ABI from "../abi/KekeswapRouter.json" with { type: "json" };
import KekeswapFactory_ABI from "../abi/KekeswapFactory.json" with { type: "json" };
import WETH9_ABI from "../abi/WETH9.json" with { type: "json" };
import MockUSDC_ABI from "../abi/MockUSDC.json" with { type: "json" };
import MockUSDT_ABI from "../abi/MockUSDT.json" with { type: "json" };
import MockWBNB_ABI from "../abi/MockWBNB.json" with { type: "json" };
import MockWBTC_ABI from "../abi/MockWBTC.json" with { type: "json" };
import KekeMockERC20_ABI from "../abi/KekeMockERC20.json" with { type: "json" };

import { 
  getTokenConfig, 
  getAllTokenConfigs, 
  createContractConfig,
  CONTRACT_SYMBOLS,
  SYSTEM_CONTRACTS
} from "../services/contract-service";

// ============== 公共参数 ================

// const chain = sepolia;
export const chain = foundry;

// ============== 各个合约相关配置 ================

// 系统合约配置（固定地址）
export const kekeSwapRouterConfig = {
  address: SYSTEM_CONTRACTS.KEKESWAP_ROUTER as `0x${string}`,
  abi: KekeswapRouter_ABI,
  chain,
};

export const kekeSwapFactoryConfig = {
  address: SYSTEM_CONTRACTS.KEKESWAP_FACTORY as `0x${string}`,
  abi: KekeswapFactory_ABI,
  chain,
};

// ============== 动态代币配置 ================

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

/**
 * 获取代币配置
 * @param symbol 代币符号
 */
export async function getTokenContractConfig(symbol: string) {
  const tokenInfo = await getTokenConfig(symbol);
  if (!tokenInfo) {
    throw new Error(`未找到代币配置: ${symbol}`);
  }
  
  const abi = TOKEN_ABIS[symbol as keyof typeof TOKEN_ABIS] || TOKEN_ABIS.ERC20;
  
  return createContractConfig(tokenInfo.address, abi, chain);
}

// 获取 KEKE 代币配置
export async function getKekeTokenConfig() {
  return await getTokenContractConfig(CONTRACT_SYMBOLS.KEKE);
}

// 获取 WETH 配置
export async function getWeth9Config() {
  return await getTokenContractConfig(CONTRACT_SYMBOLS.WETH);
}

// 获取 USDT 配置
export async function getUSDTConfig() {
  return await getTokenContractConfig(CONTRACT_SYMBOLS.USDT);
}

// 获取 USDC 配置
export async function getUSDCConfig() {
  return await getTokenContractConfig(CONTRACT_SYMBOLS.USDC);
}

// 获取 WBNB 配置
export async function getWBNBConfig() {
  return await getTokenContractConfig(CONTRACT_SYMBOLS.WBNB);
}

// 获取 WBTC 配置
export async function getWBTCConfig() {
  return await getTokenContractConfig(CONTRACT_SYMBOLS.WBTC);
}

// 获取所有代币配置
export async function getAllTokenContractConfigs() {
  const tokenConfigs = await getAllTokenConfigs();
  const contractConfigs: Record<string, any> = {};
  
  for (const [symbol, tokenInfo] of Object.entries(tokenConfigs)) {
    const abi = TOKEN_ABIS[symbol as keyof typeof TOKEN_ABIS] || TOKEN_ABIS.ERC20;
    contractConfigs[symbol] = createContractConfig(tokenInfo.address, abi, chain);
  }
  
  return contractConfigs;
}
