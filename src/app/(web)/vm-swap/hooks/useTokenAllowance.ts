"use client";

import { useState, useCallback, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { usePoolAddress } from '@/hooks';
import { useNetworkInfo } from './useNetworkInfo';
import { useTokenInfo } from './useTokenInfo';
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json';

/**
 * 代币授权相关 Hook
 */
export function useTokenAllowance() {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  
  const poolAddress = usePoolAddress();
  const { shouldUseNativeETH, getETHInfo } = useNetworkInfo();
  const { getTokenConfigBySymbol } = useTokenInfo();
  
  // 用于存储需要刷新的授权查询
  const allowanceRefreshCallbacks = useRef<Set<() => void>>(new Set());

  // 获取代币授权额度
  const useTokenAllowanceQuery = (tokenSymbol: string, spender: string) => {
    const ethInfo = getETHInfo();
    
    // 如果是原生 ETH，不需要授权（会在交易时自动包装）
    if ((tokenSymbol === 'ETH' || tokenSymbol === 'WETH') && shouldUseNativeETH) {
      return {
        data: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'), // 最大值，表示不需要授权
        isLoading: false,
        error: null,
        refetch: () => Promise.resolve(),
      };
    }
    
    // 其他代币或 WETH 需要查询授权额度
    const tokenAddress = tokenSymbol === 'ETH' || tokenSymbol === 'WETH' 
      ? ethInfo.wethAddress 
      : getTokenConfigBySymbol(tokenSymbol)?.address;
    
    const allowanceQuery = useReadContract({
      address: tokenAddress as `0x${string}`,
      abi: KekeMockERC20_ABI,
      functionName: 'allowance',
      args: [address, spender],
      query: {
        enabled: !!address && !!tokenSymbol && !!spender && !!tokenAddress,
      },
    });
    
    // 注册授权额度刷新
    if (allowanceQuery.refetch && !allowanceRefreshCallbacks.current.has(allowanceQuery.refetch)) {
      allowanceRefreshCallbacks.current.add(allowanceQuery.refetch);
    }
    
    return allowanceQuery;
  };

  // 授权代币给 Launch Pool
  const approveToken = useCallback(async (tokenSymbol: string, amount: string) => {
    console.log('approveToken-1', tokenSymbol, amount);
    if (!isConnected || !poolAddress) {
      toast.error('请先连接钱包或等待 Launch Pool 加载完成');
      return false;
    }

    // Launch Pool 买入使用原生 ETH，不需要授权
    // 只有卖出代币时才需要授权
    if (tokenSymbol === 'ETH' || tokenSymbol === 'WETH') {
      toast.success('ETH 买入无需授权！');
      return true;
    }

    try {
      setIsLoading(true);
      
      // 获取代币配置
      const tokenInfo = getTokenConfigBySymbol(tokenSymbol);

      const tokenAddress = tokenInfo?.address;
      console.log('approveToken-2', tokenInfo, tokenAddress);
      
      if (!tokenAddress) {
        toast.error('获取代币配置失败');
        return false;
      }
      
      const decimals = 18; // 大多数代币都是18位小数
      const amountWei = parseUnits(amount, decimals);

      console.log('🔐 授权代币给 Launch Pool:', {
        代币: tokenSymbol,
        地址: tokenAddress,
        数量: formatUnits(amountWei, 18),
        池地址: poolAddress,
      });

      const hash = await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: KekeMockERC20_ABI,
        functionName: 'approve',
        args: [poolAddress as `0x${string}`, amountWei],
      });

      toast.success('代币授权给 Launch Pool 成功！');
      
      // 等待一小段时间后刷新授权额度
      setTimeout(() => {
        refreshAllowances();
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ 授权失败:', error);
      if (error instanceof Error) {
        toast.error(`授权失败: ${error.message}`);
      } else {
        toast.error('授权失败');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, poolAddress, getTokenConfigBySymbol]);

  // 刷新所有授权额度
  const refreshAllowances = useCallback(async () => {
    console.log('🔄 刷新所有授权额度...');
    const refreshPromises = Array.from(allowanceRefreshCallbacks.current).map(callback => {
      try {
        return callback();
      } catch (error) {
        console.error('刷新授权额度失败:', error);
        return Promise.resolve();
      }
    });
    
    await Promise.allSettled(refreshPromises);
    console.log('✅ 授权额度刷新完成');
  }, []);

  return {
    // 状态
    isLoading,
    
    // 查询函数
    useTokenAllowance: useTokenAllowanceQuery,
    
    // 操作函数
    approveToken,
    refreshAllowances,
  };
}
