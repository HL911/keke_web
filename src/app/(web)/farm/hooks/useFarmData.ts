'use client'

import { useMemo } from 'react'
import { Address, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { 
  usePoolLength, 
  usePoolInfo, 
  useUserInfo, 
  usePendingKeke, 
  useMasterInfo,
  formatKekeAmount
} from '@/hooks/useMaster'
import { useKekeTokenAddress, useWeth9KekePairAddress } from '@/hooks/useContract'
import { useAPRWithRealPrices } from '../../../../../price'
import { useRealPrices } from '../../../../../price/useRealPrices'
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json'

// 矿池配置
export const FARM_POOLS = [
  {
    id: 0,
    name: 'KEKE',
    symbol: 'KEKE',
    isKekePool: true,
    description: 'Stake KEKE to earn KEKE rewards',
    apy: 45.2
  },
  {
    id: 1,
    name: 'KEKE-WETH LP',
    symbol: 'KEKE-WETH',
    isKekePool: false,
    description: 'Stake KEKE-WETH LP tokens to earn KEKE rewards',
    apy: 32.8
  },
  {
    id: 2,
    name: 'KEKE-WETH V4 LP',
    symbol: 'KEKE-WETH-V4',
    isKekePool: false,
    description: 'Stake KEKE-WETH V4 LP tokens to earn KEKE rewards',
    apy: 28.5
  },
  {
    id: 3,
    name: 'KEKE-WETH V2 LP',
    symbol: 'KEKE-WETH-V2',
    isKekePool: false,
    description: 'Stake KEKE-WETH V2 LP tokens to earn KEKE rewards',
    apy: 35.0
  }
]

// 农场数据类型
export interface FarmPoolData {
  id: number
  name: string
  symbol: string
  isKekePool: boolean
  description: string
  lpTokenAddress: string
  allocPoint: string
  totalStaked: string
  userStaked: string
  pendingRewards: string
  apy: number
  tvl: string
  userBalance: string
}

/**
 * 获取单个矿池的详细数据
 */
export function useFarmPoolData(poolId: number) {
  const { address } = useAccount()
  
  // 获取矿池基本信息
  const { data: poolInfo } = usePoolInfo(poolId)
  const { data: userInfo } = useUserInfo(poolId, address)
  const { data: pendingKeke } = usePendingKeke(poolId, address)
  const { data: masterInfo } = useMasterInfo()
  
  // 获取用户LP代币余额
  const lpTokenAddress = poolInfo ? (poolInfo as any)[0] : null
  const { data: userBalance } = useReadContract({
    address: lpTokenAddress as Address,
    abi: KekeMockERC20_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: {
      enabled: !!lpTokenAddress && !!address && lpTokenAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
  
  // 获取LP代币总供应量用于计算TVL
  const { data: totalSupply } = useReadContract({
    address: lpTokenAddress as Address,
    abi: KekeMockERC20_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!lpTokenAddress && lpTokenAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
  
  // 获取价格数据
  const priceData = useRealPrices()
  
  // 计算APR（如果有足够的数据）
  const aprData = useAPRWithRealPrices({
    kekePerBlock: masterInfo ? (masterInfo as any)[0] || BigInt(0) : BigInt(0),
    allocPoint: poolInfo ? (poolInfo as any)[1] || BigInt(0) : BigInt(0),
    totalAllocPoint: masterInfo ? (masterInfo as any)[1] || BigInt(1) : BigInt(1),
    totalStaked: poolInfo ? (poolInfo as any)[3] || BigInt(0) : BigInt(0), // 假设索引3是totalStaked
    lpTokenAddress: lpTokenAddress as Address,
    kekeTokenAddress: undefined // 暂时不传KEKE地址
  })
  
  return useMemo(() => {
    if (!poolInfo) return null
    
    const poolConfig = FARM_POOLS.find(p => p.id === poolId)
    if (!poolConfig) return null
    
    const poolInfoArray = poolInfo as any[]
    const userInfoArray = userInfo as any[]
    
    // 安全地获取数据
    const lpToken = poolInfoArray[0] || '0x0000000000000000000000000000000000000000'
    const allocPoint = poolInfoArray[1] || BigInt(0)
    const totalStakedAmount = poolInfoArray[3] || BigInt(0) // 池子总质押量
    const userStakedAmount = userInfoArray?.[0] || BigInt(0)
    const pendingRewardsAmount = (pendingKeke as bigint) || BigInt(0)
    const userBalanceAmount = (userBalance as bigint) || BigInt(0)
    
    // 计算TVL
    let tvlValue = 0
    if (totalStakedAmount > BigInt(0)) {
      const totalStakedNumber = Number(formatUnits(totalStakedAmount, 18))
      
      if (poolConfig.isKekePool) {
        // KEKE单币池：TVL = 总质押量 * KEKE价格
        const kekePrice = priceData.kekePrice || 4.463351 // 使用真实价格
        tvlValue = totalStakedNumber * kekePrice
      } else {
        // LP代币池：TVL = 总质押量 * LP代币价格
        const lpTokenPrice = priceData.lpTokenValue || 44.633506 // 使用真实价格
        tvlValue = totalStakedNumber * lpTokenPrice
      }
    }
    
    // 使用计算出的APR或回退到配置的APR
    const calculatedAPR = aprData?.apr || poolConfig.apy
    
    return {
      id: poolId,
      name: poolConfig.name,
      symbol: poolConfig.symbol,
      isKekePool: poolConfig.isKekePool,
      description: poolConfig.description,
      lpTokenAddress: lpToken,
      allocPoint: allocPoint.toString(),
      totalStaked: formatKekeAmount(totalStakedAmount),
      userStaked: formatKekeAmount(userStakedAmount),
      pendingRewards: formatKekeAmount(pendingRewardsAmount),
      apy: calculatedAPR,
      tvl: tvlValue.toFixed(2),
      userBalance: formatKekeAmount(userBalanceAmount)
    } as FarmPoolData
  }, [poolInfo, userInfo, pendingKeke, userBalance, poolId, priceData, aprData, totalSupply])
}

/**
 * 获取所有农场池数据
 */
export function useAllFarmData() {
  const { data: poolLength } = usePoolLength()
  
  const pool0Data = useFarmPoolData(0)
  const pool1Data = useFarmPoolData(1)
  const pool2Data = useFarmPoolData(2)
  const pool3Data = useFarmPoolData(3)
  
  return useMemo(() => {
    const pools: FarmPoolData[] = []
    
    if (pool0Data) pools.push(pool0Data)
    if (pool1Data) pools.push(pool1Data)
    if (pool2Data) pools.push(pool2Data)
    if (pool3Data) pools.push(pool3Data)
    
    // 计算总TVL
    const totalTVL = pools.reduce((sum, pool) => {
      return sum + Number(pool.tvl || 0)
    }, 0)
    
    return {
      pools,
      totalPools: Number(poolLength || 0),
      totalTVL
    }
  }, [pool0Data, pool1Data, pool2Data, pool3Data, poolLength])
}

/**
 * 获取用户总体农场数据
 */
export function useUserFarmSummary() {
  const { pools } = useAllFarmData()
  const priceData = useRealPrices()
  
  return useMemo(() => {
    const totalStaked = pools.reduce((sum, pool) => {
      return sum + Number(pool.userStaked || 0)
    }, 0)
    
    const totalPendingRewards = pools.reduce((sum, pool) => {
      return sum + Number(pool.pendingRewards || 0)
    }, 0)
    
    // 计算用户总价值（质押价值 + 待领取奖励价值）
    let totalValue = 0
    if (priceData) {
      // 计算质押价值
      const stakedValue = pools.reduce((sum, pool) => {
        const userStakedAmount = Number(pool.userStaked || 0)
        if (userStakedAmount > 0) {
          if (pool.isKekePool) {
            return sum + userStakedAmount * priceData.kekePrice
          } else {
            return sum + userStakedAmount * priceData.lpTokenValue
          }
        }
        return sum
      }, 0)
      
      // 计算待领取奖励价值（KEKE代币）
      const rewardsValue = totalPendingRewards * priceData.kekePrice
      
      totalValue = stakedValue + rewardsValue
    }
    
    return {
      totalStaked,
      totalPendingRewards,
      totalValue,
      activePools: pools.filter(pool => Number(pool.userStaked || 0) > 0).length
    }
  }, [pools, priceData])
}