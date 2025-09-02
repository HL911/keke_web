import {
  executeQuery,
  executeQueryOne,
  executeUpdate,
  Transaction,
} from "./db-core";

/**
 * 创建交易记录
 */
export async function createTransaction(
  txHash: string,
  blockNumber: number,
  pairAddress: string,
  userAddress: string,
  transactionType: string,
  amount0In: string = "0",
  amount1In: string = "0",
  amount0Out: string = "0",
  amount1Out: string = "0",
  liquidityChange: string = "0",
  feeAmount: string = "0",
  gasUsed?: number,
  gasPrice?: string
): Promise<void> {
  await executeUpdate(
    `
    INSERT INTO transactions (
      tx_hash, block_number, pair_address, user_address, transaction_type,
      amount0_in, amount1_in, amount0_out, amount1_out, liquidity_change,
      fee_amount, gas_used, gas_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      txHash,
      blockNumber,
      pairAddress,
      userAddress,
      transactionType,
      amount0In,
      amount1In,
      amount0Out,
      amount1Out,
      liquidityChange,
      feeAmount,
      gasUsed,
      gasPrice,
    ]
  );
}

/**
 * 更新交易状态
 */
export async function updateTransactionStatus(
  txHash: string,
  status: string
): Promise<void> {
  await executeUpdate(
    `
    UPDATE transactions 
    SET status = ? 
    WHERE tx_hash = ?
    `,
    [status, txHash]
  );
}

/**
 * 获取用户交易历史
 */
export async function getUserTransactions(
  userAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<Transaction[]> {
  return (await executeQuery(
    `
    SELECT 
      t.*,
      tp.token0_symbol,
      tp.token1_symbol
    FROM transactions t
    JOIN trading_pairs tp ON t.pair_address = tp.pair_address
    WHERE t.user_address = ?
    ORDER BY t.timestamp DESC
    LIMIT ? OFFSET ?
    `,
    [userAddress, limit, offset]
  )) as Transaction[];
}

/**
 * 获取平台总TVL
 */
export async function getTotalTVL(): Promise<number> {
  const result = (await executeQueryOne(
    "SELECT SUM(tvl_usd) as total FROM trading_pairs WHERE is_active = 1"
  )) as { total: number } | undefined;

  return result?.total || 0;
}

/**
 * 获取平台总交易量（24小时）
 */
export async function getTotalVolume24h(): Promise<string> {
  const result = (await executeQueryOne(
    "SELECT SUM(CAST(volume_24h AS REAL)) as total FROM trading_pairs WHERE is_active = 1"
  )) as { total: number } | undefined;

  return result?.total?.toString() || "0";
}

/**
 * 获取活跃交易对数量
 */
export async function getActivePairsCount(): Promise<number> {
  const result = (await executeQueryOne(
    "SELECT COUNT(*) as count FROM trading_pairs WHERE is_active = 1"
  )) as { count: number } | undefined;

  return result?.count || 0;
}

/**
 * 添加价格历史记录
 */
export async function addPriceHistory(
  pairAddress: string,
  price0Cumulative: string,
  price1Cumulative: string
): Promise<void> {
  await executeUpdate(
    `
    INSERT INTO price_history (pair_address, price0_cumulative, price1_cumulative)
    VALUES (?, ?, ?)
    `,
    [pairAddress, price0Cumulative, price1Cumulative]
  );
}

/**
 * 获取交易对价格历史
 */
export async function getPriceHistory(
  pairAddress: string,
  limit: number = 100
): Promise<
  {
    id: number;
    pair_address: string;
    price0_cumulative: string;
    price1_cumulative: string;
    timestamp: string;
  }[]
> {
  return (await executeQuery(
    `
    SELECT * FROM price_history 
    WHERE pair_address = ?
    ORDER BY timestamp DESC
    LIMIT ?
    `,
    [pairAddress, limit]
  )) as {
    id: number;
    pair_address: string;
    price0_cumulative: string;
    price1_cumulative: string;
    timestamp: string;
  }[];
}

/**
 * 获取平台历史统计数据
 */
export async function getPlatformHistoricalStats(days: number = 30): Promise<
  Array<{
    date: string;
    tvl: number;
    volume: number;
    activePairs: number;
    transactions: number;
  }>
> {
  const result = (await executeQuery(
    `
    SELECT 
      DATE(t.timestamp) as date,
      COUNT(DISTINCT t.pair_address) as activePairs,
      COUNT(t.id) as transactions,
      SUM(CASE WHEN t.transaction_type = 'SWAP' 
          THEN CAST(t.amount0_in AS REAL) + CAST(t.amount1_in AS REAL) 
          ELSE 0 END) as volume
    FROM transactions t
    WHERE t.timestamp >= datetime('now', '-${days} days')
    GROUP BY DATE(t.timestamp)
    ORDER BY date DESC
    `
  )) as Array<{
    date: string;
    activePairs: number;
    transactions: number;
    volume: number;
  }>;

  // 获取TVL需要另外计算（简化版本）
  return result.map((row) => ({
    date: row.date,
    tvl: 0, // TODO: 实现真实的历史TVL计算
    volume: row.volume || 0,
    activePairs: row.activePairs || 0,
    transactions: row.transactions || 0,
  }));
}

/**
 * 清理过期数据
 */
export async function cleanupOldData(): Promise<void> {
  // 清理30天前的价格历史
  await executeUpdate(`
    DELETE FROM price_history 
    WHERE timestamp < datetime('now', '-30 days')
  `);

  // 清理90天前的交易记录
  await executeUpdate(`
    DELETE FROM transactions 
    WHERE timestamp < datetime('now', '-90 days')
  `);

  console.log("Old data cleaned up successfully");
}
