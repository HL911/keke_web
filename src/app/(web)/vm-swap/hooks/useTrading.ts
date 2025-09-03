"use client";

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { useTokenConfig, useKekeswapRouterAddress } from '@/hooks';
import { foundry } from 'viem/chains';
import KekeswapRouter_ABI from '@/abi/KekeswapRouter.json';
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json';

export interface TradeParams {
  tokenSymbol: string;
  amount: string;
  price: string;
  type: 'buy' | 'sell';
}

export function useTrading() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取路由合约地址
  const routerAddress = useKekeswapRouterAddress();
  
  // 预加载常用代币配置
  const kekeConfig = useTokenConfig('KEKE');
  const usdtConfig = useTokenConfig('USDT');
  
  // 获取代币配置的辅助函数
  const getTokenConfigBySymbol = useCallback((symbol: string) => {
    if (symbol === 'KEKE') return kekeConfig.tokenInfo;
    if (symbol === 'USDT') return usdtConfig.tokenInfo;
    // 对于其他代币，需要在组件级别预加载或者使用API
    return null;
  }, [kekeConfig.tokenInfo, usdtConfig.tokenInfo]);

  // 获取代币余额
  const useTokenBalance = (tokenSymbol: string) => {
    const { tokenInfo } = useTokenConfig(tokenSymbol);
    
    return useReadContract({
      address: tokenInfo?.address as `0x${string}`,
      abi: KekeMockERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
      query: {
        enabled: !!address && !!tokenSymbol && !!tokenInfo?.address,
      },
    });
  };

  // 获取代币授权额度
  const useTokenAllowance = (tokenSymbol: string, spender: string) => {
    const { tokenInfo } = useTokenConfig(tokenSymbol);
    
    return useReadContract({
      address: tokenInfo?.address as `0x${string}`,
      abi: KekeMockERC20_ABI,
      functionName: 'allowance',
      args: [address, spender],
      query: {
        enabled: !!address && !!tokenSymbol && !!spender && !!tokenInfo?.address,
      },
    });
  };

  // 授权代币
  const approveToken = useCallback(async (tokenSymbol: string, amount: string) => {
    if (!isConnected || !routerAddress) {
      toast.error('请先连接钱包或等待加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      
      // 获取代币配置
      const tokenInfo = getTokenConfigBySymbol(tokenSymbol);
      
      if (!tokenInfo?.address) {
        toast.error('获取代币配置失败');
        return false;
      }
      
      const decimals = 18; // 大多数代币都是18位小数
      const amountWei = parseUnits(amount, decimals);

      await writeContract({
        address: tokenInfo.address as `0x${string}`,
        abi: KekeMockERC20_ABI,
        functionName: 'approve',
        args: [routerAddress as `0x${string}`, amountWei],
      });

      toast.success('授权成功！');
      return true;
    } catch (error) {
      console.error('授权失败:', error);
      toast.error('授权失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, routerAddress, getTokenConfigBySymbol]);

  // 执行买入交易
  const executeBuy = useCallback(async (params: TradeParams) => {
    if (!isConnected || !routerAddress) {
      toast.error('请先连接钱包或等待加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      const { tokenSymbol, amount, price } = params;
      const decimals = 18;
      const amountWei = parseUnits(amount, decimals);
      const totalUSDT = parseFloat(amount) * parseFloat(price);
      const totalUSDTWei = parseUnits(totalUSDT.toString(), decimals);

      // 获取代币地址
      const tokenInfo = getTokenConfigBySymbol(tokenSymbol);
      const usdtInfo = getTokenConfigBySymbol('USDT');
      
      if (!tokenInfo?.address || !usdtInfo?.address) {
        toast.error('获取代币地址失败');
        return false;
      }

      const tokenInAddress = usdtInfo.address; // USDT address
      const tokenOutAddress = tokenInfo.address; // 目标代币 address
      const path = [tokenInAddress, tokenOutAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟后过期

      await writeContract({
        address: routerAddress as `0x${string}`,
        abi: KekeswapRouter_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          totalUSDTWei,
          amountWei, // 最小输出量
          path,
          address,
          deadline
        ],
      });

      toast.success(`成功买入 ${amount} ${tokenSymbol}！`);
      return true;
    } catch (error) {
      console.error('买入失败:', error);
      toast.error('买入失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, address, routerAddress, getTokenConfigBySymbol]);

  // 执行卖出交易
  const executeSell = useCallback(async (params: TradeParams) => {
    if (!isConnected || !routerAddress) {
      toast.error('请先连接钱包或等待加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      const { tokenSymbol, amount, price } = params;
      const decimals = 18;
      const amountWei = parseUnits(amount, decimals);
      const minUSDT = parseFloat(amount) * parseFloat(price) * 0.95; // 5%滑点保护
      const minUSDTWei = parseUnits(minUSDT.toString(), decimals);

      // 获取代币地址
      const tokenInfo = getTokenConfigBySymbol(tokenSymbol);
      const usdtInfo = getTokenConfigBySymbol('USDT');
      
      if (!tokenInfo?.address || !usdtInfo?.address) {
        toast.error('获取代币地址失败');
        return false;
      }

      // 卖出代币换取USDT
      const tokenInAddress = tokenInfo.address; // 要卖出的代币 address
      const tokenOutAddress = usdtInfo.address; // USDT address
      const path = [tokenInAddress, tokenOutAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      await writeContract({
        address: routerAddress as `0x${string}`,
        abi: KekeswapRouter_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountWei,
          minUSDTWei, // 最小输出量
          path,
          address,
          deadline
        ],
      });

      toast.success(`成功卖出 ${amount} ${tokenSymbol}！`);
      return true;
    } catch (error) {
      console.error('卖出失败:', error);
      toast.error('卖出失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, address, routerAddress, getTokenConfigBySymbol]);

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
    isConnected,
    
    // 查询函数
    useTokenBalance,
    useTokenAllowance,
    getTokenPrice,
    
    // 交易函数
    approveToken,
    executeBuy,
    executeSell,
  };
}
