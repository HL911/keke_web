'use client'

import { useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Address, parseUnits, maxUint256 } from 'viem'
import { useMasterAddress } from '@/hooks/useContract'
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json'
import { toast } from 'sonner'

/**
 * 代币授权相关的hook
 */
export function useTokenApproval(tokenAddress: string) {
  const { address } = useAccount()
  const masterAddress = useMasterAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // 检查授权额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as Address,
    abi: KekeMockERC20_ABI,
    functionName: 'allowance',
    args: [address as Address, masterAddress as Address],
    query: {
      enabled: !!tokenAddress && !!address && !!masterAddress && 
               tokenAddress !== '0x0000000000000000000000000000000000000000' &&
               masterAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  // 检查是否已授权（授权额度大于0）
  const isApproved = allowance ? (allowance as bigint) > BigInt(0) : false

  // 授权函数
  const approve = useCallback(async (amount?: string) => {
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('代币地址无效')
      return
    }

    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    if (!address) {
      toast.error('请先连接钱包')
      return
    }

    try {
      // 如果没有指定金额，则授权最大值
      const approveAmount = amount ? parseUnits(amount, 18) : maxUint256
      
      await writeContract({
        address: tokenAddress as Address,
        abi: KekeMockERC20_ABI,
        functionName: 'approve',
        args: [masterAddress as Address, approveAmount]
      })
      
      toast.success('授权交易已提交，请等待确认')
    } catch (err: any) {
      console.error('授权失败:', err)
      toast.error(`授权失败: ${err.message || '未知错误'}`)
    }
  }, [tokenAddress, masterAddress, address, writeContract])

  // 撤销授权
  const revoke = useCallback(async () => {
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('代币地址无效')
      return
    }

    if (!masterAddress || masterAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Master合约地址未配置')
      return
    }

    if (!address) {
      toast.error('请先连接钱包')
      return
    }

    try {
      await writeContract({
        address: tokenAddress as Address,
        abi: KekeMockERC20_ABI,
        functionName: 'approve',
        args: [masterAddress as Address, BigInt(0)]
      })
      
      toast.success('撤销授权交易已提交，请等待确认')
    } catch (err: any) {
      console.error('撤销授权失败:', err)
      toast.error(`撤销授权失败: ${err.message || '未知错误'}`)
    }
  }, [tokenAddress, masterAddress, address, writeContract])

  return {
    allowance,
    isApproved,
    approve,
    revoke,
    refetchAllowance,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  }
}