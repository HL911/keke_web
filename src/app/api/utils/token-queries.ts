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

export interface CreateTokenData {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
  total_supply?: string;
  price_usd?: number;
  market_cap?: number;
  volume_24h?: number;
  description?: string;
  logo_uri?: string;
  twitterAddress?: string;
  telegramAddress?: string;
  websiteAddress?: string;
  is_verified?: boolean;
}

/**
 * 插入新的代币
 */
export async function insertToken(tokenData: CreateTokenData): Promise<void> {
  const {
    address,
    symbol,
    name,
    decimals = 18,
    total_supply = '0',
    price_usd = 0,
    market_cap = 0,
    volume_24h = 0,
    description,
    logo_uri,
    twitterAddress,
    telegramAddress,
    websiteAddress,
    is_verified = false
  } = tokenData;

  await executeUpdate(
    `
    INSERT INTO tokens (
      address, symbol, name, decimals, total_supply, price_usd, 
      market_cap, volume_24h, description, logo_uri, 
      twitterAddress, telegramAddress, websiteAddress, is_verified, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      address,
      symbol,
      name,
      decimals,
      total_supply,
      price_usd,
      market_cap,
      volume_24h,
      description,
      logo_uri,
      twitterAddress,
      telegramAddress,
      websiteAddress,
      is_verified ? 1 : 0
    ]
  );
}

/**
 * 创建或更新代币信息
 */
export async function upsertToken(tokenData: CreateTokenData): Promise<void> {
  const {
    address,
    symbol,
    name,
    decimals = 18,
    total_supply = '0',
    price_usd = 0,
    market_cap = 0,
    volume_24h = 0,
    description,
    logo_uri,
    twitterAddress,
    telegramAddress,
    websiteAddress,
    is_verified = false
  } = tokenData;

  await executeUpdate(
    `
    INSERT OR REPLACE INTO tokens (
      address, symbol, name, decimals, total_supply, price_usd, 
      market_cap, volume_24h, description, logo_uri, 
      twitterAddress, telegramAddress, websiteAddress, is_verified, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
      COALESCE((SELECT created_at FROM tokens WHERE address = ?), CURRENT_TIMESTAMP),
      CURRENT_TIMESTAMP
    )
    `,
    [
      address,
      symbol,
      name,
      decimals,
      total_supply,
      price_usd,
      market_cap,
      volume_24h,
      description,
      logo_uri,
      twitterAddress,
      telegramAddress,
      websiteAddress,
      is_verified ? 1 : 0,
      address
    ]
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
