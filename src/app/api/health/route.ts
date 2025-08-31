import { NextResponse } from "next/server";
import {
  healthCheck,
  getActivePairsCount,
  getTotalTVL,
  getTotalVolume24h,
} from "../utils/sqlite-db";

/**
 * GET /api/health - 数据库健康检查
 */
export async function GET() {
  try {
    // 执行健康检查
    const isHealthy = await healthCheck();

    if (!isHealthy) {
      return NextResponse.json(
        {
          success: false,
          status: "unhealthy",
          error: "Database health check failed",
        },
        { status: 503 }
      );
    }

    // 获取基本统计信息
    const [activePairsCount, totalTVL, totalVolume24h] = await Promise.all([
      getActivePairsCount(),
      getTotalTVL(),
      getTotalVolume24h(),
    ]);

    return NextResponse.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        status: "connected",
        activePairs: activePairsCount,
        totalTVL: totalTVL,
        totalVolume24h: totalVolume24h,
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: "Health check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
