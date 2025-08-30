import { NextRequest, NextResponse } from "next/server";
import {
  getUserPositions,
  upsertUserPosition,
  getUserPositionInPair,
  getAllUserPositions,
} from "../utils/sqlite-db";

/**
 * GET /api/user-positions - 获取用户持仓信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    const pairAddress = searchParams.get("pairAddress");

    if (!userAddress) {
      // 如果没有提供用户地址，返回所有持仓
      const positions = await getAllUserPositions();
      return NextResponse.json({ success: true, data: positions });
    }

    if (pairAddress) {
      // 获取用户在特定交易对中的持仓
      const position = await getUserPositionInPair(userAddress, pairAddress);
      if (!position) {
        return NextResponse.json({
          success: true,
          data: null,
          message: "No position found for this pair",
        });
      }
      return NextResponse.json({ success: true, data: position });
    }

    // 获取用户所有持仓
    const positions = await getUserPositions(userAddress);
    return NextResponse.json({ success: true, data: positions });
  } catch (error) {
    console.error("Error fetching user positions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user positions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-positions - 更新用户持仓信息
 */
export async function POST(request: NextRequest) {
  try {
    const {
      userAddress,
      pairAddress,
      lpBalance,
      token0Balance,
      token1Balance,
    } = await request.json();

    // 验证必要参数
    if (!userAddress || !pairAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: userAddress, pairAddress",
        },
        { status: 400 }
      );
    }

    // 更新用户持仓
    await upsertUserPosition(
      userAddress,
      pairAddress,
      lpBalance || "0",
      token0Balance || "0",
      token1Balance || "0"
    );

    return NextResponse.json({
      success: true,
      message: "User position updated successfully",
    });
  } catch (error) {
    console.error("Error updating user position:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user position",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
