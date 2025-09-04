# TradingChart 使用示例

## 基础用法（类似 lightweight-charts-react-wrapper）

```typescript
import { TradingChart } from './components';

// 1. 基础用法 - 使用内置模拟数据
export function BasicChart() {
  return (
    <TradingChart 
      symbol="KEKE/USDT" 
      tokenName="KEKE" 
    />
  );
}

// 2. 传入自定义数据
export function ChartWithData() {
  const data = [
    {time: '2019-04-11', open: 80.01, high: 85.23, low: 79.45, close: 84.12},
    {time: '2019-04-12', open: 84.12, high: 88.63, low: 82.30, close: 86.45},
    // ... more data
  ];

  return (
    <TradingChart 
      symbol="KEKE/USDT"
      data={data}
    />
  );
}

// 3. 带事件处理器
export function InteractiveChart() {
  const handleCrosshairMove = (param: any) => {
    console.log('Crosshair moved:', param);
  };

  const handleClick = (param: any) => {
    console.log('Chart clicked:', param);
  };

  return (
    <TradingChart 
      symbol="KEKE/USDT"
      onCrosshairMove={handleCrosshairMove}
      onClick={handleClick}
    />
  );
}

// 4. 实时数据更新
export function RealTimeChart() {
  const [chartData, setChartData] = useState(generateInitialData());

  useEffect(() => {
    const interval = setInterval(() => {
      // 模拟新数据到达
      const newCandle = {
        time: Math.floor(Date.now() / 1000),
        open: 0.42000,
        high: 0.43000,
        low: 0.41000,
        close: 0.42500,
      };
      
      setChartData(prev => [...prev.slice(-99), newCandle]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TradingChart 
      symbol="KEKE/USDT"
      data={chartData}
    />
  );
}
```

## 与原 lightweight-charts-react-wrapper 对比

### 原 wrapper 用法

```typescript
import {Chart, CandlestickSeries} from "lightweight-charts-react-wrapper";

<Chart width={800} height={600}>
  <CandlestickSeries data={data}/>
</Chart>
```

### 我们的实现

```typescript
import {TradingChart} from "./components";

<TradingChart 
  symbol="KEKE/USDT"
  data={data}
  onCrosshairMove={handleCrosshairMove}
  onClick={handleClick}
/>
```

## 特性对比

| 特性 | wrapper | 我们的实现 |
|------|---------|-----------|
| 组件化 | ✅ | ✅ |
| 事件处理 | ✅ | ✅ |
| Reactive 数据 | ✅ | ✅ |
| TypeScript | ✅ | ✅ |
| 自动清理 | ✅ | ✅ |
| 响应式 | ✅ | ✅ |
| 实时更新 | 手动 | ✅ 内置 |
| 价格显示 | 需要自实现 | ✅ 内置 |
