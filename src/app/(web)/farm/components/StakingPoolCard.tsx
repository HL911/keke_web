'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useSmartChef } from '@/hooks/useSmartChef';
import { StakingPool, formatPoolStatus, calculateTimeRemaining } from '../hooks/useStakingPools';
import { Plus, Minus, Clock, Users, ExternalLink } from 'lucide-react';

interface StakingPoolCardProps {
  pool: StakingPool;
}

/**
 * 质押池卡片组件
 * 显示单代币质押池的信息和操作
 */
export function StakingPoolCard({ pool }: StakingPoolCardProps) {
  const { address, isConnected } = useAccount();
  const { deposit, withdraw, isLoading } = useSmartChef();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeDialog, setShowStakeDialog] = useState(false);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);

  // 处理质押
  const handleStake = async () => {
    if (!stakeAmount || !isConnected) return;
    
    try {
      await deposit(stakeAmount);
      setStakeAmount('');
      setShowStakeDialog(false);
    } catch (error) {
      console.error('质押失败:', error);
    }
  };

  // 处理取消质押
  const handleUnstake = async () => {
    if (!unstakeAmount || !isConnected) return;
    
    try {
      await withdraw(unstakeAmount);
      setUnstakeAmount('');
      setShowUnstakeDialog(false);
    } catch (error) {
      console.error('取消质押失败:', error);
    }
  };

  // 设置最大金额
  const setMaxStakeAmount = () => {
    // 这里应该获取用户的代币余额
    // 暂时设置为示例值
    setStakeAmount('1000');
  };

  const setMaxUnstakeAmount = () => {
    setUnstakeAmount(formatEther(pool.userStaked));
  };

  // 计算池子进度
  const poolProgress = pool.bonusEndBlock > pool.startBlock 
    ? Math.min(100, ((Date.now() / 1000 - Number(pool.startBlock)) / (Number(pool.bonusEndBlock) - Number(pool.startBlock))) * 100)
    : 0;

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '进行中': return 'default';
      case '即将开始': return 'secondary';
      case '已结束': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* 池子状态指示器 */}
      <div className="absolute top-4 right-4">
        <Badge variant={getStatusColor(pool.status)}>
          {pool.status}
        </Badge>
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {/* 代币图标 */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
            {pool.stakedTokenSymbol.charAt(0)}
          </div>
          <div>
            <CardTitle className="text-lg">{pool.stakedTokenSymbol} 质押池</CardTitle>
            <p className="text-sm text-gray-500">质押 {pool.stakedTokenSymbol}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* APR显示 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">APR</span>
          <span className="text-lg font-bold text-green-600">
            {pool.apr.toFixed(2)}%
          </span>
        </div>

        {/* 池子进度 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">池子进度</span>
            <span className="text-sm font-medium">{poolProgress.toFixed(1)}%</span>
          </div>
          <Progress value={poolProgress} className="h-2" />
        </div>

        {/* 时间信息 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            剩余时间
          </span>
          <span className="text-sm font-medium">
            {formatPoolStatus(pool.status).text}
          </span>
        </div>

        {/* 总质押量 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">总质押</span>
          <span className="text-sm font-medium">
            {Number(formatEther(pool.totalStaked)).toLocaleString()} {pool.stakedTokenSymbol}
          </span>
        </div>

        {/* 奖励代币 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Users className="w-3 h-3" />
            奖励代币
          </span>
          <span className="text-sm font-medium">
            {pool.rewardTokenSymbol}
          </span>
        </div>

        {/* 用户限制 */}
        {pool.hasUserLimit && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">个人限额</span>
            <span className="text-sm font-medium">
              {Number(formatEther(pool.poolLimitPerUser)).toLocaleString()} {pool.stakedTokenSymbol}
            </span>
          </div>
        )}

        <Separator />

        {/* 用户信息 */}
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">我的质押</span>
              <span className="text-sm font-medium">
                {Number(formatEther(pool.userStaked)).toLocaleString()} {pool.stakedTokenSymbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">待领取奖励</span>
              <span className="text-sm font-medium text-green-600">
                {Number(formatEther(pool.pendingReward)).toLocaleString()} {pool.rewardTokenSymbol}
              </span>
            </div>

            {/* 操作按钮 */}
            {pool.status === 'live' && (
              <div className="flex gap-2">
                <Dialog open={showStakeDialog} onOpenChange={setShowStakeDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex-1" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      质押
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>质押 {pool.stakedTokenSymbol}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">质押数量</label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                          />
                          <Button variant="outline" onClick={setMaxStakeAmount}>
                            最大
                          </Button>
                        </div>
                        {pool.hasUserLimit && (
                          <p className="text-xs text-gray-500 mt-1">
                            个人限额: {Number(formatEther(pool.poolLimitPerUser)).toLocaleString()} {pool.stakedTokenSymbol}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleStake} 
                          disabled={!stakeAmount || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? '处理中...' : '确认质押'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowStakeDialog(false)}
                          className="flex-1"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showUnstakeDialog} onOpenChange={setShowUnstakeDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      size="sm"
                      disabled={pool.userStaked === BigInt(0)}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      取消质押
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>取消质押 {pool.stakedTokenSymbol}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">取消质押数量</label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={unstakeAmount}
                            onChange={(e) => setUnstakeAmount(e.target.value)}
                          />
                          <Button variant="outline" onClick={setMaxUnstakeAmount}>
                            最大
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleUnstake} 
                          disabled={!unstakeAmount || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? '处理中...' : '确认取消质押'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowUnstakeDialog(false)}
                          className="flex-1"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* 领取奖励按钮 */}
            {pool.pendingReward > BigInt(0) && (
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => handleStake()} // 质押0数量来领取奖励
              >
                领取 {Number(formatEther(pool.pendingReward)).toLocaleString()} {pool.rewardTokenSymbol}
              </Button>
            )}

            {/* 池子状态提示 */}
            {pool.status !== 'live' && (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">
                  {pool.status === 'upcoming' ? '池子尚未开始' : '池子已结束'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">连接钱包以开始质押</p>
            <Button size="sm">连接钱包</Button>
          </div>
        )}

        {/* 查看详情链接 */}
        <div className="flex justify-center pt-2">
          <Button variant="ghost" size="sm" className="text-xs">
            <ExternalLink className="w-3 h-3 mr-1" />
            查看合约
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}