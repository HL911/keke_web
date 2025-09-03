import { useState, useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { useSmartChef, calculateSmartChefAPR, getPoolStatus } from '@/hooks/useSmartChef';
import { useReadContract, useAccount } from 'wagmi';
import { useSmartChefAddress } from '@/hooks/useContract';

/**
 * 糖浆池信息接口
 */
export interface StakingPool {
  address: Address;
  stakedToken: Address;
  rewardToken: Address;
  stakedTokenSymbol: string;
  rewardTokenSymbol: string;
  rewardPerBlock: bigint;
  startBlock: bigint;
  bonusEndBlock: bigint;
  poolLimitPerUser: bigint;
  hasUserLimit: boolean;
  totalStaked: bigint;
  apr: number;
  status: 'upcoming' | 'live' | 'finished';
  userStaked: bigint;
  pendingReward: bigint;
}

/**
 * 获取糖浆池列表的Hook
 */
export function useStakingPools() {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { address: userAddress } = useAccount();
  const smartChefAddress = useSmartChefAddress();
  
  const { 
    stakedToken,
    rewardToken,
    rewardPerBlock,
    startBlock,
    bonusEndBlock,
    poolLimitPerUser,
    hasUserLimit,
    getUserInfo,
    getPendingReward
  } = useSmartChef();

  // 真实的糖浆池配置
  const stakingPoolConfigs = useMemo(() => [
    {
      address: smartChefAddress,
      stakedTokenSymbol: 'KEKE',
      rewardTokenSymbol: 'KEKE',
    },
  ], [smartChefAddress]);

  // 获取当前区块号
  const { data: currentBlock } = useReadContract({
    address: '0x0000000000000000000000000000000000000000' as Address,
    abi: [
      {
        name: 'number',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'number',
    query: {
      enabled: false, // 暂时禁用，使用模拟数据
    },
  });

  useEffect(() => {
    async function fetchPools() {
      if (!stakingPoolConfigs.length) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const poolPromises = stakingPoolConfigs.map(async (config) => {
          if (!config.address) {
            return null;
          }
          
          try {
            // 获取池子基本信息 - 使用默认值，因为这些hook可能还没有数据
             const stakedTokenAddr = (stakedToken as any)?.data as Address || config.address;
             const rewardTokenAddr = (rewardToken as any)?.data as Address || config.address;
             const rewardPerBlockValue = (rewardPerBlock as any)?.data as bigint || BigInt(1000000000000000000);
             const startBlockValue = (startBlock as any)?.data as bigint || BigInt(1000000);
             const bonusEndBlockValue = (bonusEndBlock as any)?.data as bigint || BigInt(2000000);
             const poolLimitPerUserValue = (poolLimitPerUser as any)?.data as bigint || BigInt(1000000000000000000000);
             const hasUserLimitValue = (hasUserLimit as any)?.data as boolean || true;

            // 获取用户信息（如果已连接钱包）
            let userStaked = BigInt(0);
            let pendingReward = BigInt(0);
            
            if (userAddress) {
               const userInfoResult = getUserInfo(userAddress);
               const userInfo = (userInfoResult as any)?.data;
               if (userInfo) {
                 userStaked = userInfo.amount || BigInt(0);
               }
               
               const pendingResult = getPendingReward(userAddress);
               const pending = (pendingResult as any)?.data as bigint;
               if (pending !== undefined) {
                 pendingReward = pending;
               }
             }

            // 计算池子状态
            const currentBlockNumber = BigInt(1500000); // 模拟当前区块，实际应该获取真实区块号
            const status = getPoolStatus(
              startBlockValue,
              bonusEndBlockValue,
              currentBlockNumber
            );

            // 计算APR
             const totalStaked = BigInt(10000000000000000000000); // 临时固定值，实际应该从合约获取
             const apr = calculateSmartChefAPR(
                rewardPerBlockValue,
                totalStaked,
                1, // 奖励代币价格，实际应该从价格预言机获取
                1  // 质押代币价格
              );

            return {
              ...config,
              address: config.address,
              stakedToken: stakedTokenAddr || config.address,
              rewardToken: rewardTokenAddr || config.address,
              rewardPerBlock: rewardPerBlockValue,
              startBlock: startBlockValue,
              bonusEndBlock: bonusEndBlockValue,
              poolLimitPerUser: poolLimitPerUserValue,
              hasUserLimit: hasUserLimitValue,
              totalStaked,
              apr,
              status,
              userStaked,
              pendingReward,
            };
          } catch (error) {
            console.error(`获取糖浆池 ${config.address} 信息失败:`, error);
            return null;
          }
        });

        const resolvedPools = (await Promise.all(poolPromises)).filter(Boolean) as StakingPool[];
        setPools(resolvedPools);
      } catch (err) {
        console.error('获取糖浆池数据失败:', err);
        setError('获取糖浆池数据失败');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPools();
  }, [stakingPoolConfigs, userAddress, smartChefAddress]);

  return {
    pools,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      // 触发重新获取
    },
  };
}

/**
 * 获取单个糖浆池信息的Hook
 */
export function useStakingPool(poolAddress: Address) {
  const { getUserInfo, getPendingReward } = useSmartChef();
  
  // 获取用户信息（需要连接钱包）
  const userInfoQuery = getUserInfo();
  
  // 获取待领取奖励（需要连接钱包）
  const pendingRewardQuery = getPendingReward();

  return {
    userInfo: userInfoQuery.data,
    pendingReward: pendingRewardQuery.data,
    isLoading: userInfoQuery.isLoading || pendingRewardQuery.isLoading,
    error: userInfoQuery.error || pendingRewardQuery.error,
  };
}

/**
 * 格式化池子状态显示
 */
export function formatPoolStatus(status: 'upcoming' | 'live' | 'finished'): {
  text: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'upcoming':
      return {
        text: '即将开始',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      };
    case 'live':
      return {
        text: '进行中',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      };
    case 'finished':
      return {
        text: '已结束',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      };
    default:
      return {
        text: '未知',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      };
  }
}

/**
 * 检查用户是否可以质押
 */
export function canUserStake(
  pool: StakingPool,
  userStaked: bigint,
  stakeAmount: bigint
): { canStake: boolean; reason?: string } {
  // 检查池子状态
  if (pool.status !== 'live') {
    return {
      canStake: false,
      reason: pool.status === 'upcoming' ? '池子尚未开始' : '池子已结束',
    };
  }

  // 检查用户限制
  if (pool.hasUserLimit) {
    const totalAfterStake = userStaked + stakeAmount;
    if (totalAfterStake > pool.poolLimitPerUser) {
      return {
        canStake: false,
        reason: `超出用户质押限制 (${pool.poolLimitPerUser.toString()})`,
      };
    }
  }

  return { canStake: true };
}

/**
 * 计算剩余时间
 */
export function calculateTimeRemaining(
  targetBlock: bigint,
  currentBlock: bigint,
  blockTime: number = 15 // 秒
): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const blocksRemaining = Number(targetBlock - currentBlock);
  const secondsRemaining = blocksRemaining * blockTime;

  const days = Math.floor(secondsRemaining / (24 * 60 * 60));
  const hours = Math.floor((secondsRemaining % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((secondsRemaining % (60 * 60)) / 60);
  const seconds = secondsRemaining % 60;

  return { days, hours, minutes, seconds };
}