import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import KekeswapFactory_ABI from "@/abi/KekeswapFactory.json";

// 创建公共客户端用于读取合约
const publicClient = createPublicClient({
  chain: foundry,
  transport: http(),
});

// Factory合约地址
const FACTORY_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenA, tokenB } = body;

    if (!tokenA || !tokenB) {
      return NextResponse.json({ error: "缺少代币地址参数" }, { status: 400 });
    }

    // 从Factory合约获取交易对地址
    const pairAddress = await publicClient.readContract({
      address: FACTORY_ADDRESS as `0x${string}`,
      abi: KekeswapFactory_ABI,
      functionName: "getPair",
      args: [tokenA as `0x${string}`, tokenB as `0x${string}`],
    });

    // 检查交易对是否存在
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const pairExists = pairAddress !== zeroAddress;

    return NextResponse.json({
      success: true,
      pairAddress: pairExists ? pairAddress : null,
      exists: pairExists,
    });
  } catch (error) {
    console.error("获取交易对地址失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取交易对地址失败",
      },
      { status: 500 }
    );
  }
}
