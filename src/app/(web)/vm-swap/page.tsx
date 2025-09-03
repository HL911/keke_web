"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Volume2, Users, Activity } from "lucide-react";
import { useAccount } from "wagmi";
import { Toaster } from "sonner";
import { TradingChart, TradingPanel, OrderBook } from './components';

export default function VMSwapPage() {
  const { address } = useAccount();
  const [currentPrice, setCurrentPrice] = useState("0.42814");
  const [priceChange, setPriceChange] = useState("+0.11%");
  const [marketStats, setMarketStats] = useState({
    volume24h: "$428.14M",
    marketCap: "$806.3K",
    holders: "1,245",
    transactions: "8,932"
  });

  // 模拟价格更新
  useEffect(() => {
    const interval = setInterval(() => {
      const basePrice = 0.42814;
      const variation = (Math.random() - 0.5) * 0.002;
      const newPrice = (basePrice * (1 + variation)).toFixed(5);
      const change = ((parseFloat(newPrice) - basePrice) / basePrice * 100).toFixed(2);
      
      setCurrentPrice(newPrice);
      setPriceChange(`${parseFloat(change) >= 0 ? '+' : ''}${change}%`);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 顶部统计栏 */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">KEKE/USDT</h1>
                  <p className="text-sm text-gray-400">KEKE Token</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">${currentPrice}</div>
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
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-6 ">
        {/* 左侧：图表区域 */}
        <div className="col-span-8">
          <TradingChart symbol="KEKE/USDT" tokenName="KEKE" />
          
        </div>
        {/* 右侧：交易面板和订单簿 */}
        <div className="col-span-4 space-y-6">
          {/* 交易面板 */}
          <TradingPanel symbol="KEKE" currentPrice={currentPrice} />
        </div>
        
      </div>
      {/* 订单簿 */}
      <OrderBook />
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}
