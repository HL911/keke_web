import { getDatabase } from './db-core';

// Kline 接口定义
export interface Kline {
  id: number;
  network: string;
  pair_address: string;
  interval_type: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  created_at: string;
}

// K线时间间隔类型
export type KlineInterval = '30s' | '1m' | '15m';

// 插入K线数据
export async function insertKline(kline: Omit<Kline, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.run(
    `INSERT INTO klines (
      network, pair_address, interval_type, timestamp, 
      open, high, low, close, volume
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      kline.network,
      kline.pair_address,
      kline.interval_type,
      kline.timestamp,
      kline.open,
      kline.high,
      kline.low,
      kline.close,
      kline.volume
    ]
  );
  return result.lastID as number;
}

// 批量插入K线数据
export async function insertKlines(klines: Omit<Kline, 'id' | 'created_at'>[]): Promise<void> {
  const db = await getDatabase();
  const stmt = await db.prepare(
    `INSERT INTO klines (
      network, pair_address, interval_type, timestamp, 
      open, high, low, close, volume
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  try {
    await db.exec('BEGIN TRANSACTION');
    for (const kline of klines) {
      await stmt.run([
        kline.network,
        kline.pair_address,
        kline.interval_type,
        kline.timestamp,
        kline.open,
        kline.high,
        kline.low,
        kline.close,
        kline.volume
      ]);
    }
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  } finally {
    await stmt.finalize();
  }
}

// 插入或更新K线数据（基于唯一键：network + pair_address + interval_type + timestamp）
export async function upsertKline(kline: Omit<Kline, 'id' | 'created_at'>): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO klines (
      network, pair_address, interval_type, timestamp, 
      open, high, low, close, volume
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(network, pair_address, interval_type, timestamp) 
    DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      volume = excluded.volume`,
    [
      kline.network,
      kline.pair_address,
      kline.interval_type,
      kline.timestamp,
      kline.open,
      kline.high,
      kline.low,
      kline.close,
      kline.volume
    ]
  );
}

// 根据ID查询K线数据
export async function getKlineById(id: number): Promise<Kline | null> {
  const db = await getDatabase();
  const row = await db.get(
    'SELECT * FROM klines WHERE id = ?',
    [id]
  ) as Kline | undefined;
  
  return row || null;
}

// 查询K线数据列表
export async function getKlines(options: {
  network?: string;
  pairAddress?: string;
  intervalType?: KlineInterval;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
  orderDirection?: 'ASC' | 'DESC';
}): Promise<Kline[]> {
  const db = await getDatabase();
  
  let sql = 'SELECT * FROM klines WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.pairAddress) {
    sql += ' AND pair_address = ?';
    params.push(options.pairAddress);
  }
  
  if (options.intervalType) {
    sql += ' AND interval_type = ?';
    params.push(options.intervalType);
  }
  
  if (options.startTime) {
    sql += ' AND timestamp >= ?';
    params.push(options.startTime);
  }
  
  if (options.endTime) {
    sql += ' AND timestamp <= ?';
    params.push(options.endTime);
  }
  
  // 排序
  const orderDirection = options.orderDirection || 'ASC';
  sql += ` ORDER BY timestamp ${orderDirection}`;
  
  // 分页
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }
  
  const rows = await db.all(sql, params) as Kline[];
  return rows;
}

// 获取最新的K线数据
export async function getLatestKline(options: {
  network: string;
  pairAddress: string;
  intervalType: KlineInterval;
}): Promise<Kline | null> {
  const db = await getDatabase();
  const row = await db.get(
    `SELECT * FROM klines 
     WHERE network = ? AND pair_address = ? AND interval_type = ?
     ORDER BY timestamp DESC 
     LIMIT 1`,
    [options.network, options.pairAddress, options.intervalType]
  ) as Kline | undefined;
  
  return row || null;
}

// 统计K线数据数量
export async function getKlinesCount(options: {
  network?: string;
  pairAddress?: string;
  intervalType?: KlineInterval;
  startTime?: string;
  endTime?: string;
}): Promise<number> {
  const db = await getDatabase();
  
  let sql = 'SELECT COUNT(*) as count FROM klines WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.pairAddress) {
    sql += ' AND pair_address = ?';
    params.push(options.pairAddress);
  }
  
  if (options.intervalType) {
    sql += ' AND interval_type = ?';
    params.push(options.intervalType);
  }
  
  if (options.startTime) {
    sql += ' AND timestamp >= ?';
    params.push(options.startTime);
  }
  
  if (options.endTime) {
    sql += ' AND timestamp <= ?';
    params.push(options.endTime);
  }
  
  const result = await db.get(sql, params) as { count: number };
  return result.count;
}

// 获取K线统计信息
export async function getKlineStatistics(options: {
  network: string;
  pairAddress: string;
  intervalType: KlineInterval;
  startTime?: string;
  endTime?: string;
}): Promise<{
  count: number;
  highestPrice: string;
  lowestPrice: string;
  totalVolume: string;
  avgVolume: string;
  priceChange: string;
  priceChangePercent: string;
}> {
  const db = await getDatabase();
  
  let sql = `
    SELECT 
      COUNT(*) as count,
      MAX(CAST(high AS REAL)) as highestPrice,
      MIN(CAST(low AS REAL)) as lowestPrice,
      SUM(CAST(volume AS REAL)) as totalVolume,
      AVG(CAST(volume AS REAL)) as avgVolume
    FROM klines 
    WHERE network = ? AND pair_address = ? AND interval_type = ?
  `;
  const params: any[] = [options.network, options.pairAddress, options.intervalType];
  
  if (options.startTime) {
    sql += ' AND timestamp >= ?';
    params.push(options.startTime);
  }
  
  if (options.endTime) {
    sql += ' AND timestamp <= ?';
    params.push(options.endTime);
  }
  
  const result = await db.get(sql, params) as {
    count: number;
    highestPrice: number;
    lowestPrice: number;
    totalVolume: number;
    avgVolume: number;
  };
  
  // 获取首尾价格计算涨跌幅
  const firstKline = await db.get(
    `SELECT open FROM klines 
     WHERE network = ? AND pair_address = ? AND interval_type = ?
     ${options.startTime ? 'AND timestamp >= ?' : ''}
     ${options.endTime ? 'AND timestamp <= ?' : ''}
     ORDER BY timestamp ASC LIMIT 1`,
    params
  ) as { open: string } | undefined;
  
  const lastKline = await db.get(
    `SELECT close FROM klines 
     WHERE network = ? AND pair_address = ? AND interval_type = ?
     ${options.startTime ? 'AND timestamp >= ?' : ''}
     ${options.endTime ? 'AND timestamp <= ?' : ''}
     ORDER BY timestamp DESC LIMIT 1`,
    params
  ) as { close: string } | undefined;
  
  let priceChange = '0';
  let priceChangePercent = '0';
  
  if (firstKline && lastKline) {
    const firstPrice = parseFloat(firstKline.open);
    const lastPrice = parseFloat(lastKline.close);
    const change = lastPrice - firstPrice;
    const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
    
    priceChange = change.toString();
    priceChangePercent = changePercent.toString();
  }
  
  return {
    count: result.count || 0,
    highestPrice: (result.highestPrice || 0).toString(),
    lowestPrice: (result.lowestPrice || 0).toString(),
    totalVolume: (result.totalVolume || 0).toString(),
    avgVolume: (result.avgVolume || 0).toString(),
    priceChange,
    priceChangePercent
  };
}

// 更新K线数据
export async function updateKline(id: number, updates: Partial<Omit<Kline, 'id' | 'created_at'>>): Promise<void> {
  const db = await getDatabase();
  
  const fields: string[] = [];
  const params: any[] = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  params.push(id);
  
  await db.run(
    `UPDATE klines SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

// 删除K线数据
export async function deleteKline(id: number): Promise<void> {
  const db = await getDatabase();
  await db.run('DELETE FROM klines WHERE id = ?', [id]);
}

// 按条件删除K线数据
export async function deleteKlinesByCondition(options: {
  network?: string;
  pairAddress?: string;
  intervalType?: KlineInterval;
  olderThan?: string; // ISO 日期字符串
}): Promise<number> {
  const db = await getDatabase();
  
  let sql = 'DELETE FROM klines WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.pairAddress) {
    sql += ' AND pair_address = ?';
    params.push(options.pairAddress);
  }
  
  if (options.intervalType) {
    sql += ' AND interval_type = ?';
    params.push(options.intervalType);
  }
  
  if (options.olderThan) {
    sql += ' AND created_at < ?';
    params.push(options.olderThan);
  }
  
  const result = await db.run(sql, params);
  return result.changes || 0;
}

// 获取支持的时间间隔列表
export async function getSupportedIntervals(options: {
  network?: string;
  pairAddress?: string;
}): Promise<KlineInterval[]> {
  const db = await getDatabase();
  
  let sql = 'SELECT DISTINCT interval_type FROM klines WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.pairAddress) {
    sql += ' AND pair_address = ?';
    params.push(options.pairAddress);
  }
  
  sql += ' ORDER BY interval_type';
  
  const rows = await db.all(sql, params) as { interval_type: KlineInterval }[];
  return rows.map(row => row.interval_type);
}

// 获取交易对列表
export async function getTradingPairs(network?: string): Promise<string[]> {
  const db = await getDatabase();
  
  let sql = 'SELECT DISTINCT pair_address FROM klines WHERE 1=1';
  const params: any[] = [];
  
  if (network) {
    sql += ' AND network = ?';
    params.push(network);
  }
  
  sql += ' ORDER BY pair_address';
  
  const rows = await db.all(sql, params) as { pair_address: string }[];
  return rows.map(row => row.pair_address);
}

// 获取K线数据用于图表显示
export async function getKlinesForChart(options: {
  network: string;
  pairAddress: string;
  intervalType: KlineInterval;
  startTime?: string;
  endTime?: string;
  limit?: number;
}): Promise<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}[]> {
  const klines = await getKlines({
    network: options.network,
    pairAddress: options.pairAddress,
    intervalType: options.intervalType,
    startTime: options.startTime,
    endTime: options.endTime,
    limit: options.limit,
    orderDirection: 'ASC'
  });
  
  return klines.map(kline => ({
    timestamp: kline.timestamp,
    open: parseFloat(kline.open),
    high: parseFloat(kline.high),
    low: parseFloat(kline.low),
    close: parseFloat(kline.close),
    volume: parseFloat(kline.volume)
  }));
}

// 清理过期的K线数据
export async function cleanupOldKlines(options: {
  network?: string;
  pairAddress?: string;
  intervalType?: KlineInterval;
  keepDays: number;
}): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - options.keepDays);
  
  return deleteKlinesByCondition({
    network: options.network,
    pairAddress: options.pairAddress,
    intervalType: options.intervalType,
    olderThan: cutoffDate.toISOString()
  });
}