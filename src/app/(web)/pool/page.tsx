"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PoolsList, PoolWithTokens } from "./components/PoolsList";
import { PositionsList } from "./components/PositionsList";
import { usePoolData } from "./hooks/usePoolData";

/**
 * 流动性池管理页面
 *
 * 页面结构：
 * 1. 页面头部 - 标题和主要操作按钮
 * 2. Tab区域 - 流动性池列表和用户持仓
 */
export default function PoolPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { pools, positions, loading, error, refresh, fetchPools } =
    usePoolData();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * 处理添加流动性操作
   */
  const handleAddLiquidity = (pool?: PoolWithTokens) => {
    // 如果传入了pool参数，说明是从列表中的特定池子跳转
    if (pool) {
      // 可以在URL中传递token信息，预填充表单
      router.push(
        `/liquidity/add?token0=${pool.token0_address}&token1=${pool.token1_address}`
      );
    } else {
      // 直接跳转到添加流动性页面
      router.push("/liquidity/add");
    }
  };

  /**
   * 处理搜索和过滤
   */
  const handleSearch = useCallback(
    async (params: {
      search: string;
      sortBy: string;
      sortOrder: "asc" | "desc";
    }) => {
      try {
        await fetchPools({
          search: params.search || undefined,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          limit: 50,
          page: 1,
        });
      } catch (error) {
        console.error("搜索池子失败:", error);
      }
    },
    [fetchPools]
  );

  // 计算综合加载状态
  const isDataLoading = loading;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header - SushiSwap Style */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                管理流动性资金池
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                您可以在连接的网络上调整和领取流动性持仓奖励。
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAddLiquidity()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                创建流动性池
              </button>
              <button
                onClick={() => handleAddLiquidity()}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                添加流动性
              </button>
            </div>
          </div>
        </div>

        {/* Content Area with shadcn/ui Tabs */}
        {!isConnected ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              连接钱包
            </h3>
            <p className="text-sm text-gray-600">
              连接您的钱包以查看流动性池和我的持仓
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              数据加载失败
            </h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isRefreshing}
            >
              {isRefreshing ? "刷新中..." : "重试"}
            </button>
          </div>
        ) : (
          <Tabs defaultValue="pools" className="w-full">
            <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-gray-100/80 p-0.5 text-gray-600 w-fit shadow-sm border border-gray-200/60">
              <TabsTrigger
                value="pools"
                className="relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:bg-white/50 hover:text-gray-800 text-gray-600"
              >
                流动性池
              </TabsTrigger>
              <TabsTrigger
                value="positions"
                className="relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:bg-white/50 hover:text-gray-800 text-gray-600"
              >
                我的持仓
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pools" className="mt-6">
              <PoolsList
                pools={pools}
                loading={isDataLoading}
                onAddLiquidity={handleAddLiquidity}
                onSearch={handleSearch}
                error={error}
                onRetry={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="positions" className="mt-6">
              <PositionsList
                positions={positions}
                loading={isDataLoading}
                onAddLiquidity={(position) => handleAddLiquidity()}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
