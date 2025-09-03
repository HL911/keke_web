"use client";

import { useAccount } from 'wagmi';
import { useNetworkInfo } from './useNetworkInfo';
import { useTokenInfo } from './useTokenInfo';
import { useTokenBalance } from './useTokenBalance';
import { useTokenAllowance } from './useTokenAllowance';
import { useTradingActions, type TradeParams } from './useTradingActions';

/**
 * 主交易 Hook - 组合所有子 hooks
 */
export function useTrading() {
  const { isConnected } = useAccount();
  
  // 网络信息
  const networkInfo = useNetworkInfo();
  
  // 代币信息
  const tokenInfo = useTokenInfo();
  
  // 余额相关
  const balanceHooks = useTokenBalance();
  
  // 授权相关
  const allowanceHooks = useTokenAllowance();
  
  // 交易执行
  const tradingActions = useTradingActions();

  // 合并刷新函数
  const refreshBalances = async () => {
    await Promise.all([
      balanceHooks.refreshBalances(),
      allowanceHooks.refreshAllowances(),
    ]);
  };

  return {
    // 状态
    isConnected,
    isLoading: allowanceHooks.isLoading || tradingActions.isLoading,
    transactionStatus: tradingActions.transactionStatus,
    isConfirming: tradingActions.isConfirming,
    isConfirmed: tradingActions.isConfirmed,
    isTransactionError: tradingActions.isTransactionError,
    
    // 网络信息
    chainId: networkInfo.chainId,
    isNativeETHNetwork: networkInfo.isNativeETHNetwork,
    shouldUseNativeETH: networkInfo.shouldUseNativeETH,
    getETHInfo: networkInfo.getETHInfo,
    
    // 代币信息
    memeTokenInfo: tokenInfo.memeTokenInfo,
    memeTokenLoading: tokenInfo.memeTokenLoading,
    fetchMemeTokenInfo: tokenInfo.fetchMemeTokenInfo,
    getTokenConfigBySymbol: tokenInfo.getTokenConfigBySymbol,
    getTokenInfo: tokenInfo.getTokenInfo,
    
    // 余额查询
    useTokenBalance: balanceHooks.useTokenBalance,
    useMemeTokenBalance: balanceHooks.useMemeTokenBalance,
    registerMemeTokenRefresh: balanceHooks.registerMemeTokenRefresh,
    
    // 授权查询和操作
    useTokenAllowance: allowanceHooks.useTokenAllowance,
    approveToken: allowanceHooks.approveToken,
    
    // 交易执行
    executeBuy: (params: TradeParams) => tradingActions.executeBuy(params, refreshBalances),
    executeSell: (params: TradeParams) => tradingActions.executeSell(params, refreshBalances),
    getTokenPrice: tradingActions.getTokenPrice,
    
    // 刷新函数
    refreshBalances,
  };
}

// 导出类型
export type { TradeParams };
