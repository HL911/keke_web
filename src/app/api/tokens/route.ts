import { NextRequest, NextResponse } from "next/server";
import {
  getAllTokens,
  searchTokens,
  getVerifiedTokens,
  getTokenByAddress,
  getTokenBySymbol,
} from "../utils/token-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const verified = searchParams.get("verified");
    const address = searchParams.get("address");
    const symbol = searchParams.get("symbol");

    // 根据地址查询单个代币
    if (address) {
      const token = await getTokenByAddress(address);
      if (!token) {
        return NextResponse.json(
          { success: false, error: "Token not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: { [token.symbol]: token },
      });
    }

    // 根据符号查询单个代币
    if (symbol) {
      const token = await getTokenBySymbol(symbol);
      if (!token) {
        return NextResponse.json(
          { success: false, error: "Token not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: { [token.symbol]: token },
      });
    }

    // 搜索代币
    if (search) {
      const tokens = await searchTokens(search);
      return NextResponse.json({
        success: true,
        data: tokens.reduce((acc, token) => {
          acc[token.symbol] = token;
          return acc;
        }, {} as Record<string, any>),
      });
    }

    // 只获取验证过的代币
    if (verified === "true") {
      const tokens = await getVerifiedTokens();
      return NextResponse.json({
        success: true,
        data: tokens.reduce((acc, token) => {
          acc[token.symbol] = token;
          return acc;
        }, {} as Record<string, any>),
      });
    }

    // 获取所有代币
    const tokens = await getAllTokens();
    return NextResponse.json({
      success: true,
      data: tokens.reduce((acc, token) => {
        acc[token.symbol] = token;
        return acc;
      }, {} as Record<string, any>),
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
