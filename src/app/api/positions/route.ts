import { NextRequest, NextResponse } from "next/server";
import {
  getUserPositionsWithValue,
  createOrUpdateUserPosition,
} from "@/app/api/utils/position-queries";

/**
 * 获取用户流动性持仓
 * GET /api/liquidity/positions?user=0x...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("user");

    if (!userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少用户地址参数",
        },
        { status: 400 }
      );
    }

    // 获取用户持仓（已包含代币价格等信息）
    const positions = await getUserPositionsWithValue(userAddress);

    // 计算每个持仓的价值和指标
    const positionsWithValue = await Promise.all(
      positions.map(async (position) => {
        const totalValueUSD = await calculatePositionValue({
          lp_balance: position.lp_balance,
          total_supply: "1000000", // 模拟总供应量
          tvl_usd: 100000, // 模拟TVL
        });
        const { token0ValueUSD, token1ValueUSD } = await calculateTokenValues({
          reserve0: undefined,
          reserve1: undefined,
          token0_price: undefined,
          token1_price: undefined,
        });
        const share = await calculatePoolShare(position);
        const unrealizedPnL = await calculateUnrealizedPnL(position);
        const fees24h = await calculateFees24h(position);

        return {
          ...position,
          totalValueUSD,
          token0ValueUSD,
          token1ValueUSD,
          share,
          unrealizedPnL,
          fees24h,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: positionsWithValue,
    });
  } catch (error) {
    console.error("获取用户持仓失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: "获取用户持仓失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * 更新用户持仓
 * PUT /api/liquidity/positions
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userAddress,
      pairAddress,
      lpBalance,
      token0Balance,
      token1Balance,
    } = body;

    if (!userAddress || !pairAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数",
        },
        { status: 400 }
      );
    }

    // 更新用户持仓（使用增强版函数）
    await createOrUpdateUserPosition(
      userAddress,
      pairAddress,
      lpBalance || "0",
      token0Balance || "0",
      token1Balance || "0",
      body.transactionHash // 可选的交易哈希
    );

    return NextResponse.json({
      success: true,
      message: "持仓更新成功",
    });
  } catch (error) {
    console.error("更新用户持仓失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: "更新用户持仓失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * 计算持仓价值 (USD)
 * 基于LP代币余额和池子储备量计算实际价值
 */
async function calculatePositionValue(position: {
  lp_balance?: string;
  total_supply?: string;
  tvl_usd?: number;
}): Promise<number> {
  try {
    const lpBalance = parseFloat(position.lp_balance || "0");
    const totalSupply = parseFloat(position.total_supply || "1");
    const tvlUsd = position.tvl_usd || 0;

    if (lpBalance === 0 || totalSupply === 0) return 0;

    // 用户持有的LP代币比例
    const userShare = lpBalance / totalSupply;

    // 用户在池子中的价值
    const userValue = tvlUsd * userShare;

    return userValue;
  } catch (error) {
    console.error("计算持仓价值失败:", error);
    return 0;
  }
}

/**
 * 计算各代币的价值分配
 */
async function calculateTokenValues(position: {
  reserve0?: string;
  reserve1?: string;
  token0_price?: number;
  token1_price?: number;
}): Promise<{
  token0ValueUSD: number;
  token1ValueUSD: number;
}> {
  try {
    const totalValue = await calculatePositionValue({
      lp_balance: "100", // 模拟LP余额
      total_supply: "1000000", // 模拟总供应量
      tvl_usd: 100000, // 模拟TVL
    });
    const reserve0 = parseFloat(position.reserve0 || "0");
    const reserve1 = parseFloat(position.reserve1 || "0");
    const token0Price = position.token0_price || 0;
    const token1Price = position.token1_price || 0;

    if (reserve0 === 0 || reserve1 === 0) {
      return {
        token0ValueUSD: totalValue * 0.5,
        token1ValueUSD: totalValue * 0.5,
      };
    }

    // 计算池子中两种代币的价值比例
    const token0PoolValue = reserve0 * token0Price;
    const token1PoolValue = reserve1 * token1Price;
    const totalPoolValue = token0PoolValue + token1PoolValue;

    if (totalPoolValue === 0) {
      return {
        token0ValueUSD: totalValue * 0.5,
        token1ValueUSD: totalValue * 0.5,
      };
    }

    const token0Ratio = token0PoolValue / totalPoolValue;
    const token1Ratio = token1PoolValue / totalPoolValue;

    return {
      token0ValueUSD: totalValue * token0Ratio,
      token1ValueUSD: totalValue * token1Ratio,
    };
  } catch (error) {
    console.error("计算代币价值分配失败:", error);
    return {
      token0ValueUSD: 0,
      token1ValueUSD: 0,
    };
  }
}

/**
 * 计算在池子中的份额
 * TODO: 实现基于链上数据的份额计算
 */
async function calculatePoolShare(_position: unknown): Promise<number> {
  // 简化计算，实际需要：
  // 1. 获取池子总的LP代币供应量
  // 2. 计算用户LP代币占比

  const mockShare = Math.random() * 0.1; // 模拟0-0.1%的份额
  return mockShare;
}

/**
 * 计算未实现盈亏
 * TODO: 实现基于历史成本的盈亏计算
 */
async function calculateUnrealizedPnL(_position: unknown): Promise<number> {
  // 简化计算，实际需要：
  // 1. 获取用户添加流动性时的成本
  // 2. 计算当前价值与成本的差异
  // 3. 考虑无常损失

  const mockPnL = (Math.random() - 0.5) * 1000; // 模拟盈亏
  return mockPnL;
}

/**
 * 计算24小时手续费收入
 * TODO: 实现基于交易量和份额的手续费计算
 */
async function calculateFees24h(_position: unknown): Promise<number> {
  // 简化计算，实际需要：
  // 1. 获取池子24h交易量
  // 2. 计算手续费总额
  // 3. 根据用户份额分配

  const mockFees = Math.random() * 10; // 模拟手续费收入
  return mockFees;
}
