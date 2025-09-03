import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { useMaster, calculateAPR } from '@/hooks/useMaster';
import { useReadContract, useAccount } from 'wagmi';
import { useMasterAddress } from '@/hooks/useContract';
import { getKekeTokenConfig } from '@/hooks/tokens/useTokenConfig';

export interface KekeStakingPool {
  pid: number;
  stakedToken: Address;
  allocPoint: bigint;
  lastRewardBlock: bigint;
  accKekePerShare: bigint;
  totalStaked: bigint;
  apr: number;
  tokenSymbol: string;
  tokenName: string;
  userStaked: bigint;
  pendingReward: bigint;
}

/**
 * 获取KEKE单币质押池数据的Hook
 * pid=0 是专门的KEKE单币质押池
 */
export function useKekeStaking() {
  const [pool, setPool] = useState<KekeStakingPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { address: userAddress } = useAccount();
  const kekeConfig = getKekeTokenConfig();
  
  const { 
    kekePerBlock, 
    totalAllocPoint
  } = useMaster();

  // 获取KEKE池子信息（pid=0）
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
    args: [BigInt(0)], // KEKE单币质押池固定为pid=0
    query: {
      enabled: !!useMasterAddress(),
    },
  });

  // 获取用户在KEKE池的信息
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
    args: [BigInt(0), userAddress as Address], // KEKE池用户信息
    query: {
      enabled: !!useMasterAddress() && !!userAddress,
    },
  });

  // 获取用户在KEKE池的待领取奖励
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
    args: [BigInt(0), userAddress as Address], // KEKE池待领取奖励
    query: {
      enabled: !!useMasterAddress() && !!userAddress,
    },
  });

  // 获取KEKE代币在Master合约中的总质押量
  const totalStakedQuery = useReadContract({
    address: kekeConfig.address as Address,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: [useMasterAddress() as Address],
    query: {
      enabled: !!useMasterAddress() && !!kekeConfig.address,
    },
  });

  useEffect(() => {
    try {
      const poolInfo = poolInfoQuery.data as any;
      const userInfo = userInfoQuery.data as any;
      const pendingReward = pendingRewardQuery.data as bigint;
      const totalStaked = totalStakedQuery.data as bigint;

      if (poolInfoQuery.isLoading || totalStakedQuery.isLoading || 
          (userAddress && (userInfoQuery.isLoading || pendingRewardQuery.isLoading))) {
        setIsLoading(true);
        return;
      }

      if (poolInfoQuery.error) {
        setError('获取KEKE质押池信息失败');
        setIsLoading(false);
        return;
      }

      // 计算APR
      const apr = poolInfo && totalStaked ? calculateAPR(
        kekePerBlock as bigint,
        poolInfo.allocPoint || BigInt(1000),
        totalAllocPoint as bigint,
        totalStaked
      ) : 0;

      const kekePool: KekeStakingPool = {
        pid: 0,
        stakedToken: kekeConfig.address as Address,
        allocPoint: poolInfo?.allocPoint || BigInt(1000),
        lastRewardBlock: poolInfo?.lastRewardBlock || BigInt(0),
        accKekePerShare: poolInfo?.accKekePerShare || BigInt(0),
        totalStaked: totalStaked || BigInt(0),
        apr,
        tokenSymbol: 'KEKE',
        tokenName: 'Keke Token',
        userStaked: userInfo?.amount || BigInt(0),
        pendingReward: pendingReward || BigInt(0),
      };

      setPool(kekePool);
      setIsLoading(false);
    } catch (err) {
      console.error('获取KEKE质押池数据失败:', err);
      setError('获取KEKE质押池数据失败');
      setIsLoading(false);
    }
  }, [kekePerBlock, totalAllocPoint, poolInfoQuery.data, poolInfoQuery.isLoading, poolInfoQuery.error, 
      userInfoQuery.data, userInfoQuery.isLoading, pendingRewardQuery.data, pendingRewardQuery.isLoading,
      totalStakedQuery.data, totalStakedQuery.isLoading, userAddress, kekeConfig.address]);

  return {
    pool,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
    },
  };
}

/**
 * 格式化APR显示
 */
export function formatAPR(apr: number): string {
  if (apr > 10000) {
    return `${(apr / 1000).toFixed(1)}K%`;
  }
  return `${apr.toFixed(2)}%`;
}

/**
 * 获取池子状态
 */
export function getPoolStatus(allocPoint: bigint): 'active' | 'inactive' {
  return allocPoint > BigInt(0) ? 'active' : 'inactive';
}