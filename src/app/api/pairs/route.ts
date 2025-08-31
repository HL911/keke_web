import { NextRequest, NextResponse } from "next/server";
import {
  getAllActivePairs,
  createTradingPair,
  getActivePairsCount,
  getTotalTVL,
  getTotalVolume24h,
  getPairByAddress,
  updatePairReserves,
} from "../utils/sqlite-db";

/**
 * GET /api/pairs - 获取所有活跃交易对
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairAddress = searchParams.get("pairAddress");

    // 如果带上了 pairAddress，则返回单个交易对信息
    if (pairAddress) {
      const pair = await getPairByAddress(pairAddress);
      return NextResponse.json({
        success: true,
        data: pair,
      });
    }

    const pairs = await getAllActivePairs();
    const count = await getActivePairsCount();
    const totalTVL = await getTotalTVL();
    const totalVolume = await getTotalVolume24h();

    return NextResponse.json({
      success: true,
      data: {
        pairs,
        stats: {
          totalPairs: count,
          totalTVL,
          totalVolume24h: totalVolume,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching pairs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch pairs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pairs - 创建或更新交易对
 */
export async function POST(request: NextRequest) {
  try {
    const {
      pairAddress,
      token0Address,
      token1Address,
      reserve0,
      reserve1,
      totalSupply,
    } = await request.json();

    // 验证必要参数
    if (!pairAddress || !token0Address || !token1Address) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required parameters: pairAddress, token0Address, token1Address",
        },
        { status: 400 }
      );
    }

    // 验证储备和总供应量参数
    if (
      reserve0 === undefined ||
      reserve1 === undefined ||
      totalSupply === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: reserve0, reserve1, totalSupply",
        },
        { status: 400 }
      );
    }

    // 检查交易对是否已存在
    const existingPair = await getPairByAddress(pairAddress);

    if (existingPair) {
      // 如果存在，更新储备信息
      await updatePairReserves(
        pairAddress,
        String(reserve0),
        String(reserve1),
        String(totalSupply)
      );

      return NextResponse.json({
        success: true,
        message: "Trading pair updated successfully",
        operation: "update",
      });
    } else {
      // 如果不存在，创建新的交易对
      await createTradingPair(
        pairAddress,
        token0Address,
        token1Address,
        String(reserve0),
        String(reserve1),
        String(totalSupply)
      );

      return NextResponse.json({
        success: true,
        message: "Trading pair created successfully",
        operation: "create",
      });
    }
  } catch (error) {
    console.error("Error creating/updating pair:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create/update trading pair",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
