'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react';

interface FarmStatsProps {
  totalValueLocked: string;
  totalUsers: number;
  averageApr: number;
  totalRewardsDistributed: string;
  isLoading?: boolean;
}

/**
 * 农场统计数据组件
 * 显示总锁定价值、用户数量、平均APR等关键指标
 */
export default function FarmStats({
  totalValueLocked,
  totalUsers,
  averageApr,
  totalRewardsDistributed,
  isLoading = false,
}: FarmStatsProps) {
  const stats = [
    {
      title: '总锁定价值',
      value: isLoading ? '' : `$${parseFloat(totalValueLocked).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'TVL',
    },
    {
      title: '活跃农场用户',
      value: isLoading ? '' : totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: '用户',
    },
    {
      title: '平均年化收益率',
      value: isLoading ? '' : `${averageApr.toFixed(2)}%`,
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'APR',
    },
    {
      title: '累计奖励分发',
      value: isLoading ? '' : `${parseFloat(totalRewardsDistributed).toLocaleString()} KEKE`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: '奖励',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * 农场统计数据骨架屏组件
 */
export function FarmStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}