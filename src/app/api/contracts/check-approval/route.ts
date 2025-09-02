import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, erc20Abi } from "viem";
import { foundry } from "viem/chains";

// 创建公共客户端用于读取合约
const publicClient = createPublicClient({
  chain: foundry,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, userAddress, spender, amount } = body;

    if (!tokenAddress || !userAddress || !spender || !amount) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 检查代币授权额度
    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [userAddress as `0x${string}`, spender as `0x${string}`],
    });

    // 比较授权额度和需要的金额
    const isApproved = allowance >= BigInt(amount);

    return NextResponse.json({
      success: true,
      isApproved,
      allowance: allowance.toString(),
      required: amount,
    });
  } catch (error) {
    console.error("检查授权失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "检查授权失败",
      },
      { status: 500 }
    );
  }
}
