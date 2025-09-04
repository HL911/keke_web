import { NextRequest, NextResponse } from "next/server";
import {
  getPoolsWithPagination,
  getPoolHistoricalAPY,
  createTradingPair,
  updatePairReserves,
  getPairByAddress,
} from "@/app/api/utils/pair-queries";

/**
 * 获取流动性池列表
 * GET /api/pools
 *
 * Query Parameters:
 * - page: 页码 (默认: 1)
 * - limit: 每页数量 (默认: 20)
 * - sortBy: 排序字段 (tvl_usd, volume_24h, created_at)
 * - sortOrder: 排序方向 (asc, desc, 默认: desc)
 * - search: 搜索关键词
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "tvl_usd";
    const sortOrderParam = searchParams.get("sortOrder") || "desc";
    const sortOrder =
      sortOrderParam === "asc" || sortOrderParam === "desc"
        ? sortOrderParam
        : "desc";
    const search = searchParams.get("search") || undefined;

    // 使用新的分页查询函数
    const { pools: paginatedPools, total } = await getPoolsWithPagination(
      page,
      limit,
      sortBy,
      sortOrder,
      search
    );

    // 计算额外的指标并并行获取APY数据
    const poolsWithMetrics = await Promise.all(
      paginatedPools.map(async (pool) => {
        const [historicalAPY] = await Promise.all([
          getPoolHistoricalAPY(pool.pair_address, 7).catch(() => []),
        ]);

        const currentAPY =
          historicalAPY.length > 0
            ? historicalAPY[0]?.apy || 0
            : calculateAPY(pool);

        return {
          ...pool,
          apy: currentAPY,
          priceChange24h: 0, // TODO: 实现价格变化计算
          volume7d: "0", // TODO: 实现7天交易量计算
          feesGenerated24h: calculateFees24h(pool),
          historicalAPY,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: poolsWithMetrics,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("获取流动性池列表失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: "获取流动性池列表失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * 创建新的流动性池记录或更新已有的流动性池记录
 * POST /api/pools
 *
 * Request Body:
 * {
 *   pairAddress: string,      // 交易对合约地址
 *   token0Address: string,    // Token0 地址
 *   token1Address: string,    // Token1 地址
 *   reserve0: string,         // Token0 储备量
 *   reserve1: string,         // Token1 储备量
 *   totalSupply: string,      // LP Token 总供应量
 *   tvlUsd?: number,          // 总锁定价值（美元）
 *   volume24h?: string        // 24小时交易量
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必需参数
    const {
      pairAddress,
      token0Address,
      token1Address,
      reserve0,
      reserve1,
      totalSupply,
      tvlUsd,
      volume24h,
    } = body;

    // 参数验证
    if (!pairAddress || !token0Address || !token1Address) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需参数",
          message: "pairAddress, token0Address, token1Address 是必需参数",
        },
        { status: 400 }
      );
    }

    if (
      reserve0 === undefined ||
      reserve1 === undefined ||
      totalSupply === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需参数",
          message: "reserve0, reserve1, totalSupply 是必需参数",
        },
        { status: 400 }
      );
    }

    // 验证地址格式（简单验证）
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (
      !addressRegex.test(pairAddress) ||
      !addressRegex.test(token0Address) ||
      !addressRegex.test(token1Address)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的地址格式",
          message: "所有地址必须是有效的以太坊地址格式",
        },
        { status: 400 }
      );
    }

    // 验证数值参数
    if (
      isNaN(parseFloat(reserve0)) ||
      isNaN(parseFloat(reserve1)) ||
      isNaN(parseFloat(totalSupply))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的数值参数",
          message: "reserve0, reserve1, totalSupply 必须是有效的数字",
        },
        { status: 400 }
      );
    }

    // 检查交易对是否已存在
    const existingPair = await getPairByAddress(pairAddress);

    let result;
    let isNew = false;

    if (existingPair) {
      // 更新现有记录
      result = await updatePairReserves(
        pairAddress,
        reserve0,
        reserve1,
        totalSupply,
        tvlUsd,
        volume24h
      );
    } else {
      // 创建新记录
      result = await createTradingPair(
        pairAddress,
        token0Address,
        token1Address,
        reserve0,
        reserve1,
        totalSupply,
        tvlUsd,
        volume24h
      );
      isNew = true;
    }

    return NextResponse.json({
      success: true,
      message: isNew ? "流动性池创建成功" : "流动性池更新成功",
      data: {
        isNew,
        pair: result,
      },
    });
  } catch (error) {
    console.error("创建/更新流动性池失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: "创建/更新流动性池失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * 计算池子的APY
 * TODO: 实现真实的APY计算逻辑
 */
function calculateAPY(pool: { volume_24h?: string }): number {
  // 简单的模拟计算，实际需要基于历史数据
  const baseAPY = 5; // 基础5% APY
  const volumeBonus = Math.min(parseFloat(pool.volume_24h || "0") / 100000, 20); // 基于交易量的奖励
  return baseAPY + volumeBonus;
}

/**
 * 计算24小时手续费收入
 * TODO: 实现真实的手续费计算逻辑
 */
function calculateFees24h(pool: { volume_24h?: string }): string {
  // 假设0.3%的手续费
  const volume24h = parseFloat(pool.volume_24h || "0");
  const fees = volume24h * 0.003; // 0.3% 手续费
  return fees.toString();
}
