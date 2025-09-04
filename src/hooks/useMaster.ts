'use client'

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Address, formatUnits, parseUnits } from 'viem'
import { useMasterAddress } from './useContract'
import MasterABI from '@/abi/Master.json'
import { toast } from 'sonner'
import { useCallback } from 'react'

// 矿池信息类型
export interface PoolInfo {
  lpToken: Address
  allocPoint: bigint
  lastRewardBlock: bigint
  accKekePerShare: bigint
}

// 用户信息类型
export interface UserInfo {
  amount: bigint
  rewardDebt: bigint
}

/**
 * 获取矿池数量
 */
export function usePoolLength() {
  const masterAddress = useMasterAddress()
  
  return useReadContract({
    address: masterAddress as Address,
    abi: MasterABI,
    functionName: 'poolLength',
    query: {
      enabled: !!masterAddress && masterAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
}

/**
 * 获取指定矿池信息
 */
export function usePoolInfo(poolId: number) {
  const masterAddress = useMasterAddress()
  
  return useReadContract({
    address: masterAddress as Address,
    abi: MasterABI,
    functionName: 'poolInfo',
    args: [BigInt(poolId)],
    query: {
      enabled: !!masterAddress && masterAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
}

/**
 * 获取用户在指定矿池的信息
 */
export function useUserInfo(poolId: number, userAddress?: Address) {
  const masterAddress = useMasterAddress()
  const { address } = useAccount()
  const targetAddress = userAddress || address
  
  return useReadContract({
    address: masterAddress as Address,
    abi: MasterABI,
    functionName: 'userInfo',
    args: [BigInt(poolId), targetAddress as Address],
    query: {
      enabled: !!masterAddress && !!targetAddress && masterAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
}

/**
 * 获取用户在指定矿池的待领取奖励
 */
export function usePendingKeke(poolId: number, userAddress?: Address) {
  const masterAddress = useMasterAddress()
  const { address } = useAccount()
  const targetAddress = userAddress || address
  
  return useReadContract({
    address: masterAddress as Address,
    abi: MasterABI,
    functionName: 'getPoolKEKEReward',
    args: [BigInt(poolId), targetAddress as Address],
    query: {
      enabled: !!masterAddress && !!targetAddress && masterAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000 // 每10秒刷新一次
    }
  })
}

/**
 * 获取Master合约基本信息
 */
export function useMasterInfo() {
  const masterAddress = useMasterAddress()
  
  return useReadContracts({
    contracts: [
      {
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'totalAllocPoint'
      },
      {
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'kekePerBlock'
      },
      {
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'startBlock'
      }
    ],
    query: {
      enabled: !!masterAddress && masterAddress !== '0x0000000000000000000000000000000000000000'
    }
  })
}

/**
 * 质押到矿池
 */
export function useDeposit() {
  const masterAddress = useMasterAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = useCallback(async (poolId: number, amount: string, decimals: number = 18) => {
    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    try {
      const amountWei = parseUnits(amount, decimals)
      
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'deposit',
        args: [BigInt(poolId), amountWei]
      })
      
      toast.success('质押交易已提交，请等待确认')
    } catch (err: any) {
      console.error('质押失败:', err)
      toast.error(`质押失败: ${err.message || '未知错误'}`)
    }
  }, [masterAddress, writeContract])

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}

/**
 * 从矿池提取
 */
export function useWithdraw() {
  const masterAddress = useMasterAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const withdraw = useCallback(async (poolId: number, amount: string, decimals: number = 18) => {
    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    try {
      const amountWei = parseUnits(amount, decimals)
      
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'withdraw',
        args: [BigInt(poolId), amountWei]
      })
      
      toast.success('提取交易已提交，请等待确认')
    } catch (err: any) {
      console.error('提取失败:', err)
      toast.error(`提取失败: ${err.message || '未知错误'}`)
    }
  }, [masterAddress, writeContract])

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}

/**
 * KEKE单币质押
 */
export function useEnterStaking() {
  const masterAddress = useMasterAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const enterStaking = useCallback(async (amount: string, decimals: number = 18) => {
    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    try {
      const amountWei = parseUnits(amount, decimals)
      
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'enterStaking',
        args: [amountWei]
      })
      
      toast.success('KEKE质押交易已提交，请等待确认')
    } catch (err: any) {
      console.error('KEKE质押失败:', err)
      toast.error(`KEKE质押失败: ${err.message || '未知错误'}`)
    }
  }, [masterAddress, writeContract])

  return {
    enterStaking,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}

/**
 * KEKE单币解质押
 */
export function useLeaveStaking() {
  const masterAddress = useMasterAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const leaveStaking = useCallback(async (amount: string, decimals: number = 18) => {
    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    try {
      const amountWei = parseUnits(amount, decimals)
      
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'leaveStaking',
        args: [amountWei]
      })
      
      toast.success('KEKE解质押交易已提交，请等待确认')
    } catch (err: any) {
      console.error('KEKE解质押失败:', err)
      toast.error(`KEKE解质押失败: ${err.message || '未知错误'}`)
    }
  }, [masterAddress, writeContract])

  return {
    leaveStaking,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}

/**
 * 更新矿池奖励
 */
export function useUpdatePool() {
  const masterAddress = useMasterAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const updatePool = useCallback(async (poolId: number) => {
    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    try {
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI,
        functionName: 'updatePool',
        args: [BigInt(poolId)]
      })
      
      toast.success('矿池更新交易已提交，请等待确认')
    } catch (err: any) {
      console.error('矿池更新失败:', err)
      toast.error(`矿池更新失败: ${err.message || '未知错误'}`)
    }
  }, [masterAddress, writeContract])

  return {
    updatePool,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}

/**
 * 格式化KEKE数量
 */
export function formatKekeAmount(amount: bigint | undefined, decimals: number = 18): string {
  if (!amount) return '0'
  return formatUnits(amount, decimals)
}

/**
 * 计算APY（年化收益率）
 */
export function calculateAPY(
  kekePerBlock: bigint,
  allocPoint: bigint,
  totalAllocPoint: bigint,
  poolTVL: number,
  kekePrice: number,
  blocksPerYear: number = 2628000 // 以太坊每年大约2628000个区块
): number {
  if (!poolTVL || poolTVL === 0) return 0
  
  const poolKekePerYear = Number(formatUnits(kekePerBlock * BigInt(blocksPerYear) * allocPoint / totalAllocPoint, 18))
  const yearlyRewardValue = poolKekePerYear * kekePrice
  
  return (yearlyRewardValue / poolTVL) * 100
}