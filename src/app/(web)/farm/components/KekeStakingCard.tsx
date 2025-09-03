'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMaster } from '@/hooks/useMaster';
import { KekeStakingPool, formatAPR, getPoolStatus } from '../hooks/useKekeStaking';
import { StakeModal } from './StakeModal';
import { ExternalLink, Plus, Minus, Coins } from 'lucide-react';
import { getKekeTokenConfig } from '@/hooks/tokens/useTokenConfig';
import { useTokenBalance } from '@/hooks/tokens/useTokenBalance';

interface KekeStakingCardProps {
  pool: KekeStakingPool;
}

/**
 * KEKE单币质押池卡片组件
 * 专门用于显示和操作KEKE代币质押（pid=0）
 */
export function KekeStakingCard({ pool }: KekeStakingCardProps) {
  const { address, isConnected } = useAccount();
  const { enterStaking, leaveStaking, isLoading } = useMaster();
  const kekeConfig = getKekeTokenConfig();
  const { balance: kekeBalance } = useTokenBalance({
    tokenAddress: kekeConfig.address,
    decimals: 18, // KEKE token decimals
    symbol: 'KEKE'
  });
  
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);

  // 处理快速质押
  const handleQuickStake = async () => {
    if (!isConnected || pool.userStaked === BigInt(0)) return;
    
    try {
      // 质押0数量来领取奖励
      await enterStaking('0');
    } catch (error) {
      console.error('领取奖励失败:', error);
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 border-blue-200 dark:border-blue-800">
        {/* 特殊标识 */}
        <div className="absolute top-4 right-4">
          <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            KEKE质押池
          </Badge>
        </div>

        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-transparent bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text">
                {pool.tokenSymbol} 单币质押
              </CardTitle>
              <p className="text-sm text-gray-500">质押KEKE获得KEKE奖励</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* APR显示 */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">APR</span>
            <span className="text-xl font-bold text-transparent bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text">
              {formatAPR(pool.apr)}
            </span>
          </div>

          {/* 总质押量 */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">总质押</span>
            <span className="text-sm font-medium">
              {Number(formatEther(pool.totalStaked)).toLocaleString()} KEKE
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
                <span className="text-sm text-gray-600">可用余额</span>
                <span className="text-sm font-medium">
                  {Number(formatEther(kekeBalance || BigInt(0))).toLocaleString()} KEKE
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">我的质押</span>
                <span className="text-sm font-medium">
                  {Number(formatEther(pool.userStaked)).toLocaleString()} KEKE
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">待领取奖励</span>
                <span className="text-sm font-medium text-green-600">
                  {Number(formatEther(pool.pendingReward)).toLocaleString()} KEKE
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => setShowStakeModal(true)}
                  disabled={isLoading || !kekeBalance || kekeBalance === BigInt(0)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  质押
                </Button>
                
                {pool.userStaked > BigInt(0) && (
                  <Button 
                    onClick={() => setShowUnstakeModal(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    取消质押
                  </Button>
                )}
              </div>

              {/* 领取奖励按钮 */}
              {pool.pendingReward > BigInt(0) && (
                <Button 
                  onClick={handleQuickStake}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-green-500 text-green-600 hover:bg-green-50"
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

      {/* 质押模态框 */}
      <StakeModal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        mode="stake"
        poolType="farm"
        poolId={0} // KEKE质押池固定为pid=0
        tokenAddress={kekeConfig.address}
        tokenSymbol="KEKE"
        userBalance={kekeBalance || BigInt(0)}
        userStaked={pool.userStaked}
      />

      {/* 取消质押模态框 */}
      <StakeModal
        isOpen={showUnstakeModal}
        onClose={() => setShowUnstakeModal(false)}
        mode="unstake"
        poolType="farm"
        poolId={0} // KEKE质押池固定为pid=0
        tokenAddress={kekeConfig.address}
        tokenSymbol="KEKE"
        userBalance={kekeBalance || BigInt(0)}
        userStaked={pool.userStaked}
      />
    </>
  );
}