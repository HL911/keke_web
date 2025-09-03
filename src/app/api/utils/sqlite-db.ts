import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import fs from "fs";

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), "data", "keke_swap.db");

// 数据库实例
let db: Database | null = null;

// 数据库表结构定义
const TABLE_SCHEMAS = {
  trading_pairs: `
    CREATE TABLE IF NOT EXISTS trading_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair_address TEXT UNIQUE NOT NULL,
      token0_address TEXT NOT NULL,
      token1_address TEXT NOT NULL,
      total_supply TEXT NOT NULL DEFAULT '0',
      reserve0 TEXT NOT NULL DEFAULT '0',
      reserve1 TEXT NOT NULL DEFAULT '0',
      tvl_usd REAL DEFAULT 0,
      volume_24h TEXT DEFAULT '0',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  tokens: `
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE NOT NULL,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      decimals INTEGER NOT NULL DEFAULT 18,
      total_supply TEXT NOT NULL DEFAULT '0',
      price_usd REAL DEFAULT 0,
      market_cap REAL DEFAULT 0,
      volume_24h REAL DEFAULT 0,
      logo_uri TEXT,
      is_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  transactions: `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT UNIQUE NOT NULL,
      block_number INTEGER NOT NULL,
      pair_address TEXT NOT NULL,
      user_address TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      amount0_in TEXT DEFAULT '0',
      amount1_in TEXT DEFAULT '0',
      amount0_out TEXT DEFAULT '0',
      amount1_out TEXT DEFAULT '0',
      liquidity_change TEXT DEFAULT '0',
      fee_amount TEXT DEFAULT '0',
      gas_used INTEGER,
      gas_price TEXT,
      status TEXT DEFAULT 'PENDING',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pair_address) REFERENCES trading_pairs(pair_address)
    )
  `,

  user_positions: `
    CREATE TABLE IF NOT EXISTS user_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address TEXT NOT NULL,
      pair_address TEXT NOT NULL,
      lp_balance TEXT NOT NULL DEFAULT '0',
      token0_balance TEXT NOT NULL DEFAULT '0',
      token1_balance TEXT NOT NULL DEFAULT '0',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_address, pair_address),
      FOREIGN KEY (pair_address) REFERENCES trading_pairs(pair_address)
    )
  `,

  price_history: `
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair_address TEXT NOT NULL,
      price0_cumulative TEXT NOT NULL,
      price1_cumulative TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pair_address) REFERENCES trading_pairs(pair_address)
    )
  `,
};

// 创建索引
const INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_trading_pairs_token0 ON trading_pairs(token0_address)",
  "CREATE INDEX IF NOT EXISTS idx_trading_pairs_token1 ON trading_pairs(token1_address)",
  "CREATE INDEX IF NOT EXISTS idx_trading_pairs_active ON trading_pairs(is_active)",
  "CREATE INDEX IF NOT EXISTS idx_trading_pairs_tvl ON trading_pairs(tvl_usd DESC)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_verified ON tokens(is_verified)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_pair ON transactions(pair_address)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)",
  "CREATE INDEX IF NOT EXISTS idx_user_positions_user ON user_positions(user_address)",
  "CREATE INDEX IF NOT EXISTS idx_user_positions_pair ON user_positions(pair_address)",
  "CREATE INDEX IF NOT EXISTS idx_price_history_pair ON price_history(pair_address)",
  "CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)",
];

/**
 * 获取数据库实例
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    await initializeDatabase();
  }
  return db!;
}

/**
 * 初始化数据库
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // 确保数据目录存在
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 检查数据库文件是否存在
    const dbExists = fs.existsSync(DB_PATH);

    // 打开数据库连接
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    // 启用外键约束
    await db.exec("PRAGMA foreign_keys = ON");

    if (!dbExists) {
      // 如果数据库不存在，创建所有表
      await createAllTables();
      console.log("Database initialized with all tables created");
    } else {
      console.log("Database connected successfully");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * 创建所有表
 */
async function createAllTables(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  try {
    // 创建所有表
    for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
      await db.exec(schema);
      console.log(`Table ${tableName} created successfully`);
    }

    // 创建所有索引
    for (const index of INDEXES) {
      await db.exec(index);
    }
    console.log("All indexes created successfully");
  } catch (error) {
    console.error("Failed to create tables:", error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log("Database connection closed");
  }
}

// ==================== 交易对相关操作 ====================

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
  const db = await getDatabase();

  await db.run(
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
  const db = await getDatabase();

  await db.run(
    `
    UPDATE trading_pairs 
    SET reserve0 = ?, reserve1 = ?, total_supply = ?, updated_at = CURRENT_TIMESTAMP
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
  const db = await getDatabase();

  await db.run(
    `
    UPDATE trading_pairs 
    SET tvl_usd = ?, volume_24h = ?, updated_at = CURRENT_TIMESTAMP
    WHERE pair_address = ?
  `,
    [tvlUsd, volume24h, pairAddress]
  );
}

/**
 * 获取所有活跃交易对
 */
export async function getAllActivePairs(): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(`
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
  `);
}

/**
 * 根据地址获取交易对信息
 */
export async function getPairByAddress(
  pairAddress: string
): Promise<any | null> {
  const db = await getDatabase();

  const pair = await db.get(
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
  );

  return pair || null;
}

// ==================== 代币相关操作 ====================

/**
 * 创建或更新代币信息
 */
export async function upsertToken(
  address: string,
  symbol: string,
  name: string,
  decimals: number = 18
): Promise<void> {
  const db = await getDatabase();

  await db.run(
    `
    INSERT OR REPLACE INTO tokens (address, symbol, name, decimals, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,
    [address, symbol, name, decimals]
  );
}

/**
 * 更新代币价格信息
 */
export async function updateTokenPrice(
  address: string,
  priceUsd: number,
  marketCap: number,
  volume24h: number
): Promise<void> {
  const db = await getDatabase();

  await db.run(
    `
    UPDATE tokens 
    SET price_usd = ?, market_cap = ?, volume_24h = ?, updated_at = CURRENT_TIMESTAMP
    WHERE address = ?
  `,
    [priceUsd, marketCap, volume24h, address]
  );
}

/**
 * 根据地址获取代币信息
 */
export async function getTokenByAddress(address: string): Promise<any | null> {
  const db = await getDatabase();

  return await db.get("SELECT * FROM tokens WHERE address = ?", [address]);
}

/**
 * 搜索代币
 */
export async function searchTokens(query: string): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(
    `
    SELECT * FROM tokens 
    WHERE symbol LIKE ? OR name LIKE ?
    ORDER BY is_verified DESC, market_cap DESC
    LIMIT 20
  `,
    [`%${query}%`, `%${query}%`]
  );
}

/**
 * 获取所有代币
 */
export async function getAllTokens(): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(
    `
    SELECT * FROM tokens 
    ORDER BY is_verified DESC, market_cap DESC, created_at DESC
  `
  );
}

// ==================== 交易记录相关操作 ====================

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
  const db = await getDatabase();

  await db.run(
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
  const db = await getDatabase();

  await db.run(
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
): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(
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
  );
}

// ==================== 用户持仓相关操作 ====================

/**
 * 更新用户持仓信息
 */
export async function upsertUserPosition(
  userAddress: string,
  pairAddress: string,
  lpBalance: string,
  token0Balance: string,
  token1Balance: string
): Promise<void> {
  const db = await getDatabase();

  await db.run(
    `
    INSERT OR REPLACE INTO user_positions (
      user_address, pair_address, lp_balance, token0_balance, token1_balance, last_updated
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,
    [userAddress, pairAddress, lpBalance, token0Balance, token1Balance]
  );
}

/**
 * 获取用户所有持仓
 */
export async function getUserPositions(userAddress: string): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(
    `
    SELECT 
      up.*,
      t0.symbol as token0_symbol,
      t1.symbol as token1_symbol,
      tp.token0_address,
      tp.token1_address
    FROM user_positions up
    JOIN trading_pairs tp ON up.pair_address = tp.pair_address
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    WHERE up.user_address = ?
  `,
    [userAddress]
  );
}

/**
 * 获取所有用户持仓
 */
export async function getAllUserPositions(): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(
    `
    SELECT 
      up.*,
      t0.symbol as token0_symbol,
      t1.symbol as token1_symbol,
      tp.token0_address,
      tp.token1_address
    FROM user_positions up
    JOIN trading_pairs tp ON up.pair_address = tp.pair_address
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    ORDER BY up.last_updated DESC
  `
  );
}

/**
 * 获取用户在特定交易对中的持仓
 */
export async function getUserPositionInPair(
  userAddress: string,
  pairAddress: string
): Promise<any | null> {
  const db = await getDatabase();

  return await db.get(
    `
    SELECT * FROM user_positions 
    WHERE user_address = ? AND pair_address = ?
  `,
    [userAddress, pairAddress]
  );
}

// ==================== 价格历史相关操作 ====================

/**
 * 添加价格历史记录
 */
export async function addPriceHistory(
  pairAddress: string,
  price0Cumulative: string,
  price1Cumulative: string
): Promise<void> {
  const db = await getDatabase();

  await db.run(
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
): Promise<any[]> {
  const db = await getDatabase();

  return await db.all(
    `
    SELECT * FROM price_history 
    WHERE pair_address = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `,
    [pairAddress, limit]
  );
}

// ==================== 统计查询 ====================

/**
 * 获取平台总TVL
 */
export async function getTotalTVL(): Promise<number> {
  const db = await getDatabase();

  const result = await db.get(
    "SELECT SUM(tvl_usd) as total FROM trading_pairs WHERE is_active = 1"
  );
  return result?.total || 0;
}

/**
 * 获取平台总交易量（24小时）
 */
export async function getTotalVolume24h(): Promise<string> {
  const db = await getDatabase();

  const result = await db.get(
    "SELECT SUM(CAST(volume_24h AS REAL)) as total FROM trading_pairs WHERE is_active = 1"
  );
  return result?.total?.toString() || "0";
}

/**
 * 获取活跃交易对数量
 */
export async function getActivePairsCount(): Promise<number> {
  const db = await getDatabase();

  const result = await db.get(
    "SELECT COUNT(*) as count FROM trading_pairs WHERE is_active = 1"
  );
  return result?.count || 0;
}

// ==================== 数据库维护 ====================

/**
 * 清理过期数据
 */
export async function cleanupOldData(): Promise<void> {
  const db = await getDatabase();

  // 清理30天前的价格历史
  await db.run(`
    DELETE FROM price_history 
    WHERE timestamp < datetime('now', '-30 days')
  `);

  // 清理90天前的交易记录
  await db.run(`
    DELETE FROM transactions 
    WHERE timestamp < datetime('now', '-90 days')
  `);

  console.log("Old data cleaned up successfully");
}

/**
 * 数据库健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.get("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// 导出类型定义
export interface TradingPair {
  id: number;
  pair_address: string;
  token0_address: string;
  token1_address: string;
  total_supply: string;
  reserve0: string;
  reserve1: string;
  tvl_usd: number;
  volume_24h: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  total_supply: string;
  price_usd: number;
  market_cap: number;
  volume_24h: number;
  logo_uri?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  tx_hash: string;
  block_number: number;
  pair_address: string;
  user_address: string;
  transaction_type: string;
  amount0_in: string;
  amount1_in: string;
  amount0_out: string;
  amount1_out: string;
  liquidity_change: string;
  fee_amount: string;
  gas_used?: number;
  gas_price?: string;
  status: string;
  timestamp: string;
}

export interface UserPosition {
  id: number;
  user_address: string;
  pair_address: string;
  lp_balance: string;
  token0_balance: string;
  token1_balance: string;
  last_updated: string;
}
