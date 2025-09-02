import { useState, useEffect, useMemo } from 'react';
import { formatEther } from 'viem';
import { useMaster, PoolInfo, UserInfo } from './useMaster';
import { useSmartChef, SmartChefPoolInfo, SmartChefUserInfo } from './useSmartChef';
import { useAccount } from 'wagmi';

// 农场池类型
interface FarmPool {
  id: number;
  name: string;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  token0Name: string;
  token1Name: string;
  token0Decimals: number;
  token1Decimals: number;
  token0Logo?: string;
  token1Logo?: string;
  totalSupply: string;
  reserve0: string;
  reserve1: string;
  tvlUsd: number;
  volume24h: string;
  apr: string;
  totalValueLocked: string;
  totalStakers: number;
  rewardToken: string;
  allocPoint: number;
  userStaked: string;
  userPendingReward: string;
  userLPBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 农场统计数据
interface FarmStats {
  totalTVL: string;
  activeUsers: number;
  averageAPY: string;
  totalRewardsDistributed: string;
}

// 用户农场数据
interface UserFarmData {
  totalStakedValue: string;
  totalPendingRewards: string;
  activePools: number;
}

// Hook返回类型
interface UseFarmReturn {
  // 农场池数据
  farmPools: FarmPool[];
  
  // 统计数据
  farmStats: FarmStats;
  
  // 用户数据
  userFarmData: UserFarmData;
  
  // 操作函数
  stakeLPToken: (poolId: number, amount: string) => Promise<void>;
  unstakeLPToken: (poolId: number, amount: string) => Promise<void>;
  stakeKEKE: (amount: string) => Promise<void>;
  unstakeKEKE: (amount: string) => Promise<void>;
  harvestRewards: (poolId: number) => Promise<void>;
  harvestAllRewards: () => Promise<void>;
  refreshFarmData: () => Promise<void>;
  
  // 状态
  isLoading: boolean;
  error: string | null;
}

/**
 * 农场综合功能Hook
 * 从API获取农场数据
 */
export function useFarm(): UseFarmReturn {
  const { address } = useAccount();
  const [farmPools, setFarmPools] = useState<FarmPool[]>([]);
  const [farmStats, setFarmStats] = useState<FarmStats>({
    totalTVL: '$0',
    activeUsers: 0,
    averageAPY: '0%',
    totalRewardsDistributed: '$0'
  });
  const [userFarmData, setUserFarmData] = useState<UserFarmData>({
    totalStakedValue: '0',
    totalPendingRewards: '0',
    activePools: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取农场数据
  useEffect(() => {
    const fetchFarmData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const url = address 
          ? `/api/farm?userAddress=${address}`
          : '/api/farm';
          
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
          setFarmPools(result.data.farmPools);
          setFarmStats(result.data.farmStats);
          setUserFarmData(result.data.userFarmData);
        } else {
          setError(result.error || '获取农场数据失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '网络错误');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFarmData();
  }, [address]);

  // 刷新农场数据
  const refreshFarmData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = address 
        ? `/api/farm?userAddress=${address}`
        : '/api/farm';
        
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setFarmPools(result.data.farmPools);
        setFarmStats(result.data.farmStats);
        setUserFarmData(result.data.userFarmData);
      } else {
        setError(result.error || '获取农场数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 质押LP代币
   */
  const stakeLPToken = async (poolId: number, amount: string): Promise<void> => {
    try {
      const response = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stake',
          poolId,
          amount,
          userAddress: address
        })
      });
      const result = await response.json();
      if (result.success) {
        await refreshFarmData();
      } else {
        throw new Error(result.error || '质押失败');
      }
    } catch (error) {
      console.error('质押LP代币失败:', error);
      throw error;
    }
  };

  /**
   * 取消质押LP代币
   */
  const unstakeLPToken = async (poolId: number, amount: string): Promise<void> => {
    try {
      const response = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unstake',
          poolId,
          amount,
          userAddress: address
        })
      });
      const result = await response.json();
      if (result.success) {
        await refreshFarmData();
      } else {
        throw new Error(result.error || '取消质押失败');
      }
    } catch (error) {
      console.error('取消质押LP代币失败:', error);
      throw error;
    }
  };

  /**
   * 质押KEKE代币
   */
  const stakeKEKE = async (amount: string): Promise<void> => {
    try {
      const response = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stakeKEKE',
          amount,
          userAddress: address
        })
      });
      const result = await response.json();
      if (result.success) {
        await refreshFarmData();
      } else {
        throw new Error(result.error || '质押KEKE失败');
      }
    } catch (error) {
      console.error('质押KEKE代币失败:', error);
      throw error;
    }
  };

  /**
   * 取消质押KEKE代币
   */
  const unstakeKEKE = async (amount: string): Promise<void> => {
    try {
      const response = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unstakeKEKE',
          amount,
          userAddress: address
        })
      });
      const result = await response.json();
      if (result.success) {
        await refreshFarmData();
      } else {
        throw new Error(result.error || '取消质押KEKE失败');
      }
    } catch (error) {
      console.error('取消质押KEKE代币失败:', error);
      throw error;
    }
  };

  /**
   * 收获单个池子的奖励
   */
  const harvestRewards = async (poolId: number): Promise<void> => {
    try {
      const response = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'harvest',
          poolId,
          userAddress: address
        })
      });
      const result = await response.json();
      if (result.success) {
        await refreshFarmData();
      } else {
        throw new Error(result.error || '收获奖励失败');
      }
    } catch (error) {
      console.error('收获奖励失败:', error);
      throw error;
    }
  };

  /**
   * 收获所有池子的奖励
   */
  const harvestAllRewards = async (): Promise<void> => {
    try {
      const response = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'harvestAll',
          userAddress: address
        })
      });
      const result = await response.json();
      if (result.success) {
        await refreshFarmData();
      } else {
        throw new Error(result.error || '收获所有奖励失败');
      }
    } catch (error) {
      console.error('收获所有奖励失败:', error);
      throw error;
    }
  };

  return {
    // 数据
    farmPools,
    farmStats,
    userFarmData,
    
    // 操作函数
    stakeLPToken,
    unstakeLPToken,
    stakeKEKE,
    unstakeKEKE,
    harvestRewards,
    harvestAllRewards,
    refreshFarmData,
    
    // 状态
    isLoading,
    error,
  };
}

// 导出类型
export type { FarmPool, FarmStats, UserFarmData, UseFarmReturn };