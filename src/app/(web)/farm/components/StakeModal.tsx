'use client';

import { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMaster } from '@/hooks/useMaster';
import { useSmartChef } from '@/hooks/useSmartChef';
import { Loader2, Plus, Minus } from 'lucide-react';

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'stake' | 'unstake';
  poolType: 'farm' | 'staking';
  poolId: number;
  poolAddress?: string;
  tokenAddress: string;
  tokenSymbol: string;
  userBalance: bigint;
  userStaked: bigint;
  maxStakeLimit?: bigint;
}

/**
 * 质押/取消质押模态框组件
 * 用于农场LP代币质押和糖浆池单币质押
 */
export function StakeModal({
  isOpen,
  onClose,
  mode,
  poolType,
  poolId,
  poolAddress,
  tokenAddress,
  tokenSymbol,
  userBalance,
  userStaked,
  maxStakeLimit,
}: StakeModalProps) {
  const { address, isConnected } = useAccount();
  const { deposit, withdraw, enterStaking, leaveStaking, isLoading: farmLoading } = useMaster();
  const { deposit: stakeDeposit, withdraw: stakeWithdraw, isLoading: stakingLoading } = useSmartChef();
  
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isLoading = farmLoading || stakingLoading;
  const isStakeMode = mode === 'stake';
  const maxAmount = isStakeMode ? userBalance : userStaked;
  const maxAmountFormatted = formatEther(maxAmount);

  // 获取代币授权额度
  const { data: allowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'allowance',
    args: [
      address as `0x${string}`,
      poolType === 'farm' ? poolAddress as `0x${string}` : poolAddress as `0x${string}`,
    ],
    query: {
      enabled: !!address && !!tokenAddress && isStakeMode,
    },
  });

  /**
   * 验证输入金额
   */
  const validateAmount = (value: string): string | null => {
    if (!value || value === '0') {
      return '请输入有效金额';
    }

    try {
      const amountBigInt = parseEther(value);
      
      if (amountBigInt <= BigInt(0)) {
        return '金额必须大于0';
      }

      if (amountBigInt > maxAmount) {
        return `金额不能超过 ${maxAmountFormatted} ${tokenSymbol}`;
      }

      // 检查质押限制
      if (isStakeMode && maxStakeLimit && (userStaked + amountBigInt) > maxStakeLimit) {
        const remainingLimit = maxStakeLimit - userStaked;
        return `超过质押限制，最多还能质押 ${formatEther(remainingLimit)} ${tokenSymbol}`;
      }

      // 检查授权额度
      if (isStakeMode && allowance && amountBigInt > (allowance as bigint)) {
        return '授权额度不足，请先授权';
      }

      return null;
    } catch {
      return '无效的金额格式';
    }
  };

  /**
   * 处理质押/取消质押
   */
  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      
      if (poolType === 'farm') {
        // 检查是否为KEKE单币质押池（pid=0）
        if (poolId === 0) {
          // KEKE单币质押使用特殊函数
          if (isStakeMode) {
            await enterStaking(amount);
          } else {
            await leaveStaking(amount);
          }
        } else {
          // LP代币质押使用普通函数
          if (isStakeMode) {
            await deposit(poolId, amount);
          } else {
            await withdraw(poolId, amount);
          }
        }
      } else if (poolType === 'staking' && poolAddress) {
        if (isStakeMode) {
          await stakeDeposit(amount);
        } else {
          await stakeWithdraw(amount);
        }
      }
      
      setAmount('');
      onClose();
    } catch (err: any) {
      console.error(`${isStakeMode ? '质押' : '取消质押'}失败:`, err);
      setError(err.message || `${isStakeMode ? '质押' : '取消质押'}失败，请重试`);
    }
  };

  /**
   * 设置最大金额
   */
  const handleMaxClick = () => {
    setAmount(maxAmountFormatted);
    setError(null);
  };

  /**
   * 处理金额输入变化
   */
  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (error) {
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-transparent bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text font-bold">
            {isStakeMode ? (
              <Plus className="h-5 w-5 text-blue-500" />
            ) : (
              <Minus className="h-5 w-5 text-purple-500" />
            )}
            {isStakeMode ? '质押' : '取消质押'} {tokenSymbol}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 余额信息 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {isStakeMode ? '可用余额:' : '已质押:'}
              </span>
              <span className="font-medium">
                {Number(maxAmountFormatted).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                })} {tokenSymbol}
              </span>
            </div>
            
            {maxStakeLimit && isStakeMode && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  质押限制:
                </span>
                <span className="font-medium">
                  {Number(formatEther(maxStakeLimit)).toLocaleString()} {tokenSymbol}
                </span>
              </div>
            )}
          </div>

          {/* 金额输入 */}
          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pr-16"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 px-2 text-xs"
                onClick={handleMaxClick}
              >
                最大
              </Button>
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
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
              disabled={isLoading || !amount || !isConnected}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isStakeMode ? '质押中...' : '取消质押中...'}
                </>
              ) : (
                `确认${isStakeMode ? '质押' : '取消质押'}`
              )}
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-gray-500 text-center">
            {isStakeMode
              ? '质押后将开始获得奖励'
              : '取消质押将停止获得奖励'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 快捷质押按钮组件
 */
interface QuickStakeButtonProps {
  mode: 'stake' | 'unstake';
  poolType: 'farm' | 'staking';
  poolId: number;
  poolAddress?: string;
  tokenAddress: string;
  tokenSymbol: string;
  userBalance: bigint;
  userStaked: bigint;
  maxStakeLimit?: bigint;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

export function QuickStakeButton({
  mode,
  poolType,
  poolId,
  poolAddress,
  tokenAddress,
  tokenSymbol,
  userBalance,
  userStaked,
  maxStakeLimit,
  size = 'sm',
  variant = 'outline',
}: QuickStakeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const isStakeMode = mode === 'stake';
  const hasAmount = isStakeMode ? userBalance > BigInt(0) : userStaked > BigInt(0);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        disabled={!hasAmount}
        className={isStakeMode ? 'text-green-600 border-green-600 hover:bg-green-50' : 'text-red-600 border-red-600 hover:bg-red-50'}
      >
        {isStakeMode ? (
          <Plus className="mr-1 h-3 w-3" />
        ) : (
          <Minus className="mr-1 h-3 w-3" />
        )}
        {isStakeMode ? '质押' : '取消质押'}
      </Button>
      
      <StakeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={mode}
        poolType={poolType}
        poolId={poolId}
        poolAddress={poolAddress}
        tokenAddress={tokenAddress}
        tokenSymbol={tokenSymbol}
        userBalance={userBalance}
        userStaked={userStaked}
        maxStakeLimit={maxStakeLimit}
      />
    </>
  );
}