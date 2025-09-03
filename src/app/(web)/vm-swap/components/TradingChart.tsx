"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickData, Time, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebSocket, KlineData } from '@/hooks/useWebSocket';

interface TradingChartProps {
  symbol?: string;
  tokenName?: string;
  data?: CandlestickData[];
  onCrosshairMove?: (param: any) => void;
  onClick?: (param: any) => void;
  // WebSocket 配置
  pairAddress?: string;
  network?: string;
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
  onClick,
  pairAddress = "0x123...", // 默认交易对地址，后续从配置中获取
  network = "ethereum"
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
  const [seriesType, setSeriesType] = useState<'candlestick' | 'line' | 'area' | 'mock'>('candlestick');
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // WebSocket K线数据处理
  const handleKlineUpdate = useCallback((klineData: KlineData) => {
    // 将服务器的 K线数据转换为图表格式
    const newCandlestick: CandlestickData = {
      time: (new Date(klineData.timestamp).getTime() / 1000) as Time,
      open: parseFloat(klineData.open_price),
      high: parseFloat(klineData.high_price),
      low: parseFloat(klineData.low_price),
      close: parseFloat(klineData.close_price),
    };

    console.log('收到 K线数据:', newCandlestick);

    // 更新图表数据
    setChartData(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      
      // 如果是同一时间的数据，则更新最后一条；否则添加新数据
      if (lastIndex >= 0 && updated[lastIndex].time === newCandlestick.time) {
        updated[lastIndex] = newCandlestick;
      } else {
        updated.push(newCandlestick);
        // 保持最多1000条数据
        if (updated.length > 1000) {
          updated.shift();
        }
      }
      
      return updated;
    });

    // 更新当前价格显示
    setCurrentPrice(klineData.close_price);
    setVolume(klineData.volume);
    
    // 更新图表系列
    if (candlestickSeriesRef.current && typeof candlestickSeriesRef.current.update === 'function') {
      try {
        let updateData: any;
        
        if (seriesType === 'candlestick') {
          updateData = newCandlestick;
        } else if (seriesType === 'line' || seriesType === 'area') {
          updateData = {
            time: newCandlestick.time,
            value: newCandlestick.close,
          };
        } else {
          updateData = newCandlestick;
        }
        
        candlestickSeriesRef.current.update(updateData);
      } catch (error) {
        console.error('更新图表数据失败:', error);
      }
    }
  }, [seriesType]);

  // WebSocket 连接
  const { 
    isConnected, 
    isConnecting, 
    hasReachedMaxRetries,
    reconnectAttempts,
    maxReconnectAttempts,
    connect, 
    subscribe,
    resetRetryState
  } = useWebSocket({
    onKlineUpdate: handleKlineUpdate,
    onConnect: () => {
      console.log('WebSocket 已连接');
      setWsConnected(true);
      setConnectionError(null);
    },
    onDisconnect: () => {
      console.log('WebSocket 已断开');
      setWsConnected(false);
    },
    onError: (error) => {
      console.error('WebSocket 错误:', error);
      setConnectionError(error instanceof Error ? error.message : String(error));
      setWsConnected(false);
    }
  });
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
    let actualSeriesType: 'candlestick' | 'line' | 'area' | 'mock' = 'candlestick';
    
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
        actualSeriesType = 'candlestick';
        console.log('✅ 使用 addCandlestickSeries 成功');
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
          actualSeriesType = 'candlestick';
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
          actualSeriesType = 'line';
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
            actualSeriesType = 'area';
            console.log('✅ 使用 addSeries(AreaSeries) 作为最后后备方案');
          } catch (error4) {
            console.error('❌ 所有图表方法都失败了:', error4);
            
            // 最终模拟对象
            actualSeriesType = 'mock';
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

    return { series, type: actualSeriesType };
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

    const seriesResult = createCandlestickSeries(chart);
    const candlestickSeries = seriesResult.series;
    const detectedSeriesType = seriesResult.type;
    
    // 更新图表类型状态
    setSeriesType(detectedSeriesType);
    
    if (!candlestickSeries) {
      console.warn('无法创建图表系列，将显示静态图表');
      // 不返回，继续执行，显示静态版本
    }
    
    try {
      // 设置初始数据，模拟 wrapper 的 data prop
      if (candlestickSeries && typeof candlestickSeries.setData === 'function') {
        // 根据图表类型转换数据格式
        let dataToSet: any;
        
        if (detectedSeriesType === 'candlestick') {
          // 蜡烛图使用原始数据
          dataToSet = chartData;
        } else if (detectedSeriesType === 'line' || detectedSeriesType === 'area') {
          // 线条图和区域图只需要 time 和 value（使用 close 价格）
          dataToSet = chartData.map(item => ({
            time: item.time,
            value: item.close,
          }));
        } else {
          // mock 类型不需要实际设置数据
          dataToSet = chartData;
        }
        
        if (detectedSeriesType !== 'mock') {
          candlestickSeries.setData(dataToSet);
          console.log(`✅ 图表数据设置成功 (${detectedSeriesType} 格式)`);
        }
        updatePriceInfo(chartData);
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

  // WebSocket 连接和订阅
  useEffect(() => {
    // 如果提供了外部数据，不连接 WebSocket
    if (externalData) {
      return;
    }

    // 连接 WebSocket
    connect();

    // 订阅 K线数据
    const subscription = {
      network,
      pairAddress,
      intervals: ['1m', '15m'] // 订阅 1分钟 和 15分钟 K线
    };

    // 延迟订阅，确保连接已建立
    const timer = setTimeout(() => {
      subscribe(subscription);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [externalData, network, pairAddress, connect, subscribe]);

  return (
    <Card className="bg-black text-white border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl">{symbol}</CardTitle>
            <div className="flex items-center gap-2">
              {/* WebSocket 连接状态指示 */}
              <Badge 
                variant="outline" 
                className={`text-xs cursor-help ${
                  wsConnected 
                    ? 'border-green-400 text-green-400' 
                    : isConnecting 
                    ? 'border-yellow-400 text-yellow-400'
                    : hasReachedMaxRetries
                    ? 'border-red-500 text-red-500'
                    : 'border-red-400 text-red-400'
                }`}
                title={
                  hasReachedMaxRetries
                    ? `连接失败: 已达到最大重试次数 (${maxReconnectAttempts} 次)`
                    : connectionError 
                    ? `连接错误: ${connectionError} (重试: ${reconnectAttempts}/${maxReconnectAttempts})` 
                    : wsConnected 
                    ? '实时数据连接正常' 
                    : isConnecting 
                    ? `正在连接 WebSocket... (尝试: ${reconnectAttempts + 1}/${maxReconnectAttempts})` 
                    : '未连接到实时数据源'
                }
              >
                {wsConnected 
                  ? '实时数据' 
                  : isConnecting 
                  ? `连接中... (${reconnectAttempts + 1}/${maxReconnectAttempts})` 
                  : hasReachedMaxRetries
                  ? '重试已耗尽'
                  : connectionError 
                  ? `连接失败 (${reconnectAttempts}/${maxReconnectAttempts})` 
                  : externalData 
                  ? '静态数据' 
                  : '离线'
                }
              </Badge>
              
              {/* 手动重试按钮 */}
              {hasReachedMaxRetries && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                  onClick={() => {
                    resetRetryState();
                    connect();
                  }}
                  title="重置重试状态并尝试重新连接"
                >
                  手动重试
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                  买入
                </Button>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                  卖出
                </Button>
              </div>
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
                <div className="text-sm text-gray-400 mt-4">
                  {connectionError ? (
                    <div className="space-y-2">
                      <div className="text-red-400">⚠️ 实时数据连接失败</div>
                      <div className="text-xs max-w-md break-words">{connectionError}</div>
                      <div className="text-xs text-blue-400 mt-2">
                        💡 提示: 请运行 <code className="bg-gray-800 px-1 rounded">npm run test:websocket</code> 检查连接
                      </div>
                    </div>
                  ) : isConnecting ? (
                    <div>
                      <div className="animate-pulse">🔄 连接实时数据中...</div>
                      <div className="text-xs mt-1">正在连接 WebSocket 服务器</div>
                    </div>
                  ) : (
                    <div>📊 图表加载中...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
