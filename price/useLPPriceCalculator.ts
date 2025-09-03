import { useReadContract, useReadContracts } from 'wagmi'
import { Address, formatUnits } from 'viem'
import { sepolia } from 'wagmi/chains'

// 常量定义 - Sepolia网络
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address
const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306' as Address

// ABI定义
const ERC20_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }]
  }
] as const

const PAIR_ABI = [
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { type: 'uint112', name: 'reserve0' },
      { type: 'uint112', name: 'reserve1' },
      { type: 'uint32', name: 'blockTimestampLast' }
    ]
  }
] as const

const PRICE_FEED_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }]
  },
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { type: 'uint80', name: 'roundId' },
      { type: 'int256', name: 'answer' },
      { type: 'uint256', name: 'startedAt' },
      { type: 'uint256', name: 'updatedAt' },
      { type: 'uint80', name: 'answeredInRound' }
    ]
  }
] as const

export interface TokenPriceInfo {
  address: Address
  price: number
  symbol?: string
  decimals?: number
}

export interface LPTokenPriceResult {
  token0: TokenPriceInfo
  token1: TokenPriceInfo
  lpAddress: Address
  totalValueLocked: number
  isLoading: boolean
  error: string | null
}

/**
 * 从Chainlink获取ETH/USD价格
 * @param priceFeedAddress Chainlink价格预言机地址
 * @returns ETH价格（美元）
 */
export function useChainlinkPrice(priceFeedAddress: Address = CHAINLINK_ETH_USD) {
  const { data: priceData, isLoading: isPriceLoading, error: priceError } = useReadContracts({
    contracts: [
      {
        address: priceFeedAddress,
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
        chainId: sepolia.id
      },
      {
        address: priceFeedAddress,
        abi: PRICE_FEED_ABI,
        functionName: 'decimals',
        chainId: sepolia.id
      }
    ]
  })

  const ethPrice = priceData && priceData[0]?.result && priceData[1]?.result
    ? Number(priceData[0].result[1]) / (10 ** Number(priceData[1].result))
    : 0

  return {
    ethPrice,
    isLoading: isPriceLoading,
    error: priceError?.message || null
  }
}

/**
 * 获取代币基本信息（小数位数等）
 * @param tokenAddress 代币地址
 * @returns 代币信息
 */
export function useTokenInfo(tokenAddress: Address) {
  const { data: decimals, isLoading, error } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: sepolia.id
  })

  return {
    decimals: decimals || 18,
    isLoading,
    error: error?.message || null
  }
}

/**
 * 核心Hook：通过LP地址获取两个代币的价格
 * @param lpAddress LP代币地址
 * @returns 代币价格信息
 */
export function useLPTokenPrices(lpAddress: Address): LPTokenPriceResult {
  // 获取LP对基本信息
  const { data: lpData, isLoading: isLPLoading, error: lpError } = useReadContracts({
    contracts: [
      {
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: 'token0',
        chainId: sepolia.id
      },
      {
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: 'token1',
        chainId: sepolia.id
      },
      {
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: 'getReserves',
        chainId: sepolia.id
      }
    ]
  })

  const token0Address = lpData?.[0]?.result as Address
  const token1Address = lpData?.[1]?.result as Address
  const reserves = lpData?.[2]?.result as [bigint, bigint, number]

  // 获取代币小数位数
  const { data: tokenDecimals, isLoading: isDecimalsLoading } = useReadContracts({
    contracts: token0Address && token1Address ? [
      {
        address: token0Address,
        abi: ERC20_ABI,
        functionName: 'decimals',
        chainId: sepolia.id
      },
      {
        address: token1Address,
        abi: ERC20_ABI,
        functionName: 'decimals',
        chainId: sepolia.id
      }
    ] : [],
    query: {
      enabled: !!(token0Address && token1Address)
    }
  })

  // 获取ETH价格
  const { ethPrice, isLoading: isEthPriceLoading, error: ethPriceError } = useChainlinkPrice()

  const isLoading = isLPLoading || isDecimalsLoading || isEthPriceLoading
  const error = lpError?.message || ethPriceError

  // 计算代币价格
  const calculateTokenPrices = (): { token0: TokenPriceInfo; token1: TokenPriceInfo; totalValueLocked: number } => {
    if (!token0Address || !token1Address || !reserves || !tokenDecimals || !ethPrice) {
      return {
        token0: { address: '0x0' as Address, price: 0 },
        token1: { address: '0x0' as Address, price: 0 },
        totalValueLocked: 0
      }
    }

    const token0Decimals = Number(tokenDecimals[0]?.result || 18)
    const token1Decimals = Number(tokenDecimals[1]?.result || 18)

    const reserve0 = Number(formatUnits(reserves[0], token0Decimals))
    const reserve1 = Number(formatUnits(reserves[1], token1Decimals))

    let baseTokenPrice: number
    let otherTokenPrice: number
    let token0Price: number
    let token1Price: number

    // 确定哪个是WETH
    if (token0Address.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
      // token0是WETH
      baseTokenPrice = ethPrice
      otherTokenPrice = (reserve0 / reserve1) * ethPrice
      token0Price = baseTokenPrice
      token1Price = otherTokenPrice
    } else if (token1Address.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
      // token1是WETH
      baseTokenPrice = ethPrice
      otherTokenPrice = (reserve1 / reserve0) * ethPrice
      token0Price = otherTokenPrice
      token1Price = baseTokenPrice
    } else {
      // 都不是WETH，无法计算价格
      console.warn('LP对不包含WETH，无法计算价格')
      return {
        token0: { address: token0Address, price: 0, decimals: token0Decimals },
        token1: { address: token1Address, price: 0, decimals: token1Decimals },
        totalValueLocked: 0
      }
    }

    // 计算总锁定价值 (TVL)
    const totalValueLocked = (reserve0 * token0Price) + (reserve1 * token1Price)

    return {
      token0: {
        address: token0Address,
        price: token0Price,
        decimals: token0Decimals
      },
      token1: {
        address: token1Address,
        price: token1Price,
        decimals: token1Decimals
      },
      totalValueLocked
    }
  }

  const result = calculateTokenPrices()

  return {
    ...result,
    lpAddress,
    isLoading,
    error
  }
}

/**
 * 获取特定代币在LP中的价格
 * @param lpAddress LP地址
 * @param targetTokenAddress 目标代币地址
 * @returns 代币价格信息
 */
export function useTokenPriceFromLP(lpAddress: Address, targetTokenAddress: Address) {
  const { token0, token1, isLoading, error } = useLPTokenPrices(lpAddress)

  const targetToken = token0.address.toLowerCase() === targetTokenAddress.toLowerCase()
    ? token0
    : token1.address.toLowerCase() === targetTokenAddress.toLowerCase()
    ? token1
    : null

  return {
    tokenPrice: targetToken?.price || 0,
    tokenInfo: targetToken,
    isLoading,
    error: error || (targetToken ? null : 'Token not found in LP pair')
  }
}

/**
 * 格式化价格显示
 * @param price 价格
 * @param decimals 小数位数
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number, decimals: number = 6): string {
  if (price === 0) return '$0.00'
  if (price < 0.000001) return '<$0.000001'
  if (price < 1) return `$${price.toFixed(decimals)}`
  if (price < 1000) return `$${price.toFixed(2)}`
  if (price < 1000000) return `$${(price / 1000).toFixed(2)}K`
  return `$${(price / 1000000).toFixed(2)}M`
}

/**
 * 格式化TVL显示
 * @param tvl 总锁定价值
 * @returns 格式化后的TVL字符串
 */
export function formatTVL(tvl: number): string {
  if (tvl === 0) return '$0'
  if (tvl < 1000) return `$${tvl.toFixed(2)}`
  if (tvl < 1000000) return `$${(tvl / 1000).toFixed(2)}K`
  if (tvl < 1000000000) return `$${(tvl / 1000000).toFixed(2)}M`
  return `$${(tvl / 1000000000).toFixed(2)}B`
}