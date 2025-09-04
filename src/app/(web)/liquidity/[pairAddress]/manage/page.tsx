"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ArrowLeft } from "lucide-react";
import { usePairInfo } from "@/hooks/liquidity/usePairInfo";
import { Token } from "../../components/TokenSelector";
import UserPositionCard from "./components/UserPositionCard";
import AddLiquidity from "./components/AddLiquidity";
import RemoveLiquidity from "./components/RemoveLiquidity";
import { PositionData } from "./components/UserPositionCard";

export default function AddLiquidityPage({
  params,
}: {
  params: Promise<{ pairAddress: string }>;
}) {
  const { pairAddress } = use(params);
  const { isConnected, address } = useAccount();
  const router = useRouter();

  // Tab状态管理
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

  // 持仓数据状态
  const [positionData, setPositionData] = useState<
    (PositionData & { lpTokenBalance: string }) | null
  >(null);

  // 从数据库查询对应的两个token信息
  const {
    pairInfo,
    loading: pairInfoLoading,
    error: pairInfoError,
    refetch: refetchPairInfo,
  } = usePairInfo(pairAddress);

  // 从pair信息中构建token信息
  let token0: Token | null = null;
  let token1: Token | null = null;

  if (pairInfo) {
    token0 = {
      address: pairInfo.token0.address,
      symbol: pairInfo.token0.symbol,
      name: pairInfo.token0.name,
      decimals: pairInfo.token0.decimals,
      logoURI: pairInfo.token0.logoUri || "",
      price: pairInfo.token0.priceUsd || 0,
    };
    token1 = {
      address: pairInfo.token1.address,
      symbol: pairInfo.token1.symbol,
      name: pairInfo.token1.name,
      decimals: pairInfo.token1.decimals,
      logoURI: pairInfo.token1.logoUri || "",
      price: pairInfo.token1.priceUsd || 0,
    };
  }

  // 处理添加流动性成功后的回调
  const handleAddLiquiditySuccess = () => {
    // 可以在这里添加成功后的逻辑，比如刷新数据等
    console.log("流动性添加成功");
  };

  // 处理移除流动性成功后的回调
  const handleRemoveLiquiditySuccess = () => {
    // 可以在这里移除成功后的逻辑，比如刷新数据等
    console.log("流动性移除成功");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 页面头部 */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <div className="flex flex-col gap-2">
            <div className="relative flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="xl:absolute xl:-ml-14 hover:bg-gray-100 hover:scale-105 transition-all duration-200 ease-in-out group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">
                管理流动性持仓
              </h1>
            </div>
            <p className="text-gray-600">
              在当前资金池中添加流动性或移除流动性。
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <section className="flex flex-col flex-1">
        <div className="bg-gray-50 border-t border-gray-200 pt-8 pb-20 min-h-screen">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：控制区域 */}
              <div>
                <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Tab切换组件 */}
                      <div className="flex bg-gray-100 rounded-xl p-1">
                        <button
                          onClick={() => setActiveTab("add")}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                            activeTab === "add"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          添加流动性
                        </button>
                        <button
                          onClick={() => setActiveTab("remove")}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                            activeTab === "remove"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Minus className="w-4 h-4" />
                          移除流动性
                        </button>
                      </div>

                      {/* Tab内容区域 */}
                      {activeTab === "add" && (
                        <AddLiquidity
                          token0={token0}
                          token1={token1}
                          pairInfoLoading={pairInfoLoading}
                          onSuccess={handleAddLiquiditySuccess}
                        />
                      )}

                      {/* 移除流动性内容 */}
                      {activeTab === "remove" && (
                        <RemoveLiquidity
                          token0={token0}
                          token1={token1}
                          pairAddress={pairAddress}
                          pairInfo={pairInfo}
                          pairInfoLoading={pairInfoLoading}
                          positionData={positionData}
                          onSuccess={handleRemoveLiquiditySuccess}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右侧：持仓信息区域 */}
              <div>
                <UserPositionCard
                  pairAddress={pairAddress}
                  token0={token0}
                  token1={token1}
                  pairInfoLoading={pairInfoLoading}
                  onConnectWallet={() => open()}
                  onPositionDataChange={setPositionData}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
