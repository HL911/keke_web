import { getLatestKline, upsertKline } from '../app/api/utils/klines-queries';

// K线时间间隔类型
export type KlineInterval = '30s' | '1m' | '15m';

// 交易数据接口
export interface TradeData {
  amount: string;
  price: string;
  address: string;
  network: string;
  timestamp?: number;
}

// K线数据接口
export interface KlineData {
  network: string;
  pair_address: string;
  interval_type: KlineInterval;
  timestamp: number;
  open_price: string;
  high_price: string;
  low_price: string;
  close_price: string;
  volume: string;
  trade_count: number;
  is_complete: boolean;
}

// 内存中的K线缓存
class KlineCache {
  private cache: Map<string, KlineData> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // 生成缓存键
  private getCacheKey(network: string, pairAddress: string, interval: KlineInterval, timestamp: number): string {
    return `${network}:${pairAddress}:${interval}:${timestamp}`;
  }

  // 获取K线周期的开始时间戳
  private getKlinePeriodStart(timestamp: number, interval: KlineInterval): number {
    const date = new Date(timestamp);
    const seconds = date.getSeconds();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    
    switch (interval) {
      case '30s':
        // 30秒周期：00:00:00-00:00:30, 00:00:30-00:01:00
        const period30s = Math.floor(seconds / 30) * 30;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, period30s).getTime();
      
      case '1m':
        // 1分钟周期：00:00:00-00:01:00, 00:01:00-00:02:00
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0).getTime();
      
      case '15m':
        // 15分钟周期：00:00:00-00:15:00, 00:15:00-00:30:00
        const period15m = Math.floor(minutes / 15) * 15;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, period15m, 0).getTime();
      
      default:
        throw new Error(`Unsupported interval: ${interval}`);
    }
  }

  // 获取K线周期的结束时间戳
  private getKlinePeriodEnd(timestamp: number, interval: KlineInterval): number {
    const periodStart = this.getKlinePeriodStart(timestamp, interval);
    
    switch (interval) {
      case '30s':
        return periodStart + 30 * 1000;
      case '1m':
        return periodStart + 60 * 1000;
      case '15m':
        return periodStart + 15 * 60 * 1000;
      default:
        throw new Error(`Unsupported interval: ${interval}`);
    }
  }

  // 获取或创建K线数据
  async getOrCreateKline(network: string, pairAddress: string, interval: KlineInterval, timestamp: number, price: string): Promise<KlineData> {
    const periodStart = this.getKlinePeriodStart(timestamp, interval);
    const cacheKey = this.getCacheKey(network, pairAddress, interval, periodStart);
    
    let kline = this.cache.get(cacheKey);
    
    if (!kline) {
      // 尝试从数据库获取最新的K线数据
      const latestKline = await getLatestKline({
        network,
        pairAddress,
        intervalType: interval
      });
      
      // 如果是新周期的开始，开盘价应该是上一个K线的收盘价
      let openPrice = price;
      if (latestKline && parseInt(latestKline.timestamp) < periodStart) {
        openPrice = latestKline.close;
      }
      
      kline = {
        network,
        pair_address: pairAddress,
        interval_type: interval,
        timestamp: periodStart,
        open_price: openPrice,
        high_price: price,
        low_price: price,
        close_price: price,
        volume: '0',
        trade_count: 0,
        is_complete: false
      };
      
      this.cache.set(cacheKey, kline);
      
      // 设置定时器，在周期结束时自动完成K线
      const periodEnd = this.getKlinePeriodEnd(timestamp, interval);
      const timeToEnd = periodEnd - Date.now();
      
      if (timeToEnd > 0) {
        const timer = setTimeout(() => {
          this.completeKline(cacheKey);
        }, timeToEnd);
        
        this.timers.set(cacheKey, timer);
      }
    }
    
    return kline;
  }

  // 更新K线数据
  updateKline(kline: KlineData, price: string, volume: string): void {
    // 更新最高价
    if (parseFloat(price) > parseFloat(kline.high_price)) {
      kline.high_price = price;
    }
    
    // 更新最低价
    if (parseFloat(price) < parseFloat(kline.low_price)) {
      kline.low_price = price;
    }
    
    // 更新收盘价
    kline.close_price = price;
    
    // 累加成交量
    kline.volume = (parseFloat(kline.volume) + parseFloat(volume)).toString();
    
    // 增加交易次数
    kline.trade_count += 1;
  }

  // 完成K线（标记为完成并持久化到数据库）
  async completeKline(cacheKey: string): Promise<void> {
    const kline = this.cache.get(cacheKey);
    if (!kline || kline.is_complete) {
      return;
    }
    
    // 标记为完成
    kline.is_complete = true;
    
    try {
      // 持久化到数据库
      await upsertKline({
        network: kline.network,
        pair_address: kline.pair_address,
        interval_type: kline.interval_type,
        timestamp: kline.timestamp.toString(),
        open: kline.open_price,
        high: kline.high_price,
        low: kline.low_price,
        close: kline.close_price,
        volume: kline.volume
      });
      console.log(`K线已完成并保存: ${cacheKey}`);
    } catch (error) {
      console.error(`保存K线数据失败: ${cacheKey}`, error);
    }
    
    // 从缓存中移除
    this.cache.delete(cacheKey);
    
    // 清除定时器
    const timer = this.timers.get(cacheKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(cacheKey);
    }
  }

  // 获取所有缓存的K线数据
  getAllCachedKlines(): KlineData[] {
    return Array.from(this.cache.values());
  }

  // 清理过期的缓存
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    Array.from(this.cache.entries()).forEach(([key, kline]) => {
      const periodEnd = this.getKlinePeriodEnd(kline.timestamp, kline.interval_type);
      if (now > periodEnd) {
        keysToDelete.push(key);
      }
    });
    
    for (const key of keysToDelete) {
      this.completeKline(key);
    }
  }
}

// 全局K线缓存实例
const klineCache = new KlineCache();

// K线聚合服务类
export class KlineAggregationService {
  private static instance: KlineAggregationService;
  private intervals: KlineInterval[] = ['30s', '1m', '15m'];
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupTimer();
  }

  // 获取单例实例
  static getInstance(): KlineAggregationService {
    if (!KlineAggregationService.instance) {
      KlineAggregationService.instance = new KlineAggregationService();
    }
    return KlineAggregationService.instance;
  }

  // 处理交易数据，更新所有时间周期的K线
  async processTradeData(tradeData: TradeData): Promise<void> {
    const timestamp = tradeData.timestamp || Date.now();
    const { amount, price, address: pairAddress, network } = tradeData;
    
    console.log(`处理交易数据: ${network}:${pairAddress}, 价格: ${price}, 数量: ${amount}`);
    
    // 为每个时间间隔更新K线数据
    for (const interval of this.intervals) {
      try {
        // 获取或创建K线数据
        const kline = await klineCache.getOrCreateKline(network, pairAddress, interval, timestamp, price);
        
        // 更新K线数据
        klineCache.updateKline(kline, price, amount);
        
        console.log(`更新K线 ${interval}: ${network}:${pairAddress}, OHLC: ${kline.open_price}/${kline.high_price}/${kline.low_price}/${kline.close_price}`);
      } catch (error) {
        console.error(`处理K线数据失败 ${interval}:`, error);
      }
    }
  }

  // 强制完成指定的K线周期
  async forceCompleteKlines(network: string, pairAddress: string, beforeTimestamp?: number): Promise<void> {
    const cachedKlines = klineCache.getAllCachedKlines();
    
    for (const kline of cachedKlines) {
      if (kline.network === network && kline.pair_address === pairAddress) {
        if (!beforeTimestamp || kline.timestamp < beforeTimestamp) {
          const cacheKey = `${network}:${pairAddress}:${kline.interval_type}:${kline.timestamp}`;
          await klineCache.completeKline(cacheKey);
        }
      }
    }
  }

  // 获取当前缓存的K线数据
  getCachedKlines(network?: string, pairAddress?: string): KlineData[] {
    const allKlines = klineCache.getAllCachedKlines();
    
    if (!network && !pairAddress) {
      return allKlines;
    }
    
    return allKlines.filter(kline => {
      if (network && kline.network !== network) return false;
      if (pairAddress && kline.pair_address !== pairAddress) return false;
      return true;
    });
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    // 每分钟清理一次过期的缓存
    this.cleanupTimer = setInterval(() => {
      klineCache.cleanup();
    }, 60 * 1000);
  }

  // 停止服务
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // 手动触发清理
  cleanup(): void {
    klineCache.cleanup();
  }
}

// 导出服务实例
export const klineService = KlineAggregationService.getInstance();

// 导出处理函数供外部调用
export async function processTradeForKlines(tradeData: TradeData): Promise<void> {
  return klineService.processTradeData(tradeData);
}

// 导出获取缓存K线数据的函数
export function getCachedKlineData(network?: string, pairAddress?: string): KlineData[] {
  return klineService.getCachedKlines(network, pairAddress);
}

// 导出强制完成K线的函数
export async function forceCompleteKlineData(network: string, pairAddress: string, beforeTimestamp?: number): Promise<void> {
  return klineService.forceCompleteKlines(network, pairAddress, beforeTimestamp);
}