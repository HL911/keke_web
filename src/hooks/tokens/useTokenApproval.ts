"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";

interface TokenApprovalState {
  isApproved: boolean;
  isApproving: boolean;
  isChecking: boolean;
  allowance: bigint;
  error: string | null;
  txHash: string | null;
  approve: (amount?: string) => Promise<void>;
  checkApproval: () => Promise<void>;
}

interface UseTokenApprovalProps {
  tokenAddress: string;
  spenderAddress: string;
  requiredAmount: string;
  decimals: number;
  enabled?: boolean;
}

/**
 * 代币授权管理Hook
 * 处理ERC20代币的授权逻辑，包括检查当前授权、执行授权等
 */
export function useTokenApproval({
  tokenAddress,
  spenderAddress,
  requiredAmount,
  decimals,
  enabled = true,
}: UseTokenApprovalProps): TokenApprovalState {
  const { address } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // 获取当前授权额度
  const {
    data: allowance = BigInt(0),
    isLoading: isChecking,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && spenderAddress
        ? [address, spenderAddress as `0x${string}`]
        : undefined,
    query: {
      enabled: enabled && !!address && !!tokenAddress && !!spenderAddress,
      refetchInterval: 10000, // 每10秒刷新一次
    },
  });

  // 写入合约授权
  const { writeContractAsync } = useWriteContract();

  // 等待交易确认
  const { isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  // 计算是否已授权足够的额度
  const requiredAmountBigInt = requiredAmount
    ? parseUnits(requiredAmount, decimals)
    : BigInt(0);

  const isApproved =
    allowance >= requiredAmountBigInt && requiredAmountBigInt > BigInt(0);

  // 检查授权状态
  const checkApproval = useCallback(async () => {
    if (!enabled || !address || !tokenAddress || !spenderAddress) return;

    try {
      setError(null);
      await refetchAllowance();
    } catch (err) {
      console.error("检查授权失败:", err);
      setError(err instanceof Error ? err.message : "检查授权失败");
    }
  }, [enabled, address, tokenAddress, spenderAddress, refetchAllowance]);

  // 执行授权
  const approve = useCallback(
    async (amount?: string) => {
      if (!address || !tokenAddress || !spenderAddress) {
        throw new Error("缺少必要参数");
      }

      setIsApproving(true);
      setError(null);
      setTxHash(null);

      try {
        // 如果没有指定金额，使用最大值（无限授权）
        const approveAmount = amount
          ? parseUnits(amount, decimals)
          : parseUnits(
              "115792089237316195423570985008687907853269984665640564039457584007913129639935",
              0
            ); // 2^256 - 1

        const hash = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [spenderAddress as `0x${string}`, approveAmount],
        });

        setTxHash(hash);

        // 等待交易确认后刷新授权状态
        // 注意：实际的等待逻辑由useWaitForTransactionReceipt处理
      } catch (err) {
        console.error("授权失败:", err);
        setError(err instanceof Error ? err.message : "授权失败");
        throw err;
      } finally {
        setIsApproving(false);
      }
    },
    [address, tokenAddress, spenderAddress, decimals, writeContractAsync]
  );

  // 交易确认后刷新数据
  useEffect(() => {
    if (txHash && !isWaitingForReceipt) {
      // 延迟一下再检查，确保区块链状态已更新
      setTimeout(() => {
        checkApproval();
      }, 2000);
    }
  }, [txHash, isWaitingForReceipt, checkApproval]);

  // 组件挂载时检查一次授权状态
  useEffect(() => {
    if (enabled) {
      checkApproval();
    }
  }, [enabled, checkApproval]);

  return {
    isApproved,
    isApproving: isApproving || isWaitingForReceipt,
    isChecking,
    allowance,
    error,
    txHash,
    approve,
    checkApproval,
  };
}

/**
 * 批量检查多个代币的授权状态
 * 注意：这个Hook应该在组件层级使用，不能在循环或条件语句中调用
 */
export function useMultiTokenApproval(
  tokens: Array<{
    address: string;
    amount: string;
    decimals: number;
  }>,
  spenderAddress: string,
  enabled: boolean = true
) {
  // 为了遵循Hooks规则，我们需要固定数量的Hook调用
  // 这里简化为最多支持2个代币的授权检查
  const approval1 = useTokenApproval({
    tokenAddress: tokens[0]?.address || "",
    spenderAddress,
    requiredAmount: tokens[0]?.amount || "0",
    decimals: tokens[0]?.decimals || 18,
    enabled: enabled && !!tokens[0],
  });

  const approval2 = useTokenApproval({
    tokenAddress: tokens[1]?.address || "",
    spenderAddress,
    requiredAmount: tokens[1]?.amount || "0",
    decimals: tokens[1]?.decimals || 18,
    enabled: enabled && !!tokens[1],
  });

  const approvals = [approval1, approval2].slice(0, tokens.length);

  const allApproved = approvals.every((approval) => approval.isApproved);
  const anyApproving = approvals.some((approval) => approval.isApproving);
  const anyError = approvals.find((approval) => approval.error)?.error || null;

  return {
    approvals,
    allApproved,
    anyApproving,
    anyError,
    approveAll: async () => {
      for (const approval of approvals) {
        if (!approval.isApproved) {
          await approval.approve();
        }
      }
    },
  };
}

/**
 * 格式化授权额度显示
 */
export function formatAllowance(
  allowance: bigint,
  decimals: number,
  symbol: string
): string {
  if (allowance === BigInt(0)) return "0";

  // 检查是否是无限授权（接近最大值）
  const maxValue = parseUnits("1000000000000", decimals); // 1T as threshold
  if (allowance >= maxValue) {
    return `无限制 ${symbol}`;
  }

  const formatted = formatUnits(allowance, decimals);
  const number = parseFloat(formatted);

  if (number >= 1e9) return `${(number / 1e9).toFixed(2)}B ${symbol}`;
  if (number >= 1e6) return `${(number / 1e6).toFixed(2)}M ${symbol}`;
  if (number >= 1e3) return `${(number / 1e3).toFixed(2)}K ${symbol}`;

  return `${number.toFixed(6)} ${symbol}`;
}
