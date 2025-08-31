import { NextResponse } from "next/server";
import { getDatabase } from "../utils/sqlite-db";

/**
 * GET /api/database-monitor - 获取数据库监控数据
 */
export async function GET() {
  try {
    const db = await getDatabase();

    // 获取所有表的数据
    const [tradingPairs, tokens, transactions, userPositions, priceHistory] =
      await Promise.all([
        db.all(
          "SELECT * FROM trading_pairs ORDER BY created_at DESC LIMIT 100"
        ),
        db.all("SELECT * FROM tokens ORDER BY created_at DESC LIMIT 100"),
        db.all("SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 100"),
        db.all(
          "SELECT * FROM user_positions ORDER BY last_updated DESC LIMIT 100"
        ),
        db.all("SELECT * FROM price_history ORDER BY timestamp DESC LIMIT 100"),
      ]);

    // 获取表的基本统计信息
    const [
      pairsCount,
      tokensCount,
      transactionsCount,
      positionsCount,
      historyCount,
    ] = await Promise.all([
      db.get("SELECT COUNT(*) as count FROM trading_pairs"),
      db.get("SELECT COUNT(*) as count FROM tokens"),
      db.get("SELECT COUNT(*) as count FROM transactions"),
      db.get("SELECT COUNT(*) as count FROM user_positions"),
      db.get("SELECT COUNT(*) as count FROM price_history"),
    ]);

    // 获取数据库文件信息
    const dbInfo = await db.get("PRAGMA database_list");
    const tableInfo = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        tables: tableInfo.map((t) => t.name),
        statistics: {
          trading_pairs: pairsCount?.count || 0,
          tokens: tokensCount?.count || 0,
          transactions: transactionsCount?.count || 0,
          user_positions: positionsCount?.count || 0,
          price_history: historyCount?.count || 0,
        },
      },
      data: {
        trading_pairs: tradingPairs,
        tokens: tokens,
        transactions: transactions,
        user_positions: userPositions,
        price_history: priceHistory,
      },
    });
  } catch (error) {
    console.error("Database monitor failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch database data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
