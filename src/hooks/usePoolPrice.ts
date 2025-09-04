/**
 * Pool.sol 合约价格计算 Hook
 * 基于 bonding curve 机制计算代币价格
 */

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import PoolABI from '@/abi/Pool.json';
import sepoliaAddresses from '@/config/address/sepolia.json';

// Pool 合约地址
const POOL_ADDRESS = sepoliaAddresses.poolAddress as `0x${string}`;

export interface BondingCurveInfo {
  tokenMint: string;
  virtualTokenReserves: bigint;
  virtualEthReserves: bigint;
  realTokenReserves: bigint;
  realEthReserves: bigint;
  tokenTotalSupply: bigint;
  mcapLimit: bigint;
  presaleOpen: boolean;
  tradingOpen: boolean;
  poolFail: boolean;
}

export interface TokenPrice {
  // 基础价格信息
  priceInETH: string;        // 以ETH计价的代币价格
  priceInUSD: string;        // 以USD计价的代币价格 (需要ETH/USD价格)
  marketCap: string;         // 市值
  
  // 储备量信息  
  virtualTokenReserves: string;
  virtualEthReserves: string;
  realTokenReserves: string;
  realEthReserves: string;
  
  // 交易信息
  presaleOpen: boolean;
  tradingOpen: boolean;
  poolFail: boolean;
  
  // 24小时变化 (模拟数据，需要历史数据支持)
  priceChange24h: string;
  volume24h: string;
  
  // 状态
  isLoading: boolean;
  error: string | null;
}

/**
 * 获取代币的 bonding curve 信息
 */
export function useBondingCurveInfo(tokenAddress?: string) {
  return useReadContract({
    address: POOL_ADDRESS,
    abi: PoolABI,
    functionName: 'bondingCurve',
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/**
 * 获取代币市值
 */
export function useTokenMarketCap(tokenAddress?: string) {
  return useReadContract({
    address: POOL_ADDRESS,
    abi: PoolABI,
    functionName: 'mCap',
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/**
 * 计算买入价格 - 获取指定ETH数量能买到的代币数量
 */
export function useCalcBuyPrice(tokenAddress?: string, ethAmount?: string) {
  const ethAmountWei = ethAmount ? parseUnits(ethAmount, 18) : BigInt(0);
  
  return useReadContract({
    address: POOL_ADDRESS,
    abi: PoolABI,
    functionName: 'calPresaleSwapETHForToken',
    args: tokenAddress && ethAmount ? [tokenAddress as `0x${string}`, ethAmountWei] : undefined,
    query: {
      enabled: !!tokenAddress && !!ethAmount && parseFloat(ethAmount) > 0,
      refetchInterval: 30000, // 30秒刷新一次，减少频率
      staleTime: 20000, // 20秒内数据视为新鲜
    },
  });
}

/**
 * 计算卖出价格 - 获取指定代币数量能获得的ETH数量
 */
export function useCalcSellPrice(tokenAddress?: string, tokenAmount?: string) {
  const tokenAmountWei = tokenAmount ? parseUnits(tokenAmount, 18) : BigInt(0);
  
  return useReadContract({
    address: POOL_ADDRESS,
    abi: PoolABI,
    functionName: 'calPresaleSwapTokenForETH',
    args: tokenAddress && tokenAmount ? [tokenAddress as `0x${string}`, tokenAmountWei] : undefined,
    query: {
      enabled: !!tokenAddress && !!tokenAmount && parseFloat(tokenAmount) > 0,
      refetchInterval: 30000, // 30秒刷新一次，减少频率
      staleTime: 20000, // 20秒内数据视为新鲜
    },
  });
}

/**
 * 主要的 Pool 价格 Hook
 */
export function usePoolPrice(tokenAddress?: string, ethPriceUSD = 3000): TokenPrice {
  const [priceData, setPriceData] = useState<TokenPrice>({
    priceInETH: '0',
    priceInUSD: '0',
    marketCap: '0',
    virtualTokenReserves: '0',
    virtualEthReserves: '0',
    realTokenReserves: '0',
    realEthReserves: '0',
    presaleOpen: false,
    tradingOpen: false,
    poolFail: false,
    priceChange24h: '+0.00%',
    volume24h: '$0',
    isLoading: true,
    error: null,
  });

  // 获取 bonding curve 信息
  const { 
    data: bondingCurveData, 
    isLoading: bondingCurveLoading, 
    error: bondingCurveError 
  } = useBondingCurveInfo(tokenAddress);

  // 获取市值
  const { 
    data: marketCapData, 
    isLoading: marketCapLoading 
  } = useTokenMarketCap(tokenAddress);

  // 用1 ETH的数量来计算当前价格
  const { 
    data: buyPriceData, 
    isLoading: buyPriceLoading 
  } = useCalcBuyPrice(tokenAddress, "1.0");

  // 计算价格数据
  const calculatePrice = useCallback(() => {
    console.log('🔍 usePoolPrice calculatePrice:', {
      tokenAddress,
      bondingCurveData,
      bondingCurveLoading,
      bondingCurveError: bondingCurveError?.message,
    });

    if (!bondingCurveData || !tokenAddress) {
      console.log('❌ usePoolPrice: 缺少必要数据:', {
        hasBondingCurveData: !!bondingCurveData,
        hasTokenAddress: !!tokenAddress,
      });
      setPriceData(prev => ({
        ...prev,
        isLoading: bondingCurveLoading,
        error: bondingCurveError?.message || '缺少代币地址或bonding curve数据',
      }));
      return;
    }

    try {
      const bondingInfo = bondingCurveData as BondingCurveInfo;
      console.log('📊 bondingInfo:', bondingInfo);
      
      // 计算当前价格 - 基于虚拟储备量
      const virtualTokenReserves = bondingInfo.virtualTokenReserves;
      const virtualEthReserves = bondingInfo.virtualEthReserves;
      
      console.log('💰 储备量数据:', {
        virtualTokenReserves: virtualTokenReserves?.toString(),
        virtualEthReserves: virtualEthReserves?.toString(),
        buyPriceData: buyPriceData?.toString(),
      });
      
      let priceInETH = '0';
      if (virtualTokenReserves > BigInt(0) && virtualEthReserves > BigInt(0)) {
        // 价格 = virtualEthReserves / virtualTokenReserves
        const ethAmount = Number(formatUnits(virtualEthReserves, 18));
        const tokenAmount = Number(formatUnits(virtualTokenReserves, 18));
        const price = ethAmount / tokenAmount;
        priceInETH = price.toFixed(8);
        console.log('💱 基于储备量的价格计算:', { ethAmount, tokenAmount, price });
      }

      // 如果有买入价格数据，使用更准确的价格计算
      if (buyPriceData && typeof buyPriceData === 'bigint' && buyPriceData > BigInt(0)) {
        // 1 ETH 能买到的代币数量
        const tokensFor1ETH = Number(formatUnits(buyPriceData, 18));
        if (tokensFor1ETH > 0) {
          const calculatedPrice = (1 / tokensFor1ETH).toFixed(8);
          console.log('💱 基于买入数据的价格计算:', { tokensFor1ETH, calculatedPrice });
          priceInETH = calculatedPrice;
        }
      }
      
      console.log('🎯 最终计算的价格:', priceInETH);

      const priceInUSD = (parseFloat(priceInETH) * ethPriceUSD).toFixed(6);

      // 格式化市值
      let formattedMarketCap = '$0';
      if (marketCapData && typeof marketCapData === 'bigint') {
        const marketCapETH = Number(formatUnits(marketCapData, 18));
        const marketCapUSD = marketCapETH * ethPriceUSD;
        
        if (marketCapUSD > 1000000) {
          formattedMarketCap = `$${(marketCapUSD / 1000000).toFixed(2)}M`;
        } else if (marketCapUSD > 1000) {
          formattedMarketCap = `$${(marketCapUSD / 1000).toFixed(2)}K`;
        } else {
          formattedMarketCap = `$${marketCapUSD.toFixed(2)}`;
        }
      }

      // 模拟24小时数据 (实际应用中需要历史数据)
      const mockPriceChange = (Math.random() - 0.5) * 20; // -10% 到 +10% 的随机变化
      const priceChange24h = `${mockPriceChange >= 0 ? '+' : ''}${mockPriceChange.toFixed(2)}%`;
      
      const mockVolume24h = Math.random() * 100000; // 随机24小时交易量
      const volume24h = mockVolume24h > 1000 
        ? `$${(mockVolume24h / 1000).toFixed(1)}K` 
        : `$${mockVolume24h.toFixed(0)}`;

      setPriceData({
        priceInETH,
        priceInUSD,
        marketCap: formattedMarketCap,
        virtualTokenReserves: formatUnits(bondingInfo.virtualTokenReserves, 18),
        virtualEthReserves: formatUnits(bondingInfo.virtualEthReserves, 18),
        realTokenReserves: formatUnits(bondingInfo.realTokenReserves, 18),
        realEthReserves: formatUnits(bondingInfo.realEthReserves, 18),
        presaleOpen: bondingInfo.presaleOpen,
        tradingOpen: bondingInfo.tradingOpen,
        poolFail: bondingInfo.poolFail,
        priceChange24h,
        volume24h,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('❌ 计算价格数据失败:', error);
      console.error('❌ 错误详情:', {
        tokenAddress,
        bondingCurveData,
        buyPriceData,
        marketCapData,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      setPriceData(prev => ({
        ...prev,
        isLoading: false,
        error: `价格计算失败: ${error instanceof Error ? error.message : String(error)}`,
      }));
    }
  }, [
    bondingCurveData, 
    marketCapData, 
    buyPriceData, 
    tokenAddress, 
    ethPriceUSD, 
    bondingCurveLoading, 
    bondingCurveError
  ]);

  // 回退价格计算 - 当无法从 Pool 合约获取数据时使用
  const calculateFallbackPrice = useCallback(() => {
    console.log('🔄 使用回退价格计算');
    
    // 如果有买入价格数据，可以直接计算价格
    if (buyPriceData && typeof buyPriceData === 'bigint' && buyPriceData > BigInt(0)) {
      try {
        const tokensFor1ETH = Number(formatUnits(buyPriceData, 18));
        if (tokensFor1ETH > 0) {
          const priceInETH = (1 / tokensFor1ETH).toFixed(8);
          const priceInUSD = (parseFloat(priceInETH) * ethPriceUSD).toFixed(6);
          
          console.log('✅ 回退价格计算成功:', { priceInETH, priceInUSD });
          
          setPriceData({
            priceInETH,
            priceInUSD,
            marketCap: '$0', // 无法计算市值
            virtualTokenReserves: '0',
            virtualEthReserves: '0',
            realTokenReserves: '0',
            realEthReserves: '0',
            presaleOpen: false,
            tradingOpen: true, // 假设交易开放
            poolFail: false,
            priceChange24h: '+0.00%',
            volume24h: '$0',
            isLoading: false,
            error: null,
          });
          return true;
        }
      } catch (error) {
        console.error('❌ 回退价格计算失败:', error);
      }
    }
    
    return false;
  }, [buyPriceData, ethPriceUSD]);

  // 当数据更新时重新计算价格
  useEffect(() => {
    if (!bondingCurveLoading && !marketCapLoading && !buyPriceLoading) {
      calculatePrice();
    }
  }, [bondingCurveLoading, marketCapLoading, buyPriceLoading, calculatePrice]);

  // 如果主要计算失败，尝试使用回退计算
  useEffect(() => {
    if (!buyPriceLoading && priceData.error && priceData.priceInETH === '0') {
      console.log('🔄 主要价格计算失败，尝试回退方案');
      calculateFallbackPrice();
    }
  }, [buyPriceLoading, priceData.error, priceData.priceInETH, calculateFallbackPrice]);

  return priceData;
}

/**
 * 获取交易报价 - 用于交易前的价格预览
 */
export function useTradeQuote(
  tokenAddress?: string,
  tradeType: 'buy' | 'sell' = 'buy',
  amount?: string
) {
  const buyQuote = useCalcBuyPrice(
    tokenAddress,
    tradeType === 'buy' ? amount : undefined
  );
  
  const sellQuote = useCalcSellPrice(
    tokenAddress,
    tradeType === 'sell' ? amount : undefined
  );

  const isLoading = tradeType === 'buy' ? buyQuote.isLoading : sellQuote.isLoading;
  const error = tradeType === 'buy' ? buyQuote.error : sellQuote.error;
  const data = tradeType === 'buy' ? buyQuote.data : sellQuote.data;

  return {
    data: data ? formatUnits(data as bigint, 18) : '0',
    isLoading,
    error,
  };
}
