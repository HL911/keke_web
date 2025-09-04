"use client";

import { useRef, useCallback } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useTokenConfig } from '@/hooks';
import { useNetworkInfo } from './useNetworkInfo';
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json';

/**
 * 代币余额相关 Hook
 */
export function useTokenBalance() {
  const { address } = useAccount();
  const { shouldUseNativeETH } = useNetworkInfo();
  
  // 用于存储需要刷新的余额查询
  const balanceRefreshCallbacks = useRef<Set<() => void>>(new Set());
  
  // 用于存储 meme 代币的余额查询
  const memeTokenBalanceQueries = useRef<Map<string, () => Promise<any>>>(new Map());

  // 获取代币余额
  const useTokenBalanceQuery = (tokenSymbol: string) => {
    const { tokenInfo } = useTokenConfig(tokenSymbol);
    
    // 移除 refetch 的注册，避免余额刷新时重新获取token配置
    // 因为token配置是相对静态的数据，不需要频繁刷新
    
    // 如果是 ETH 且当前网络支持原生 ETH，返回原生 ETH 余额
    if ((tokenSymbol === 'ETH' || tokenSymbol === 'WETH') && shouldUseNativeETH) {
      // 原生ETH余额查询
      const balanceQuery = useBalance({
        address: address,
        query: {
          enabled: !!address,
        },
      });
      
      // 注册原生ETH余额刷新
      if (balanceQuery.refetch && !balanceRefreshCallbacks.current.has(balanceQuery.refetch)) {
        balanceRefreshCallbacks.current.add(balanceQuery.refetch);
      }
      
      return {
        data: balanceQuery.data?.value,
        isLoading: balanceQuery.isLoading,
        error: balanceQuery.error,
        refetch: balanceQuery.refetch,
      };
    }
    
    // 其他代币使用 ERC20 合约查询余额
    const balanceQuery = useReadContract({
      address: tokenInfo?.address as `0x${string}`,
      abi: KekeMockERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
      query: {
        enabled: !!address && !!tokenSymbol && !!tokenInfo?.address,
      },
    });
    
    // 注册ERC20余额刷新
    if (balanceQuery.refetch && !balanceRefreshCallbacks.current.has(balanceQuery.refetch)) {
      balanceRefreshCallbacks.current.add(balanceQuery.refetch);
    }
    
    return balanceQuery;
  };

  // 获取 meme 代币余额（通过代币地址）
  const useMemeTokenBalance = (tokenAddress: string, tokenSymbol: string) => {
    const balanceQuery = useReadContract({
      address: tokenAddress as `0x${string}`,
      abi: KekeMockERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
      query: {
        enabled: !!address && !!tokenAddress,
      },
    });
    
    // 注册 meme 代币余额刷新回调
    if (balanceQuery.refetch) {
      const queryKey = `${tokenSymbol}-${tokenAddress}`;
      if (!memeTokenBalanceQueries.current.has(queryKey)) {
        memeTokenBalanceQueries.current.set(queryKey, balanceQuery.refetch);
      }
    }
    
    return balanceQuery;
  };

  // 注册 meme 代币余额刷新
  const registerMemeTokenRefresh = useCallback((tokenSymbol: string, tokenAddress: string, refetchFn: () => Promise<any>) => {
    const queryKey = `${tokenSymbol}-${tokenAddress}`;
    memeTokenBalanceQueries.current.set(queryKey, refetchFn);
  }, []);

  // 刷新所有余额（包括系统代币和 meme 代币）
  const refreshBalances = useCallback(async () => {
    console.log('🔄 刷新所有余额...');
    
    // 刷新系统代币余额
    const systemTokenRefreshPromises = Array.from(balanceRefreshCallbacks.current).map(callback => {
      try {
        return callback();
      } catch (error) {
        console.error('刷新系统代币余额失败:', error);
        return Promise.resolve();
      }
    });
    
    // 刷新 meme 代币余额
    const memeTokenRefreshPromises = Array.from(memeTokenBalanceQueries.current.values()).map(callback => {
      try {
        return callback();
      } catch (error) {
        console.error('刷新 meme 代币余额失败:', error);
        return Promise.resolve();
      }
    });
    
    // 并行执行所有刷新操作
    await Promise.allSettled([
      ...systemTokenRefreshPromises, 
      ...memeTokenRefreshPromises
    ]);
    
    console.log('✅ 所有余额刷新完成（包括系统代币和 meme 代币）');
  }, []);

  return {
    useTokenBalance: useTokenBalanceQuery,
    useMemeTokenBalance,
    registerMemeTokenRefresh,
    refreshBalances,
  };
}
