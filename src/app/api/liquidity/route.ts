import { NextRequest, NextResponse } from "next/server";
import { getPairWithFullTokenInfo } from "../utils/pair-queries";

/**
 * 通过pair地址获取交易对的信息以及两个token的信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairAddress = searchParams.get("pairAddress");

    if (!pairAddress) {
      return NextResponse.json(
        { error: "pairAddress参数是必需的" },
        { status: 400 }
      );
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(pairAddress)) {
      return NextResponse.json(
        { error: "无效的pair地址格式" },
        { status: 400 }
      );
    }

    // 获取交易对和token信息
    const result = await getPairWithFullTokenInfo(pairAddress);

    if (!result) {
      return NextResponse.json(
        { error: "未找到指定的交易对" },
        { status: 404 }
      );
    }

    // 返回格式化的响应
    return NextResponse.json({
      success: true,
      data: {
        pair: {
          id: result.pair.id,
          pairAddress: result.pair.pair_address,
          token0Address: result.pair.token0_address,
          token1Address: result.pair.token1_address,
          totalSupply: result.pair.total_supply,
          reserve0: result.pair.reserve0,
          reserve1: result.pair.reserve1,
          tvlUsd: result.pair.tvl_usd,
          volume24h: result.pair.volume_24h,
          isActive: result.pair.is_active,
          createdAt: result.pair.created_at,
          updatedAt: result.pair.updated_at,
        },
        token0: {
          address: result.token0.address,
          symbol: result.token0.symbol,
          name: result.token0.name,
          decimals: result.token0.decimals,
          totalSupply: result.token0.total_supply,
          priceUsd: result.token0.price_usd,
          marketCap: result.token0.market_cap,
          volume24h: result.token0.volume_24h,
          description: result.token0.description,
          logoUri: result.token0.logo_uri,
          twitterAddress: result.token0.twitterAddress,
          telegramAddress: result.token0.telegramAddress,
          websiteAddress: result.token0.websiteAddress,
          isVerified: result.token0.is_verified,
          createdAt: result.token0.created_at,
          updatedAt: result.token0.updated_at,
        },
        token1: {
          address: result.token1.address,
          symbol: result.token1.symbol,
          name: result.token1.name,
          decimals: result.token1.decimals,
          totalSupply: result.token1.total_supply,
          priceUsd: result.token1.price_usd,
          marketCap: result.token1.market_cap,
          volume24h: result.token1.volume_24h,
          description: result.token1.description,
          logoUri: result.token1.logo_uri,
          twitterAddress: result.token1.twitterAddress,
          telegramAddress: result.token1.telegramAddress,
          websiteAddress: result.token1.websiteAddress,
          isVerified: result.token1.is_verified,
          createdAt: result.token1.created_at,
          updatedAt: result.token1.updated_at,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching pair and token info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
