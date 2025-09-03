'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMaster } from '@/hooks/useMaster';
import { useSmartChef } from '@/hooks/useSmartChef';
import { Loader2, Award } from 'lucide-react';

interface HarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolType: 'farm' | 'staking';
  poolId: number;
  poolAddress?: string;
  pendingReward: bigint;
  rewardTokenSymbol: string;
}

/**
 * 收获奖励模态框组件
 * 用于收获农场或糖浆池的待领取奖励
 */
export function HarvestModal({
  isOpen,
  onClose,
  poolType,
  poolId,
  poolAddress,
  pendingReward,
  rewardTokenSymbol,
}: HarvestModalProps) {
  const { address, isConnected } = useAccount();
  const { harvest: harvestFarm, isLoading: farmLoading } = useMaster();
  const { harvest: harvestStaking, isLoading: stakingLoading } = useSmartChef();
  const [error, setError] = useState<string | null>(null);

  const isLoading = farmLoading || stakingLoading;
  const rewardAmount = formatEther(pendingReward);

  /**
   * 处理收获奖励
   */
  const handleHarvest = async () => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    if (pendingReward === BigInt(0)) {
      setError('没有可收获的奖励');
      return;
    }

    try {
      setError(null);
      
      if (poolType === 'farm') {
        await harvestFarm(poolId);
      } else if (poolType === 'staking' && poolAddress) {
        await harvestStaking(poolAddress);
      }
      
      onClose();
    } catch (err: any) {
      console.error('收获失败:', err);
      setError(err.message || '收获失败，请重试');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            收获奖励
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 奖励信息 */}
          <div className="text-center space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              待收获奖励
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Number(rewardAmount).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              })} {rewardTokenSymbol}
            </div>
            <div className="text-xs text-gray-500">
              池子类型: {poolType === 'farm' ? '农场' : '糖浆池'}
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleHarvest}
              className="flex-1"
              disabled={isLoading || pendingReward === BigInt(0) || !isConnected}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  收获中...
                </>
              ) : (
                '收获奖励'
              )}
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-gray-500 text-center">
            收获奖励将直接发送到您的钱包地址
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 简化版收获按钮组件
 */
interface HarvestButtonProps {
  poolType: 'farm' | 'staking';
  poolId: number;
  poolAddress?: string;
  pendingReward: bigint;
  rewardTokenSymbol: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

export function HarvestButton({
  poolType,
  poolId,
  poolAddress,
  pendingReward,
  rewardTokenSymbol,
  size = 'sm',
  variant = 'outline',
}: HarvestButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const hasReward = pendingReward > BigInt(0);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        disabled={!hasReward}
        className={hasReward ? 'text-green-600 border-green-600 hover:bg-green-50' : ''}
      >
        <Award className="mr-1 h-3 w-3" />
        收获
      </Button>
      
      <HarvestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        poolType={poolType}
        poolId={poolId}
        poolAddress={poolAddress}
        pendingReward={pendingReward}
        rewardTokenSymbol={rewardTokenSymbol}
      />
    </>
  );
}