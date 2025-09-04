/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 18:15:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 18:15:00
 * @FilePath: /keke_web/src/hooks/usePairInfo.ts
 * @Description: 交易对信息 Hook
 */

import { useEffect, useState, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useKekeswapFactoryAddress } from './useContract';
import KekeswapFactory_ABI from '@/abi/KekeswapFactory.json';
import KekeMockERC20_ABI from '@/abi/KekeMockERC20.json';

export interface PairInfo {
  // 基础信息
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  
  // 储备量信息
  reserve0: string;
  reserve1: string;
  
  // 计算得出的信息
  currentPrice: string;
  priceChange24h: string;
  totalSupply: string;
  
  // 市场统计
  marketCap: string;
  volume24h: string;
  holders: string;
  
  // 状态
  isLoading: boolean;
  error: string | null;
}

interface UsePairInfoOptions {
  token0Symbol: string;
  token1Symbol: string;
  token0Address?: string;
  token1Address?: string;
}

export function usePairInfo({ 
  token0Symbol, 
  token1Symbol, 
  token0Address, 
  token1Address 
}: UsePairInfoOptions): PairInfo {
  const [pairInfo, setPairInfo] = useState<PairInfo>({
    pairAddress: '',
    token0Address: token0Address || '',
    token1Address: token1Address || '',
    token0Symbol,
    token1Symbol,
    reserve0: '0',
    reserve1: '0',
    currentPrice: '0',
    priceChange24h: '+0.00%',
    totalSupply: '0',
    marketCap: '0',
    volume24h: '0',
    holders: '0',
    isLoading: true,
    error: null
  });

  const factoryAddress = useKekeswapFactoryAddress();

  // 获取交易对地址
  const { data: pairAddress, isLoading: isPairLoading } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: KekeswapFactory_ABI,
    functionName: 'getPair',
    args: [token0Address, token1Address],
    query: {
      enabled: !!factoryAddress && !!token0Address && !!token1Address,
    },
  });

  // 获取代币 0 信息
  const { data: token0Name } = useReadContract({
    address: token0Address as `0x${string}`,
    abi: KekeMockERC20_ABI,
    functionName: 'name',
    query: {
      enabled: !!token0Address,
    },
  });

  const { data: token0TotalSupply } = useReadContract({
    address: token0Address as `0x${string}`,
    abi: KekeMockERC20_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!token0Address,
    },
  });

  // 获取代币 1 信息
  const { data: token1Name } = useReadContract({
    address: token1Address as `0x${string}`,
    abi: KekeMockERC20_ABI,
    functionName: 'name',
    query: {
      enabled: !!token1Address,
    },
  });

  // 获取交易对储备量（需要交易对合约的ABI）
  const { data: reserves } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: [
      {
        "name": "getReserves",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
          {"name": "reserve0", "type": "uint112"},
          {"name": "reserve1", "type": "uint112"},
          {"name": "blockTimestampLast", "type": "uint32"}
        ]
      }
    ],
    functionName: 'getReserves',
    query: {
      enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // 从 API 获取24小时数据
  const fetch24hData = useCallback(async () => {
    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      return;
    }

    try {
      // 获取交易对统计数据
      const response = await fetch(`/api/pools?pair=${pairAddress}`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const poolData = result.data[0];
        return {
          volume24h: poolData.volume_24h || '0',
          priceChange24h: poolData.priceChange24h ? `${poolData.priceChange24h > 0 ? '+' : ''}${poolData.priceChange24h.toFixed(2)}%` : '+0.00%',
        };
      }
    } catch (error) {
      console.error('获取24小时数据失败:', error);
    }
    
    return {
      volume24h: '0',
      priceChange24h: '+0.00%',
    };
  }, [pairAddress]);

  // 获取持有人数量（模拟数据，实际需要从索引器获取）
  const getHoldersCount = useCallback(async () => {
    // 这里可以调用第三方API或者自己的索引器来获取持有人数量
    // 目前返回模拟数据
    return Math.floor(Math.random() * 10000 + 1000).toString();
  }, []);

  // 计算价格和市值
  const calculateMetrics = useCallback(async () => {
    if (!reserves || !token0TotalSupply) {
      return;
    }

    try {
      const [reserve0, reserve1] = reserves as [bigint, bigint, number];
      const reserve0Formatted = parseFloat(formatUnits(reserve0, 18));
      const reserve1Formatted = parseFloat(formatUnits(reserve1, 18));
      
      // 计算当前价格 (token1/token0)
      const currentPrice = reserve0Formatted > 0 ? (reserve1Formatted / reserve0Formatted).toFixed(6) : '0';
      
      // 计算市值 (假设 token1 是 USDT，price 是 token0 相对于 USDT 的价格)
      const totalSupplyFormatted = parseFloat(formatUnits(token0TotalSupply as bigint, 18));
      const marketCap = (totalSupplyFormatted * parseFloat(currentPrice));
      
      // 获取24小时数据
      const h24Data = await fetch24hData();
      
      // 获取持有人数量
      const holders = await getHoldersCount();

      setPairInfo(prev => ({
        ...prev,
        pairAddress: pairAddress as string,
        reserve0: reserve0Formatted.toFixed(2),
        reserve1: reserve1Formatted.toFixed(2),
        currentPrice,
        totalSupply: totalSupplyFormatted.toFixed(0),
        marketCap: marketCap > 1000000 
          ? `$${(marketCap / 1000000).toFixed(2)}M` 
          : marketCap > 1000 
          ? `$${(marketCap / 1000).toFixed(2)}K` 
          : `$${marketCap.toFixed(2)}`,
        volume24h: h24Data?.volume24h || '0',
        priceChange24h: h24Data?.priceChange24h || '+0.00%',
        holders,
        isLoading: false,
        error: null
      }));
      
    } catch (error) {
      console.error('计算交易对指标失败:', error);
      setPairInfo(prev => ({
        ...prev,
        isLoading: false,
        error: '计算失败'
      }));
    }
  }, [reserves, token0TotalSupply, pairAddress, fetch24hData, getHoldersCount]);

  // 当数据变化时重新计算
  useEffect(() => {
    if (reserves && token0TotalSupply && !isPairLoading) {
      calculateMetrics();
    }
  }, [reserves, token0TotalSupply, isPairLoading, calculateMetrics]);

  // 设置初始加载状态
  useEffect(() => {
    setPairInfo(prev => ({
      ...prev,
      isLoading: isPairLoading || !reserves || !token0TotalSupply,
    }));
  }, [isPairLoading, reserves, token0TotalSupply]);

  return pairInfo;
}
