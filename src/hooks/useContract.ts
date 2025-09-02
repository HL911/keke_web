import { useChainId } from "wagmi";
import { sepolia, foundry } from "viem/chains";
import { useTokenConfig } from "./useTokenConfig";



// 网络合约地址配置
interface NetworkContracts {
  tokenFactoryAddress: string;
  poolAddress: string;
  kekeswapRouterAddress: string;
  kekeswapFactoryAddress: string;
}

// 不同网络的合约地址配置
const NETWORK_CONTRACTS: Record<number, NetworkContracts> = {
  // Foundry 本地网络
  [foundry.id]: {
    tokenFactoryAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    poolAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    kekeswapRouterAddress: "0x0000000000000000000000000000000000000000",
    kekeswapFactoryAddress: "0x0000000000000000000000000000000000000000",
  },
  // Sepolia 测试网络
  [sepolia.id]: {
    tokenFactoryAddress: "0x126DA8A2083B7b16358897aaCcf419A63BBBB24E", // 需要替换为实际部署地址
    poolAddress: "0xf7Eaf5FA85D8dbac581B2594D931558DA969102c", // 需要替换为实际部署地址
    kekeswapRouterAddress: "0x0000000000000000000000000000000000000000", // 需要替换为实际部署地址
    kekeswapFactoryAddress: "0x0000000000000000000000000000000000000000", // 需要替换为实际部署地址
  },
};

/**
 * 根据当前连接的网络返回合约地址的 Hook
 */
export function useContract(): NetworkContracts | null {
  const chainId = useChainId();
  
  if (!chainId || !(chainId in NETWORK_CONTRACTS)) {
    return null;
  }
  
  return NETWORK_CONTRACTS[chainId];
}

/**
 * 获取特定合约地址的 Hook
 */
export function useContractAddress(contractName: keyof NetworkContracts): string | null {
  const contracts = useContract();
  return contracts ? contracts[contractName] : null;
}

/**
 * 获取 TokenFactory 合约地址
 */
export function useTokenFactoryAddress(): string | null {
  return useContractAddress("tokenFactoryAddress");
}

/**
 * 获取 Pool 合约地址
 */
export function usePoolAddress(): string | null {
  return useContractAddress("poolAddress");
}

/**
 * 获取 KekeswapRouter 合约地址
 */
export function useKekeswapRouterAddress(): string | null {
  return useContractAddress("kekeswapRouterAddress");
}

/**
 * 获取 KekeswapFactory 合约地址
 */
export function useKekeswapFactoryAddress(): string | null {
  return useContractAddress("kekeswapFactoryAddress");
}

/**
 * 获取 Token 合约地址 - 从数据库查询
 * @param symbol 代币符号
 */
export function useTokenAddress(symbol?: string): string | null {
  const { tokenConfig } = useTokenConfig(symbol);
  return tokenConfig?.address || null;
}

// 导出类型
export type { NetworkContracts };