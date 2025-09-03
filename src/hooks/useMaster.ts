import { useCallback, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, parseEther, formatEther } from 'viem';
import { useMasterAddress } from './useContract';
import MasterABI from '../abi/Master.json';

/**
 * Master合约交互Hook
 * 提供农场质押相关的所有功能
 */
export function useMaster() {
  const { address } = useAccount();
  const masterAddress = useMasterAddress();
  const [error, setError] = useState<string | null>(null);

  // 写入合约
  const { writeContract, data: writeData, isPending: isWritePending } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isTxLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  /**
   * 获取池子信息
   */
  const getPoolInfo = useCallback((pid: number) => {
    return useReadContract({
      address: masterAddress as Address,
      abi: MasterABI.abi,
      functionName: 'poolInfo',
      args: [BigInt(pid)],
      query: {
        enabled: !!masterAddress,
      },
    });
  }, [masterAddress]);

  /**
   * 获取用户信息
   */
  const getUserInfo = useCallback((pid: number, userAddress?: Address) => {
    const targetAddress = userAddress || address;
    return useReadContract({
      address: masterAddress as Address,
      abi: MasterABI.abi,
      functionName: 'userInfo',
      args: [BigInt(pid), targetAddress],
      query: {
        enabled: !!masterAddress && !!targetAddress,
      },
    });
  }, [masterAddress, address]);

  /**
   * 获取待领取奖励
   */
  const getPendingReward = useCallback((pid: number, userAddress?: Address) => {
    const targetAddress = userAddress || address;
    return useReadContract({
      address: masterAddress as Address,
      abi: MasterABI.abi,
      functionName: 'pendingKeke',
      args: [BigInt(pid), targetAddress],
      query: {
        enabled: !!masterAddress && !!targetAddress,
      },
    });
  }, [masterAddress, address]);

  /**
   * 获取池子数量
   */
  const { data: poolLength } = useReadContract({
    address: masterAddress as Address,
    abi: MasterABI.abi,
    functionName: 'poolLength',
    query: {
      enabled: !!masterAddress,
    },
  });

  /**
   * 获取每个区块的KEKE产出
   */
  const { data: kekePerBlock } = useReadContract({
    address: masterAddress as Address,
    abi: MasterABI.abi,
    functionName: 'kekePerBlock',
    query: {
      enabled: !!masterAddress,
    },
  });

  /**
   * 获取总分配点数
   */
  const { data: totalAllocPoint } = useReadContract({
    address: masterAddress as Address,
    abi: MasterABI.abi,
    functionName: 'totalAllocPoint',
    query: {
      enabled: !!masterAddress,
    },
  });

  /**
   * 质押LP代币
   */
  const deposit = useCallback(async (pid: number, amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error("Master合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI.abi,
        functionName: "deposit",
        args: [BigInt(pid), parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || "质押失败");
      throw err;
    }
  }, [masterAddress, writeContract]);

  /**
   * 提取LP代币
   */
  const withdraw = useCallback(async (pid: number, amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error("Master合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI.abi,
        functionName: "withdraw",
        args: [BigInt(pid), parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || "提取失败");
      throw err;
    }
  }, [masterAddress, writeContract]);

  /**
   * 质押KEKE代币
   */
  const enterStaking = useCallback(async (amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error("Master合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI.abi,
        functionName: "enterStaking",
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || "质押KEKE失败");
      throw err;
    }
  }, [masterAddress, writeContract]);

  /**
   * 提取KEKE代币
   */
  const leaveStaking = useCallback(async (amount: string): Promise<void> => {
    if (!masterAddress) {
      throw new Error("Master合约地址未找到");
    }
    
    try {
      setError(null);
      await writeContract({
        address: masterAddress as Address,
        abi: MasterABI.abi,
        functionName: "leaveStaking",
        args: [parseEther(amount)],
      });
    } catch (err: any) {
      setError(err.message || "提取KEKE失败");
      throw err;
    }
  }, [masterAddress, writeContract]);

  return {
    // 读取函数
    getPoolInfo,
    getUserInfo,
    getPendingReward,
    poolLength,
    kekePerBlock,
    totalAllocPoint,
    
    // 写入函数
    deposit,
    withdraw,
    enterStaking,
    leaveStaking,
    
    // 状态
    isLoading: isWritePending || isTxLoading,
    isSuccess,
    error,
    txHash: writeData,
  };
}

/**
 * 池子信息类型
 */
export interface PoolInfo {
  lpToken: Address;
  allocPoint: bigint;
  lastRewardBlock: bigint;
  accKekePerShare: bigint;
}

/**
 * 用户信息类型
 */
export interface UserInfo {
  amount: bigint;
  rewardDebt: bigint;
}

/**
 * 计算APR的辅助函数
 */
export function calculateAPR(
  kekePerBlock: bigint,
  allocPoint: bigint,
  totalAllocPoint: bigint,
  totalStaked: bigint
): number {
  if (!totalStaked || totalStaked === BigInt(0)) return 0;
  
  // 每天大约产生6400个区块（假设15秒一个区块）
  const blocksPerDay = BigInt(6400);
  const blocksPerYear = blocksPerDay * BigInt(365);
  
  // 计算该池子每年的KEKE奖励
  const poolKekePerYear = (kekePerBlock * allocPoint * blocksPerYear) / totalAllocPoint;
  
  // 假设KEKE价格为1美元（实际应该从价格预言机获取）
  const kekePrice = 1;
  const yearlyRewardValue = Number(formatEther(poolKekePerYear)) * kekePrice;
  
  // 假设LP代币价值（实际应该计算LP代币的真实价值）
  const stakedValue = Number(formatEther(totalStaked));
  
  return (yearlyRewardValue / stakedValue) * 100;
}

/**
 * 格式化大数字为可读字符串
 */
export function formatBigNumber(value: bigint, decimals: number = 18): string {
  return formatEther(value);
}

/**
 * 解析字符串为大数字
 */
export function parseBigNumber(value: string): bigint {
  return parseEther(value);
}