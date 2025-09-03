'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { FarmPoolData } from '../hooks/useFarmData'
import { useDeposit, useWithdraw, useEnterStaking, useLeaveStaking } from '@/hooks/useMaster'
import { useTokenApproval } from '@/hooks/useTokenApproval'

interface FarmPoolCardProps {
  pool: FarmPoolData
  onRefresh?: () => void
}

export function FarmPoolCard({ pool, onRefresh }: FarmPoolCardProps) {
  const { address, isConnected } = useAccount()
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [activeTab, setActiveTab] = useState('stake')

  // 合约交互hooks
  const { deposit, isPending: isDepositing } = useDeposit()
  const { withdraw, isPending: isWithdrawing } = useWithdraw()
  const { enterStaking, isPending: isEnteringStaking } = useEnterStaking()
  const { leaveStaking, isPending: isLeavingStaking } = useLeaveStaking()
  const { approve, isApproved, isPending: isApproving } = useTokenApproval(pool.lpTokenAddress)

  const handleStake = async () => {
    if (!isConnected) {
      toast.error('请先连接钱包')
      return
    }

    if (!stakeAmount || Number(stakeAmount) <= 0) {
      toast.error('请输入有效的质押数量')
      return
    }

    if (Number(stakeAmount) > Number(pool.userBalance)) {
      toast.error('质押数量超过可用余额')
      return
    }

    try {
      if (pool.isKekePool) {
        // KEKE单币质押
        await enterStaking(stakeAmount)
      } else {
        // LP代币质押
        if (!isApproved) {
          toast.error('请先授权代币')
          return
        }
        await deposit(pool.id, stakeAmount)
      }
      
      setStakeAmount('')
      onRefresh?.()
    } catch (error) {
      console.error('质押失败:', error)
    }
  }

  const handleUnstake = async () => {
    if (!isConnected) {
      toast.error('请先连接钱包')
      return
    }

    if (!unstakeAmount || Number(unstakeAmount) <= 0) {
      toast.error('请输入有效的解质押数量')
      return
    }

    if (Number(unstakeAmount) > Number(pool.userStaked)) {
      toast.error('解质押数量超过已质押数量')
      return
    }

    try {
      if (pool.isKekePool) {
        // KEKE单币解质押
        await leaveStaking(unstakeAmount)
      } else {
        // LP代币解质押
        await withdraw(pool.id, unstakeAmount)
      }
      
      setUnstakeAmount('')
      onRefresh?.()
    } catch (error) {
      console.error('解质押失败:', error)
    }
  }

  const handleApprove = async () => {
    if (!isConnected) {
      toast.error('请先连接钱包')
      return
    }

    try {
      await approve()
      toast.success('授权成功')
    } catch (error) {
      console.error('授权失败:', error)
    }
  }

  const handleMaxStake = () => {
    setStakeAmount(pool.userBalance)
  }

  const handleMaxUnstake = () => {
    setUnstakeAmount(pool.userStaked)
  }

  const isLoading = isDepositing || isWithdrawing || isEnteringStaking || isLeavingStaking || isApproving

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">{pool.name}</CardTitle>
            {pool.isKekePool && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                单币池
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{pool.apy.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">APY</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{pool.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 池子信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">总质押量</div>
            <div className="font-medium">{Number(pool.totalStaked).toFixed(4)} {pool.symbol}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">TVL</div>
            <div className="font-medium">${pool.tvl}</div>
          </div>
        </div>

        <Separator />

        {/* 用户信息 */}
        {isConnected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">已质押</div>
                <div className="font-medium">{Number(pool.userStaked).toFixed(4)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">待领取奖励</div>
                <div className="font-medium text-green-600">{Number(pool.pendingRewards).toFixed(4)} KEKE</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">可用余额</div>
                <div className="font-medium">{Number(pool.userBalance).toFixed(4)}</div>
              </div>
            </div>

            <Separator />

            {/* 操作区域 */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stake">质押</TabsTrigger>
                <TabsTrigger value="unstake">解质押</TabsTrigger>
              </TabsList>

              <TabsContent value="stake" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">质押数量</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMaxStake}
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                    >
                      最大值
                    </Button>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {!pool.isKekePool && !isApproved && (
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="w-full"
                  >
                    {isApproving ? '授权中...' : '授权代币'}
                  </Button>
                )}

                <Button
                  onClick={handleStake}
                  disabled={isLoading || (!pool.isKekePool && !isApproved) || !stakeAmount}
                  className="w-full"
                >
                  {isLoading ? '处理中...' : '质押'}
                </Button>
              </TabsContent>

              <TabsContent value="unstake" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">解质押数量</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMaxUnstake}
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                    >
                      最大值
                    </Button>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={handleUnstake}
                  disabled={isLoading || !unstakeAmount}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? '处理中...' : '解质押'}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!isConnected && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">请连接钱包以查看详细信息</p>
            <w3m-button />
          </div>
        )}
      </CardContent>
    </Card>
  )
}