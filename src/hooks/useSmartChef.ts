import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import SmartChefABI from '../abi/SmartChef.json';
import { Abi } from 'viem';
import { useSmartChefAddress } from './useContract';

// SmartChef池子信息类型
interface SmartChefPoolInfo {
  stakedToken: string;
  rewardToken: string;
  rewardPerBlock: bigint;
  startBlock: bigint;
  bonusEndBlock: bigint;
  poolLimitPerUser: bigint;
}

// SmartChef用户信息类型
interface SmartChefUserInfo {
  amount: bigint;
  rewardDebt: bigint;
}

// Hook返回类型
interface UseSmartChefReturn {
  // 读取函数
  getUserInfo: (user: string) => SmartChefUserInfo | undefined;
  getPendingReward: (user: string) => bigint | undefined;
  getPoolInfo: () => SmartChefPoolInfo | undefined;
  getStakedToken: () => string | undefined;
  getRewardToken: () => string | undefined;
  getRewardPerBlock: () => bigint | undefined;
  
  // 写入函数
  deposit: (amount: string) => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
  emergencyWithdraw: () => Promise<void>;
  
  // 状态
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: string | undefined;
}

/**
 * SmartChef合约交互Hook
 * 提供单币质押功能
 */
export function useSmartChef(): UseSmartChefReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const smartChefAddress = useSmartChefAddress();

  // 写入合约的hook
  const { writeContract, data: hash, error: writeError } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 读取质押代币地址
  const { data: stakedToken } = useReadContract({
    address: smartChefAddress as `0x${string}`,
    abi: SmartChefABI as unknown as Abi,
    functionName: 'stakedToken',
    query: { enabled: !!smartChefAddress },
  });

  // 读取奖励代币地址
  const { data: rewardToken } = useReadContract({
    address: smartChefAddress as `0x${string}`,
    abi: SmartChefABI as unknown as Abi,
    functionName: 'rewardToken',
    query: { enabled: !!smartChefAddress },
  });

  // 读取每块奖励
  const { data: rewardPerBlock } = useReadContract({
    address: smartChefAddress as `0x${string}`,
    abi: SmartChefABI as unknown as Abi,
    functionName: 'rewardPerBlock',
    query: { enabled: !!smartChefAddress },
  });

  /**
   * 获取池子信息
   */
  const getPoolInfo = (): SmartChefPoolInfo | undefined => {
    // SmartChef合约可能没有单独的poolInfo函数，需要组合多个读取
    if (!stakedToken || !rewardToken || !rewardPerBlock) {
      return undefined;
    }
    
    return {
      stakedToken: stakedToken as string,
      rewardToken: rewardToken as string,
      rewardPerBlock: rewardPerBlock as bigint,
      startBlock: BigInt(0), // 需要根据实际合约调整
      bonusEndBlock: BigInt(0), // 需要根据实际合约调整
      poolLimitPerUser: BigInt(0), // 需要根据实际合约调整
    };
  };

  /**
   * 获取用户信息
   * @param user 用户地址
   */
  const getUserInfo = (user: string): SmartChefUserInfo | undefined => {
    const { data } = useReadContract({
      address: smartChefAddress as `0x${string}`,
      abi: SmartChefABI as unknown as Abi,
      functionName: 'userInfo',
      args: [user as `0x${string}`],
      query: { enabled: !!smartChefAddress && !!user },
    });
    return data as SmartChefUserInfo | undefined;
  };

  /**
   * 获取待收获奖励
   * @param user 用户地址
   */
  const getPendingReward = (user: string): bigint | undefined => {
    const { data } = useReadContract({
      address: smartChefAddress as `0x${string}`,
      abi: SmartChefABI as unknown as Abi,
      functionName: 'pendingReward',
      args: [user as `0x${string}`],
      query: { enabled: !!smartChefAddress && !!user },
    });
    return data as bigint | undefined;
  };

  /**
   * 质押代币
   * @param amount 质押数量
   */
  const deposit = async (amount: string): Promise<void> => {
    if (!smartChefAddress) {
      throw new Error('SmartChef合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: smartChefAddress as `0x${string}`,
        abi: SmartChefABI as unknown as Abi,
        functionName: 'deposit',
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || '质押失败');
      console.error('质押失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 提取代币
   * @param amount 提取数量
   */
  const withdraw = async (amount: string): Promise<void> => {
    if (!smartChefAddress) {
      throw new Error('SmartChef合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: smartChefAddress as `0x${string}`,
        abi: SmartChefABI as unknown as Abi,
        functionName: 'withdraw',
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || '提取失败');
      console.error('提取失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 紧急提取（不收获奖励）
   */
  const emergencyWithdraw = async (): Promise<void> => {
    if (!smartChefAddress) {
      throw new Error('SmartChef合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: smartChefAddress as `0x${string}`,
        abi: SmartChefABI as unknown as Abi,
        functionName: 'emergencyWithdraw',
        args: [],
      });
    } catch (err: any) {
      setError(err.message || '紧急提取失败');
      console.error('紧急提取失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // 读取函数
    getUserInfo,
    getPendingReward,
    getPoolInfo,
    getStakedToken: () => stakedToken as string | undefined,
    getRewardToken: () => rewardToken as string | undefined,
    getRewardPerBlock: () => rewardPerBlock as bigint | undefined,
    
    // 写入函数
    deposit,
    withdraw,
    emergencyWithdraw,
    
    // 状态
    isLoading: isLoading || isConfirming,
    isSuccess,
    error: error || writeError?.message || null,
    txHash: hash,
  };
}

// 导出类型
export type { SmartChefPoolInfo, SmartChefUserInfo, UseSmartChefReturn };