import { NextRequest, NextResponse } from 'next/server';
import {
  insertToken,
  upsertToken,
  getTokenByAddress,
  getTokenBySymbol,
  getAllTokens,
  searchTokens,
  getVerifiedTokens,
  updateTokenPrice,
  type CreateTokenData
} from '../utils/token-queries';

// GET - 获取代币列表或搜索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const address = searchParams.get('address');
    const symbol = searchParams.get('symbol');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    switch (action) {
      case 'verified':
        const verifiedTokens = await getVerifiedTokens();
        return NextResponse.json({ success: true, data: verifiedTokens });

      case 'get':
        if (address) {
          const tokenByAddress = await getTokenByAddress(address);
          if (!tokenByAddress) {
            return NextResponse.json(
              { success: false, error: '代币不存在' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, data: tokenByAddress });
        }
        
        if (symbol) {
          const tokenBySymbol = await getTokenBySymbol(symbol);
          if (!tokenBySymbol) {
            return NextResponse.json(
              { success: false, error: '代币不存在' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, data: tokenBySymbol });
        }
        
        return NextResponse.json(
          { success: false, error: '缺少地址或符号参数' },
          { status: 400 }
        );

      case 'search':
        if (!search) {
          return NextResponse.json(
            { success: false, error: '缺少搜索参数' },
            { status: 400 }
          );
        }
        const searchResults = await searchTokens(search);
        return NextResponse.json({ success: true, data: searchResults });

      default:
        // 获取所有代币列表
        const allTokens = await getAllTokens();
        return NextResponse.json({ success: true, data: allTokens });
    }
  } catch (error) {
    console.error('获取代币失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST - 创建新的代币
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
    } = body as CreateTokenData;

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
    const existingToken = await getTokenByAddress(address);
    if (existingToken) {
      return NextResponse.json(
        { success: false, error: '该地址的代币已存在' },
        { status: 409 }
      );
    }

    // 创建代币数据
    const tokenData: CreateTokenData = {
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
    await insertToken(tokenData);

    // 返回创建的代币信息
    const createdToken = await getTokenByAddress(address);
    
    return NextResponse.json(
      { 
        success: true, 
        message: '代币创建成功',
        data: createdToken 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建代币失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PUT - 更新或插入代币
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
    } = body as CreateTokenData;

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
    const tokenData: CreateTokenData = {
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
    await upsertToken(tokenData);

    // 返回更新后的代币信息
    const updatedToken = await getTokenByAddress(address);
    
    return NextResponse.json(
      { 
        success: true, 
        message: '代币更新成功',
        data: updatedToken 
      }
    );
  } catch (error) {
    console.error('更新代币失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PATCH - 更新代币价格信息
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, price_usd, market_cap, volume_24h } = body;

    // 验证必需字段
    if (!address) {
      return NextResponse.json(
        { success: false, error: '缺少地址参数' },
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

    // 检查代币是否存在
    const existingToken = await getTokenByAddress(address);
    if (!existingToken) {
      return NextResponse.json(
        { success: false, error: '代币不存在' },
        { status: 404 }
      );
    }

    // 更新价格信息
    await updateTokenPrice(
      address,
      price_usd || existingToken.price_usd,
      market_cap || existingToken.market_cap,
      volume_24h || existingToken.volume_24h
    );

    // 返回更新后的代币信息
    const updatedToken = await getTokenByAddress(address);
    
    return NextResponse.json(
      { 
        success: true, 
        message: '代币价格更新成功',
        data: updatedToken 
      }
    );
  } catch (error) {
    console.error('更新代币价格失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
