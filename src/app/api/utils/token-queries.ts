import { executeQuery, executeQueryOne, executeUpdate, Token } from "./db-core";

/**
 * 根据符号获取代币信息
 */
export async function getTokenBySymbol(symbol: string): Promise<Token | null> {
  const result = (await executeQueryOne(
    "SELECT * FROM tokens WHERE symbol = ?",
    [symbol]
  )) as Token | undefined;

  return result || null;
}

/**
 * 根据地址获取代币信息
 */
export async function getTokenByAddress(
  address: string
): Promise<Token | null> {
  const result = (await executeQueryOne(
    "SELECT * FROM tokens WHERE address = ?",
    [address]
  )) as Token | undefined;

  return result || null;
}

/**
 * 获取所有代币
 */
export async function getAllTokens(): Promise<Token[]> {
  return (await executeQuery(
    `
    SELECT * FROM tokens 
    ORDER BY is_verified DESC, market_cap DESC, created_at DESC
    `
  )) as Token[];
}

/**
 * 搜索代币
 */
export async function searchTokens(query: string): Promise<Token[]> {
  return (await executeQuery(
    `
    SELECT * FROM tokens 
    WHERE symbol LIKE ? OR name LIKE ?
    ORDER BY is_verified DESC, market_cap DESC
    LIMIT 20
    `,
    [`%${query}%`, `%${query}%`]
  )) as Token[];
}

/**
 * 创建或更新代币信息
 */
export async function upsertToken(
  address: string,
  symbol: string,
  name: string,
  decimals: number = 18
): Promise<void> {
  await executeUpdate(
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
  await executeUpdate(
    `
    UPDATE tokens 
    SET price_usd = ?, market_cap = ?, volume_24h = ?, updated_at = CURRENT_TIMESTAMP
    WHERE address = ?
    `,
    [priceUsd, marketCap, volume24h, address]
  );
}

/**
 * 获取验证过的代币列表
 */
export async function getVerifiedTokens(): Promise<Token[]> {
  return (await executeQuery(
    "SELECT * FROM tokens WHERE is_verified = 1 ORDER BY market_cap DESC"
  )) as Token[];
}

/**
 * 更新代币地址（用于部署后地址变化的情况）
 */
export async function updateTokenAddress(
  symbol: string,
  newAddress: string
): Promise<void> {
  await executeUpdate(
    `
    UPDATE tokens 
    SET address = ?, updated_at = CURRENT_TIMESTAMP
    WHERE symbol = ?
    `,
    [newAddress, symbol]
  );
}
