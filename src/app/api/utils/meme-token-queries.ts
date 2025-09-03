import { executeQuery, executeQueryOne, executeUpdate, getDatabase } from './db-core';

export interface MemeToken {
  id: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  total_supply: string;
  price_usd: number;
  market_cap: number;
  volume_24h: number;
  description?: string;
  logo_uri?: string;
  twitterAddress?: string;
  telegramAddress?: string;
  websiteAddress?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMemeTokenData {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
  total_supply?: string;
  price_usd?: number;
  market_cap?: number;
  volume_24h?: number;
  logo_uri?: string;
  description?: string;
  twitterAddress?: string;
  telegramAddress?: string;
  websiteAddress?: string;
  is_verified?: boolean;
}

/**
 * 插入新的 Meme 代币
 */
export async function insertMemeToken(tokenData: CreateMemeTokenData): Promise<void> {
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
    INSERT INTO meme_tokens (
      address, symbol, name, decimals, total_supply, price_usd, 
      market_cap, volume_24h, description, logo_uri, 
      twitterAddress, telegramAddress, websiteAddress, is_verified, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
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
 * 更新或插入 Meme 代币（如果地址已存在则更新）
 */
export async function upsertMemeToken(tokenData: CreateMemeTokenData): Promise<void> {
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
    INSERT OR REPLACE INTO meme_tokens (
      address, symbol, name, decimals, total_supply, price_usd, 
      market_cap, volume_24h, description, logo_uri, 
      twitterAddress, telegramAddress, websiteAddress, is_verified, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
      COALESCE((SELECT created_at FROM meme_tokens WHERE address = ?), datetime('now', 'localtime')),
      datetime('now', 'localtime')
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
 * 根据地址获取 Meme 代币
 */
export async function getMemeTokenByAddress(address: string): Promise<MemeToken | null> {
  const result = await executeQueryOne(
    'SELECT * FROM meme_tokens WHERE address = ?',
    [address]
  ) as MemeToken | undefined;

  return result || null;
}

/**
 * 根据符号获取 Meme 代币
 */
export async function getMemeTokenBySymbol(symbol: string): Promise<MemeToken | null> {
  const result = await executeQueryOne(
    'SELECT * FROM meme_tokens WHERE symbol = ?',
    [symbol]
  ) as MemeToken | undefined;

  return result || null;
}

/**
 * 获取所有 Meme 代币列表
 */
export async function getAllMemeTokens(
  limit: number = 50,
  offset: number = 0,
  orderBy: 'created_at' | 'market_cap' | 'volume_24h' = 'created_at',
  orderDirection: 'ASC' | 'DESC' = 'DESC'
): Promise<{ tokens: MemeToken[]; total: number }> {
  // 获取总数
  const countResult = await executeQueryOne(
    'SELECT COUNT(*) as count FROM meme_tokens'
  ) as { count: number };
  
  const total = countResult.count;

  // 获取分页数据
  const tokens = await executeQuery(
    `SELECT * FROM meme_tokens ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`,
    [limit, offset]
  ) as MemeToken[];

  return { tokens, total };
}

/**
 * 搜索 Meme 代币（按名称或符号）
 */
export async function searchMemeTokens(
  searchTerm: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ tokens: MemeToken[]; total: number }> {
  const searchPattern = `%${searchTerm}%`;
  
  // 获取总数
  const countResult = await executeQueryOne(
    'SELECT COUNT(*) as count FROM meme_tokens WHERE name LIKE ? OR symbol LIKE ?',
    [searchPattern, searchPattern]
  ) as { count: number };
  
  const total = countResult.count;

  // 获取搜索结果
  const tokens = await executeQuery(
    `
    SELECT * FROM meme_tokens 
    WHERE name LIKE ? OR symbol LIKE ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
    `,
    [searchPattern, searchPattern, limit, offset]
  ) as MemeToken[];

  return { tokens, total };
}

/**
 * 更新 Meme 代币价格信息
 */
export async function updateMemeTokenPrice(
  address: string,
  price_usd: number,
  market_cap?: number,
  volume_24h?: number
): Promise<void> {
  const updateFields = ['price_usd = ?', 'updated_at = datetime(\'now\', \'localtime\')'];
  const params: unknown[] = [price_usd];

  if (market_cap !== undefined) {
    updateFields.push('market_cap = ?');
    params.push(market_cap);
  }

  if (volume_24h !== undefined) {
    updateFields.push('volume_24h = ?');
    params.push(Number(volume_24h));
  }

  params.push(address);

  await executeUpdate(
    `UPDATE meme_tokens SET ${updateFields.join(', ')} WHERE address = ?`,
    params
  );
}

/**
 * 删除 Meme 代币
 */
export async function deleteMemeToken(address: string): Promise<void> {
  await executeUpdate(
    'DELETE FROM meme_tokens WHERE address = ?',
    [address]
  );
}

/**
 * 获取 Meme 代币统计信息
 */
export async function getMemeTokenStats(): Promise<{
  total_tokens: number;
  verified_tokens: number;
  total_market_cap: number;
  total_volume_24h: number;
}> {
  const result = await executeQueryOne(
    `
    SELECT 
      COUNT(*) as total_tokens,
      SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_tokens,
      SUM(market_cap) as total_market_cap,
      SUM(volume_24h) as total_volume_24h
    FROM meme_tokens
    `
  ) as {
    total_tokens: number;
    verified_tokens: number;
    total_market_cap: number;
    total_volume_24h: number;
  };

  return result;
}

/**
 * 获取最新创建的 Meme 代币
 */
export async function getLatestMemeTokens(limit: number = 10): Promise<MemeToken[]> {
  return await executeQuery(
    'SELECT * FROM meme_tokens ORDER BY created_at DESC LIMIT ?',
    [limit]
  ) as MemeToken[];
}

/**
 * 检查 Meme 代币地址是否已存在
 */
export async function memeTokenExists(address: string): Promise<boolean> {
  const result = await executeQueryOne(
    'SELECT 1 FROM meme_tokens WHERE address = ? LIMIT 1',
    [address]
  );
  
  return !!result;
}