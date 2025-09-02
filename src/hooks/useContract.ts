import { useChainId } from "wagmi";
import { sepolia, foundry } from "viem/chains";
import FOUNDRY_ADDRESS from "@/config/address/foundry.json";
import SEPOLIA_ADDRESS from "@/config/address/sepolia.json";

// 导出类型
export type { NetworkContracts };

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
  [foundry.id]: FOUNDRY_ADDRESS,
  // Sepolia 测试网络
  [sepolia.id]: SEPOLIA_ADDRESS,
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
export function useContractAddress(
  contractName: keyof NetworkContracts
): string | null {
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
