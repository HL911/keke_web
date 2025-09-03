'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAccount } from 'wagmi'
import { FarmPoolCard } from './components/FarmPoolCard'
import { DebugInfo } from './components/DebugInfo'
import { useAllFarmData, useUserFarmSummary } from './hooks/useFarmData'

export default function FarmPage() {
  const { isConnected } = useAccount()
  const { pools, totalPools, totalTVL } = useAllFarmData()
  const { totalStaked, totalPendingRewards, totalValue, activePools } = useUserFarmSummary()

  const handleRefresh = () => {
    // 刷新数据的逻辑可以在这里实现
    window.location.reload()
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          KekeSwap 农场
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          质押您的代币和LP代币，获得KEKE奖励。参与流动性挖矿，享受高收益回报。
        </p>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总矿池数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPools}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总锁定价值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalTVL.toLocaleString()}</div>
          </CardContent>
        </Card>

        {isConnected && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">我的质押</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStaked.toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">活跃矿池: {activePools}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">待领取奖励</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalPendingRewards.toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">KEKE</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Separator />

      {/* 调试信息 */}
      <DebugInfo />

      {/* 矿池列表 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">矿池列表</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {pools.length} 个活跃矿池
            </Badge>
          </div>
        </div>

        {pools.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pools.map((pool) => (
              <FarmPoolCard
                key={pool.id}
                pool={pool}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <div className="text-lg font-medium mb-2">暂无可用矿池</div>
                <div className="text-sm">矿池数据加载中，请稍候...</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 使用说明 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">如何使用农场？</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <h3 className="font-medium">选择矿池</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                选择您想要参与的矿池，查看APY和奖励信息
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <h3 className="font-medium">质押代币</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                质押KEKE代币或LP代币到矿池中开始赚取奖励
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <h3 className="font-medium">收获奖励</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                随时查看和领取您的KEKE奖励，或继续复投
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>实时收益计算</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>无锁定期限</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>复合收益</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>低手续费</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}