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
import { Loader2, Plus } from 'lucide-react';

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStake: (amount: string) => Promise<void>;
  poolName: string;
  isKekePool: boolean;
  isLoading?: boolean;
}

/**
 * 质押弹窗组件
 * 用于质押LP代币或KEKE代币
 */
export default function StakeModal({
  isOpen,
  onClose,
  onStake,
  poolName,
  isKekePool,
  isLoading = false,
}: StakeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 处理质押提交
   */
  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的质押数量');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onStake(amount);
      setAmount('');
    } catch (err: any) {
      setError(err.message || '质押失败，请重试');
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
   * 设置最大数量（需要从钱包余额获取）
   */
  const handleMaxClick = () => {
    // TODO: 从钱包获取代币余额
    setAmount('100'); // 临时值
  };

  const tokenSymbol = isKekePool ? 'KEKE' : 'LP';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            质押到 {poolName}
          </DialogTitle>
          <DialogDescription>
            质押您的 {tokenSymbol} 代币开始赚取 KEKE 奖励
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 质押数量输入 */}
          <div className="space-y-2">
            <Label htmlFor="stake-amount">质押数量</Label>
            <div className="relative">
              <Input
                id="stake-amount"
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

          {/* 余额显示 */}
          <div className="text-sm text-gray-600">
            可用余额: -- {tokenSymbol}
          </div>

          {/* 预期收益信息 */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-1">
            <div className="text-sm font-medium text-blue-900">预期收益</div>
            <div className="text-xs text-blue-700">
              • 开始赚取 KEKE 代币奖励
              • 随时可以提取本金和奖励
              • 复利效应增加收益
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
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                质押中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                确认质押
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}