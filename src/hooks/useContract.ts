import { useChainId } from "wagmi";
import { sepolia, foundry } from "viem/chains";
import FOUNDRY_ADDRESS from "@/config/address/foundry.json";
import SEPOLIA_ADDRESS from "@/config/address/sepolia.json";
import EARN_ADDRESSES from "../../earn.json";

// 导出类型
export type { NetworkContracts, FarmContracts };

// 网络合约地址配置
interface NetworkContracts {
  tokenFactoryAddress: string;
  poolAddress: string;
  kekeswapRouterAddress: string;
  kekeswapFactoryAddress: string;
}

// 农场合约地址配置
interface FarmContracts {
  WETH9: string;
  KEKE: string;
  WETH9_KEKE_PAIR: string;
  KEKE_WETH_V4: string;
  WETH: string;
  CHAINLINK_ETH_USD: string;
  Master: string;
  SyrupBar: string;
  SmartChef: string;
}

// 不同网络的合约地址配置
const NETWORK_CONTRACTS: Record<number, NetworkContracts> = {
  // Foundry 本地网络
  [foundry.id]: FOUNDRY_ADDRESS,
  // Sepolia 测试网络
  [sepolia.id]: SEPOLIA_ADDRESS,
};

// 农场合约地址配置
const FARM_CONTRACTS: Record<number, FarmContracts> = {
  // Sepolia 测试网络
  [sepolia.id]: EARN_ADDRESSES.sepolia,
  // Foundry 本地网络 - 使用相同的地址进行测试
  [foundry.id]: EARN_ADDRESSES.sepolia,
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

/**
 * 根据当前连接的网络返回农场合约地址的 Hook
 */
export function useFarmContract(): FarmContracts | null {
  const chainId = useChainId();

  if (!chainId || !(chainId in FARM_CONTRACTS)) {
    return null;
  }

  return FARM_CONTRACTS[chainId];
}

/**
 * 获取特定农场合约地址的 Hook
 */
export function useFarmContractAddress(
  contractName: keyof FarmContracts
): string | null {
  const contracts = useFarmContract();
  return contracts ? contracts[contractName] : null;
}

/**
 * 获取 Master 合约地址
 */
export function useMasterAddress(): string | null {
  return useFarmContractAddress("Master");
}

/**
 * 获取 SmartChef 合约地址
 */
export function useSmartChefAddress(): string | null {
  return useFarmContractAddress("SmartChef");
}

/**
 * 获取 KEKE 代币地址
 */
export function useKekeTokenAddress(): string | null {
  return useFarmContractAddress("KEKE");
}

/**
 * 获取 SyrupBar 合约地址
 */
export function useSyrupBarAddress(): string | null {
  return useFarmContractAddress("SyrupBar");
}

/**
 * 获取 KEKE_WETH_V4 LP代币地址
 */
export function useKekeWethV4Address(): string | null {
  return useFarmContractAddress("KEKE_WETH_V4");
}

/**
 * 获取 WETH 代币地址
 */
export function useWethAddress(): string | null {
  return useFarmContractAddress("WETH");
}

/**
 * 获取 Chainlink ETH/USD 价格预言机地址
 */
export function useChainlinkETHUSDAddress(): string | null {
  return useFarmContractAddress("CHAINLINK_ETH_USD");
}
