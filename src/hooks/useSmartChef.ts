import { useCallback, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, parseEther, formatEther } from 'viem';
import { useSmartChefAddress } from './useContract';
import SmartChefABI from '../abi/SmartChef.json';

/**
 * SmartChef合约交互Hook
 * 提供单币质押相关的所有功能
 */
export function useSmartChef() {
  const { address } = useAccount();
  const smartChefAddress = useSmartChefAddress();
  const [error, setError] = useState<string | null>(null);

  // 写入合约
  const { writeContract, data: writeData, isPending: isWritePending } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isTxLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  /**
   * 获取质押代币地址
   */
  const { data: stakedToken } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'stakedToken',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 获取奖励代币地址
   */
  const { data: rewardToken } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'rewardToken',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 获取每个区块的奖励
   */
  const { data: rewardPerBlock } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'rewardPerBlock',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 获取开始区块
   */
  const { data: startBlock } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'startBlock',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 获取结束区块
   */
  const { data: bonusEndBlock } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'bonusEndBlock',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 获取用户信息
   */
  const getUserInfo = useCallback((userAddress?: Address) => {
    const targetAddress = userAddress || address;
    return useReadContract({
      address: smartChefAddress as Address,
      abi: SmartChefABI.abi,
      functionName: 'userInfo',
      args: [targetAddress],
      query: {
        enabled: !!smartChefAddress && !!targetAddress,
      },
    });
  }, [smartChefAddress, address]);

  /**
   * 获取待领取奖励
   */
  const getPendingReward = useCallback((userAddress?: Address) => {
    const targetAddress = userAddress || address;
    return useReadContract({
      address: smartChefAddress as Address,
      abi: SmartChefABI.abi,
      functionName: 'pendingReward',
      args: [targetAddress],
      query: {
        enabled: !!smartChefAddress && !!targetAddress,
      },
    });
  }, [smartChefAddress, address]);

  /**
   * 获取用户质押限制
   */
  const { data: poolLimitPerUser } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'poolLimitPerUser',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 获取是否有用户限制
   */
  const { data: hasUserLimit } = useReadContract({
    address: smartChefAddress as Address,
    abi: SmartChefABI.abi,
    functionName: 'hasUserLimit',
    query: {
      enabled: !!smartChefAddress,
    },
  });

  /**
   * 质押代币
   */
  const deposit = useCallback(async (amount: string): Promise<void> => {
    if (!smartChefAddress) {
      throw new Error("SmartChef合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: smartChefAddress as Address,
        abi: SmartChefABI.abi,
        functionName: "deposit",
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || "质押失败");
      throw err;
    }
  }, [smartChefAddress, writeContract]);

  /**
   * 提取代币
   */
  const withdraw = useCallback(async (amount: string): Promise<void> => {
    if (!smartChefAddress) {
      throw new Error("SmartChef合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: smartChefAddress as Address,
        abi: SmartChefABI.abi,
        functionName: "withdraw",
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || "提取失败");
      throw err;
    }
  }, [smartChefAddress, writeContract]);

  /**
   * 紧急提取（不领取奖励）
   */
  const emergencyWithdraw = useCallback(async (): Promise<void> => {
    if (!smartChefAddress) {
      throw new Error("SmartChef合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: smartChefAddress as Address,
        abi: SmartChefABI.abi,
        functionName: "emergencyWithdraw",
        args: [],
      });
    } catch (err: any) {
      setError(err.message || "紧急提取失败");
      throw err;
    }
  }, [smartChefAddress, writeContract]);

  return {
    // 读取数据
    stakedToken,
    rewardToken,
    rewardPerBlock,
    startBlock,
    bonusEndBlock,
    poolLimitPerUser,
    hasUserLimit,
    getUserInfo,
    getPendingReward,
    
    // 写入函数
    deposit,
    withdraw,
    emergencyWithdraw,
    
    // 状态
    isLoading: isWritePending || isTxLoading,
    isSuccess,
    error,
    txHash: writeData,
  };
}

/**
 * SmartChef用户信息类型
 */
export interface SmartChefUserInfo {
  amount: bigint;
  rewardDebt: bigint;
}

/**
 * 计算SmartChef池子的APR
 */
export function calculateSmartChefAPR(
  rewardPerBlock: bigint,
  totalStaked: bigint,
  rewardTokenPrice: number = 1,
  stakedTokenPrice: number = 1
): number {
  if (!totalStaked || totalStaked === BigInt(0)) return 0;
  
  // 每天大约产生6400个区块（假设15秒一个区块）
  const blocksPerDay = BigInt(6400);
  const blocksPerYear = blocksPerDay * BigInt(365);
  
  // 计算年奖励
  const yearlyReward = rewardPerBlock * blocksPerYear;
  const yearlyRewardValue = Number(formatEther(yearlyReward)) * rewardTokenPrice;
  
  // 计算质押价值
  const stakedValue = Number(formatEther(totalStaked)) * stakedTokenPrice;
  
  return (yearlyRewardValue / stakedValue) * 100;
}

/**
 * 检查池子是否已结束
 */
export function isPoolEnded(bonusEndBlock: bigint, currentBlock: bigint): boolean {
  return currentBlock >= bonusEndBlock;
}

/**
 * 检查池子是否已开始
 */
export function isPoolStarted(startBlock: bigint, currentBlock: bigint): boolean {
  return currentBlock >= startBlock;
}

/**
 * 获取池子状态
 */
export function getPoolStatus(startBlock: bigint, bonusEndBlock: bigint, currentBlock: bigint): 'upcoming' | 'live' | 'finished' {
  if (currentBlock < startBlock) {
    return 'upcoming';
  } else if (currentBlock >= startBlock && currentBlock < bonusEndBlock) {
    return 'live';
  } else {
    return 'finished';
  }
}