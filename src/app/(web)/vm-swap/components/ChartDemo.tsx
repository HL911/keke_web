"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TradingChart from './TradingChart';
import { CandlestickData, Time } from 'lightweight-charts';

// 生成演示数据
const generateDemoData = (count = 100): CandlestickData[] => {
  const data: CandlestickData[] = [];
  let basePrice = 0.42814;
  
  for (let i = 0; i < count; i++) {
    const time = (Math.floor(Date.now() / 1000) - (count - i) * 300) as Time; // 5分钟间隔
    const change = (Math.random() - 0.5) * 0.02;
    const open = basePrice;
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
    
    basePrice = close;
  }
  
  return data;
};

export default function ChartDemo() {
  const [demoType, setDemoType] = useState<'basic' | 'data' | 'events' | 'realtime'>('basic');
  const [chartData, setChartData] = useState<CandlestickData[]>(generateDemoData());
  const [eventLog, setEventLog] = useState<string[]>([]);

  // 实时数据更新演示
  useEffect(() => {
    if (demoType === 'realtime') {
      const interval = setInterval(() => {
        const lastCandle = chartData[chartData.length - 1];
        const newTime = (lastCandle.time as number) + 300 as Time; // 5分钟后
        const change = (Math.random() - 0.5) * 0.01;
        const open = lastCandle.close;
        const close = open * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        
        const newCandle: CandlestickData = {
          time: newTime,
          open: Number(open.toFixed(5)),
          high: Number(high.toFixed(5)),
          low: Number(low.toFixed(5)),
          close: Number(close.toFixed(5)),
        };
        
        setChartData(prev => [...prev.slice(-99), newCandle]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [demoType, chartData]);

  // 事件处理器
  const handleCrosshairMove = (param: any) => {
    if (param.time) {
      const message = `十字光标移动: 时间=${param.time}, 价格=${param.point?.y?.toFixed(5) || 'N/A'}`;
      setEventLog(prev => [message, ...prev.slice(0, 4)]);
    }
  };

  const handleClick = (param: any) => {
    const message = `图表点击: 时间=${param.time || 'N/A'}, 坐标=(${param.point?.x || 'N/A'}, ${param.point?.y || 'N/A'})`;
    setEventLog(prev => [message, ...prev.slice(0, 4)]);
  };

  const resetData = () => {
    setChartData(generateDemoData());
    setEventLog([]);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          TradingChart 组件演示
          <Badge className="ml-3" variant="outline">
            基于 lightweight-charts-react-wrapper 设计
          </Badge>
        </h1>

        {/* 演示类型选择器 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>选择演示类型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button 
                variant={demoType === 'basic' ? 'default' : 'outline'}
                onClick={() => setDemoType('basic')}
              >
                基础用法
              </Button>
              <Button 
                variant={demoType === 'data' ? 'default' : 'outline'}
                onClick={() => setDemoType('data')}
              >
                自定义数据
              </Button>
              <Button 
                variant={demoType === 'events' ? 'default' : 'outline'}
                onClick={() => setDemoType('events')}
              >
                事件处理
              </Button>
              <Button 
                variant={demoType === 'realtime' ? 'default' : 'outline'}
                onClick={() => setDemoType('realtime')}
              >
                实时数据
              </Button>
              <Button variant="outline" onClick={resetData}>
                重置数据
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 图表演示 */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            {demoType === 'basic' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">基础用法 - 内置模拟数据</h3>
                <TradingChart symbol="KEKE/USDT" tokenName="KEKE" />
              </div>
            )}

            {demoType === 'data' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">自定义数据 - 外部数据源</h3>
                <TradingChart 
                  symbol="KEKE/USDT" 
                  tokenName="KEKE"
                  data={chartData}
                />
              </div>
            )}

            {demoType === 'events' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">事件处理 - 交互响应</h3>
                <TradingChart 
                  symbol="KEKE/USDT" 
                  tokenName="KEKE"
                  data={chartData}
                  onCrosshairMove={handleCrosshairMove}
                  onClick={handleClick}
                />
              </div>
            )}

            {demoType === 'realtime' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">实时数据 - 自动更新</h3>
                <TradingChart 
                  symbol="KEKE/USDT" 
                  tokenName="KEKE"
                  data={chartData}
                />
              </div>
            )}
          </div>

          {/* 侧边栏信息 */}
          <div className="col-span-4 space-y-4">
            {/* 代码示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">代码示例</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                  {demoType === 'basic' && (
                    <pre>{`<TradingChart 
  symbol="KEKE/USDT" 
  tokenName="KEKE" 
/>`}</pre>
                  )}
                  {demoType === 'data' && (
                    <pre>{`<TradingChart 
  symbol="KEKE/USDT"
  data={chartData}
/>`}</pre>
                  )}
                  {demoType === 'events' && (
                    <pre>{`<TradingChart 
  symbol="KEKE/USDT"
  onCrosshairMove={handleMove}
  onClick={handleClick}
/>`}</pre>
                  )}
                  {demoType === 'realtime' && (
                    <pre>{`<TradingChart 
  symbol="KEKE/USDT"
  data={realtimeData}
/>`}</pre>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 事件日志 */}
            {demoType === 'events' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">事件日志</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {eventLog.length === 0 ? (
                      <p className="text-gray-500 text-sm">移动鼠标或点击图表查看事件...</p>
                    ) : (
                      eventLog.map((log, index) => (
                        <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 数据信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">数据信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>数据点数量: {chartData.length}</div>
                  <div>最新价格: ${chartData[chartData.length - 1]?.close.toFixed(5)}</div>
                  <div>最高价: ${Math.max(...chartData.map(d => d.high)).toFixed(5)}</div>
                  <div>最低价: ${Math.min(...chartData.map(d => d.low)).toFixed(5)}</div>
                  <div>价格范围: {((Math.max(...chartData.map(d => d.high)) - Math.min(...chartData.map(d => d.low))) * 100).toFixed(3)}%</div>
                </div>
              </CardContent>
            </Card>

            {/* 特性说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">组件特性</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✅</Badge>
                    <span>组件化设计</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✅</Badge>
                    <span>TypeScript 支持</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✅</Badge>
                    <span>事件处理</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✅</Badge>
                    <span>响应式数据</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✅</Badge>
                    <span>自动清理</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✅</Badge>
                    <span>实时更新</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
