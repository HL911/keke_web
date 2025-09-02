import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, TradingPairWithTokens } from '@/app/api/utils/db-core';

/**
 * 获取数据库中的交易对列表
 * GET /api/trading-pairs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    
    const db = await getDatabase();
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    // 活跃状态过滤
    if (isActive !== null) {
      whereClause += ' AND tp.is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    // 搜索过滤
    if (search) {
      whereClause += ` AND (
        t0.symbol LIKE ? OR t0.name LIKE ? OR 
        t1.symbol LIKE ? OR t1.name LIKE ? OR
        tp.pair_address LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM trading_pairs tp
      LEFT JOIN tokens t0 ON tp.token0_address = t0.address
      LEFT JOIN tokens t1 ON tp.token1_address = t1.address
      ${whereClause}
    `;
    
    const countResult = await db.get(countQuery, params) as { total: number };
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
      LEFT JOIN tokens t0 ON tp.token0_address = t0.address
      LEFT JOIN tokens t1 ON tp.token1_address = t1.address
      ${whereClause}
      ORDER BY tp.tvl_usd DESC, tp.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const tradingPairs = await db.all(dataQuery, [...params, limit, offset]) as TradingPairWithTokens[];
    
    // 计算分页信息
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return NextResponse.json({
      success: true,
      data: {
        tradingPairs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      }
    });
    
  } catch (error) {
    console.error('获取交易对列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取交易对列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 获取单个交易对详情
 * GET /api/trading-pairs/[address]
 */
export async function getByAddress(pairAddress: string) {
  try {
    const db = await getDatabase();
    
    const query = `
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
      LEFT JOIN tokens t0 ON tp.token0_address = t0.address
      LEFT JOIN tokens t1 ON tp.token1_address = t1.address
      WHERE tp.pair_address = ?
    `;
    
    const tradingPair = await db.get(query, [pairAddress]) as TradingPairWithTokens;
    
    if (!tradingPair) {
      return NextResponse.json(
        {
          success: false,
          error: '交易对不存在'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tradingPair
    });
    
  } catch (error) {
    console.error('获取交易对详情失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取交易对详情失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}