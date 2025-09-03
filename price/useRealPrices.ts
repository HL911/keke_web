'use client'

import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'

// Sepolia网络合约地址
const SEPOLIA_ADDRESSES = {
  KEKE_WETH_V4: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4' as `0x${string}`, // V4 Position Manager
  KEKE_TOKEN: '0xEc724C6EAB8f5a1212DEE12c792139fc8f57D858' as `0x${string}`,
  WETH: '0xb16F35c0Ae2912430DAc15764477E179D9B9EbEa' as `0x${string}`,
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as `0x${string}`,
  LP_TOKEN: '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2' as `0x${string}` // V2 Pair作为LP Token
}

// Chainlink Price Feed ABI
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
] as const

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
] as const

// Uniswap V4 Position Manager ABI
const POSITION_MANAGER_ABI = [
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
] as const

interface TokenInfo {
  name: string
  symbol: string
  decimals: number
}

interface PriceData {
  ethPrice: number
  kekePrice: number
  lpTokenValue: number
  isLoading: boolean
  error: string | null
}

/**
 * 获取Chainlink ETH/USD价格
 * @returns ETH价格数据和加载状态
 */
export function useChainlinkETHPrice() {
  const { data, isLoading, error } = useReadContract({
    address: SEPOLIA_ADDRESSES.CHAINLINK_ETH_USD,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData'
  })

  const ethPrice = useMemo(() => {
    if (!data || !data[1]) return 0
    // Chainlink ETH/USD 有8位小数
    return Number(formatUnits(data[1], 8))
  }, [data])

  return {
    ethPrice,
    isLoading,
    error: error?.message || null
  }
}

/**
 * 获取KEKE代币信息
 * @returns KEKE代币信息
 */
export function useKEKETokenInfo() {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: SEPOLIA_ADDRESSES.KEKE_TOKEN,
        abi: ERC20_ABI,
        functionName: 'name'
      },
      {
        address: SEPOLIA_ADDRESSES.KEKE_TOKEN,
        abi: ERC20_ABI,
        functionName: 'symbol'
      },
      {
        address: SEPOLIA_ADDRESSES.KEKE_TOKEN,
        abi: ERC20_ABI,
        functionName: 'decimals'
      }
    ]
  })

  const tokenInfo = useMemo((): TokenInfo | null => {
    if (!data || data.some(result => result.status === 'failure')) return null
    
    return {
      name: data[0].result as string,
      symbol: data[1].result as string,
      decimals: data[2].result as number
    }
  }, [data])

  return {
    tokenInfo,
    isLoading,
    error: error?.message || null
  }
}

/**
 * 获取LP代币信息（Uniswap V4 Position Manager）
 * @returns LP代币信息
 */
export function useLPTokenInfo() {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: SEPOLIA_ADDRESSES.LP_TOKEN,
        abi: POSITION_MANAGER_ABI,
        functionName: 'name'
      },
      {
        address: SEPOLIA_ADDRESSES.LP_TOKEN,
        abi: POSITION_MANAGER_ABI,
        functionName: 'symbol'
      }
    ]
  })

  const tokenInfo = useMemo(() => {
    if (!data || data.some(result => result.status === 'failure')) return null
    
    return {
      name: data[0].result as string,
      symbol: data[1].result as string
    }
  }, [data])

  return {
    tokenInfo,
    isLoading,
    error: error?.message || null
  }
}

/**
 * 计算KEKE代币价格（基于ETH价格）
 * @param ethPrice ETH价格（美元）
 * @returns KEKE价格（美元）
 */
function calculateKEKEPrice(ethPrice: number): number {
  // 这里需要根据实际的流动性池来计算价格
  // 目前使用模拟价格：1 KEKE = 0.001 ETH
  return ethPrice * 0.001
}

/**
 * 计算LP代币价值（基于ETH价格）
 * @param ethPrice ETH价格（美元）
 * @returns LP代币价值（美元）
 */
function calculateLPTokenValue(ethPrice: number): number {
  // 这里需要根据实际的流动性池来计算价值
  // 目前使用模拟价值：1 LP = 0.01 ETH
  return ethPrice * 0.01
}

/**
 * 获取真实的KEKE和LP代币价格
 * @returns 包含ETH、KEKE和LP代币价格的完整数据
 */
export function useRealPrices(): PriceData {
  const { ethPrice, isLoading: ethLoading, error: ethError } = useChainlinkETHPrice()
  const { tokenInfo: kekeInfo, isLoading: kekeLoading, error: kekeError } = useKEKETokenInfo()
  const { tokenInfo: lpInfo, isLoading: lpLoading, error: lpError } = useLPTokenInfo()

  const prices = useMemo(() => {
    if (!ethPrice || ethPrice === 0) {
      return {
        ethPrice: 0,
        kekePrice: 1, // 默认价格作为fallback
        lpTokenValue: 1 // 默认价格作为fallback
      }
    }

    return {
      ethPrice,
      kekePrice: calculateKEKEPrice(ethPrice),
      lpTokenValue: calculateLPTokenValue(ethPrice)
    }
  }, [ethPrice])

  const isLoading = ethLoading || kekeLoading || lpLoading
  const error = ethError || kekeError || lpError

  return {
    ...prices,
    isLoading,
    error
  }
}

/**
 * 格式化价格显示
 * @param price 价格值
 * @param decimals 显示小数位数
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number, decimals: number = 6): string {
  return price.toFixed(decimals)
}

/**
 * 格式化美元价格显示
 * @param price 价格值
 * @param decimals 显示小数位数
 * @returns 格式化后的美元价格字符串
 */
export function formatUSDPrice(price: number, decimals: number = 2): string {
  return `$${price.toFixed(decimals)}`
}

// 导出地址常量供其他模块使用
export { SEPOLIA_ADDRESSES }