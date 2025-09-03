"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickData, Time, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TradingChartProps {
  symbol?: string;
  tokenName?: string;
  data?: CandlestickData[];
  onCrosshairMove?: (param: any) => void;
  onClick?: (param: any) => void;
}

// 模拟 lightweight-charts-react-wrapper 的数据生成
const generateInitialData = (): CandlestickData[] => {
  const data: CandlestickData[] = [];
  const basePrice = 0.42814;
  let lastPrice = basePrice;
  
  for (let i = 0; i < 100; i++) {
    const time = (Math.floor(Date.now() / 1000) - (100 - i) * 60) as Time;
    const change = (Math.random() - 0.5) * 0.01;
    const open = lastPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    data.push({
      time,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
    });
    
    lastPrice = close;
  }
  
  return data;
};

export default function TradingChart({ 
  symbol = "KEKE/USDT", 
  tokenName = "KEKE",
  data: externalData,
  onCrosshairMove,
  onClick
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState("0.42814");
  const [priceChange, setPriceChange] = useState("+0.11%");
  const [volume, setVolume] = useState("940");
  const [chartData, setChartData] = useState<CandlestickData[]>(() => 
    externalData || generateInitialData()
  );
  // 类似 lightweight-charts-react-wrapper 的 Chart 组件功能
  const createChartInstance = useCallback(() => {
    if (!chartContainerRef.current) return null;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#DDD',
      },
      grid: {
        vertLines: {
          color: '#2B2B43',
          style: 0,
          visible: true,
        },
        horzLines: {
          color: '#2B2B43',
          style: 0,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        textColor: '#DDD',
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 添加事件监听器，模拟 wrapper 的事件处理
    if (onCrosshairMove) {
      chart.subscribeCrosshairMove(onCrosshairMove);
    }
    
    if (onClick) {
      chart.subscribeClick(onClick);
    }

    return chart;
  }, [onCrosshairMove, onClick]);

  // 类似 lightweight-charts-react-wrapper 的 CandlestickSeries 组件功能
  const createCandlestickSeries = useCallback((chart: IChartApi) => {
    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    return series;
  }, []);

  // 更新价格信息
  const updatePriceInfo = useCallback((data: CandlestickData[]) => {
    if (data.length > 0) {
      const lastCandle = data[data.length - 1];
      setCurrentPrice(lastCandle.close.toFixed(5));
      const change = ((lastCandle.close - data[0].close) / data[0].close) * 100;
      setPriceChange(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
    }
  }, []);

  // 主要的 useEffect，模拟 wrapper 的组件生命周期
  useEffect(() => {
    const chart = createChartInstance();
    if (!chart) return;

    const candlestickSeries = createCandlestickSeries(chart);
    
    // 设置初始数据，模拟 wrapper 的 data prop
    candlestickSeries.setData(chartData);
    updatePriceInfo(chartData);

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // 响应式调整
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        chart.remove();
      } catch (error) {
        console.error('Error removing chart:', error);
      }
    };
  }, [createChartInstance, createCandlestickSeries, chartData, updatePriceInfo]);

  // 外部数据变化时更新图表，模拟 wrapper 的 reactive 功能
  useEffect(() => {
    if (externalData && candlestickSeriesRef.current) {
      setChartData(externalData);
      candlestickSeriesRef.current.setData(externalData);
      updatePriceInfo(externalData);
    }
  }, [externalData, updatePriceInfo]);

  // 实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      if (candlestickSeriesRef.current && !externalData) {
        const lastTime = Math.floor(Date.now() / 1000) as Time;
        const change = (Math.random() - 0.5) * 0.005;
        const lastPrice = Number(currentPrice);
        const newPrice = lastPrice * (1 + change);
        
        try {
          const newCandle: CandlestickData = {
            time: lastTime,
            open: lastPrice,
            high: Math.max(lastPrice, newPrice) * (1 + Math.random() * 0.001),
            low: Math.min(lastPrice, newPrice) * (1 - Math.random() * 0.001),
            close: newPrice,
          };

          candlestickSeriesRef.current.update(newCandle);
          setCurrentPrice(newPrice.toFixed(5));
          
          // 更新内部数据状态
          setChartData(prev => [...prev.slice(-99), newCandle]);
        } catch (error) {
          console.error('Error updating chart:', error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPrice, externalData]);

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
        <div ref={chartContainerRef} className="w-full" />
      </CardContent>
    </Card>
  );
}
