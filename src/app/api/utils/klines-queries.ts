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
export type KlineInterval = '30s' | '1m' | '15m' | '1h' | '4h' | '1d';

// 查询选项基础接口
export interface BaseKlineQueryOptions {
  network?: string;
  pairAddress?: string;
  intervalType?: KlineInterval;
  startTime?: string;
  endTime?: string;
}

// 分页查询选项
export interface PaginatedKlineQueryOptions extends BaseKlineQueryOptions {
  limit?: number;
  offset?: number;
  orderDirection?: 'ASC' | 'DESC';
}

// 输入验证函数
function validateKlineInterval(interval: string): interval is KlineInterval {
  return ['30s', '1m', '15m', '1h', '4h', '1d'].includes(interval);
}

function validateNetwork(network: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(network) && network.length > 0;
}

function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

// 插入K线数据
export async function insertKline(kline: Omit<Kline, 'id' | 'created_at'>): Promise<number> {
  // 输入验证
  if (!validateNetwork(kline.network)) {
    throw new Error('Invalid network format');
  }
  
  if (!validateAddress(kline.pair_address)) {
    throw new Error('Invalid pair address format');
  }
  
  if (!validateKlineInterval(kline.interval_type)) {
    throw new Error(`Invalid interval type: ${kline.interval_type}`);
  }
  
  if (!validateTimestamp(kline.timestamp)) {
    throw new Error('Invalid timestamp format');
  }
  
  // 验证价格数据格式
  const prices = [kline.open, kline.high, kline.low, kline.close, kline.volume];
  for (const price of prices) {
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      throw new Error(`Invalid price data: ${price}`);
    }
  }
  
  const db = await getDatabase();
  
  try {
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
  } catch (error) {
    console.error('Failed to insert kline:', error);
    throw new Error(`Failed to insert kline data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
export async function getKlines(options: PaginatedKlineQueryOptions): Promise<Kline[]> {
  // 输入验证
  if (options.network && !validateNetwork(options.network)) {
    throw new Error('Invalid network format');
  }
  
  if (options.pairAddress && !validateAddress(options.pairAddress)) {
    throw new Error('Invalid pair address format');
  }
  
  if (options.intervalType && !validateKlineInterval(options.intervalType)) {
    throw new Error(`Invalid interval type: ${options.intervalType}`);
  }
  
  if (options.startTime && !validateTimestamp(options.startTime)) {
    throw new Error('Invalid startTime format');
  }
  
  if (options.endTime && !validateTimestamp(options.endTime)) {
    throw new Error('Invalid endTime format');
  }
  
  if (options.limit && (options.limit <= 0 || options.limit > 10000)) {
    throw new Error('Limit must be between 1 and 10000');
  }
  
  if (options.offset && options.offset < 0) {
    throw new Error('Offset must be non-negative');
  }
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
  // 构建首个K线查询
  let firstKlineSql = `SELECT open FROM klines WHERE network = ? AND pair_address = ? AND interval_type = ?`;
  const firstKlineParams: any[] = [options.network, options.pairAddress, options.intervalType];
  
  if (options.startTime) {
    firstKlineSql += ' AND timestamp >= ?';
    firstKlineParams.push(options.startTime);
  }
  
  if (options.endTime) {
    firstKlineSql += ' AND timestamp <= ?';
    firstKlineParams.push(options.endTime);
  }
  
  firstKlineSql += ' ORDER BY timestamp ASC LIMIT 1';
  
  const firstKline = await db.get(firstKlineSql, firstKlineParams) as { open: string } | undefined;
  
  // 构建最后一个K线查询
  let lastKlineSql = `SELECT close FROM klines WHERE network = ? AND pair_address = ? AND interval_type = ?`;
  const lastKlineParams: any[] = [options.network, options.pairAddress, options.intervalType];
  
  if (options.startTime) {
    lastKlineSql += ' AND timestamp >= ?';
    lastKlineParams.push(options.startTime);
  }
  
  if (options.endTime) {
    lastKlineSql += ' AND timestamp <= ?';
    lastKlineParams.push(options.endTime);
  }
  
  lastKlineSql += ' ORDER BY timestamp DESC LIMIT 1';
  
  const lastKline = await db.get(lastKlineSql, lastKlineParams) as { close: string } | undefined;
  
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
  if (options.keepDays <= 0) {
    throw new Error('keepDays must be positive');
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - options.keepDays);
  
  return deleteKlinesByCondition({
    network: options.network,
    pairAddress: options.pairAddress,
    intervalType: options.intervalType,
    olderThan: cutoffDate.toISOString()
  });
}

// 获取K线数据的时间范围
export async function getKlineTimeRange(options: BaseKlineQueryOptions): Promise<{
  earliest: string | null;
  latest: string | null;
  count: number;
}> {
  const db = await getDatabase();
  
  let sql = `
    SELECT 
      MIN(timestamp) as earliest,
      MAX(timestamp) as latest,
      COUNT(*) as count
    FROM klines WHERE 1=1
  `;
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
  
  const result = await db.get(sql, params) as {
    earliest: string | null;
    latest: string | null;
    count: number;
  };
  
  return result;
}

// 检查K线数据缺口
export async function detectKlineGaps(options: {
  network: string;
  pairAddress: string;
  intervalType: KlineInterval;
  startTime?: string;
  endTime?: string;
}): Promise<Array<{
  gapStart: string;
  gapEnd: string;
  expectedCount: number;
  actualCount: number;
}>> {
  // 根据时间间隔计算期望的间隔毫秒数
  const intervalMs = getIntervalMilliseconds(options.intervalType);
  
  const klines = await getKlines({
    network: options.network,
    pairAddress: options.pairAddress,
    intervalType: options.intervalType,
    startTime: options.startTime,
    endTime: options.endTime,
    orderDirection: 'ASC'
  });
  
  const gaps: Array<{
    gapStart: string;
    gapEnd: string;
    expectedCount: number;
    actualCount: number;
  }> = [];
  
  for (let i = 1; i < klines.length; i++) {
    const prevTime = new Date(klines[i - 1].timestamp).getTime();
    const currTime = new Date(klines[i].timestamp).getTime();
    const timeDiff = currTime - prevTime;
    
    // 如果时间差超过了一个间隔，则可能存在缺口
    if (timeDiff > intervalMs * 1.5) {
      const expectedCount = Math.floor(timeDiff / intervalMs) - 1;
      gaps.push({
        gapStart: klines[i - 1].timestamp,
        gapEnd: klines[i].timestamp,
        expectedCount,
        actualCount: 0
      });
    }
  }
  
  return gaps;
}

// 根据时间间隔类型获取毫秒数
function getIntervalMilliseconds(interval: KlineInterval): number {
  const intervals: Record<KlineInterval, number> = {
    '30s': 30 * 1000,
    '1m': 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  
  return intervals[interval];
}

// 获取K线数据概览
export async function getKlineOverview(options?: {
  network?: string;
  pairAddress?: string;
}): Promise<{
  totalKlines: number;
  networksCount: number;
  pairsCount: number;
  intervals: KlineInterval[];
  earliestTimestamp: string | null;
  latestTimestamp: string | null;
}> {
  const db = await getDatabase();
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  
  if (options?.network) {
    whereClause += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options?.pairAddress) {
    whereClause += ' AND pair_address = ?';
    params.push(options.pairAddress);
  }
  
  // 获取基本统计信息
  const basicStats = await db.get(`
    SELECT 
      COUNT(*) as totalKlines,
      COUNT(DISTINCT network) as networksCount,
      COUNT(DISTINCT pair_address) as pairsCount,
      MIN(timestamp) as earliestTimestamp,
      MAX(timestamp) as latestTimestamp
    FROM klines ${whereClause}
  `, params) as {
    totalKlines: number;
    networksCount: number;
    pairsCount: number;
    earliestTimestamp: string | null;
    latestTimestamp: string | null;
  };
  
  // 获取支持的时间间隔
  const intervalRows = await db.all(`
    SELECT DISTINCT interval_type 
    FROM klines ${whereClause} 
    ORDER BY interval_type
  `, params) as { interval_type: KlineInterval }[];
  
  return {
    ...basicStats,
    intervals: intervalRows.map(row => row.interval_type)
  };
}

// 批量更新K线数据（基于时间戳）
export async function bulkUpdateKlines(
  network: string,
  pairAddress: string,
  intervalType: KlineInterval,
  updates: Array<{
    timestamp: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
    volume?: string;
  }>
): Promise<number> {
  const db = await getDatabase();
  let updatedCount = 0;
  
  try {
    await db.exec('BEGIN TRANSACTION');
    
    for (const update of updates) {
      const fields: string[] = [];
      const params: any[] = [];
      
      Object.entries(update).forEach(([key, value]) => {
        if (key !== 'timestamp' && value !== undefined) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      if (fields.length > 0) {
        params.push(network, pairAddress, intervalType, update.timestamp);
        
        const result = await db.run(
          `UPDATE klines SET ${fields.join(', ')} 
           WHERE network = ? AND pair_address = ? AND interval_type = ? AND timestamp = ?`,
          params
        );
        
        updatedCount += result.changes || 0;
      }
    }
    
    await db.exec('COMMIT');
    return updatedCount;
    
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}