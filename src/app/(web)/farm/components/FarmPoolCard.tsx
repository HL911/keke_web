'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Users, Coins, Plus, Minus, Award } from 'lucide-react';
import { FarmPool } from '@/hooks/useFarm';
import StakeModal from './StakeModal';
import UnstakeModal from './UnstakeModal';
import HarvestModal from './HarvestModal';

interface FarmPoolCardProps {
  pool: FarmPool;
  onStake: (poolId: number, amount: string) => Promise<void>;
  onUnstake: (poolId: number, amount: string) => Promise<void>;
  onHarvest: (poolId: number) => Promise<void>;
  isLoading?: boolean;
}

/**
 * 农场池卡片组件
 * 显示单个农场池的信息和操作按钮
 */
export default function FarmPoolCard({ 
  pool, 
  onStake, 
  onUnstake, 
  onHarvest, 
  isLoading = false 
}: FarmPoolCardProps) {
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);

  const hasStaked = parseFloat(pool.userStaked) > 0;
  const hasPendingReward = parseFloat(pool.userPendingReward) > 0;

  /**
   * 处理质押
   */
  const handleStake = async (amount: string) => {
    try {
      await onStake(pool.id, amount);
      setShowStakeModal(false);
    } catch (error) {
      console.error('质押失败:', error);
    }
  };

  /**
   * 处理取消质押
   */
  const handleUnstake = async (amount: string) => {
    try {
      await onUnstake(pool.id, amount);
      setShowUnstakeModal(false);
    } catch (error) {
      console.error('取消质押失败:', error);
    }
  };

  /**
   * 处理收获奖励
   */
  const handleHarvest = async () => {
    try {
      await onHarvest(pool.id);
      setShowHarvestModal(false);
    } catch (error) {
      console.error('收获奖励失败:', error);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🌾</span>
              </div>
              {pool.name}
            </CardTitle>
            <Badge variant={pool.isKekePool ? "default" : "secondary"}>
              {pool.isKekePool ? 'KEKE' : 'LP'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 池子统计信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-gray-600">APY</span>
              </div>
              <p className="text-lg font-bold text-green-600">{pool.apy}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Coins className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-sm text-gray-600">TVL</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{pool.tvl}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-sm text-gray-600">质押用户</span>
            </div>
            <p className="text-sm font-semibold">{pool.stakedUsers.toLocaleString()}</p>
          </div>
          
          <Separator />
          
          {/* 用户信息 */}
          {hasStaked && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">已质押</span>
                <span className="font-semibold">{parseFloat(pool.userStaked).toFixed(4)}</span>
              </div>
              
              {hasPendingReward && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">待收获</span>
                  <span className="font-semibold text-green-600">
                    {parseFloat(pool.userPendingReward).toFixed(4)} KEKE
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="space-y-2">
            {!hasStaked ? (
              <Button 
                className="w-full" 
                onClick={() => setShowStakeModal(true)}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                质押代币
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowStakeModal(true)}
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowUnstakeModal(true)}
                  disabled={isLoading}
                >
                  <Minus className="w-4 h-4 mr-1" />
                  提取
                </Button>
              </div>
            )}
            
            {hasPendingReward && (
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => setShowHarvestModal(true)}
                disabled={isLoading}
              >
                <Award className="w-4 h-4 mr-2" />
                收获奖励
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 质押弹窗 */}
      <StakeModal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        onStake={handleStake}
        poolName={pool.name}
        isKekePool={pool.isKekePool}
        isLoading={isLoading}
      />
      
      {/* 取消质押弹窗 */}
      <UnstakeModal
        isOpen={showUnstakeModal}
        onClose={() => setShowUnstakeModal(false)}
        onUnstake={handleUnstake}
        poolName={pool.name}
        stakedAmount={pool.userStaked}
        isKekePool={pool.isKekePool}
        isLoading={isLoading}
      />
      
      {/* 收获奖励弹窗 */}
      <HarvestModal
        isOpen={showHarvestModal}
        onClose={() => setShowHarvestModal(false)}
        onHarvest={handleHarvest}
        poolName={pool.name}
        pendingRewards={pool.userPendingReward}
        isLoading={isLoading}
      />
    </>
  );
}