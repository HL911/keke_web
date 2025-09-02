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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Minus } from 'lucide-react';

interface UnstakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnstake: (amount: string) => Promise<void>;
  poolName: string;
  stakedAmount: string;
  isKekePool: boolean;
  isLoading?: boolean;
}

/**
 * 取消质押弹窗组件
 * 用于提取已质押的LP代币或KEKE代币
 */
export default function UnstakeModal({
  isOpen,
  onClose,
  onUnstake,
  poolName,
  stakedAmount,
  isKekePool,
  isLoading = false,
}: UnstakeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 处理取消质押提交
   */
  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的提取数量');
      return;
    }

    if (parseFloat(amount) > parseFloat(stakedAmount)) {
      setError('提取数量不能超过已质押数量');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUnstake(amount);
      setAmount('');
    } catch (err: any) {
      setError(err.message || '提取失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理弹窗关闭
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('');
      setError(null);
      onClose();
    }
  };

  /**
   * 设置最大提取数量
   */
  const handleMaxClick = () => {
    setAmount(stakedAmount);
  };

  /**
   * 设置25%、50%、75%提取
   */
  const handlePercentageClick = (percentage: number) => {
    const withdrawAmount = (parseFloat(stakedAmount) * percentage / 100).toFixed(6);
    setAmount(withdrawAmount);
  };

  const tokenSymbol = isKekePool ? 'KEKE' : 'LP';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="w-5 h-5 text-orange-600" />
            从 {poolName} 提取
          </DialogTitle>
          <DialogDescription>
            提取您质押的 {tokenSymbol} 代币，同时收获已获得的奖励
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 提取数量输入 */}
          <div className="space-y-2">
            <Label htmlFor="unstake-amount">提取数量</Label>
            <div className="relative">
              <Input
                id="unstake-amount"
                type="number"
                placeholder={`输入 ${tokenSymbol} 数量`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="pr-16"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 px-2 text-xs"
                onClick={handleMaxClick}
                disabled={isSubmitting || isLoading}
              >
                最大
              </Button>
            </div>
          </div>

          {/* 已质押数量显示 */}
          <div className="text-sm text-gray-600">
            已质押: {parseFloat(stakedAmount).toFixed(4)} {tokenSymbol}
          </div>

          {/* 快速选择按钮 */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(25)}
              disabled={isSubmitting || isLoading}
            >
              25%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(50)}
              disabled={isSubmitting || isLoading}
            >
              50%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePercentageClick(75)}
              disabled={isSubmitting || isLoading}
            >
              75%
            </Button>
          </div>

          {/* 提取说明 */}
          <div className="bg-yellow-50 rounded-lg p-3 space-y-1">
            <div className="text-sm font-medium text-yellow-900">提取说明</div>
            <div className="text-xs text-yellow-700">
              • 提取时会自动收获所有待收获的奖励
              • 提取后该部分代币将停止产生奖励
              • 可以随时重新质押
            </div>
          </div>

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
            disabled={isSubmitting || isLoading || !amount || parseFloat(amount) <= 0}
            variant="destructive"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提取中...
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 mr-2" />
                确认提取
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}