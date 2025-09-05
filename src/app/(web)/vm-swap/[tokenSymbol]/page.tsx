"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Volume2, Users, Activity } from "lucide-react";
import { useAccount } from "wagmi";
import { Toaster } from "sonner";
import { TradingChart, TradingPanel, OrderBook } from '../components';
import { useTokenInfo } from '../hooks/useTokenInfo';
import { useMemeTokens } from '../../trending/hook/useMemeTokens';

interface VMSwapPageProps {
  params: {
    tokenSymbol: string;
  };
}

export default function VMSwapPage({ params }: VMSwapPageProps) {
  const { address } = useAccount();
  const { tokenSymbol } = params;
  
  // 数字格式化函数 - 参考 TokenList.tsx
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  };

  // 价格格式化函数 - 参考 TokenList.tsx
  const formatPrice = (price: number | undefined) => {
    if (!price) return '$0.00';
    if (price < 0.01) {
      // 将小数转换为字符串
      const priceStr = price.toString();
      
      // 检查是否为科学计数法
      if (priceStr.includes('e')) {
        const [base, exponent] = priceStr.split('e');
        const exp = Math.abs(parseInt(exponent));
        
        // 获取有效数字
        const significantDigits = base.replace('.', '').replace('-', '');
        
        // 格式化为 0.0₈44873 形式
        if (exp > 1) {
          const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
          const subscriptExp = (exp - 1).toString().split('').map(digit => subscriptNumbers[parseInt(digit)]).join('');
          return `$0.0${subscriptExp}${significantDigits.slice(0, 5)}`;
        }
      }
      
      // 处理普通小数
      const match = priceStr.match(/^0\.(0+)([1-9]\d*)/);
      if (match) {
        const zeros = match[1].length;
        const digits = match[2];
        
        if (zeros >= 4) {
          const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
          const subscriptZeros = zeros.toString().split('').map(digit => subscriptNumbers[parseInt(digit)]).join('');
          return `$0.0${subscriptZeros}${digits.slice(0, 5)}`;
        }
      }
      
      return `$${price.toFixed(8)}`;
    }
    return `$${price.toFixed(4)}`;
  };
  
  // 解码 URL 参数（防止特殊字符问题）
  const decodedTokenSymbol = decodeURIComponent(tokenSymbol);
  
  // 获取代币信息
  const { fetchMemeTokenInfo, memeTokenInfo, memeTokenLoading } = useTokenInfo();
  
  // 获取meme代币列表数据 - 替换poolPrice数据源
  const { tokens, loading: tokensLoading, error: tokensError } = useMemeTokens({
    search: decodedTokenSymbol,
    orderBy: 'market_cap',
    orderDirection: 'DESC',
    limit: 10
  });
  
  // 找到当前代币的数据
  const currentTokenData = tokens.find(token => 
    token.symbol.toLowerCase() === decodedTokenSymbol.toLowerCase()
  );
  
  // 获取 meme 代币信息 - 当代币符号变化时重置并获取新信息
  useEffect(() => {
    if (decodedTokenSymbol) {
      console.log('🔄 页面代币符号变化:', decodedTokenSymbol);
      // 先重置之前的信息，避免显示错误的缓存数据
      fetchMemeTokenInfo(decodedTokenSymbol);
    }
  }, [decodedTokenSymbol]); // 移除 fetchMemeTokenInfo 依赖，避免循环

  // 使用 MemeToken API 数据
  const currentPrice = currentTokenData?.price_usd 
    ? (currentTokenData.price_usd / 3000).toFixed(8) // 假设ETH价格为3000USD，转换为ETH价格
    : "0.0000001";
  
  // 计算价格变化百分比
  const priceChange = currentTokenData?.price_change_24h 
    ? `${currentTokenData.price_change_24h >= 0 ? '+' : ''}${currentTokenData.price_change_24h.toFixed(2)}%`
    : "+0.00%";
  
  const marketStats = {
    volume24h: `$${formatNumber(currentTokenData?.volume_24h)}`,
    marketCap: `$${formatNumber(currentTokenData?.market_cap)}`,
    priceUSD: currentTokenData?.price_usd ? formatPrice(currentTokenData.price_usd) : '$0.00',
    holders: "1,245", // 暂时保持模拟数据，后续可从API获取
    transactions: "8,932", // 暂时保持模拟数据，后续可从API获取
    
    // 代币信息
    tokenInfo: currentTokenData,
    isLoading: tokensLoading || memeTokenLoading,
    error: tokensError,
    
    // 交易状态（基于API数据推断）
    presaleOpen: false, // API数据中没有这个信息，设为false
    tradingOpen: true,  // 如果有价格数据说明已开放交易
    poolFail: false,    // API数据中没有这个信息，设为false
  };
  console.log('marketStats', marketStats)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 顶部统计栏 */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{decodedTokenSymbol.charAt(0)}</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">{decodedTokenSymbol}/ETH</h1>
                  <p className="text-sm text-gray-600">{decodedTokenSymbol} Token</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentPrice} ETH
                    {marketStats.isLoading && (
                      <span className="ml-2 text-sm text-gray-500">(加载中...)</span>
                    )}
                    {marketStats.error && (
                      <span className="ml-2 text-sm text-red-500">(加载失败)</span>
                    )}
                  </div>
                  <div className={`text-sm flex items-center gap-1 ${priceChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange.startsWith('+') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {priceChange}
                  </div>
                  {currentTokenData?.price_usd && (
                    <div className="text-sm text-gray-600">
                      ≈ {marketStats.priceUSD}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600 flex items-center gap-1">
                      <Volume2 className="w-4 h-4" />
                      24h成交量
                    </div>
                    <div className="font-semibold">{marketStats.volume24h}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      市值
                    </div>
                    <div className="font-semibold">{marketStats.marketCap}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      持有人
                    </div>
                    <div className="font-semibold">{marketStats.holders}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {marketStats.tradingOpen && currentTokenData && (
                <Badge variant="outline" className="border-green-600 text-green-600">
                  交易开放
                </Badge>
              )}              
              {currentTokenData && (
                <Badge variant="outline" className="border-purple-600 text-purple-600">
                  Meme代币
                </Badge>
              )}
              {address && (
                <Badge variant="outline" className="border-blue-600 text-blue-600">
                  已连接
                </Badge>
              )}
              {marketStats.isLoading && (
                <Badge variant="outline" className="border-gray-500 text-gray-500">
                  加载中...
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
          {
            memeTokenInfo?.address && <TradingChart 
            symbol={`${decodedTokenSymbol}/ETH`}
            tokenName={decodedTokenSymbol}
            pairAddress={memeTokenInfo?.address}
            network="ethereum"
          />
          }
          
        </div>
        {/* 右侧：交易面板和订单簿 */}
        <div className="col-span-4 space-y-6">
          {/* 交易面板 - 传递正确的 symbol 参数 */}
          <TradingPanel symbol={decodedTokenSymbol} currentPrice={currentPrice} />
          
          {/* 订单簿 */}
          
        </div>
        
      </div>
      {/* Toast notifications */}
      {/* <Toaster position="top-right" /> */}
      {/* <OrderBook /> */}
    </div>
  );
}
