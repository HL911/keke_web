import { useMemo } from 'react'
import { Address, formatEther } from 'viem'
import { useLPTokenPrices, useTokenPriceFromLP, useChainlinkPrice } from './useLPPriceCalculator'

export interface APRCalculationParams {
  kekePerBlock: bigint
  allocPoint: bigint
  totalAllocPoint: bigint
  totalStaked: bigint
  lpTokenAddress?: Address
  kekeTokenAddress?: Address
}

export interface APRResult {
  apr: number
  yearlyRewardValue: number
  stakedValue: number
  kekePrice: number
  lpTokenValue: number
  isLoading: boolean
  error: string | null
}

/**
 * 计算农场池子的APR（年化收益率）
 * @param params APR计算参数
 * @returns APR计算结果
 */
export function useAPRCalculator(params: APRCalculationParams): APRResult {
  const {
    kekePerBlock,
    allocPoint,
    totalAllocPoint,
    totalStaked,
    lpTokenAddress,
    kekeTokenAddress
  } = params

  // 获取LP代币价格信息（如果是LP代币池）
  const lpPriceData = useLPTokenPrices(lpTokenAddress || '0x0' as Address)
  const isLPToken = !!lpTokenAddress && lpTokenAddress !== '0x0'

  // 获取KEKE代币价格（如果提供了LP地址且KEKE在其中）
  const kekeFromLP = useTokenPriceFromLP(
    lpTokenAddress || '0x0' as Address,
    kekeTokenAddress || '0x0' as Address
  )

  // 获取ETH价格作为备用
  const { ethPrice, isLoading: isEthLoading, error: ethError } = useChainlinkPrice()

  const result = useMemo(() => {
    if (!totalStaked || totalStaked === BigInt(0)) {
      return {
        apr: 0,
        yearlyRewardValue: 0,
        stakedValue: 0,
        kekePrice: 0,
        lpTokenValue: 0,
        isLoading: false,
        error: null
      }
    }

    // 每天大约产生6400个区块（假设15秒一个区块）
    const blocksPerDay = BigInt(6400)
    const blocksPerYear = blocksPerDay * BigInt(365)

    // 计算该池子每年的KEKE奖励
    const poolKekePerYear = (kekePerBlock * allocPoint * blocksPerYear) / totalAllocPoint

    // 确定KEKE价格
    let kekePrice = 1 // 默认价格
    if (kekeFromLP.tokenPrice > 0 && !kekeFromLP.isLoading && !kekeFromLP.error) {
      kekePrice = kekeFromLP.tokenPrice
    }

    // 确定LP代币或质押代币的价值
    let lpTokenValue = 1 // 默认价值
    if (isLPToken && lpPriceData.totalValueLocked > 0 && !lpPriceData.isLoading && !lpPriceData.error) {
      // 对于LP代币，计算每个LP代币的价值
      // 这里需要获取LP代币的总供应量来计算单个LP代币的价值
      // 暂时使用简化计算
      lpTokenValue = lpPriceData.totalValueLocked / Number(formatEther(totalStaked))
    } else if (kekeTokenAddress && kekePrice > 1) {
      // 如果质押的是KEKE代币本身
      lpTokenValue = kekePrice
    }

    const yearlyRewardValue = Number(formatEther(poolKekePerYear)) * kekePrice
    const stakedValue = Number(formatEther(totalStaked)) * lpTokenValue

    const apr = stakedValue > 0 ? (yearlyRewardValue / stakedValue) * 100 : 0

    const isLoading = (isLPToken && lpPriceData.isLoading) || 
                     (kekeTokenAddress && kekeFromLP.isLoading) || 
                     isEthLoading

    const error = lpPriceData.error || kekeFromLP.error || ethError

    return {
      apr,
      yearlyRewardValue,
      stakedValue,
      kekePrice,
      lpTokenValue,
      isLoading,
      error
    }
  }, [
    kekePerBlock,
    allocPoint,
    totalAllocPoint,
    totalStaked,
    lpPriceData,
    kekeFromLP,
    ethPrice,
    isEthLoading,
    ethError,
    isLPToken,
    kekeTokenAddress
  ])

  return result
}

/**
 * 简化版APR计算hook，用于快速计算
 * @param kekePerBlock 每区块KEKE奖励
 * @param allocPoint 池子分配点数
 * @param totalAllocPoint 总分配点数
 * @param totalStaked 总质押量
 * @returns 简化的APR结果
 */
export function useSimpleAPR(
  kekePerBlock: bigint,
  allocPoint: bigint,
  totalAllocPoint: bigint,
  totalStaked: bigint
): number {
  return useMemo(() => {
    if (!totalStaked || totalStaked === BigInt(0)) return 0

    const blocksPerDay = BigInt(6400)
    const blocksPerYear = blocksPerDay * BigInt(365)
    const poolKekePerYear = (kekePerBlock * allocPoint * blocksPerYear) / totalAllocPoint
    
    // 使用默认价格进行简单计算
    const yearlyRewardValue = Number(formatEther(poolKekePerYear))
    const stakedValue = Number(formatEther(totalStaked))
    
    return stakedValue > 0 ? (yearlyRewardValue / stakedValue) * 100 : 0
  }, [kekePerBlock, allocPoint, totalAllocPoint, totalStaked])
}

/**
 * 格式化APR显示
 * @param apr APR值
 * @returns 格式化的APR字符串
 */
export function formatAPR(apr: number): string {
  if (apr === 0) return '0%'
  if (apr < 0.01) return '<0.01%'
  if (apr < 1) return `${apr.toFixed(2)}%`
  if (apr < 100) return `${apr.toFixed(1)}%`
  if (apr < 1000) return `${Math.round(apr)}%`
  return `${(apr / 1000).toFixed(1)}K%`
}

/**
 * 格式化奖励价值显示
 * @param value 奖励价值
 * @returns 格式化的价值字符串
 */
export function formatRewardValue(value: number): string {
  if (value === 0) return '$0'
  if (value < 1) return `$${value.toFixed(4)}`
  if (value < 1000) return `$${value.toFixed(2)}`
  if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`
  return `$${(value / 1000000).toFixed(2)}M`
}