import { useState, useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { useMaster, calculateAPR } from '@/hooks/useMaster';
import { useReadContract, useAccount } from 'wagmi';
import { useFarmContractAddress, useMasterAddress } from '@/hooks/useContract';

/**
 * 农场池信息接口
 */
export interface FarmPool {
  pid: number;
  lpToken: Address;
  allocPoint: bigint;
  lastRewardBlock: bigint;
  accKekePerShare: bigint;
  totalStaked: bigint;
  apr: number;
  lpTokenSymbol: string;
  lpTokenName: string;
  token0Symbol: string;
  token1Symbol: string;
  userStaked: bigint;
  pendingReward: bigint;
}

/**
 * 获取农场池列表的Hook
 */
export function useFarmPools() {
  const [pools, setPools] = useState<FarmPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { address: userAddress } = useAccount();
  const weth9KekePair = useFarmContractAddress('WETH9_KEKE_PAIR');
  
  const { 
    poolLength, 
    kekePerBlock, 
    totalAllocPoint
  } = useMaster();

  // 真实的农场池配置
  // 注意：pid=0 是KEKE单币质押池，不应该在这里显示
  // LP代币池从pid=1开始
  const farmPoolConfigs = useMemo(() => [
    {
      pid: 1,
      lpToken: weth9KekePair as Address,
      lpTokenSymbol: 'WETH9-KEKE LP',
      lpTokenName: 'WETH9-KEKE Liquidity Pool',
      token0Symbol: 'WETH9',
      token1Symbol: 'KEKE',
    },
  ], [weth9KekePair]);

  // 为每个池子获取数据
  const poolInfoQuery = useReadContract({
    address: useMasterAddress() as Address,
    abi: [{
      name: 'poolInfo',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'pid', type: 'uint256' }],
      outputs: [
        { name: 'lpToken', type: 'address' },
        { name: 'allocPoint', type: 'uint256' },
        { name: 'lastRewardBlock', type: 'uint256' },
        { name: 'accKekePerShare', type: 'uint256' }
      ]
    }],
    functionName: 'poolInfo',
    args: [BigInt(1)], // 使用pid=1获取LP池信息
    query: {
      enabled: !!useMasterAddress(),
    },
  });

  const userInfoQuery = useReadContract({
    address: useMasterAddress() as Address,
    abi: [{
      name: 'userInfo',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'pid', type: 'uint256' },
        { name: 'user', type: 'address' }
      ],
      outputs: [
        { name: 'amount', type: 'uint256' },
        { name: 'rewardDebt', type: 'uint256' }
      ]
    }],
    functionName: 'userInfo',
    args: [BigInt(1), userAddress as Address], // 使用pid=1获取LP池用户信息
    query: {
      enabled: !!useMasterAddress() && !!userAddress,
    },
  });

  const pendingRewardQuery = useReadContract({
    address: useMasterAddress() as Address,
    abi: [{
      name: 'getPoolKEKEReward',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'pid', type: 'uint256' },
        { name: 'user', type: 'address' }
      ],
      outputs: [{ name: '', type: 'uint256' }]
    }],
    functionName: 'getPoolKEKEReward',
    args: [BigInt(1), userAddress as Address], // 使用pid=1获取LP池待领取奖励
    query: {
      enabled: !!useMasterAddress() && !!userAddress,
    },
  });

  useEffect(() => {
    if (!poolLength || !kekePerBlock || !totalAllocPoint || !farmPoolConfigs.length) {
      setIsLoading(true);
      return;
    }

    try {
      setError(null);
      
      const config = farmPoolConfigs[0]; // 目前只有一个池子
      if (!config.lpToken) {
        setIsLoading(false);
        return;
      }

      const poolInfo = poolInfoQuery.data as any;
      const userInfo = userInfoQuery.data as any;
      const pendingReward = pendingRewardQuery.data as bigint;

      if (poolInfoQuery.isLoading || (userAddress && (userInfoQuery.isLoading || pendingRewardQuery.isLoading))) {
        setIsLoading(true);
        return;
      }

      if (poolInfoQuery.error) {
        setError('获取池子信息失败');
        setIsLoading(false);
        return;
      }

      // 计算APR（使用池子的实际质押总量）
      const totalStaked = BigInt(1000000000000000000000); // 临时使用固定值
      
      const apr = poolInfo ? calculateAPR(
        kekePerBlock as bigint,
        poolInfo.allocPoint || BigInt(100),
        totalAllocPoint as bigint,
        totalStaked
      ) : 0;

      const pool: FarmPool = {
        ...config,
        lpToken: config.lpToken,
        allocPoint: poolInfo?.allocPoint || BigInt(100),
        lastRewardBlock: poolInfo?.lastRewardBlock || BigInt(0),
        accKekePerShare: poolInfo?.accKekePerShare || BigInt(0),
        totalStaked,
        apr,
        userStaked: userInfo?.amount || BigInt(0),
        pendingReward: pendingReward || BigInt(0),
      };

      setPools([pool]);
      setIsLoading(false);
    } catch (err) {
      console.error('获取农场池数据失败:', err);
      setError('获取农场池数据失败');
      setIsLoading(false);
    }
  }, [poolLength, kekePerBlock, totalAllocPoint, farmPoolConfigs, poolInfoQuery.data, poolInfoQuery.isLoading, poolInfoQuery.error, userInfoQuery.data, userInfoQuery.isLoading, pendingRewardQuery.data, pendingRewardQuery.isLoading, userAddress]);

  return {
    pools,
    isLoading,
    error,
    refetch: () => {
      // 重新获取数据的函数
      if (poolLength && kekePerBlock && totalAllocPoint) {
        setIsLoading(true);
        // 触发重新获取
      }
    },
  };
}

/**
 * 获取单个农场池信息的Hook
 */
export function useFarmPool(pid: number) {
  const { getPoolInfo, getUserInfo, getPendingReward } = useMaster();
  
  // 获取池子信息
  const poolInfoQuery = getPoolInfo(pid);
  
  // 获取用户信息（需要连接钱包）
  const userInfoQuery = getUserInfo(pid);
  
  // 获取待领取奖励（需要连接钱包）
  const pendingRewardQuery = getPendingReward(pid);

  return {
    poolInfo: poolInfoQuery.data,
    userInfo: userInfoQuery.data,
    pendingReward: pendingRewardQuery.data,
    isLoading: poolInfoQuery.isLoading || userInfoQuery.isLoading || pendingRewardQuery.isLoading,
    error: poolInfoQuery.error || userInfoQuery.error || pendingRewardQuery.error,
  };
}

/**
 * 格式化APR显示
 */
export function formatAPR(apr: number): string {
  if (apr === 0) return '0%';
  if (apr < 0.01) return '<0.01%';
  if (apr > 10000) return '>10,000%';
  return `${apr.toFixed(2)}%`;
}

/**
 * 格式化池子名称
 */
export function formatPoolName(token0Symbol: string, token1Symbol: string): string {
  return `${token0Symbol}-${token1Symbol} LP`;
}

/**
 * 获取池子状态
 */
export function getPoolStatus(allocPoint: bigint): 'active' | 'inactive' {
  return allocPoint > BigInt(0) ? 'active' : 'inactive';
}