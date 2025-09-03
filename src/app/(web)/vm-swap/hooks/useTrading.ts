"use client";

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useBalance, useChainId } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { useTokenConfig, useKekeswapRouterAddress } from '@/hooks';
import { foundry, mainnet, sepolia } from 'viem/chains';
import KekeswapRouter_ABI from '@/abi/KekeswapRouter.json';
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json';
import WETH9_ABI from '@/abi/WETH9.json';

export interface TradeParams {
  tokenSymbol: string;
  amount: string;
  price: string;
  type: 'buy' | 'sell';
  systemTokenInfo?: any; // 代币信息对象
}

export function useTrading() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const chainId = useChainId();
  
  // 获取路由合约地址
  const routerAddress = useKekeswapRouterAddress();
  
  // 预加载常用代币配置
  const kekeConfig = useTokenConfig('KEKE');
  const wethConfig = useTokenConfig('WETH');
  
  // 获取原生 ETH 余额
  const { data: nativeETHBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address,
    },
  });

  // 判断当前网络是否支持原生 ETH
  const isNativeETHNetwork = useCallback(() => {
    return chainId === mainnet.id || chainId === sepolia.id;
  }, [chainId]);

  // 判断是否使用原生 ETH 进行交易
  const shouldUseNativeETH = useCallback(() => {
    // 在主网和测试网上，如果用户选择使用 ETH，优先使用原生 ETH
    // 在本地 Foundry 网络上，使用 WETH
    return isNativeETHNetwork() && chainId !== foundry.id;
  }, [chainId, isNativeETHNetwork]);

  // 获取 ETH/WETH 信息
  const getETHInfo = useCallback(() => {
    if (shouldUseNativeETH()) {
      // 返回原生 ETH 信息（用于显示，实际交易时会转换为 WETH）
      return {
        address: '0x0000000000000000000000000000000000000000', // 原生 ETH 地址
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        wethAddress: wethConfig.tokenInfo?.address, // WETH 合约地址，用于 DEX 交易
      };
    } else {
      // 返回 WETH 信息
      return {
        ...wethConfig.tokenInfo,
        symbol: 'WETH',
        isNative: false,
        wethAddress: wethConfig.tokenInfo?.address,
      };
    }
  }, [shouldUseNativeETH, wethConfig.tokenInfo]);
  
  // 获取代币配置的辅助函数
  const getTokenConfigBySymbol = useCallback((symbol: string) => {
    if (symbol === 'KEKE') return kekeConfig.tokenInfo;
    if (symbol === 'ETH' || symbol === 'WETH') return getETHInfo();
    // 对于其他代币，需要在组件级别预加载或者使用API
    return null;
  }, [kekeConfig.tokenInfo, wethConfig.tokenInfo, getETHInfo]);

  // 获取代币余额
  const useTokenBalance = (tokenSymbol: string) => {
    const { tokenInfo } = useTokenConfig(tokenSymbol);
    
    // 如果是 ETH 且当前网络支持原生 ETH，返回原生 ETH 余额
    if ((tokenSymbol === 'ETH' || tokenSymbol === 'WETH') && shouldUseNativeETH()) {
      return {
        data: nativeETHBalance?.value,
        isLoading: false,
        error: null,
      };
    }
    
    // 其他代币使用 ERC20 合约查询余额
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
    const ethInfo = getETHInfo();
    
    // 如果是原生 ETH，不需要授权（会在交易时自动包装）
    if ((tokenSymbol === 'ETH' || tokenSymbol === 'WETH') && shouldUseNativeETH()) {
      return {
        data: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'), // 最大值，表示不需要授权
        isLoading: false,
        error: null,
      };
    }
    
    // 其他代币或 WETH 需要查询授权额度
    const tokenAddress = tokenSymbol === 'ETH' || tokenSymbol === 'WETH' 
      ? ethInfo.wethAddress 
      : getTokenConfigBySymbol(tokenSymbol)?.address;
    
    return useReadContract({
      address: tokenAddress as `0x${string}`,
      abi: KekeMockERC20_ABI,
      functionName: 'allowance',
      args: [address, spender],
      query: {
        enabled: !!address && !!tokenSymbol && !!spender && !!tokenAddress,
      },
    });
  };

  // 授权代币
  const approveToken = useCallback(async (tokenSymbol: string, amount: string) => {
    if (!isConnected || !routerAddress) {
      toast.error('请先连接钱包或等待加载完成');
      return false;
    }

    // 如果是原生 ETH，不需要授权
    if ((tokenSymbol === 'ETH' || tokenSymbol === 'WETH') && shouldUseNativeETH()) {
      toast.success('原生 ETH 无需授权！');
      return true;
    }

    try {
      setIsLoading(true);
      
      // 获取代币配置
      const tokenInfo = getTokenConfigBySymbol(tokenSymbol);
      let tokenAddress = tokenInfo?.address;
      
      // 如果是 WETH，使用 WETH 合约地址
      if (tokenSymbol === 'ETH' || tokenSymbol === 'WETH') {
        tokenAddress = getETHInfo().wethAddress;
      }
      
      if (!tokenAddress) {
        toast.error('获取代币配置失败');
        return false;
      }
      
      const decimals = 18; // 大多数代币都是18位小数
      const amountWei = parseUnits(amount, decimals);

      await writeContract({
        address: tokenAddress as `0x${string}`,
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
  }, [isConnected, writeContract, routerAddress, getTokenConfigBySymbol, shouldUseNativeETH, getETHInfo]);

  // 执行买入交易
  const executeBuy = useCallback(async (params: TradeParams) => {
    if (!isConnected || !routerAddress) {
      toast.error('请先连接钱包或等待加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      const { systemTokenInfo, amount, price, tokenSymbol } = params;
      const decimals = 18;
      const amountWei = parseUnits(amount, decimals);
      const totalETH = parseFloat(amount) * parseFloat(price);
      const totalETHWei = parseUnits(totalETH.toString(), decimals);
      
      console.log('executeBuy:systemTokenInfo', systemTokenInfo)
      
      // 获取代币地址
      const tokenInfo = systemTokenInfo;
      const ethInfo = getETHInfo();
      
      console.log('executeBuy:tokenInfo', tokenInfo)
      console.log('executeBuy:ethInfo', ethInfo)
      
      if (!tokenInfo?.address) {
        toast.error('获取目标代币地址失败');
        return false;
      }

      // 确定使用的 ETH 地址（DEX 交易需要 WETH）
      const ethAddress = ethInfo.wethAddress || ethInfo.address;
      if (!ethAddress) {
        toast.error('获取 ETH 地址失败');
        return false;
      }

      const path = [ethAddress, tokenInfo.address];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟后过期

      // 如果使用原生 ETH，调用 swapExactETHForTokens
      if (shouldUseNativeETH()) {
        await writeContract({
          address: routerAddress as `0x${string}`,
          abi: KekeswapRouter_ABI,
          functionName: 'swapExactETHForTokens',
          args: [
            amountWei, // 最小输出量
            path,
            address,
            deadline
          ],
          value: totalETHWei, // 发送的 ETH 数量
        });
      } else {
        // 使用 WETH，调用 swapExactTokensForTokens
        await writeContract({
          address: routerAddress as `0x${string}`,
          abi: KekeswapRouter_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            totalETHWei,
            amountWei, // 最小输出量
            path,
            address,
            deadline
          ],
        });
      }

      toast.success(`成功买入 ${amount} ${tokenSymbol}！`);
      return true;
    } catch (error) {
      console.error('买入失败:', error);
      toast.error('买入失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, address, routerAddress, getETHInfo, shouldUseNativeETH]);

  // 执行卖出交易
  const executeSell = useCallback(async (params: TradeParams) => {
    if (!isConnected || !routerAddress) {
      toast.error('请先连接钱包或等待加载完成');
      return false;
    }

    try {
      setIsLoading(true);
      const { tokenSymbol, amount, price, systemTokenInfo } = params;
      const decimals = 18;
      const amountWei = parseUnits(amount, decimals);
      const minETH = parseFloat(amount) * parseFloat(price) * 0.95; // 5%滑点保护
      const minETHWei = parseUnits(minETH.toString(), decimals);

      // 获取代币地址
      const tokenInfo = systemTokenInfo || getTokenConfigBySymbol(tokenSymbol);
      const ethInfo = getETHInfo();
      
      if (!tokenInfo?.address) {
        toast.error('获取代币地址失败');
        return false;
      }

      // 确定使用的 ETH 地址（DEX 交易需要 WETH）
      const ethAddress = ethInfo.wethAddress || ethInfo.address;
      if (!ethAddress) {
        toast.error('获取 ETH 地址失败');
        return false;
      }

      const path = [tokenInfo.address, ethAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // 如果目标是原生 ETH，调用 swapExactTokensForETH
      if (shouldUseNativeETH()) {
        await writeContract({
          address: routerAddress as `0x${string}`,
          abi: KekeswapRouter_ABI,
          functionName: 'swapExactTokensForETH',
          args: [
            amountWei,
            minETHWei, // 最小输出量
            path,
            address,
            deadline
          ],
        });
      } else {
        // 使用 WETH，调用 swapExactTokensForTokens
        await writeContract({
          address: routerAddress as `0x${string}`,
          abi: KekeswapRouter_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            amountWei,
            minETHWei, // 最小输出量
            path,
            address,
            deadline
          ],
        });
      }

      toast.success(`成功卖出 ${amount} ${tokenSymbol}！`);
      return true;
    } catch (error) {
      console.error('卖出失败:', error);
      toast.error('卖出失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, writeContract, address, routerAddress, getETHInfo, shouldUseNativeETH]);

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
    
    // 网络信息
    chainId,
    isNativeETHNetwork: isNativeETHNetwork(),
    shouldUseNativeETH: shouldUseNativeETH(),
    
    // 查询函数
    useTokenBalance,
    useTokenAllowance,
    getTokenPrice,
    getETHInfo,
    
    // 交易函数
    approveToken,
    executeBuy,
    executeSell,
  };
}
