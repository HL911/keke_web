import {
  executeQuery,
  executeQueryOne,
  executeUpdate,
  executeTransaction,
  UserPosition,
  UserPositionWithTokens,
} from "./db-core";

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
  await executeUpdate(
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
export async function getUserPositions(
  userAddress: string
): Promise<UserPositionWithTokens[]> {
  return (await executeQuery(
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
  )) as UserPositionWithTokens[];
}

/**
 * 获取所有用户持仓
 */
export async function getAllUserPositions(): Promise<UserPositionWithTokens[]> {
  return (await executeQuery(
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
  )) as UserPositionWithTokens[];
}

/**
 * 获取用户在特定交易对中的持仓
 */
export async function getUserPositionInPair(
  userAddress: string,
  pairAddress: string
): Promise<UserPosition | null> {
  const result = (await executeQueryOne(
    `
    SELECT * FROM user_positions 
    WHERE user_address = ? AND pair_address = ?
    `,
    [userAddress, pairAddress]
  )) as UserPosition | undefined;

  return result || null;
}

/**
 * 获取用户持仓（带价值计算）
 */
export async function getUserPositionsWithValue(
  userAddress: string
): Promise<UserPositionWithTokens[]> {
  return (await executeQuery(
    `
    SELECT 
      up.*,
      t0.symbol as token0_symbol,
      t0.name as token0_name,
      t0.decimals as token0_decimals,
      t0.logo_uri as token0_logo,
      t0.price_usd as token0_price,
      t1.symbol as token1_symbol,
      t1.name as token1_name,
      t1.decimals as token1_decimals,
      t1.logo_uri as token1_logo,
      t1.price_usd as token1_price,
      tp.token0_address,
      tp.token1_address,
      tp.reserve0,
      tp.reserve1,
      tp.total_supply,
      tp.tvl_usd
    FROM user_positions up
    JOIN trading_pairs tp ON up.pair_address = tp.pair_address
    JOIN tokens t0 ON tp.token0_address = t0.address
    JOIN tokens t1 ON tp.token1_address = t1.address
    WHERE up.user_address = ? AND up.lp_balance > '0'
    ORDER BY up.last_updated DESC
    `,
    [userAddress]
  )) as UserPositionWithTokens[];
}

/**
 * 创建或更新用户持仓（增强版）
 */
export async function createOrUpdateUserPosition(
  userAddress: string,
  pairAddress: string,
  lpBalance: string,
  token0Balance: string,
  token1Balance: string,
  transactionHash?: string
): Promise<void> {
  const operations = [
    async () => {
      // 更新用户持仓
      await executeUpdate(
        `
        INSERT OR REPLACE INTO user_positions (
          user_address, pair_address, lp_balance, token0_balance, token1_balance, last_updated
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [userAddress, pairAddress, lpBalance, token0Balance, token1Balance]
      );
    },
  ];

  // 如果提供了交易哈希，记录交易
  if (transactionHash) {
    operations.push(async () => {
      await executeUpdate(
        `
        INSERT OR IGNORE INTO transactions (
          tx_hash, pair_address, user_address, transaction_type, 
          liquidity_change, status, block_number
        ) VALUES (?, ?, ?, 'ADD_LIQUIDITY', ?, 'SUCCESS', 0)
        `,
        [transactionHash, pairAddress, userAddress, lpBalance]
      );
    });
  }

  await executeTransaction(operations);
}
