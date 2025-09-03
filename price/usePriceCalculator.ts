import { useReadContract, useReadContracts } from 'wagmi';
import { Address, formatUnits, parseUnits } from 'viem';

// Sepolia网络地址配置
const SEPOLIA_ADDRESSES = {
  // V2版本地址
  WETH9: '0x75B2245a13c46677Ff66B140b6dA1751Ed96d9d6' as Address,
  KEKE: '0xEc724C6EAB8f5a1212DEE12c792139fc8f57D858' as Address,
  WETH9_KEKE_PAIR: '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2' as Address, // V2 Pair
  LP_TOKEN: '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2' as Address, // 使用V2 Pair作为LP Token
  
  // V4版本地址
  KEKE_WETH_V4: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4' as Address, // V4 Position Manager
  WETH: '0xb16F35c0Ae2912430DAc15764477E179D9B9EbEa' as Address,
  
  // 价格预言机
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as Address,
};

// Chainlink价格预言机ABI
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Uniswap V2 Pair ABI
const UNISWAP_V2_PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Uniswap V4 Position Manager ABI
const UNISWAP_V4_POSITION_MANAGER_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export interface PriceData {
  ethPrice: number;
  kekePrice: number;
  lpTokenValue: number;
  lpTokenType: 'V2' | 'V4';
  lpTokenName: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * 获取ETH/USD价格
 */
export function useETHPrice() {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
  });
}

/**
 * 获取KEKE代币信息
 */
export function useKEKETokenInfo() {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.KEKE,
    abi: ERC20_ABI,
    functionName: 'name',
  });
}

/**
 * 获取V2 Pair信息
 */
export function useV2PairInfo() {
  return useReadContracts({
    contracts: [
      {
        address: SEPOLIA_ADDRESSES.WETH9_KEKE_PAIR,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'getReserves',
      },
      {
        address: SEPOLIA_ADDRESSES.WETH9_KEKE_PAIR,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'token0',
      },
      {
        address: SEPOLIA_ADDRESSES.WETH9_KEKE_PAIR,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'token1',
      }
    ]
  });
}

/**
 * 获取V4 Position Manager信息
 */
export function useV4PositionManagerInfo() {
  return useReadContracts({
    contracts: [
      {
        address: SEPOLIA_ADDRESSES.LP_TOKEN,
        abi: UNISWAP_V4_POSITION_MANAGER_ABI,
        functionName: 'name',
      },
      {
        address: SEPOLIA_ADDRESSES.LP_TOKEN,
        abi: UNISWAP_V4_POSITION_MANAGER_ABI,
        functionName: 'symbol',
      }
    ]
  });
}

/**
 * 格式化价格显示
 */
export function formatPrice(price: number, decimals: number = 6): string {
  return price.toFixed(decimals);
}

/**
 * 格式化代币数量
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

/**
 * 计算V2 Pair中的KEKE价格
 */
export function calculateV2KEKEPrice(
  reserves: [bigint, bigint, number],
  token0: Address,
  token1: Address,
  ethPrice: number
): number {
  const [reserve0, reserve1] = reserves;
  
  // 确定哪个是KEKE，哪个是WETH
  const isToken0KEKE = token0.toLowerCase() === SEPOLIA_ADDRESSES.KEKE.toLowerCase();
  const kekeReserve = isToken0KEKE ? reserve0 : reserve1;
  const wethReserve = isToken0KEKE ? reserve1 : reserve0;
  
  if (kekeReserve === BigInt(0) || wethReserve === BigInt(0)) return 0;
  
  // KEKE价格 = (WETH储备量 / KEKE储备量) * ETH价格
  const kekePerWeth = Number(formatUnits(kekeReserve, 18)) / Number(formatUnits(wethReserve, 18));
  return ethPrice / kekePerWeth;
}

/**
 * 计算V2 LP代币价值
 */
export function calculateV2LPValue(
  reserves: [bigint, bigint, number],
  token0: Address,
  token1: Address,
  ethPrice: number,
  kekePrice: number
): number {
  const [reserve0, reserve1] = reserves;
  
  const isToken0KEKE = token0.toLowerCase() === SEPOLIA_ADDRESSES.KEKE.toLowerCase();
  const kekeReserve = isToken0KEKE ? reserve0 : reserve1;
  const wethReserve = isToken0KEKE ? reserve1 : reserve0;
  
  // 计算池子总价值（KEKE价值 + WETH价值）
  const kekeValue = Number(formatUnits(kekeReserve, 18)) * kekePrice;
  const wethValue = Number(formatUnits(wethReserve, 18)) * ethPrice;
  
  return kekeValue + wethValue;
}

/**
 * 主要的价格计算Hook
 */
export function usePriceCalculator(): {
  data: PriceData | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: ethPriceData, isLoading: ethLoading, error: ethError } = useETHPrice();
  const { data: v2PairData, isLoading: v2Loading, error: v2Error } = useV2PairInfo();
  const { data: v4ManagerData, isLoading: v4Loading, error: v4Error } = useV4PositionManagerInfo();
  
  const isLoading = ethLoading || v2Loading || v4Loading;
  const error = ethError || v2Error || v4Error;
  
  if (isLoading || error || !ethPriceData || !v2PairData || !v4ManagerData) {
    return {
      data: null,
      isLoading,
      error: error as Error | null
    };
  }
  
  // 解析ETH价格
  const ethPrice = Number(formatUnits(BigInt(ethPriceData[1]), 8));
  
  // 解析V2 Pair数据
  const [reserves, token0, token1] = v2PairData.map(result => result.result);
  
  if (!reserves || !token0 || !token1) {
    return {
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch V2 pair data')
    };
  }
  
  // 计算KEKE价格（基于V2 Pair）
  const kekePrice = calculateV2KEKEPrice(
    reserves as [bigint, bigint, number],
    token0 as Address,
    token1 as Address,
    ethPrice
  );
  
  // 计算V2 LP代币价值
  const v2LPValue = calculateV2LPValue(
    reserves as [bigint, bigint, number],
    token0 as Address,
    token1 as Address,
    ethPrice,
    kekePrice
  );
  
  // 解析V4 Position Manager数据
  const [v4Name, v4Symbol] = v4ManagerData.map(result => result.result);
  
  // 对于V4，我们使用相同的KEKE价格，但LP代币价值可能不同
  // 这里简化处理，实际应用中需要更复杂的V4价格计算
  const v4LPValue = v2LPValue; // 简化处理
  
  return {
    data: {
      ethPrice,
      kekePrice,
      lpTokenValue: v4LPValue, // 默认返回V4价值
      lpTokenType: 'V4',
      lpTokenName: 'KEKE-ETH' // 前端显示名称
    },
    isLoading: false,
    error: null
  };
}

/**
 * 获取特定版本的LP代币价格
 */
export function useLPTokenPrice(version: 'V2' | 'V4' = 'V4') {
  const { data, isLoading, error } = usePriceCalculator();
  
  if (!data) {
    return { data: null, isLoading, error };
  }
  
  return {
    data: {
      ...data,
      lpTokenType: version,
      lpTokenName: version === 'V4' ? 'KEKE-ETH' : 'WETH9-KEKE'
    },
    isLoading,
    error
  };
}

/**
 * 导出地址常量供外部使用
 */
export { SEPOLIA_ADDRESSES };