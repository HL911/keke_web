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
  trades: `
    CREATE TABLE IF NOT EXISTS trade_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      network TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      user_address TEXT NOT NULL,
      token_amount TEXT NOT NULL DEFAULT '0',
      eth_amount TEXT NOT NULL DEFAULT '0',
      token_address TEXT,
      isBuy BOOLEAN DEFAULT 1,
      price TEXT NOT NULL DEFAULT '0',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    // 插入初始代币数据
    await insertInitialTokens();
    console.log("Initial token data inserted successfully");

    // 插入初始流动性数据
    await insertInitialLiquidity();
    console.log("Initial liquidity data inserted successfully");
  } catch (error) {
    console.error("Failed to create tables:", error);
    throw error;
  }
}

/**
 * 插入初始代币数据
 */
async function insertInitialTokens(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  try {
    const initialTokens = [
      {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        symbol: "KEKE",
        name: "Keke Token",
        decimals: 18,
        is_verified: true,
        logo_uri: "/public/keke-logo.png",
      },
      {
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        is_verified: true,
        logo_uri: "/public/weth-logo.png",
      },
      {
        address: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        is_verified: true,
        logo_uri: "/public/usdt-logo.png",
      },
      {
        address: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        is_verified: true,
        logo_uri: "/public/usdc-logo.png",
      },
      {
        address: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
        symbol: "WBNB",
        name: "Wrapped BNB",
        decimals: 18,
        is_verified: true,
        logo_uri: "/public/wbnb-logo.png",
      },
      {
        address: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
        symbol: "WBTC",
        name: "Wrapped BTC",
        decimals: 8,
        is_verified: true,
        logo_uri: "/public/wbtc-logo.png",
      },
    ];

    for (const token of initialTokens) {
      await db.run(
        `
        INSERT OR REPLACE INTO tokens (
          address, symbol, name, decimals, is_verified, logo_uri, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          token.address,
          token.symbol,
          token.name,
          token.decimals,
          token.is_verified ? 1 : 0,
          token.logo_uri,
        ]
      );
    }
  } catch (error) {
    console.error("Failed to insert initial tokens:", error);
    throw error;
  }
}

/**
 * 插入初始流动性数据
 */
async function insertInitialLiquidity(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  // addLiquidity: usdt + bnb;
  // pairA: 0x6a46c44b4570260d2c97aacd0971141ec978563f;
  // amountUsdt: 1000000000;
  // amountWbnb: 500000000000000000000;
  // liquidityA: 707106781185547;
  // addLiquidity: weth + usdc;
  // pairB: 0x90cf8b9a78ea5f67131a94e692c2893805814216;
  // amountWeth: 5000000000000000000;
  // amountUsdc: 1000000000;
  // liquidityB: 70710678117654;
  // addLiquidity: weth + wbnb;
  // pairC: 0x1fbc90bdb38ccf3254af29bab6d747d2adc18a90;
  // amountWeth: 5000000000000000000;
  // amountWbnb: 500000000000000000000;
  // liquidityC: 49999999999999999000;
  // addLiquidity: usdc + wbtc;
  // pairD: 0xc47513e8752da8bd450437b43e31ab776e53ca34;
  // amountWeth: 1000000000;
  // amountWbtc: 1000000000;
  // liquidityD: 999999000;

  try {
    const initialPairs = [
      {
        // USDT + WBNB 交易对
        pair_address: "0x6a46c44b4570260d2c97aacd0971141ec978563f", // 需要实际计算
        token0_address: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6", // USDT
        token1_address: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788", // WBNB
        reserve0: (1000 * 10 ** 6).toString(), // 1000 USDT
        reserve1: (500 * 10 ** 18).toString(), // 500 WBNB
        total_supply: "22360679774997896964091736687", // sqrt(1000 * 10^6 * 500 * 10^18) 近似值
      },
      {
        // WETH + USDC 交易对
        pair_address: "0x90cf8b9a78ea5f67131a94e692c2893805814216", // 需要实际计算
        token0_address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // WETH
        token1_address: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // USDC
        reserve0: (5 * 10 ** 18).toString(), // 5 WETH
        reserve1: (1000 * 10 ** 6).toString(), // 1000 USDC
        total_supply: "70710678118654752440084436210", // sqrt(5 * 10^18 * 1000 * 10^6) 近似值
      },
      {
        // WETH + WBNB 交易对
        pair_address: "0x1fbc90bdb38ccf3254af29bab6d747d2adc18a90", // 需要实际计算
        token0_address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // WETH
        token1_address: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788", // WBNB
        reserve0: (5 * 10 ** 18).toString(), // 5 WETH
        reserve1: (500 * 10 ** 18).toString(), // 500 WBNB
        total_supply: "50000000000000000000000000000", // sqrt(5 * 10^18 * 500 * 10^18) 近似值
      },
      {
        // USDC + WBTC 交易对
        pair_address: "0xc47513e8752da8bd450437b43e31ab776e53ca34", // 需要实际计算
        token0_address: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // USDC
        token1_address: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e", // WBTC
        reserve0: (1000 * 10 ** 6).toString(), // 1000 USDC
        reserve1: (10 * 10 ** 8).toString(), // 10 WBTC
        total_supply: "31622776601683793319988935444", // sqrt(1000 * 10^6 * 10 * 10^8) 近似值
      },
    ];

    for (const pair of initialPairs) {
      // 计算 TVL (这里简化处理，实际应该根据代币价格计算)
      let tvl_usd = 0;

      // 简单的TVL估算 (假设USDT=USDC=1美元, WETH=2000美元, WBNB=300美元, WBTC=50000美元)
      if (
        pair.token0_address === "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
      ) {
        // USDT
        tvl_usd = 2000; // 1000 USDT * 2
      } else if (
        pair.token0_address === "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
      ) {
        // WETH
        if (
          pair.token1_address === "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
        ) {
          // USDC
          tvl_usd = 11000; // 5 WETH * 2000 + 1000 USDC
        } else if (
          pair.token1_address === "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
        ) {
          // WBNB
          tvl_usd = 160000; // 5 WETH * 2000 + 500 WBNB * 300
        }
      } else if (
        pair.token0_address === "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
      ) {
        // USDC
        tvl_usd = 501000; // 1000 USDC + 10 WBTC * 50000
      }

      await db.run(
        `
        INSERT OR REPLACE INTO trading_pairs (
          pair_address, token0_address, token1_address, total_supply, 
          reserve0, reserve1, tvl_usd, volume_24h, is_active, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          pair.pair_address,
          pair.token0_address,
          pair.token1_address,
          pair.total_supply,
          pair.reserve0,
          pair.reserve1,
          tvl_usd,
          "0", // 初始24小时交易量为0
          1, // 激活状态
        ]
      );
    }

    console.log("Initial liquidity pairs inserted successfully");
  } catch (error) {
    console.error("Failed to insert initial liquidity:", error);
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

/**
 * 数据库健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const database = await getDatabase();
    await database.get("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// ==================== 基础CRUD操作 ====================

/**
 * 执行原生SQL查询
 */
export async function executeQuery(
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  const database = await getDatabase();
  return await database.all(sql, params);
}

/**
 * 执行单条查询
 */
export async function executeQueryOne(
  sql: string,
  params: unknown[] = []
): Promise<unknown> {
  const database = await getDatabase();
  return await database.get(sql, params);
}

/**
 * 执行更新/插入操作
 */
export async function executeUpdate(
  sql: string,
  params: unknown[] = []
): Promise<void> {
  const database = await getDatabase();
  await database.run(sql, params);
}

/**
 * 执行事务
 */
export async function executeTransaction(
  operations: (() => Promise<void>)[]
): Promise<void> {
  const database = await getDatabase();

  await database.exec("BEGIN TRANSACTION");

  try {
    for (const operation of operations) {
      await operation();
    }
    await database.exec("COMMIT");
  } catch (error) {
    await database.exec("ROLLBACK");
    throw error;
  }
}

// ==================== 类型定义 ====================

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

export interface TradingPairWithTokens extends TradingPair {
  token0_symbol: string;
  token0_name: string;
  token0_decimals: number;
  token1_symbol: string;
  token1_name: string;
  token1_decimals: number;
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

export interface UserPositionWithTokens extends UserPosition {
  token0_symbol: string;
  token1_symbol: string;
  token0_address: string;
  token1_address: string;
}
