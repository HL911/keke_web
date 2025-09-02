'use client'

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import TokenFactoryABI from '../abi/TokenFactory.json';

interface CreateTokenParams {
  name: string;
  symbol: string;
  description: string;
  iconAddress: string;
  twitterAddress: string;
  telegramAddress: string;
  websiteAddress: string;
}

interface UseTokenFactoryReturn {
  // 创建代币（不购买）
  createToken: (params: CreateTokenParams) => Promise<void>;
  // 创建代币并购买
  createTokenAndBuy: (params: CreateTokenParams, ethAmount: string) => Promise<void>;
  // 获取当前代币索引
  currentTokenIndex: bigint | undefined;
  // 获取所有代币
  tokens: any[] | undefined;
  // 状态
  isCreating: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: string | undefined;
}

export function useTokenFactory(contractAddress: `0x${string}`): UseTokenFactoryReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 写入合约的hook
  const { writeContract, data: hash, error: writeError } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 读取当前代币索引
  const { data: currentTokenIndex } = useReadContract({
    address: contractAddress,
    abi: TokenFactoryABI,
    functionName: 'currentTokenIndex',
  });

  // 读取所有代币
  const { data: tokens } = useReadContract({
    address: contractAddress,
    abi: TokenFactoryABI,
    functionName: 'getTokens',
  });

  // 创建代币（不购买）
  const createToken = async (params: CreateTokenParams) => {
    try {
      setIsCreating(true);
      setError(null);

      await writeContract({
        address: contractAddress,
        abi: TokenFactoryABI,
        functionName: 'createBump',
        args: [
          params.name,
          params.symbol,
          params.description,
          params.iconAddress,
          params.twitterAddress,
          params.telegramAddress,
          params.websiteAddress,
        ],
      });
    } catch (err: any) {
      setError(err.message || '创建代币失败');
      console.error('创建代币失败:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // 创建代币并购买
  const createTokenAndBuy = async (params: CreateTokenParams, ethAmount: string) => {
    try {
      setIsCreating(true);
      setError(null);

      await writeContract({
        address: contractAddress,
        abi: TokenFactoryABI,
        functionName: 'createBumpAndBuy',
        args: [
          params.name,
          params.symbol,
          params.description,
          params.iconAddress,
          params.twitterAddress,
          params.telegramAddress,
          params.websiteAddress,
        ],
        value: parseEther(ethAmount),
      });
    } catch (err: any) {
      setError(err.message || '创建代币并购买失败');
      console.error('创建代币并购买失败:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createToken,
    createTokenAndBuy,
    currentTokenIndex: currentTokenIndex as bigint | undefined,
    tokens: tokens as any[] | undefined,
    isCreating: isCreating || isConfirming,
    isSuccess,
    error: error || writeError?.message || null,
    txHash: hash,
  };
}

// 导出类型
export type { CreateTokenParams, UseTokenFactoryReturn };