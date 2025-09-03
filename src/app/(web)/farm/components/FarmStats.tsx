'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReadContract } from 'wagmi';
import { Address, formatEther } from 'viem';
import { useMaster } from '@/hooks/useMaster';
import { useKekeTokenAddress } from '@/hooks/useContract';
import { Award, TrendingUp, Users, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FarmStatsProps {
  className?: string;
}

/**
 * 农场统计信息组件
 * 显示总锁仓价值、总奖励等关键指标
 */
export function FarmStats({ className }: FarmStatsProps) {
  const { kekePerBlock, totalAllocPoint } = useMaster();
  const kekeTokenAddress = useKekeTokenAddress();

  // 获取KEKE代币总供应量
  const { data: totalSupply } = useReadContract({
    address: kekeTokenAddress as Address,
    abi: [
      {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'totalSupply',
    query: {
      enabled: !!kekeTokenAddress,
    },
  });

  // 计算每日KEKE产出
  const dailyKekeEmission = kekePerBlock ? 
    Number(formatEther(kekePerBlock as bigint)) * 6400 : 0; // 假设每天6400个区块

  const stats = [
    {
      title: 'KEKE每区块产出',
      value: kekePerBlock ? `${formatEther(kekePerBlock as bigint)} KEKE` : '--',
      description: '每个区块产出的KEKE代币数量',
      icon: '⚡',
      loading: !kekePerBlock,
    },
    {
      title: '每日KEKE产出',
      value: dailyKekeEmission ? `${dailyKekeEmission.toLocaleString()} KEKE` : '--',
      description: '预计每日产出的KEKE代币总量',
      icon: '📅',
      loading: !kekePerBlock,
    },
    {
      title: '总分配点数',
      value: totalAllocPoint ? totalAllocPoint.toString() : '--',
      description: '所有农场池的分配点数总和',
      icon: '🎯',
      loading: !totalAllocPoint,
    },
    {
      title: 'KEKE总供应量',
      value: totalSupply ? `${Number(formatEther(totalSupply as bigint)).toLocaleString()} KEKE` : '--',
      description: 'KEKE代币的总供应量',
      icon: '💰',
      loading: !totalSupply,
    },
  ];

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {stat.title}
            </CardTitle>
            <span className="text-2xl">{stat.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stat.loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stat.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 简化版农场统计组件
 */
export function SimpleFarmStats() {
  const { kekePerBlock } = useMaster();
  
  return (
    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-1">
        <span>⚡</span>
        <span>每区块: {kekePerBlock ? formatEther(kekePerBlock as bigint) : '--'} KEKE</span>
      </div>
      <div className="flex items-center gap-1">
        <span>📅</span>
        <span>每日: {kekePerBlock ? (Number(formatEther(kekePerBlock as bigint)) * 6400).toLocaleString() : '--'} KEKE</span>
      </div>
    </div>
  );
}