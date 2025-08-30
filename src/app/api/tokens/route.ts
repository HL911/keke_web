import { NextRequest, NextResponse } from "next/server";
import {
  upsertToken,
  getTokenByAddress,
  searchTokens,
  getAllTokens,
  updateTokenPrice,
} from "../utils/sqlite-db";

/**
 * GET /api/tokens - 获取代币信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const query = searchParams.get("query");

    if (address) {
      // 根据地址获取特定代币
      const token = await getTokenByAddress(address);
      if (!token) {
        return NextResponse.json(
          { success: false, error: "Token not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: token });
    }

    if (query) {
      // 搜索代币
      const tokens = await searchTokens(query);
      return NextResponse.json({ success: true, data: tokens });
    }

    // 如果没有参数，返回所有代币
    const tokens = await getAllTokens();
    return NextResponse.json({ success: true, data: tokens });
  } catch (error) {
    console.error("Error fetching token:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens - 创建或更新代币信息
 */
export async function POST(request: NextRequest) {
  try {
    const { address, symbol, name, decimals = 18 } = await request.json();

    // 验证必要参数
    if (!address || !symbol || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: address, symbol, name",
        },
        { status: 400 }
      );
    }

    // 创建或更新代币
    await upsertToken(address, symbol, name, decimals);

    return NextResponse.json({
      success: true,
      message: "Token created/updated successfully",
    });
  } catch (error) {
    console.error("Error creating/updating token:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create/update token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tokens/[address]/price - 更新代币价格信息
 */
export async function PUT(request: NextRequest) {
  try {
    const { address, priceUsd, marketCap, volume24h } = await request.json();

    // 验证必要参数
    if (!address || priceUsd === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: address, priceUsd",
        },
        { status: 400 }
      );
    }

    // 更新代币价格
    await updateTokenPrice(address, priceUsd, marketCap || 0, volume24h || 0);

    return NextResponse.json({
      success: true,
      message: "Token price updated successfully",
    });
  } catch (error) {
    console.error("Error updating token price:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update token price",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
