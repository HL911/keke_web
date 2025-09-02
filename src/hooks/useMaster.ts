import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import MasterABI from '../abi/Master.json';
import { Abi } from 'viem';
import { useMasterAddress } from './useContract';

// 池子信息类型
interface PoolInfo {
  lpToken: string;
  allocPoint: bigint;
  lastRewardBlock: bigint;
  accKekePerShare: bigint;
}

// 用户信息类型
interface UserInfo {
  amount: bigint;
  rewardDebt: bigint;
}

// Hook返回类型
interface UseMasterReturn {
  // 读取函数
  getPoolInfo: (pid: number) => PoolInfo | undefined;
  getUserInfo: (pid: number, user: string) => UserInfo | undefined;
  getPendingReward: (pid: number, user: string) => bigint | undefined;
  getPoolLength: () => number | undefined;
  getKekePerBlock: () => bigint | undefined;
  getTotalAllocPoint: () => bigint | undefined;
  
  // 写入函数
  deposit: (pid: number, amount: string) => Promise<void>;
  withdraw: (pid: number, amount: string) => Promise<void>;
  enterStaking: (amount: string) => Promise<void>;
  leaveStaking: (amount: string) => Promise<void>;
  harvest: (pid: number) => Promise<void>;
  emergencyWithdraw: (pid: number) => Promise<void>;
  
  // 状态
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: string | undefined;
}

/**
 * Master合约交互Hook
 * 提供农场质押、提取、收获等功能
 */
export function useMaster(): UseMasterReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const masterAddress = useMasterAddress();

  // 写入合约的hook
  const { writeContract, data: hash, error: writeError } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 读取池子长度
  const { data: poolLength } = useReadContract({
    address: masterAddress as `0x${string}`,
    abi: MasterABI as unknown as Abi,
    functionName: 'poolLength',
    query: { enabled: !!masterAddress },
  });

  // 读取KEKE每块奖励
  const { data: kekePerBlock } = useReadContract({
    address: masterAddress as `0x${string}`,
    abi: MasterABI as unknown as Abi,
    functionName: 'kekePerBlock',
    query: { enabled: !!masterAddress },
  });

  // 读取总分配点数
  const { data: totalAllocPoint } = useReadContract({
    address: masterAddress as `0x${string}`,
    abi: MasterABI as unknown as Abi,
    functionName: 'totalAllocPoint',
    query: { enabled: !!masterAddress },
  });

  /**
   * 获取池子信息
   * @param pid 池子ID
   */
  const getPoolInfo = (pid: number): PoolInfo | undefined => {
    const { data } = useReadContract({
      address: masterAddress as `0x${string}`,
      abi: MasterABI as unknown as Abi,
      functionName: 'poolInfo',
      args: [BigInt(pid)],
      query: { enabled: !!masterAddress },
    });
    return data as PoolInfo | undefined;
  };

  /**
   * 获取用户信息
   * @param pid 池子ID
   * @param user 用户地址
   */
  const getUserInfo = (pid: number, user: string): UserInfo | undefined => {
    const { data } = useReadContract({
      address: masterAddress as `0x${string}`,
      abi: MasterABI as unknown as Abi,
      functionName: 'userInfo',
      args: [BigInt(pid), user as `0x${string}`],
      query: { enabled: !!masterAddress && !!user },
    });
    return data as UserInfo | undefined;
  };

  /**
   * 获取待收获奖励
   * @param pid 池子ID
   * @param user 用户地址
   */
  const getPendingReward = (pid: number, user: string): bigint | undefined => {
    const { data } = useReadContract({
      address: masterAddress as `0x${string}`,
      abi: MasterABI as unknown as Abi,
      functionName: 'getPoolKEKEReward',
      args: [BigInt(pid), user as `0x${string}`],
      query: { enabled: !!masterAddress && !!user },
    });
    return data as bigint | undefined;
  };

  /**
   * 质押LP代币
   * @param pid 池子ID
   * @param amount 质押数量
   */
  const deposit = async (pid: number, amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error('Master合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: masterAddress as `0x${string}`,
        abi: MasterABI as unknown as Abi,
        functionName: 'deposit',
        args: [BigInt(pid), parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || '质押失败');
      console.error('质押失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 提取LP代币
   * @param pid 池子ID
   * @param amount 提取数量
   */
  const withdraw = async (pid: number, amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error('Master合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: masterAddress as `0x${string}`,
        abi: MasterABI as unknown as Abi,
        functionName: 'withdraw',
        args: [BigInt(pid), parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || '提取失败');
      console.error('提取失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 质押KEKE代币
   * @param amount 质押数量
   */
  const enterStaking = async (amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error('Master合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: masterAddress as `0x${string}`,
        abi: MasterABI as unknown as Abi,
        functionName: 'enterStaking',
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || 'KEKE质押失败');
      console.error('KEKE质押失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 提取KEKE代币
   * @param amount 提取数量
   */
  const leaveStaking = async (amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error('Master合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: masterAddress as `0x${string}`,
        abi: MasterABI as unknown as Abi,
        functionName: 'leaveStaking',
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || 'KEKE提取失败');
      console.error('KEKE提取失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 收获奖励（不提取本金）
   * @param pid 池子ID
   */
  const harvest = async (pid: number): Promise<void> => {
    if (!masterAddress) {
      throw new Error('Master合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      // 通过deposit 0数量来收获奖励
      await writeContract({
        address: masterAddress as `0x${string}`,
        abi: MasterABI as unknown as Abi,
        functionName: 'deposit',
        args: [BigInt(pid), BigInt(0)],
      });
    } catch (err: any) {
      setError(err.message || '收获奖励失败');
      console.error('收获奖励失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 紧急提取
   * @param pid 池子ID
   */
  const emergencyWithdraw = async (pid: number) => {
    if (!masterAddress) {
      throw new Error('Master合约地址未配置');
    }

    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: masterAddress as `0x${string}`,
        abi: MasterABI as unknown as Abi,
        functionName: 'emergencyWithdraw',
        args: [BigInt(pid)],
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
    getPoolInfo,
    getUserInfo,
    getPendingReward,
    getPoolLength: () => poolLength as number | undefined,
    getKekePerBlock: () => kekePerBlock as bigint | undefined,
    getTotalAllocPoint: () => totalAllocPoint as bigint | undefined,
    
    // 写入函数
    deposit,
    withdraw,
    enterStaking,
    leaveStaking,
    harvest,
    emergencyWithdraw,
    
    // 状态
    isLoading: isLoading || isConfirming,
    isSuccess,
    error: error || writeError?.message || null,
    txHash: hash,
  };
}

// 导出类型
export type { PoolInfo, UserInfo, UseMasterReturn };