"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
}

interface TradeEntry {
  time: string;
  price: string;
  amount: string;
  type: 'buy' | 'sell';
  txHash?: string;
}

export default function OrderBook() {
  const [buyOrders, setBuyOrders] = useState<OrderBookEntry[]>([]);
  const [sellOrders, setSellOrders] = useState<OrderBookEntry[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeEntry[]>([]);

  // 生成模拟订单簿数据
  useEffect(() => {
    const generateOrderBook = () => {
      const basePrice = 0.42814;
      const buyOrdersData: OrderBookEntry[] = [];
      const sellOrdersData: OrderBookEntry[] = [];

      // 生成买单 (价格递减)
      for (let i = 0; i < 10; i++) {
        const price = (basePrice * (1 - (i + 1) * 0.001)).toFixed(5);
        const amount = (Math.random() * 1000 + 100).toFixed(2);
        const total = (parseFloat(price) * parseFloat(amount)).toFixed(4);
        buyOrdersData.push({ price, amount, total });
      }

      // 生成卖单 (价格递增)
      for (let i = 0; i < 10; i++) {
        const price = (basePrice * (1 + (i + 1) * 0.001)).toFixed(5);
        const amount = (Math.random() * 1000 + 100).toFixed(2);
        const total = (parseFloat(price) * parseFloat(amount)).toFixed(4);
        sellOrdersData.push({ price, amount, total });
      }

      setBuyOrders(buyOrdersData);
      setSellOrders(sellOrdersData);
    };

    // 生成模拟交易记录
    const generateTrades = () => {
      const trades: TradeEntry[] = [];
      const basePrice = 0.42814;

      for (let i = 0; i < 20; i++) {
        const time = new Date(Date.now() - i * 60000).toLocaleTimeString('zh-CN', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
        const priceVariation = (Math.random() - 0.5) * 0.01;
        const price = (basePrice * (1 + priceVariation)).toFixed(5);
        const amount = (Math.random() * 500 + 10).toFixed(2);
        const type = Math.random() > 0.5 ? 'buy' : 'sell';
        const txHash = `0x${Math.random().toString(16).substr(2, 8)}...`;

        trades.push({ time, price, amount, type, txHash });
      }

      setRecentTrades(trades);
    };

    generateOrderBook();
    generateTrades();

    // 定期更新数据
    const interval = setInterval(() => {
      generateOrderBook();
      // 只更新最新的交易记录
      if (Math.random() > 0.7) {
        const newTrade: TradeEntry = {
          time: new Date().toLocaleTimeString('zh-CN', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          price: (0.42814 * (1 + (Math.random() - 0.5) * 0.01)).toFixed(5),
          amount: (Math.random() * 500 + 10).toFixed(2),
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          txHash: `0x${Math.random().toString(16).substr(2, 8)}...`
        };
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 19)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gray-900 text-white border-gray-700 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">市场深度</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="orderbook" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 mx-4 mb-4">
            <TabsTrigger value="orderbook" className="text-gray-400 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              订单簿
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-gray-400 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              最新成交
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orderbook" className="mt-0">
            <div className="px-4">
              {/* 卖单区域 */}
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2 px-2">
                  <span>价格(USDT)</span>
                  <span className="text-right">数量(KEKE)</span>
                  <span className="text-right">总计</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {sellOrders.map((order, index) => (
                    <div key={`sell-${index}`} className="grid grid-cols-3 gap-2 text-xs py-1 px-2 hover:bg-gray-800 cursor-pointer">
                      <span className="text-red-400 font-mono">{order.price}</span>
                      <span className="text-right text-white font-mono">{order.amount}</span>
                      <span className="text-right text-gray-300 font-mono">{order.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 当前价格 */}
              <div className="flex items-center justify-center py-3 bg-gray-800 rounded-lg mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">0.42814</div>
                  <div className="text-xs text-gray-400">≈ $0.42814</div>
                </div>
              </div>

              {/* 买单区域 */}
              <div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {buyOrders.map((order, index) => (
                    <div key={`buy-${index}`} className="grid grid-cols-3 gap-2 text-xs py-1 px-2 hover:bg-gray-800 cursor-pointer">
                      <span className="text-green-400 font-mono">{order.price}</span>
                      <span className="text-right text-white font-mono">{order.amount}</span>
                      <span className="text-right text-gray-300 font-mono">{order.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="mt-0">
            <div className="px-4">
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 mb-2 px-2">
                <span>时间</span>
                <span className="text-right">价格(USDT)</span>
                <span className="text-right">数量(KEKE)</span>
                <span className="text-right">类型</span>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {recentTrades.map((trade, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 text-xs py-1 px-2 hover:bg-gray-800 cursor-pointer">
                    <span className="text-gray-300 font-mono">{trade.time}</span>
                    <span className={`text-right font-mono ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.price}
                    </span>
                    <span className="text-right text-white font-mono">{trade.amount}</span>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-1 py-0 ${
                          trade.type === 'buy' 
                            ? 'border-green-400 text-green-400' 
                            : 'border-red-400 text-red-400'
                        }`}
                      >
                        {trade.type === 'buy' ? '买入' : '卖出'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
