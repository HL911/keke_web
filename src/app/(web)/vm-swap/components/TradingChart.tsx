"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickData, Time, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
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
  const createCandlestickSeries = useCallback((chart: any) => {
    // 处理 lightweight-charts API 兼容性问题
    let series = null;
    
    try {
      // 方法1: 尝试使用 addCandlestickSeries (较新版本)
      if (typeof chart.addCandlestickSeries === 'function') {
        series = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        console.log('使用 addCandlestickSeries 成功');
      } else {
        throw new Error('addCandlestickSeries not available');
      }
    } catch (error1) {
      console.warn('addCandlestickSeries 失败，尝试其他方法:', error1);
      
      try {
        // 方法2: 使用 v5.0+ 官方API - CandlestickSeries
        if (typeof chart.addSeries === 'function') {
          series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
          });
          console.log('✅ 使用 addSeries(CandlestickSeries) 成功');
        } else {
          throw new Error('addSeries not available');
        }
      } catch (error2) {
        console.warn('addSeries 失败，使用线条图作为后备:', error2);
        
        try {
          // 方法3: 降级到 LineSeries (v5.0+ API)
          series = chart.addSeries(LineSeries, {
            color: '#26a69a',
            lineWidth: 2,
          });
          console.log('✅ 使用 addSeries(LineSeries) 作为后备方案');
        } catch (error3) {
          console.warn('LineSeries 也失败，尝试 AreaSeries:', error3);
          
          try {
            // 方法4: 最后尝试 AreaSeries
            series = chart.addSeries(AreaSeries, {
              lineColor: '#26a69a',
              topColor: 'rgba(38, 166, 154, 0.4)',
              bottomColor: 'rgba(38, 166, 154, 0.0)',
              lineWidth: 2,
            });
            console.log('✅ 使用 addSeries(AreaSeries) 作为最后后备方案');
          } catch (error4) {
            console.error('❌ 所有图表方法都失败了:', error4);
            
            // 最终模拟对象
            series = {
              setData: (data: any) => {
                console.log('模拟 setData 调用，数据:', data?.length, '条记录');
              },
              update: (data: any) => {
                console.log('模拟 update 调用，数据:', data);
              },
            };
          }
        }
      }
    }

    return series;
  }, []);

  // 更新价格信息 - 支持不同的数据格式
  const updatePriceInfo = useCallback((data: any[]) => {
    if (data.length > 0) {
      const lastCandle = data[data.length - 1];
      const firstCandle = data[0];
      
      // 支持蜡烛图数据格式 (close) 和线条图数据格式 (value)
      const currentPrice = lastCandle.close || lastCandle.value || 0;
      const initialPrice = firstCandle.close || firstCandle.value || 0;
      
      setCurrentPrice(currentPrice.toFixed(5));
      
      if (initialPrice > 0) {
        const change = ((currentPrice - initialPrice) / initialPrice) * 100;
        setPriceChange(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
      }
    }
  }, []);

  // 主要的 useEffect，模拟 wrapper 的组件生命周期
  useEffect(() => {
    const chart = createChartInstance();
    if (!chart) return;

    const candlestickSeries = createCandlestickSeries(chart);
    if (!candlestickSeries) {
      console.warn('无法创建图表系列，将显示静态图表');
      // 不返回，继续执行，显示静态版本
    }
    
    try {
      // 设置初始数据，模拟 wrapper 的 data prop
      if (candlestickSeries && typeof candlestickSeries.setData === 'function') {
        candlestickSeries.setData(chartData);
        updatePriceInfo(chartData);
        console.log('图表数据设置成功');
      } else {
        console.warn('series.setData 方法不可用，仅更新价格信息');
        updatePriceInfo(chartData);
      }
    } catch (error) {
      console.error('设置图表数据失败:', error);
      // 即使设置数据失败，也要更新价格信息
      updatePriceInfo(chartData);
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // 响应式调整
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        try {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch (error) {
          console.error('调整图表大小失败:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        if (chart && typeof chart.remove === 'function') {
          chart.remove();
        }
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
          // 根据图表类型使用不同的数据格式
          let updateData: any;
          
          // 检查是否为线条图或区域图（只需要 value）
          const isLineSeries = !candlestickSeriesRef.current.update.toString().includes('candlestick');
          
          if (isLineSeries) {
            updateData = {
              time: lastTime,
              value: newPrice,
            };
          } else {
            updateData = {
              time: lastTime,
              open: lastPrice,
              high: Math.max(lastPrice, newPrice) * (1 + Math.random() * 0.001),
              low: Math.min(lastPrice, newPrice) * (1 - Math.random() * 0.001),
              close: newPrice,
            };
          }

          if (typeof candlestickSeriesRef.current.update === 'function') {
            candlestickSeriesRef.current.update(updateData);
            setCurrentPrice(newPrice.toFixed(5));
            
            // 更新内部数据状态
            setChartData(prev => [...prev.slice(-99), updateData]);
          }
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
        <div ref={chartContainerRef} className="w-full h-[400px] relative">
          {/* 如果图表加载失败，显示静态后备UI */}
          {!candlestickSeriesRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">📈</div>
                <div className="text-xl mb-2">{symbol}</div>
                <div className="text-2xl font-bold text-green-400">${currentPrice}</div>
                <div className={`text-lg ${priceChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange}
                </div>
                <div className="text-sm text-gray-400 mt-4">图表加载中...</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
