'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Coins } from 'lucide-react';

interface HarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHarvest: () => Promise<void>;
  poolName: string;
  pendingRewards: string;
  isLoading?: boolean;
}

/**
 * 收获奖励弹窗组件
 * 用于收获已获得的KEKE代币奖励
 */
export default function HarvestModal({
  isOpen,
  onClose,
  onHarvest,
  poolName,
  pendingRewards,
  isLoading = false,
}: HarvestModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 处理收获提交
   */
  const handleSubmit = async () => {
    if (parseFloat(pendingRewards) <= 0) {
      setError('暂无可收获的奖励');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onHarvest();
    } catch (err: any) {
      setError(err.message || '收获失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理弹窗关闭
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  const hasRewards = parseFloat(pendingRewards) > 0;
  const rewardsDisplay = parseFloat(pendingRewards).toFixed(6);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-600" />
            收获 {poolName} 奖励
          </DialogTitle>
          <DialogDescription>
            收获您在农场池中获得的 KEKE 代币奖励
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 待收获奖励显示 */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">待收获奖励</div>
              <div className="text-3xl font-bold text-yellow-600">
                {rewardsDisplay}
              </div>
              <div className="text-sm text-gray-500">KEKE</div>
            </div>
          </div>

          {/* 奖励价值估算 */}
          <div className="text-center text-sm text-gray-600">
            预估价值: ~$-- USD
          </div>

          {/* 收获说明 */}
          <div className="bg-green-50 rounded-lg p-3 space-y-1">
            <div className="text-sm font-medium text-green-900">收获说明</div>
            <div className="text-xs text-green-700">
              • 收获不会影响您的质押本金
              • 收获后奖励将转入您的钱包
              • 质押继续产生新的奖励
              • 建议定期收获以复利投资
            </div>
          </div>

          {/* 无奖励提示 */}
          {!hasRewards && (
            <Alert>
              <AlertDescription>
                暂无可收获的奖励。继续质押以获得更多 KEKE 代币奖励！
              </AlertDescription>
            </Alert>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || !hasRewards}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                收获中...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                收获奖励
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}