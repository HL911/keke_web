"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Volume2, Users, Activity } from "lucide-react";
import { useAccount } from "wagmi";
import { Toaster } from "sonner";
import { TradingChart, TradingPanel, OrderBook } from '../components';
import { usePairInfo } from '@/hooks/usePairInfo';
import { useTokenConfig } from '@/hooks';

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
  
  // 获取代币配置
  const memeTokenConfig = useTokenConfig(decodedTokenSymbol);
  const ethConfig = useTokenConfig('WETH'); // 使用WETH作为基础交易对
  
  // 获取交易对信息
  const pairInfo = usePairInfo({
    token0Symbol: decodedTokenSymbol,
    token1Symbol: 'WETH',
    token0Address: memeTokenConfig.tokenInfo?.address,
    token1Address: ethConfig.tokenInfo?.address,
  });

  // 使用真实数据或回退到默认值
  const currentPrice = pairInfo.currentPrice || "0.42814";
  const priceChange = pairInfo.priceChange24h || "+0.11%";
  const marketStats = {
    volume24h: pairInfo.volume24h || "$428.14M",
    marketCap: pairInfo.marketCap || "$806.3K",
    holders: pairInfo.holders || "1,245",
    transactions: "8,932" // 暂时保持模拟数据，后续可从API获取
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
                    {pairInfo.isLoading && (
                      <span className="ml-2 text-sm text-gray-400">(加载中...)</span>
                    )}
                  </div>
                  <div className={`text-sm flex items-center gap-1 ${priceChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange.startsWith('+') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {priceChange}
                  </div>
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
              <Badge variant="outline" className="border-green-400 text-green-400">
                已验证
              </Badge>
              <Badge variant="outline" className="border-blue-400 text-blue-400">
                DEX
              </Badge>
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
