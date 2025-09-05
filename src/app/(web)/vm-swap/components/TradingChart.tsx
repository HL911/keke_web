"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickData, Time, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebSocket, KlineData } from '@/hooks/useWebSocket';

// API返回的K线数据格式
interface ApiKlineData {
  network: string;
  pair_address: string;
  interval_type: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

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
    externalData || [] // 初始为空，等待从API加载
  );
  const [seriesType, setSeriesType] = useState<'candlestick' | 'line' | 'area' | 'mock'>('candlestick');
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const isInitializedRef = useRef(false); // 防止重复初始化

  // API数据转换：将API返回的数据转换为图表所需格式
  const convertApiDataToCandlestick = useCallback((apiData: ApiKlineData[]): CandlestickData[] => {
    console.log('🔄 转换API数据到图表格式:', {
      totalRecords: apiData.length,
      firstRecord: apiData[0],
      samplePrices: apiData.slice(0, 3).map(item => ({
        timestamp: item.timestamp,
        open: item.open,
        close: item.close,
        parsedOpen: parseFloat(item.open),
        parsedClose: parseFloat(item.close)
      }))
    });

    const convertedData = apiData.map((item, index) => {
      const timeValue = new Date(item.timestamp).getTime() / 1000;
      let openValue = parseFloat(item.open);
      let highValue = parseFloat(item.high);
      let lowValue = parseFloat(item.low);
      let closeValue = parseFloat(item.close);

      // 检查数据有效性
      if (isNaN(timeValue) || isNaN(openValue) || isNaN(highValue) || isNaN(lowValue) || isNaN(closeValue)) {
        console.warn(`⚠️ 第${index + 1}条数据包含无效数值:`, {
          timestamp: item.timestamp,
          timeValue,
          openValue,
          highValue,
          lowValue,
          closeValue
        });
      }

      // 检查价格是否过小，如果过小则缩放
      const PRICE_THRESHOLD = 1e-6;
      const PRICE_SCALE = 1e9; // 将纳米级别的价格放大到可见范围

      if (openValue > 0 && openValue < PRICE_THRESHOLD) {
        console.warn(`⚠️ 第${index + 1}条数据价格过小，进行缩放:`, {
          originalOpen: openValue,
          scientific: item.open,
          scaledOpen: openValue * PRICE_SCALE
        });
        
        // 缩放所有价格
        openValue *= PRICE_SCALE;
        highValue *= PRICE_SCALE;
        lowValue *= PRICE_SCALE;
        closeValue *= PRICE_SCALE;
      }

      return {
        time: timeValue as Time,
        open: openValue,
        high: highValue,
        low: lowValue,
        close: closeValue,
      };
    }).sort((a, b) => (a.time as number) - (b.time as number)); // 按时间升序排列

    console.log('✅ 数据转换完成:', {
      convertedCount: convertedData.length,
      firstConverted: convertedData[0],
      lastConverted: convertedData[convertedData.length - 1],
      priceRange: {
        minPrice: Math.min(...convertedData.map(d => Math.min(d.open, d.high, d.low, d.close))),
        maxPrice: Math.max(...convertedData.map(d => Math.max(d.open, d.high, d.low, d.close)))
      }
    });

    return convertedData;
  }, []);

  // 获取历史K线数据
  const fetchHistoricalKlines = useCallback(async (
    network: string,
    pairAddress: string,
    interval: string = '1m',
    limit: number = 100
  ): Promise<CandlestickData[]> => {
    // 防止重复请求
    if (isLoadingHistory) {
      console.log('⚠️ 历史数据正在加载中，跳过重复请求');
      return [];
    }

    try {
      setIsLoadingHistory(true);
      setHistoryLoadError(null);

      const params = new URLSearchParams({
        network,
        pair_address: pairAddress,
        interval,
        limit: limit.toString()
      });

      const response = await fetch(`/api/klines?${params}`);
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API返回错误');
      }

      // 转换数据格式
      const candlestickData = convertApiDataToCandlestick(result.data || []);
      
      console.log(`✅ 成功获取 ${candlestickData.length} 条历史K线数据`);
      return candlestickData;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取历史数据失败';
      console.error('获取历史K线数据失败:', errorMessage);
      setHistoryLoadError(errorMessage);
      
      // 返回模拟数据作为后备方案
      console.log('📊 使用模拟数据作为后备方案');
      return generateInitialData();
      
    } finally {
      setIsLoadingHistory(false);
    }
  }, [convertApiDataToCandlestick, isLoadingHistory]);

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
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#374151',
      },
      grid: {
        vertLines: {
          color: '#e5e7eb',
          style: 0,
          visible: true,
        },
        horzLines: {
          color: '#e5e7eb',
          style: 0,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        textColor: '#374151',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        // 自动价格格式化
        autoScale: true,
      },
      timeScale: {
        borderColor: '#e5e7eb',
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
    console.log('📊 更新价格信息:', { dataLength: data.length, sampleData: data.slice(0, 2) });
    
    if (data.length > 0) {
      const lastCandle = data[data.length - 1];
      const firstCandle = data[0];
      
      // 支持蜡烛图数据格式 (close) 和线条图数据格式 (value)
      const currentPrice = lastCandle.close || lastCandle.value || 0;
      const initialPrice = firstCandle.close || firstCandle.value || 0;
      
      console.log('💰 价格计算:', {
        currentPrice,
        initialPrice,
        lastCandle,
        firstCandle
      });
      
      // 格式化价格显示
      let formattedPrice;
      if (currentPrice > 1) {
        formattedPrice = currentPrice.toFixed(5);
      } else if (currentPrice > 0.001) {
        formattedPrice = currentPrice.toFixed(8);
      } else if (currentPrice > 0) {
        // 对于非常小的价格，使用科学计数法
        formattedPrice = currentPrice.toExponential(2);
      } else {
        formattedPrice = "0.00000";
      }
      
      setCurrentPrice(formattedPrice);
      
      if (initialPrice > 0) {
        const change = ((currentPrice - initialPrice) / initialPrice) * 100;
        setPriceChange(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
        
        console.log('📈 价格变化:', {
          change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
          calculation: { currentPrice, initialPrice, change }
        });
      }
      
      // 更新成交量显示
      if (lastCandle.volume !== undefined) {
        setVolume(lastCandle.volume.toString());
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
      console.log('📊 准备设置图表数据:', {
        chartDataLength: chartData.length,
        detectedSeriesType,
        hasValidSeries: !!(candlestickSeries && typeof candlestickSeries.setData === 'function'),
        sampleChartData: chartData.slice(0, 3)
      });

      if (candlestickSeries && typeof candlestickSeries.setData === 'function') {
        // 根据图表类型转换数据格式
        let dataToSet: any;
        
        if (detectedSeriesType === 'candlestick') {
          // 蜡烛图使用原始数据
          dataToSet = chartData;
          console.log('🕯️ 使用蜡烛图格式，数据样例:', dataToSet.slice(0, 2));
        } else if (detectedSeriesType === 'line' || detectedSeriesType === 'area') {
          // 线条图和区域图只需要 time 和 value（使用 close 价格）
          dataToSet = chartData.map(item => ({
            time: item.time,
            value: item.close,
          }));
          console.log('📈 使用线条/区域图格式，数据样例:', dataToSet.slice(0, 2));
        } else {
          // mock 类型不需要实际设置数据
          dataToSet = chartData;
          console.log('🎭 使用模拟格式');
        }
        
        if (detectedSeriesType !== 'mock') {
          console.log('⚡ 正在设置图表数据...', {
            seriesType: detectedSeriesType,
            dataLength: dataToSet.length,
            firstData: dataToSet[0],
            lastData: dataToSet[dataToSet.length - 1]
          });
          
          candlestickSeries.setData(dataToSet);
          console.log(`✅ 图表数据设置成功 (${detectedSeriesType} 格式, ${dataToSet.length} 条数据)`);
        }
        updatePriceInfo(chartData);
      } else {
        console.warn('⚠️ series.setData 方法不可用，仅更新价格信息');
        updatePriceInfo(chartData);
      }
    } catch (error) {
      console.error('❌ 设置图表数据失败:', error);
      console.error('失败时的数据状态:', {
        chartDataLength: chartData.length,
        detectedSeriesType,
        sampleData: chartData.slice(0, 3)
      });
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

  // 数据初始化
  useEffect(() => {
    // 如果提供了外部数据，直接使用外部数据
    if (externalData) {
      setChartData(externalData);
      isInitializedRef.current = true;
      return;
    }

    // 防止重复初始化
    if (isInitializedRef.current) {
      return;
    }

    // 初始化历史数据
    const initializeData = async () => {
      console.log('🚀 开始初始化图表数据...');
      isInitializedRef.current = true;
      
      // 获取历史K线数据
      const historicalData = await fetchHistoricalKlines(network, pairAddress, '1m', 100);
      
      if (historicalData.length > 0) {
        setChartData(historicalData);
        console.log('✅ 历史数据初始化完成', historicalData);
      } else {
        // 如果没有历史数据，使用模拟数据
        console.log('⚠️ 未获取到历史数据，使用模拟数据');
        setChartData(generateInitialData());
      }
    };

    initializeData();
  }, [externalData, network, pairAddress]); // 只依赖基础值，不依赖函数

  // WebSocket 连接（单独的 useEffect，避免与数据初始化混合）
  useEffect(() => {
    // 如果提供了外部数据，不连接 WebSocket
    if (externalData) {
      return;
    }

    // 连接 WebSocket 获取实时数据
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
  }, [externalData, network, pairAddress]); // 只在基础参数变化时重新连接

  return (
    <Card className="bg-white text-gray-900 border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl">{symbol}</CardTitle>
            <div className="flex items-center gap-2">
              {/* 历史数据加载状态 */}
              <Badge 
                variant="outline"
                className={`text-xs cursor-help mr-2 ${
                  isLoadingHistory
                    ? 'border-blue-600 text-blue-600'
                    : historyLoadError
                    ? 'border-orange-600 text-orange-600'
                    : chartData.length > 0
                    ? 'border-green-600 text-green-600'
                    : 'border-gray-500 text-gray-500'
                }`}
                title={
                  isLoadingHistory 
                    ? '正在加载历史K线数据...'
                    : historyLoadError
                    ? `历史数据加载失败: ${historyLoadError}`
                    : chartData.length > 0
                    ? `历史数据已加载 (${chartData.length} 条记录)`
                    : '暂无历史数据'
                }
              >
                {isLoadingHistory 
                  ? '加载中...'
                  : historyLoadError
                  ? '历史数据异常'
                  : chartData.length > 0
                  ? `历史数据 (${chartData.length})`
                  : '无历史数据'
                }
              </Badge>

              {/* WebSocket 连接状态指示 */}
              <Badge 
                variant="outline" 
                className={`text-xs cursor-help ${
                  wsConnected 
                    ? 'border-green-600 text-green-600' 
                    : isConnecting 
                    ? 'border-yellow-600 text-yellow-600'
                    : hasReachedMaxRetries
                    ? 'border-red-600 text-red-600'
                    : 'border-red-600 text-red-600'
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
                  className="text-xs h-6 px-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
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
                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                  买入
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  卖出
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-gray-600">30s</Button>
            <Button variant="ghost" size="sm" className="text-white bg-gray-600">1m</Button>
            <Button variant="ghost" size="sm" className="text-gray-600">5m</Button>            
          </div>
        </div>        
      </CardHeader>
      <CardContent className="p-0">
        <div ref={chartContainerRef} className="w-full h-[400px] relative">
          {/* 如果图表加载失败，显示静态后备UI */}
          {!candlestickSeriesRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-900">
                <div className="text-6xl mb-4">📈</div>
                <div className="text-xl mb-2">{symbol}</div>
                <div className="text-2xl font-bold text-green-600">${currentPrice}</div>
                <div className={`text-lg ${priceChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange}
                </div>
                <div className="text-sm text-gray-600 mt-4">
                  {isLoadingHistory ? (
                    <div className="space-y-2">
                      <div className="animate-pulse text-blue-600">⏳ 正在加载历史K线数据...</div>
                      <div className="text-xs">请稍候，正在从API获取历史数据</div>
                    </div>
                  ) : historyLoadError ? (
                    <div className="space-y-2">
                      <div className="text-orange-600">⚠️ 历史数据加载失败</div>
                      <div className="text-xs max-w-md break-words">{historyLoadError}</div>
                      <div className="text-xs text-blue-600 mt-2">
                        💡 提示: 使用模拟数据替代，请检查API服务是否正常
                      </div>
                    </div>
                  ) : connectionError ? (
                    <div className="space-y-2">
                      <div className="text-red-600">⚠️ 实时数据连接失败</div>
                      <div className="text-xs max-w-md break-words">{connectionError}</div>
                      <div className="text-xs text-blue-600 mt-2">
                        💡 提示: 请运行 <code className="bg-gray-200 px-1 rounded">npm run test:websocket</code> 检查连接
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
