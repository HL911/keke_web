'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useMaster } from '@/hooks/useMaster';
import { FarmPool, formatAPR } from '../hooks/useFarmPools';
import { Plus, Minus, ExternalLink } from 'lucide-react';

interface FarmPoolCardProps {
  pool: FarmPool;
}

/**
 * 农场池卡片组件
 * 显示LP代币质押池的信息和操作
 */
export function FarmPoolCard({ pool }: FarmPoolCardProps) {
  const { address, isConnected } = useAccount();
  const { deposit, withdraw, isLoading } = useMaster();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeDialog, setShowStakeDialog] = useState(false);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);

  // 处理质押
  const handleStake = async () => {
    if (!stakeAmount || !isConnected) return;
    
    try {
      await deposit(pool.pid, stakeAmount);
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
      await withdraw(pool.pid, unstakeAmount);
      setUnstakeAmount('');
      setShowUnstakeDialog(false);
    } catch (error) {
      console.error('取消质押失败:', error);
    }
  };

  // 设置最大金额
  const setMaxStakeAmount = () => {
    // 这里应该获取用户的LP代币余额
    // 暂时设置为示例值
    setStakeAmount('100');
  };

  const setMaxUnstakeAmount = () => {
    setUnstakeAmount(formatEther(pool.userStaked));
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* 池子状态指示器 */}
      <div className="absolute top-4 right-4">
        <Badge variant={pool.allocPoint > BigInt(0) ? 'default' : 'secondary'}>
          {pool.allocPoint > BigInt(0) ? '活跃' : '非活跃'}
        </Badge>
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {/* 代币图标占位符 */}
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
              {pool.token0Symbol.charAt(0)}
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
              {pool.token1Symbol.charAt(0)}
            </div>
          </div>
          <div>
            <CardTitle className="text-lg">{pool.lpTokenSymbol}</CardTitle>
            <p className="text-sm text-gray-500">{pool.token0Symbol}-{pool.token1Symbol}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* APR显示 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">APR</span>
          <span className="text-lg font-bold text-green-600">
            {formatAPR(pool.apr)}
          </span>
        </div>

        {/* 总质押量 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">总质押</span>
          <span className="text-sm font-medium">
            {Number(formatEther(pool.totalStaked)).toLocaleString()} LP
          </span>
        </div>

        {/* 分配点数 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">分配点数</span>
          <span className="text-sm font-medium">
            {pool.allocPoint.toString()}
          </span>
        </div>

        <Separator />

        {/* 用户信息 */}
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">我的质押</span>
              <span className="text-sm font-medium">
                {Number(formatEther(pool.userStaked)).toLocaleString()} LP
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">待领取奖励</span>
              <span className="text-sm font-medium text-green-600">
                {Number(formatEther(pool.pendingReward)).toLocaleString()} KEKE
              </span>
            </div>

            {/* 操作按钮 */}
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
                    <DialogTitle>质押 {pool.lpTokenSymbol}</DialogTitle>
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
                    <DialogTitle>取消质押 {pool.lpTokenSymbol}</DialogTitle>
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

            {/* 领取奖励按钮 */}
            {pool.pendingReward > BigInt(0) && (
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => handleStake()} // 质押0数量来领取奖励
              >
                领取 {Number(formatEther(pool.pendingReward)).toLocaleString()} KEKE
              </Button>
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