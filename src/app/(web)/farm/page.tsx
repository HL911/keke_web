'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from 'wagmi';
import { FarmPoolCard } from './components/FarmPoolCard';
import { StakingPoolCard } from './components/StakingPoolCard';
import { FarmStats } from './components/FarmStats';
import { useFarmPools, type FarmPool } from './hooks/useFarmPools';
import { useStakingPools, type StakingPool } from './hooks/useStakingPools';
import { Award, TrendingUp, Users, Coins } from 'lucide-react';

/**
 * Farm农场质押页面
 * 展示LP代币质押和单币质押功能
 */
export default function FarmPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('farms');
  
  const { 
    pools: farmPools, 
    isLoading: farmLoading, 
    error: farmError 
  } = useFarmPools();
  
  const { 
    pools: stakingPools, 
    isLoading: stakingLoading, 
    error: stakingError 
  } = useStakingPools();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          农场质押
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          质押LP代币或KEKE代币获得丰厚奖励
        </p>
      </div>

      {/* 统计信息 */}
      <FarmStats className="mb-8" />

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="farms" className="flex items-center gap-2">
            <span>🚜</span>
            农场 (LP质押)
            {farmPools && (
              <Badge variant="secondary" className="ml-1">
                {farmPools.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pools" className="flex items-center gap-2">
            <span>🏊</span>
            糖浆池 (单币质押)
            {stakingPools && (
              <Badge variant="secondary" className="ml-1">
                {stakingPools.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 农场页面 */}
        <TabsContent value="farms" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              LP代币农场
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                只显示质押中
              </Button>
              <Button variant="outline" size="sm">
                按APR排序
              </Button>
            </div>
          </div>

          {!isConnected ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">连接钱包开始质押</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    连接您的钱包以查看和管理您的农场质押
                  </p>
                  <Button>连接钱包</Button>
                </div>
              </CardContent>
            </Card>
          ) : farmLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : farmError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2 text-red-600">加载失败</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {farmError}
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : farmPools && farmPools.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {farmPools.map((pool: FarmPool) => (
                <FarmPoolCard key={pool.pid} pool={pool} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">暂无农场</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    目前没有可用的农场池，请稍后再试
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 糖浆池页面 */}
        <TabsContent value="pools" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              KEKE糖浆池
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                只显示质押中
              </Button>
              <Button variant="outline" size="sm">
                按APR排序
              </Button>
            </div>
          </div>

          {!isConnected ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">连接钱包开始质押</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    连接您的钱包以查看和管理您的糖浆池质押
                  </p>
                  <Button>连接钱包</Button>
                </div>
              </CardContent>
            </Card>
          ) : stakingLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stakingError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2 text-red-600">加载失败</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {stakingError}
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : stakingPools && stakingPools.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stakingPools.map((pool: StakingPool) => (
                <StakingPoolCard key={pool.address} pool={pool} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">暂无糖浆池</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    目前没有可用的糖浆池，请稍后再试
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}