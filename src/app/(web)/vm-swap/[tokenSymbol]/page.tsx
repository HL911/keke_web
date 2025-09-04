"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Volume2, Users, Activity } from "lucide-react";
import { useAccount } from "wagmi";
import { Toaster } from "sonner";
import { TradingChart, TradingPanel, OrderBook } from '../components';
import { usePoolPrice } from '@/hooks/usePoolPrice';
import { useTokenInfo } from '../hooks/useTokenInfo';

interface VMSwapPageProps {
  params: {
    tokenSymbol: string;
  };
}

export default function VMSwapPage({ params }: VMSwapPageProps) {
  const { address } = useAccount();
  const { tokenSymbol } = params;
  
  // 解码 URL 参数（防止特殊字符问题）
  const decodedTokenSymbol = decodeURIComponent(tokenSymbol);
  
  // 获取代币信息
  const { fetchMemeTokenInfo, memeTokenInfo, memeTokenLoading } = useTokenInfo();
  
  // 获取基于Pool合约的价格信息
  const poolPrice = usePoolPrice(memeTokenInfo?.address, 3000); // 假设ETH价格为3000 USD
  
  // 获取 meme 代币信息 - 当代币符号变化时重置并获取新信息
  useEffect(() => {
    if (decodedTokenSymbol) {
      console.log('🔄 页面代币符号变化:', decodedTokenSymbol);
      // 先重置之前的信息，避免显示错误的缓存数据
      fetchMemeTokenInfo(decodedTokenSymbol);
    }
  }, [decodedTokenSymbol]); // 移除 fetchMemeTokenInfo 依赖，避免循环

  // 使用 Pool 合约的真实数据或回退到默认值
  const currentPrice = poolPrice.priceInETH || "0.0000001";
  const priceChange = poolPrice.priceChange24h || "+0.00%";
  const marketStats = {
    volume24h: poolPrice.volume24h || "$0",
    marketCap: poolPrice.marketCap || "$0",
    holders: "1,245", // 暂时保持模拟数据，后续可从API获取
    transactions: "8,932", // 暂时保持模拟数据，后续可从API获取
    
    // 新增的储备量信息
    virtualTokenReserves: poolPrice.virtualTokenReserves,
    virtualEthReserves: poolPrice.virtualEthReserves,
    realTokenReserves: poolPrice.realTokenReserves,
    realEthReserves: poolPrice.realEthReserves,
    
    // 交易状态
    presaleOpen: poolPrice.presaleOpen,
    tradingOpen: poolPrice.tradingOpen,
    poolFail: poolPrice.poolFail,
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 顶部统计栏 */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{decodedTokenSymbol.charAt(0)}</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">{decodedTokenSymbol}/ETH</h1>
                  <p className="text-sm text-gray-400">{decodedTokenSymbol} Token</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentPrice} ETH
                    {(poolPrice.isLoading || memeTokenLoading) && (
                      <span className="ml-2 text-sm text-gray-400">(加载中...)</span>
                    )}
                    {poolPrice.error && (
                      <span className="ml-2 text-sm text-red-400">(加载失败)</span>
                    )}
                  </div>
                  <div className={`text-sm flex items-center gap-1 ${priceChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange.startsWith('+') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {priceChange}
                  </div>
                  {poolPrice.priceInUSD && (
                    <div className="text-sm text-gray-400">
                      ≈ ${poolPrice.priceInUSD} USD
                    </div>
                  )}
                </div>
                
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400 flex items-center gap-1">
                      <Volume2 className="w-4 h-4" />
                      24h成交量
                    </div>
                    <div className="font-semibold">{marketStats.volume24h}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      市值
                    </div>
                    <div className="font-semibold">{marketStats.marketCap}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      持有人
                    </div>
                    <div className="font-semibold">{marketStats.holders}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {marketStats.presaleOpen && (
                <Badge variant="outline" className="border-orange-400 text-orange-400">
                  预售中
                </Badge>
              )}
              {marketStats.tradingOpen && (
                <Badge variant="outline" className="border-green-400 text-green-400">
                  交易开放
                </Badge>
              )}
              {marketStats.poolFail && (
                <Badge variant="outline" className="border-red-400 text-red-400">
                  池子失败
                </Badge>
              )}
              {memeTokenInfo && (
                <Badge variant="outline" className="border-blue-400 text-blue-400">
                  已验证
                </Badge>
              )}
              {address && (
                <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                  已连接
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-6 ">
        {/* 左侧：图表区域 */}
        <div className="col-span-8">
          {/* <TradingChart 
            symbol={`${decodedTokenSymbol}/ETH`}
            tokenName={decodedTokenSymbol}
            pairAddress={pairInfo.pairAddress || "0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C"}
            network="ethereum"
          /> */}
        </div>
        {/* 右侧：交易面板和订单簿 */}
        <div className="col-span-4 space-y-6">
          {/* 交易面板 - 传递正确的 symbol 参数 */}
          <TradingPanel symbol={decodedTokenSymbol} currentPrice={currentPrice} />
          
          {/* 订单簿 */}
          
        </div>
        
      </div>
      {/* Toast notifications */}
      <Toaster position="top-right" />
      <OrderBook />
    </div>
  );
}
