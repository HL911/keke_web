import {
  executeQuery,
  executeQueryOne,
  executeUpdate,
  executeTransaction,
  TradingPair,
  TradingPairWithTokens,
} from "./db-core";

/**
 * 创建新的交易对
 */
export async function createTradingPair(
  pairAddress: string,
  token0Address: string,
  token1Address: string,
  reserve0: string,
  reserve1: string,
  totalSupply: string
): Promise<void> {
  await executeUpdate(
    `
    INSERT INTO trading_pairs (pair_address, token0_address, token1_address, reserve0, reserve1, total_supply)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [pairAddress, token0Address, token1Address, reserve0, reserve1, totalSupply]
  );
}

/**
 * 更新交易对储备数据
 */
export async function updatePairReserves(
  pairAddress: string,
  reserve0: string,
  reserve1: string,
  totalSupply: string
): Promise<void> {
  await executeUpdate(
    `
    UPDATE trading_pairs 
    SET reserve0 = ?, reserve1 = ?, total_supply = ?, updated_at = datetime('now', 'localtime')
    WHERE pair_address = ?
    `,
    [reserve0, reserve1, totalSupply, pairAddress]
  );
}

/**
 * 更新交易对TVL和交易量
 */
export async function updatePairStats(
  pairAddress: string,
  tvlUsd: number,
  volume24h: string
): Promise<void> {
  await executeUpdate(
    `
    UPDATE trading_pairs 
    SET tvl_usd = ?, volume_24h = ?, updated_at = datetime('now', 'localtime')
    WHERE pair_address = ?
    `,
    [tvlUsd, volume24h, pairAddress]
  );
}

/**
 * 获取所有活跃交易对
 */
export async function getAllActivePairs(): Promise<TradingPairWithTokens[]> {
  return (await executeQuery(`
    SELECT 
      tp.*,
      t0.symbol as token0_symbol,
      t0.name as token0_name,
      t0.decimals as token0_decimals,
      t1.symbol as token1_symbol,
      t1.name as token1_name,
      t1.decimals as token1_decimals
    FROM trading_pairs tp
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    WHERE tp.is_active = 1
    ORDER BY tp.tvl_usd DESC
  `)) as TradingPairWithTokens[];
}

/**
 * 根据地址获取交易对信息
 */
export async function getPairByAddress(
  pairAddress: string
): Promise<TradingPairWithTokens | null> {
  const pair = (await executeQueryOne(
    `
    SELECT 
      tp.*,
      t0.symbol as token0_symbol,
      t0.name as token0_name,
      t0.decimals as token0_decimals,
      t1.symbol as token1_symbol,
      t1.name as token1_name,
      t1.decimals as token1_decimals
    FROM trading_pairs tp
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    WHERE tp.pair_address = ?
    `,
    [pairAddress]
  )) as TradingPairWithTokens | undefined;

  return pair || null;
}

/**
 * 获取带分页的流动性池列表
 */
export async function getPoolsWithPagination(
  page: number = 1,
  limit: number = 20,
  sortBy: string = "tvl_usd",
  sortOrder: "asc" | "desc" = "desc",
  search?: string
): Promise<{ pools: TradingPairWithTokens[]; total: number }> {
  let whereClause = "WHERE tp.is_active = 1";
  const params: unknown[] = [];

  // 添加搜索条件
  if (search) {
    whereClause += ` AND (
      t0.symbol LIKE ? OR t0.name LIKE ? OR 
      t1.symbol LIKE ? OR t1.name LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  // 构建排序子句
  const validSortFields = ["tvl_usd", "volume_24h", "created_at"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "tvl_usd";
  const orderDirection = sortOrder === "asc" ? "ASC" : "DESC";

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM trading_pairs tp
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    ${whereClause}
  `;
  const countResult = (await executeQueryOne(countQuery, params)) as {
    total: number;
  };
  const total = countResult?.total || 0;

  // 获取分页数据
  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT 
      tp.*,
      t0.symbol as token0_symbol,
      t0.name as token0_name,
      t0.decimals as token0_decimals,
      t0.logo_uri as token0_logo,
      t1.symbol as token1_symbol,
      t1.name as token1_name,
      t1.decimals as token1_decimals,
      t1.logo_uri as token1_logo
    FROM trading_pairs tp
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    ${whereClause}
    ORDER BY tp.${orderField} ${orderDirection}
    LIMIT ? OFFSET ?
  `;

  const pools = (await executeQuery(dataQuery, [
    ...params,
    limit,
    offset,
  ])) as TradingPairWithTokens[];

  return { pools, total };
}

/**
 * 批量更新交易对储备数据
 */
export async function batchUpdatePairReserves(
  updates: Array<{
    pairAddress: string;
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    tvlUsd?: number;
  }>
): Promise<void> {
  const operations = updates.map((update) => async () => {
    await executeUpdate(
      `
      UPDATE trading_pairs 
      SET reserve0 = ?, reserve1 = ?, total_supply = ?, 
          tvl_usd = COALESCE(?, tvl_usd), updated_at = datetime('now', 'localtime')
      WHERE pair_address = ?
      `,
      [
        update.reserve0,
        update.reserve1,
        update.totalSupply,
        update.tvlUsd,
        update.pairAddress,
      ]
    );
  });

  await executeTransaction(operations);
}

/**
 * 获取热门代币对
 */
export async function getTrendingPairs(
  limit: number = 10
): Promise<TradingPairWithTokens[]> {
  return (await executeQuery(
    `
    SELECT 
      tp.*,
      t0.symbol as token0_symbol,
      t0.name as token0_name,
      t0.decimals as token0_decimals,
      t0.logo_uri as token0_logo,
      t1.symbol as token1_symbol,
      t1.name as token1_name,
      t1.decimals as token1_decimals,
      t1.logo_uri as token1_logo,
      COUNT(DISTINCT tr.user_address) as unique_traders,
      COUNT(tr.id) as transaction_count
    FROM trading_pairs tp
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    LEFT JOIN transactions tr ON tp.pair_address = tr.pair_address 
      AND tr.timestamp >= datetime('now', '-24 hours')
    WHERE tp.is_active = 1
    GROUP BY tp.id
    ORDER BY transaction_count DESC, tp.tvl_usd DESC
    LIMIT ?
    `,
    [limit]
  )) as TradingPairWithTokens[];
}

/**
 * 获取池子的历史APY数据
 */
export async function getPoolHistoricalAPY(
  pairAddress: string,
  days: number = 7
): Promise<Array<{ date: string; apy: number }>> {
  const result = (await executeQuery(
    `
    SELECT 
      DATE(timestamp) as date,
      SUM(CAST(fee_amount AS REAL)) as daily_fees,
      AVG(tp.tvl_usd) as avg_tvl
    FROM transactions t
    JOIN trading_pairs tp ON t.pair_address = tp.pair_address
    WHERE t.pair_address = ? 
      AND t.timestamp >= datetime('now', '-${days} days')
      AND t.transaction_type IN ('SWAP', 'ADD_LIQUIDITY', 'REMOVE_LIQUIDITY')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
    `,
    [pairAddress]
  )) as Array<{ date: string; daily_fees: number; avg_tvl: number }>;

  return result.map((row) => ({
    date: row.date,
    apy: row.avg_tvl > 0 ? (row.daily_fees * 365 * 100) / row.avg_tvl : 0,
  }));
}
