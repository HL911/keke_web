"use client";

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TradingChartSimpleProps {
  symbol?: string;
  tokenName?: string;
}

export default function TradingChartSimple({ symbol = "KEKE/USDT", tokenName = "KEKE" }: TradingChartSimpleProps) {
  const [currentPrice, setCurrentPrice] = useState("0.42814");
  const [priceChange, setPriceChange] = useState("+0.11%");
  const [volume, setVolume] = useState("940");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 模拟价格更新
    const interval = setInterval(() => {
      const basePrice = 0.42814;
      const variation = (Math.random() - 0.5) * 0.002;
      const newPrice = (basePrice * (1 + variation)).toFixed(5);
      const change = ((parseFloat(newPrice) - basePrice) / basePrice * 100).toFixed(2);
      
      setCurrentPrice(newPrice);
      setPriceChange(`${parseFloat(change) >= 0 ? '+' : ''}${change}%`);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 动态加载 lightweight-charts
  useEffect(() => {
    const loadChart = async () => {
      if (!chartContainerRef.current) return;
      
      try {
        // 动态导入 lightweight-charts
        const LightweightCharts = await import('lightweight-charts');
        const { createChart, ColorType } = LightweightCharts;

        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { type: ColorType.Solid, color: '#1a1a1a' },
            textColor: '#DDD',
          },
          grid: {
            vertLines: { color: '#2B2B43' },
            horzLines: { color: '#2B2B43' },
          },
          rightPriceScale: {
            borderColor: '#2B2B43',
          },
          timeScale: {
            borderColor: '#2B2B43',
            timeVisible: true,
          },
        });

        // 尝试添加蜡烛图系列
        let candlestickSeries;
        try {
          candlestickSeries = (chart as any).addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
          });
        } catch (error) {
          console.warn('Candlestick series not available, falling back to line series');
          // 如果蜡烛图不可用，使用线条图
          candlestickSeries = chart.addLineSeries({
            color: '#26a69a',
            lineWidth: 2,
          });
        }

        // 生成模拟数据
        const generateData = () => {
          const data = [];
          const basePrice = 0.42814;
          let lastPrice = basePrice;
          
          for (let i = 0; i < 100; i++) {
            const time = Math.floor(Date.now() / 1000) - (100 - i) * 60;
            const change = (Math.random() - 0.5) * 0.01;
            const price = lastPrice * (1 + change);
            
            if (candlestickSeries.setData) {
              // 蜡烛图数据
              const open = lastPrice;
              const close = price;
              const high = Math.max(open, close) * (1 + Math.random() * 0.01);
              const low = Math.min(open, close) * (1 - Math.random() * 0.01);
              
              data.push({
                time,
                open: Number(open.toFixed(5)),
                high: Number(high.toFixed(5)),
                low: Number(low.toFixed(5)),
                close: Number(close.toFixed(5)),
              });
            } else {
              // 线条图数据
              data.push({
                time,
                value: Number(price.toFixed(5)),
              });
            }
            
            lastPrice = price;
          }
          
          return data;
        };

        const data = generateData();
        candlestickSeries.setData(data);

        // 响应式调整
        const handleResize = () => {
          if (chartContainerRef.current) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          chart.remove();
        };
      } catch (error) {
        console.error('Error loading chart:', error);
        // 如果图表加载失败，显示占位符
        if (chartContainerRef.current) {
          chartContainerRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-400">
              <div class="text-center">
                <div class="text-lg mb-2">📈</div>
                <div>图表加载中...</div>
              </div>
            </div>
          `;
        }
      }
    };

    loadChart();
  }, []);

  return (
    <Card className="bg-black text-white border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl">{symbol}</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                买入
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                卖出
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400">1m</Button>
            <Button variant="ghost" size="sm" className="text-gray-400">5m</Button>
            <Button variant="ghost" size="sm" className="text-white bg-gray-800">15m</Button>
            <Button variant="ghost" size="sm" className="text-gray-400">1h</Button>
            <Button variant="ghost" size="sm" className="text-gray-400">4h</Button>
            <Button variant="ghost" size="sm" className="text-gray-400">1d</Button>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-400">价格: </span>
            <span className="text-white font-bold">${currentPrice}</span>
          </div>
          <div>
            <span className="text-gray-400">24h变化: </span>
            <span className={`font-bold ${priceChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange}
            </span>
          </div>
          <div>
            <span className="text-gray-400">成交量: </span>
            <span className="text-white">{volume}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={chartContainerRef} className="w-full h-[400px] bg-gray-900" />
      </CardContent>
    </Card>
  );
}
