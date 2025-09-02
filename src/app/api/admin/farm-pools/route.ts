import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/utils/sqlite-db';
import { z } from 'zod';

// 添加交易对到农场池的请求体验证
const addToFarmSchema = z.object({
  pairAddresses: z.array(z.string().min(1, '交易对地址不能为空')),
  allocPoint: z.number().min(0, '分配点数必须大于等于0').default(100),
  depositFee: z.number().min(0).max(10000, '存款费用必须在0-10000之间').default(0),
  withUpdate: z.boolean().default(true)
});

/**
 * 添加选定的交易对到农场池
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pairAddresses, allocPoint, depositFee, withUpdate } = addToFarmSchema.parse(body);

    if (pairAddresses.length === 0) {
      return NextResponse.json(
        { error: '请至少选择一个交易对' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 验证所有交易对地址是否存在
    const placeholders = pairAddresses.map(() => '?').join(',');
    const existingPairs = await db.all(`
      SELECT pair_address, token0_symbol, token1_symbol 
      FROM trading_pairs 
      WHERE pair_address IN (${placeholders})
    `, ...pairAddresses);

    if (existingPairs.length !== pairAddresses.length) {
      const existingAddresses = existingPairs.map((p: any) => p.pair_address);
      const missingAddresses = pairAddresses.filter(addr => !existingAddresses.includes(addr));
      return NextResponse.json(
        { error: `以下交易对地址不存在: ${missingAddresses.join(', ')}` },
        { status: 400 }
      );
    }

    // 检查是否已经存在于农场池中
    const existingFarmPools = await db.all(`
      SELECT pair_address 
      FROM farm_pools 
      WHERE pair_address IN (${placeholders})
    `, ...pairAddresses);

    if (existingFarmPools.length > 0) {
      const existingAddresses = existingFarmPools.map((p: any) => p.pair_address);
      return NextResponse.json(
        { error: `以下交易对已存在于农场池中: ${existingAddresses.join(', ')}` },
        { status: 400 }
      );
    }

    // 创建farm_pools表（如果不存在）
    await db.exec(`
      CREATE TABLE IF NOT EXISTS farm_pools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pair_address TEXT NOT NULL UNIQUE,
        alloc_point INTEGER NOT NULL DEFAULT 100,
        deposit_fee INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 批量插入农场池
    for (const pairAddress of pairAddresses) {
      await db.run(`
        INSERT INTO farm_pools (pair_address, alloc_point, deposit_fee, is_active)
        VALUES (?, ?, ?, 1)
      `, pairAddress, allocPoint, depositFee);
    }

    // 获取添加的农场池信息
    const addedPools = await db.all(`
      SELECT 
        fp.id,
        fp.pair_address,
        fp.alloc_point,
        fp.deposit_fee,
        fp.is_active,
        fp.created_at,
        tp.token0_symbol,
        tp.token1_symbol,
        tp.token0_address,
        tp.token1_address
      FROM farm_pools fp
      JOIN trading_pairs tp ON fp.pair_address = tp.pair_address
      WHERE fp.pair_address IN (${placeholders})
      ORDER BY fp.created_at DESC
    `, ...pairAddresses);

    return NextResponse.json({
      success: true,
      message: `成功添加 ${pairAddresses.length} 个交易对到农场池`,
      data: {
        addedPools,
        count: pairAddresses.length
      }
    });

  } catch (error) {
    console.error('添加农场池失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '添加农场池失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 获取农场池列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('active');

    const offset = (page - 1) * limit;
    const db = await getDatabase();

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (
        tp.token0_symbol LIKE ? OR 
        tp.token1_symbol LIKE ? OR 
        fp.pair_address LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (isActive !== null) {
      whereClause += ' AND fp.is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }

    // 获取农场池列表
    const farmPools = await db.all(`
      SELECT 
        fp.id,
        fp.pair_address,
        fp.alloc_point,
        fp.deposit_fee,
        fp.is_active,
        fp.created_at,
        fp.updated_at,
        tp.token0_symbol,
        tp.token1_symbol,
        tp.token0_address,
        tp.token1_address,
        tp.reserve0,
        tp.reserve1
      FROM farm_pools fp
      JOIN trading_pairs tp ON fp.pair_address = tp.pair_address
      ${whereClause}
      ORDER BY fp.created_at DESC
      LIMIT ? OFFSET ?
    `, ...params, limit, offset);

    // 获取总数
    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM farm_pools fp
      JOIN trading_pairs tp ON fp.pair_address = tp.pair_address
      ${whereClause}
    `, ...params) as { count: number };

    return NextResponse.json({
      success: true,
      data: {
        farmPools,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取农场池列表失败:', error);
    return NextResponse.json(
      { error: '获取农场池列表失败，请稍后重试' },
      { status: 500 }
    );
  }
}