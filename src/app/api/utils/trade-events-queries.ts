import { getDatabase } from './db-core';

// TradeEvent 接口定义
export interface TradeEvent {
  id: number;
  network: string;
  tx_hash: string;
  user_address: string;
  token_amount: string;
  eth_amount: string;
  token_address?: string;
  isBuy: boolean;
  price: string;
  timestamp: string;
  created_at: string;
}

// 插入交易事件
export async function insertTradeEvent(tradeEvent: Omit<TradeEvent, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.run(
    `INSERT INTO trade_events (
      network, tx_hash, user_address, token_amount, eth_amount, 
      token_address, isBuy, price, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tradeEvent.network,
      tradeEvent.tx_hash,
      tradeEvent.user_address,
      tradeEvent.token_amount,
      tradeEvent.eth_amount,
      tradeEvent.token_address,
      tradeEvent.isBuy ? 1 : 0,
      tradeEvent.price,
      tradeEvent.timestamp
    ]
  );
  return result.lastID as number;
}

// 批量插入交易事件
export async function insertTradeEvents(tradeEvents: Omit<TradeEvent, 'id' | 'created_at'>[]): Promise<void> {
  const db = await getDatabase();
  const stmt = await db.prepare(
    `INSERT INTO trade_events (
      network, tx_hash, user_address, token_amount, eth_amount, 
      token_address, isBuy, price, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  try {
    await db.exec('BEGIN TRANSACTION');
    for (const tradeEvent of tradeEvents) {
      await stmt.run([
        tradeEvent.network,
        tradeEvent.tx_hash,
        tradeEvent.user_address,
        tradeEvent.token_amount,
        tradeEvent.eth_amount,
        tradeEvent.token_address,
        tradeEvent.isBuy ? 1 : 0,
        tradeEvent.price,
        tradeEvent.timestamp
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

// 根据ID查询交易事件
export async function getTradeEventById(id: number): Promise<TradeEvent | null> {
  const db = await getDatabase();
  const row = await db.get(
    'SELECT * FROM trade_events WHERE id = ?',
    [id]
  ) as TradeEvent | undefined;
  
  if (row) {
    row.isBuy = Boolean(row.isBuy);
  }
  
  return row || null;
}

// 根据交易哈希查询交易事件
export async function getTradeEventByTxHash(txHash: string): Promise<TradeEvent | null> {
  const db = await getDatabase();
  const row = await db.get(
    'SELECT * FROM trade_events WHERE tx_hash = ?',
    [txHash]
  ) as TradeEvent | undefined;
  
  if (row) {
    row.isBuy = Boolean(row.isBuy);
  }
  
  return row || null;
}

// 查询交易事件列表
export async function getTradeEvents(options: {
  network?: string;
  userAddress?: string;
  tokenAddress?: string;
  isBuy?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'created_at' | 'price';
  orderDirection?: 'ASC' | 'DESC';
}): Promise<TradeEvent[]> {
  const db = await getDatabase();
  
  let sql = 'SELECT * FROM trade_events WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.userAddress) {
    sql += ' AND user_address = ?';
    params.push(options.userAddress);
  }
  
  if (options.tokenAddress) {
    sql += ' AND token_address = ?';
    params.push(options.tokenAddress);
  }
  
  if (options.isBuy !== undefined) {
    sql += ' AND isBuy = ?';
    params.push(options.isBuy ? 1 : 0);
  }
  
  // 排序
  const orderBy = options.orderBy || 'timestamp';
  const orderDirection = options.orderDirection || 'DESC';
  sql += ` ORDER BY ${orderBy} ${orderDirection}`;
  
  // 分页
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }
  
  const rows = await db.all(sql, params) as TradeEvent[];
  
  // 转换 isBuy 字段
  return rows.map(row => ({
    ...row,
    isBuy: Boolean(row.isBuy)
  }));
}

// 统计交易事件数量
export async function getTradeEventsCount(options: {
  network?: string;
  userAddress?: string;
  tokenAddress?: string;
  isBuy?: boolean;
}): Promise<number> {
  const db = await getDatabase();
  
  let sql = 'SELECT COUNT(*) as count FROM trade_events WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.userAddress) {
    sql += ' AND user_address = ?';
    params.push(options.userAddress);
  }
  
  if (options.tokenAddress) {
    sql += ' AND token_address = ?';
    params.push(options.tokenAddress);
  }
  
  if (options.isBuy !== undefined) {
    sql += ' AND isBuy = ?';
    params.push(options.isBuy ? 1 : 0);
  }
  
  const result = await db.get(sql, params) as { count: number };
  return result.count;
}

// 获取交易统计信息
export async function getTradeStatistics(options: {
  network?: string;
  tokenAddress?: string;
  timeRange?: {
    start: string;
    end: string;
  };
}): Promise<{
  totalTrades: number;
  totalVolume: string;
  buyCount: number;
  sellCount: number;
  avgPrice: string;
}> {
  const db = await getDatabase();
  
  let sql = `
    SELECT 
      COUNT(*) as totalTrades,
      SUM(CAST(eth_amount AS REAL)) as totalVolume,
      SUM(CASE WHEN isBuy = 1 THEN 1 ELSE 0 END) as buyCount,
      SUM(CASE WHEN isBuy = 0 THEN 1 ELSE 0 END) as sellCount,
      AVG(CAST(price AS REAL)) as avgPrice
    FROM trade_events 
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.tokenAddress) {
    sql += ' AND token_address = ?';
    params.push(options.tokenAddress);
  }
  
  if (options.timeRange) {
    sql += ' AND timestamp BETWEEN ? AND ?';
    params.push(options.timeRange.start, options.timeRange.end);
  }
  
  const result = await db.get(sql, params) as {
    totalTrades: number;
    totalVolume: number;
    buyCount: number;
    sellCount: number;
    avgPrice: number;
  };
  
  return {
    totalTrades: result.totalTrades || 0,
    totalVolume: (result.totalVolume || 0).toString(),
    buyCount: result.buyCount || 0,
    sellCount: result.sellCount || 0,
    avgPrice: (result.avgPrice || 0).toString()
  };
}

// 更新交易事件
export async function updateTradeEvent(id: number, updates: Partial<Omit<TradeEvent, 'id' | 'created_at'>>): Promise<void> {
  const db = await getDatabase();
  
  const fields: string[] = [];
  const params: any[] = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      if (key === 'isBuy') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  params.push(id);
  
  await db.run(
    `UPDATE trade_events SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

// 删除交易事件
export async function deleteTradeEvent(id: number): Promise<void> {
  const db = await getDatabase();
  await db.run('DELETE FROM trade_events WHERE id = ?', [id]);
}

// 按条件删除交易事件
export async function deleteTradeEventsByCondition(options: {
  network?: string;
  userAddress?: string;
  tokenAddress?: string;
  olderThan?: string; // ISO 日期字符串
}): Promise<number> {
  const db = await getDatabase();
  
  let sql = 'DELETE FROM trade_events WHERE 1=1';
  const params: any[] = [];
  
  if (options.network) {
    sql += ' AND network = ?';
    params.push(options.network);
  }
  
  if (options.userAddress) {
    sql += ' AND user_address = ?';
    params.push(options.userAddress);
  }
  
  if (options.tokenAddress) {
    sql += ' AND token_address = ?';
    params.push(options.tokenAddress);
  }
  
  if (options.olderThan) {
    sql += ' AND created_at < ?';
    params.push(options.olderThan);
  }
  
  const result = await db.run(sql, params);
  return result.changes || 0;
}

// 获取最新的交易事件
export async function getLatestTradeEvents(limit: number = 10): Promise<TradeEvent[]> {
  const db = await getDatabase();
  const rows = await db.all(
    'SELECT * FROM trade_events ORDER BY timestamp DESC LIMIT ?',
    [limit]
  ) as TradeEvent[];
  
  return rows.map(row => ({
    ...row,
    isBuy: Boolean(row.isBuy)
  }));
}

// 获取用户的交易历史
export async function getUserTradeHistory(userAddress: string, options: {
  network?: string;
  tokenAddress?: string;
  limit?: number;
  offset?: number;
}): Promise<TradeEvent[]> {
  return getTradeEvents({
    userAddress,
    network: options.network,
    tokenAddress: options.tokenAddress,
    limit: options.limit,
    offset: options.offset,
    orderBy: 'timestamp',
    orderDirection: 'DESC'
  });
}