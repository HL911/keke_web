"use client";

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { usePoolAddress } from '@/hooks';
import { useTokenInfo } from './useTokenInfo';
import POOL_ABI from '@/abi/Pool.json';

export interface TradeParams {
  tokenSymbol: string;
  amount: string;
  price: string;
  type: 'buy' | 'sell';
  memeTokenInfo?: any; // meme 代币信息对象
}

/**
 * 交易执行相关 Hook
 */
export function useTradingActions() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending, data: hash } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  const poolAddress = usePoolAddress();
  const { getTokenConfigBySymbol } = useTokenInfo();
  
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTransactionError } = useWaitForTransactionReceipt({
    hash,
  });

  // 执行买入交易 - Launch Pool 预售
  const executeBuy = useCallback(async (params: TradeParams, onSuccess?: () => void) => {
    if (!isConnected || !poolAddress) {
      toast.error('请先连接钱包或等待 Launch Pool 加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      setTransactionStatus('pending');
      
      const { memeTokenInfo, amount, price, tokenSymbol } = params;
      const totalETH = parseFloat(amount) * parseFloat(price);
      const totalETHWei = parseUnits(totalETH.toString(), 18);
      
      console.log('🚀 Launch Pool 买入交易:', { tokenSymbol, amount, price, totalETH, memeTokenInfo });
      
      // 获取代币地址
      const tokenInfo = memeTokenInfo;
      
      if (!tokenInfo?.address) {
        toast.error('获取目标代币地址失败');
        setTransactionStatus('error');
        return false;
      }

      console.log('📊 Launch Pool 交易参数:', {
        代币地址: tokenInfo.address,
        ETH数量: formatUnits(totalETHWei, 18),
        接收地址: address,
        池地址: poolAddress,
      });

      // 注意：calPresaleSwapETHForToken 是 view 函数，这里为了简化直接进行交易
      // 在生产环境中，应该先调用这个函数预估代币数量
      console.log('💰 准备执行 Launch Pool 买入交易');

      // 执行 Launch Pool 预售买入
      const transactionHash = await writeContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'presaleSwapETHForToken',
        args: [
          tokenInfo.address, // 代币地址
          address // 接收地址
        ],
        value: totalETHWei, // 发送的 ETH 数量
      });

      console.log('📝 Launch Pool 交易已提交:', transactionHash);
      toast.success(`Launch Pool 买入交易已提交！正在等待确认...`);
      setTransactionStatus('success');
      
      // 等待一段时间后刷新余额
      setTimeout(() => {
        onSuccess?.();
        toast.success(`成功通过 Launch Pool 买入 ${tokenSymbol}！`);
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('❌ 买入失败:', error);
      setTransactionStatus('error');
      if (error instanceof Error) {
        toast.error(`买入失败: ${error.message}`);
      } else {
        toast.error('买入失败');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, address, poolAddress]);

  // 执行卖出交易 - Launch Pool 预售
  const executeSell = useCallback(async (params: TradeParams, onSuccess?: () => void) => {
    if (!isConnected || !poolAddress) {
      toast.error('请先连接钱包或等待 Launch Pool 加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      setTransactionStatus('pending');
      
      const { tokenSymbol, amount, price, memeTokenInfo } = params;
      const decimals = 18;
      const amountWei = parseUnits(amount, decimals);

      console.log('🔥 Launch Pool 卖出交易:', { tokenSymbol, amount, price, memeTokenInfo });

      // 获取代币地址
      const tokenInfo = memeTokenInfo || getTokenConfigBySymbol(tokenSymbol);
      
      if (!tokenInfo?.address) {
        toast.error('获取代币地址失败');
        setTransactionStatus('error');
        return false;
      }

      console.log('📊 Launch Pool 卖出参数:', {
        代币地址: tokenInfo.address,
        代币数量: formatUnits(amountWei, 18),
        接收地址: address,
        池地址: poolAddress,
      });

      // 注意：calPresaleSwapTokenForETH 是 view 函数，这里为了简化直接进行交易
      // 在生产环境中，应该先调用这个函数预估 ETH 数量
      console.log('💰 准备执行 Launch Pool 卖出交易');

      // 执行 Launch Pool 预售卖出
      const transactionHash = await writeContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'presaleSwapTokenForETH',
        args: [
          tokenInfo.address, // 代币地址
          address, // 接收地址
          amountWei // 代币数量
        ],
      });

      console.log('📝 Launch Pool 卖出交易已提交:', transactionHash);
      toast.success(`Launch Pool 卖出交易已提交！正在等待确认...`);
      setTransactionStatus('success');
      
      // 等待一段时间后刷新余额
      setTimeout(() => {
        onSuccess?.();
        toast.success(`成功通过 Launch Pool 卖出 ${amount} ${tokenSymbol}！`);
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('❌ 卖出失败:', error);
      setTransactionStatus('error');
      if (error instanceof Error) {
        toast.error(`卖出失败: ${error.message}`);
      } else {
        toast.error('卖出失败');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, address, poolAddress, getTokenConfigBySymbol]);

  // 获取交易对价格
  const getTokenPrice = useCallback(async (tokenSymbol: string) => {
    try {
      // 这里应该从DEX获取实时价格
      // 为了演示，返回模拟价格
      return '0.42814';
    } catch (error) {
      console.error('获取价格失败:', error);
      return '0';
    }
  }, []);

  return {
    // 状态
    isLoading: isLoading || isPending,
    transactionStatus,
    isConfirming,
    isConfirmed,
    isTransactionError,
    
    // 交易函数
    executeBuy,
    executeSell,
    getTokenPrice,
  };
}
