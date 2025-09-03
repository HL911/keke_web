import { NextRequest, NextResponse } from "next/server";
import { getAllTokens, getTokenBySymbol } from "@/app/api/utils/token-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (symbol) {
      // 获取单个代币配置
      const tokenConfig = await getTokenBySymbol(symbol);
      if (!tokenConfig) {
        return NextResponse.json(
          { error: `代币 ${symbol} 不存在` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: tokenConfig });
    } else {
      // 获取所有代币配置
      const allTokens = await getAllTokens();
      const tokensMap: Record<string, (typeof allTokens)[0]> = {};
      allTokens.forEach((token) => {
        tokensMap[token.symbol] = token;
      });
      return NextResponse.json({ success: true, data: tokensMap });
    }
  } catch (error) {
    console.error("获取合约配置失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, address } = body;

    if (!symbol || !address) {
      return NextResponse.json(
        { error: "缺少必需参数 symbol 或 address" },
        { status: 400 }
      );
    }

    // 这里可以添加更新代币地址的逻辑
    // 注意：在生产环境中，这个操作应该需要管理员权限

    return NextResponse.json({
      success: true,
      message: "代币配置更新成功",
    });
  } catch (error) {
    console.error("更新合约配置失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
