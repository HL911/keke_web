import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { formatUnits, parseAbi, Address } from 'viem'
import { sepolia } from 'viem/chains'

// Uniswap V4 合约地址 (Sepolia)
const POSITION_MANAGER_ADDRESS = '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4' as const
const POOL_MANAGER_ADDRESS = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as const
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as const
const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306' as const

// ABI 定义
const POSITION_MANAGER_ABI = parseAbi([
  'function poolManager() external view returns (address)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)'
])

const POOL_MANAGER_ABI = parseAbi([
  'function getLiquidity(bytes32 poolId) external view returns (uint128)',
  'function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)'
])

const ERC20_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
])

const CHAINLINK_ABI = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
])

// 类型定义
export interface UniswapV4PositionInfo {
  tokenId: bigint
  owner: Address
  tokenURI?: string
}

export interface UniswapV4PoolInfo {
  poolId: string
  sqrtPriceX96?: bigint
  tick?: number
  liquidity?: bigint
  protocolFee?: number
  lpFee?: number
}

export interface TokenInfo {
  address: Address
  name: string
  symbol: string
  decimals: number
  balance?: bigint
}

/**
 * 获取 Chainlink ETH/USD 价格
 * @returns ETH价格 (USD)
 */
export function useChainlinkETHPrice() {
  const { data: priceData } = useReadContract({
    address: CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData'
  })

  return useMemo(() => {
    if (!priceData) return null
    
    const [, answer] = priceData
    // Chainlink ETH/USD 价格有8位小数
    return parseFloat(formatUnits(answer, 8))
  }, [priceData])
}

/**
 * 获取代币信息
 * @param tokenAddress 代币地址
 * @param userAddress 用户地址（可选，用于获取余额）
 * @returns 代币信息
 */
export function useTokenInfo(tokenAddress: Address, userAddress?: Address): TokenInfo | null {
  const contracts = useMemo(() => {
    const baseContracts = [
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name' as const
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol' as const
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals' as const
      }
    ]

    if (userAddress) {
      baseContracts.push({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf' as const,
        args: [userAddress]
      } as any)
    }

    return baseContracts
  }, [tokenAddress, userAddress])

  const { data: results } = useReadContracts({
    contracts
  })

  return useMemo(() => {
    if (!results || results.some(r => r.status === 'failure')) return null

    const [nameResult, symbolResult, decimalsResult, balanceResult] = results

    return {
      address: tokenAddress,
      name: nameResult.result as string,
      symbol: symbolResult.result as string,
      decimals: decimalsResult.result as number,
      balance: balanceResult?.result as bigint | undefined
    }
  }, [results, tokenAddress])
}

/**
 * 获取 Uniswap V4 PositionManager 基本信息
 * @returns PositionManager 信息
 */
export function useUniswapV4PositionManager() {
  const { data: name } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'name'
  })

  const { data: symbol } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'symbol'
  })

  const { data: poolManager } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'poolManager'
  })

  return useMemo(() => ({
    address: POSITION_MANAGER_ADDRESS,
    name,
    symbol,
    poolManager
  }), [name, symbol, poolManager])
}

/**
 * 获取用户在 PositionManager 中的 NFT 余额
 * @param userAddress 用户地址
 * @returns NFT 余额
 */
export function useUserPositionBalance(userAddress?: Address) {
  const { data: balance } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined
  })

  return balance
}

/**
 * 获取特定 NFT 的所有者
 * @param tokenId NFT Token ID
 * @returns 所有者地址
 */
export function usePositionOwner(tokenId: bigint) {
  const { data: owner } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'ownerOf',
    args: [tokenId]
  })

  return owner
}

/**
 * 获取特定 NFT 的 URI
 * @param tokenId NFT Token ID
 * @returns Token URI
 */
export function usePositionTokenURI(tokenId: bigint) {
  const { data: tokenURI } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'tokenURI',
    args: [tokenId]
  })

  return tokenURI
}

/**
 * 获取池子信息
 * @param poolId 池子ID
 * @returns 池子信息
 */
export function usePoolInfo(poolId: string): UniswapV4PoolInfo | null {
  const poolIdBytes = poolId as `0x${string}`

  const { data: slot0Data } = useReadContract({
    address: POOL_MANAGER_ADDRESS,
    abi: POOL_MANAGER_ABI,
    functionName: 'getSlot0',
    args: [poolIdBytes]
  })

  const { data: liquidity } = useReadContract({
    address: POOL_MANAGER_ADDRESS,
    abi: POOL_MANAGER_ABI,
    functionName: 'getLiquidity',
    args: [poolIdBytes]
  })

  return useMemo(() => {
    if (!slot0Data) return null

    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0Data

    return {
      poolId,
      sqrtPriceX96,
      tick,
      liquidity,
      protocolFee,
      lpFee
    }
  }, [poolId, slot0Data, liquidity])
}

/**
 * 格式化价格显示
 * @param price 价格
 * @param decimals 小数位数
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number | null, decimals: number = 6): string {
  if (price === null || price === undefined) return '--'
  
  if (price === 0) return '0'
  
  // 对于非常小的数字，使用科学计数法
  if (price < 0.000001) {
    return price.toExponential(2)
  }
  
  // 对于小数，显示更多位数
  if (price < 1) {
    return price.toFixed(8).replace(/\.?0+$/, '')
  }
  
  // 对于大数，使用千分位分隔符
  if (price >= 1000000) {
    return (price / 1000000).toFixed(2) + 'M'
  }
  
  if (price >= 1000) {
    return (price / 1000).toFixed(2) + 'K'
  }
  
  return price.toFixed(decimals).replace(/\.?0+$/, '')
}

/**
 * 格式化代币数量
 * @param amount 数量 (bigint)
 * @param decimals 代币小数位数
 * @param displayDecimals 显示小数位数
 * @returns 格式化后的数量字符串
 */
export function formatTokenAmount(
  amount: bigint | null | undefined,
  decimals: number,
  displayDecimals: number = 6
): string {
  if (!amount) return '0'
  
  const formatted = formatUnits(amount, decimals)
  const num = parseFloat(formatted)
  
  return formatPrice(num, displayDecimals)
}

/**
 * 计算 sqrtPriceX96 对应的实际价格
 * @param sqrtPriceX96 Uniswap V3/V4 的价格表示
 * @param token0Decimals token0 的小数位数
 * @param token1Decimals token1 的小数位数
 * @returns token1/token0 的价格
 */
export function calculatePriceFromSqrtPriceX96(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): number {
  // sqrtPriceX96 = sqrt(price) * 2^96
  // price = (sqrtPriceX96 / 2^96)^2
  
  const Q96 = BigInt(2) ** BigInt(96)
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
  const price = sqrtPrice * sqrtPrice
  
  // 调整小数位数差异
  const decimalAdjustment = 10 ** (token1Decimals - token0Decimals)
  
  return price * decimalAdjustment
}

// 导出常量
export const UNISWAP_V4_CONSTANTS = {
  POSITION_MANAGER_ADDRESS,
  POOL_MANAGER_ADDRESS,
  WETH_ADDRESS,
  CHAINLINK_ETH_USD
} as const