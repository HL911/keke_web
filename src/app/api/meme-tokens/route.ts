import { NextRequest, NextResponse } from 'next/server';
import {
  insertMemeToken,
  upsertMemeToken,
  getMemeTokenByAddress,
  getAllMemeTokens,
  searchMemeTokens,
  getMemeTokenStats,
  getLatestMemeTokens,
  memeTokenExists,
  type CreateMemeTokenData
} from '../utils/meme-token-queries';

// GET - 获取 Meme 代币列表或搜索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const address = searchParams.get('address');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') as 'created_at' | 'market_cap' | 'volume_24h' || 'created_at';
    const orderDirection = searchParams.get('orderDirection') as 'ASC' | 'DESC' || 'DESC';

    switch (action) {
      case 'stats':
        const stats = await getMemeTokenStats();
        return NextResponse.json({ success: true, data: stats });

      case 'latest':
        const latestLimit = parseInt(searchParams.get('limit') || '10');
        const latest = await getLatestMemeTokens(latestLimit);
        return NextResponse.json({ success: true, data: latest });

      case 'exists':
        if (!address) {
          return NextResponse.json(
            { success: false, error: '缺少地址参数' },
            { status: 400 }
          );
        }
        const exists = await memeTokenExists(address);
        return NextResponse.json({ success: true, data: { exists } });

      case 'get':
        if (!address) {
          return NextResponse.json(
            { success: false, error: '缺少地址参数' },
            { status: 400 }
          );
        }
        const token = await getMemeTokenByAddress(address);
        if (!token) {
          return NextResponse.json(
            { success: false, error: '代币不存在' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: token });

      case 'search':
        if (!search) {
          return NextResponse.json(
            { success: false, error: '缺少搜索参数' },
            { status: 400 }
          );
        }
        const searchResults = await searchMemeTokens(search, limit, offset);
        return NextResponse.json({ success: true, data: searchResults });

      default:
        // 获取所有代币列表
        const allTokens = await getAllMemeTokens(limit, offset, orderBy, orderDirection);
        return NextResponse.json({ success: true, data: allTokens });
    }
  } catch (error) {
    console.error('获取 Meme 代币失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST - 创建新的 Meme 代币
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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
      is_verified
    } = body as CreateMemeTokenData;

    // 验证必需字段
    if (!address || !symbol || !name) {
      return NextResponse.json(
        { success: false, error: '缺少必需字段: address, symbol, name' },
        { status: 400 }
      );
    }

    // 验证地址格式（简单的以太坊地址格式检查）
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: '无效的地址格式' },
        { status: 400 }
      );
    }

    // 检查代币是否已存在
    const exists = await memeTokenExists(address);
    if (exists) {
      return NextResponse.json(
        { success: false, error: '该地址的代币已存在' },
        { status: 409 }
      );
    }

    // 创建代币数据
    const tokenData: CreateMemeTokenData = {
      address,
      symbol,
      name,
      decimals: decimals || 18,
      total_supply: total_supply || '0',
      price_usd: price_usd || 0,
      market_cap: market_cap || 0,
      volume_24h: volume_24h || 0,
      description,
      logo_uri,
      twitterAddress,
      telegramAddress,
      websiteAddress,
      is_verified: is_verified || false
    };

    // 插入到数据库
    await insertMemeToken(tokenData);

    // 返回创建的代币信息
    const createdToken = await getMemeTokenByAddress(address);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Meme 代币创建成功',
        data: createdToken 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建 Meme 代币失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PUT - 更新或插入 Meme 代币
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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
      is_verified
    } = body as CreateMemeTokenData;

    // 验证必需字段
    if (!address || !symbol || !name) {
      return NextResponse.json(
        { success: false, error: '缺少必需字段: address, symbol, name' },
        { status: 400 }
      );
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: '无效的地址格式' },
        { status: 400 }
      );
    }

    // 创建代币数据
    const tokenData: CreateMemeTokenData = {
      address,
      symbol,
      name,
      decimals: decimals || 18,
      total_supply: total_supply || '0',
      price_usd: price_usd || 0,
      market_cap: market_cap || 0,
      volume_24h: volume_24h || 0,
      description,
      logo_uri,
      twitterAddress,
      telegramAddress,
      websiteAddress,
      is_verified: is_verified || false
    };

    // 更新或插入到数据库
    await upsertMemeToken(tokenData);

    // 返回更新后的代币信息
    const updatedToken = await getMemeTokenByAddress(address);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Meme 代币更新成功',
        data: updatedToken 
      }
    );
  } catch (error) {
    console.error('更新 Meme 代币失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}