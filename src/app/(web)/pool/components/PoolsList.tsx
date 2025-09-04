"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowUpDown, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradingPairWithTokens } from "@/app/api/utils/db-core";

/**
 * 扩展的流动性池信息
 */
export interface PoolWithTokens extends TradingPairWithTokens {
  apy?: number;
  volume7d?: string;
  feesGenerated24h?: string;
  priceChange24h?: number;
  liquidityChange24h?: number;
}

interface PoolsListProps {
  pools: PoolWithTokens[];
  loading: boolean;
  onAddLiquidity: (pool?: PoolWithTokens) => void;
  onSearch?: (params: {
    search: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => void;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * 格式化数字显示
 */
const formatNumber = (value: number, decimals: number = 2): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(decimals) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(decimals) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(decimals) + "K";
  return value.toFixed(decimals);
};

/**
 * 格式化百分比
 */
const formatPercentage = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals) + "%";
};

/**
 * 流动性池列表组件
 * 采用表格形式展示池子信息
 */
export function PoolsList({
  pools,
  loading,
  onAddLiquidity,
  onSearch,
  error,
  onRetry,
}: PoolsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"tvl_usd" | "volume_24h" | "apy">(
    "tvl_usd"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isSearching, setIsSearching] = useState(false);

  // 防抖搜索
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (
        searchValue: string,
        sortByValue: string,
        sortOrderValue: "asc" | "desc"
      ) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (onSearch) {
            setIsSearching(true);
            onSearch({
              search: searchValue,
              sortBy: sortByValue,
              sortOrder: sortOrderValue,
            });
            // 搜索完成后重置搜索状态
            setTimeout(() => setIsSearching(false), 500);
          }
        }, 300); // 300ms 防抖延迟
      };
    })(),
    [onSearch]
  );

  // 当搜索条件改变时触发 API 搜索
  useEffect(() => {
    if (onSearch) {
      debouncedSearch(searchTerm, sortBy, sortOrder);
    }
  }, [searchTerm, sortBy, sortOrder, debouncedSearch]);

  // 本地数据处理
  const filteredPools = pools;

  // 排序（如果使用 API 搜索，排序主要在服务端完成）
  const sortedPools = onSearch
    ? filteredPools
    : [...filteredPools].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "tvl_usd":
            comparison = b.tvl_usd - a.tvl_usd;
            break;
          case "volume_24h":
            comparison =
              parseFloat(b.volume_24h || "0") - parseFloat(a.volume_24h || "0");
            break;
          case "apy":
            comparison = (b.apy || 0) - (a.apy || 0);
            break;
        }
        return sortOrder === "desc" ? comparison : -comparison;
      });

  const handleSort = (column: "tvl_usd" | "volume_24h" | "apy") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // 错误状态显示
  if (error && !loading) {
    return (
      <div className="space-y-6">
        {/* 搜索栏 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索流动性池..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
          </div>
        </div>

        {/* 错误显示 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">😓</div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            数据加载失败
          </h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              重试加载
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* 搜索栏骨架屏 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="h-10 bg-gray-200 rounded-lg w-full max-w-md animate-pulse"></div>
        </div>

        {/* 表格骨架屏 */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="h-12 bg-gray-50 animate-pulse"></div>
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-16 bg-white border-t border-gray-200 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索流动性池..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {(isSearching || loading) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-gray-50 border-gray-200">
              <TableHead className="text-gray-700 font-medium pl-6">
                名称
              </TableHead>
              <TableHead className="text-gray-700 font-medium">
                <button
                  onClick={() => handleSort("apy")}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  APR
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </TableHead>
              <TableHead className="text-gray-700 font-medium">
                <button
                  onClick={() => handleSort("tvl_usd")}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  锁定总价值
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </TableHead>
              <TableHead className="text-gray-700 font-medium">
                <button
                  onClick={() => handleSort("volume_24h")}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  24小时交易额
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </TableHead>
              <TableHead className="text-gray-700 font-medium text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 pl-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl mb-4">🏊‍♀️</div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        暂无流动性池
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {searchTerm
                          ? "未找到符合您搜索条件的池子。"
                          : "创建第一个流动性池开始赚取手续费。"}
                      </p>
                      <Button
                        onClick={() => onAddLiquidity()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                      >
                        <Plus className="w-4 h-4" />
                        添加流动性
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedPools.map((pool) => (
                <TableRow
                  key={pool.pair_address}
                  className="hover:bg-gray-50 transition-colors border-gray-200"
                >
                  {/* Pool Name */}
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {pool.token0_symbol}/{pool.token1_symbol}
                        </div>
                        <div className="text-xs text-gray-500">0.3% 手续费</div>
                      </div>
                      {/* {pool.apy && pool.apy > 50 && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          热门
                        </Badge>
                      )} */}
                    </div>
                  </TableCell>

                  {/* APR */}
                  <TableCell>
                    <div className="text-green-600 font-medium">
                      {pool.apy ? `${formatPercentage(pool.apy)}` : "0.00%"}
                    </div>
                    <div className="text-xs text-gray-500">年化收益率</div>
                  </TableCell>

                  {/* 锁定总价值 (TVL) */}
                  <TableCell>
                    <div className="text-gray-900 font-medium">
                      ${formatNumber(pool.tvl_usd)}
                    </div>
                    <div className="text-xs text-gray-500">总锁定价值</div>
                  </TableCell>

                  {/* 24小时交易额 */}
                  <TableCell>
                    <div className="text-gray-900 font-medium">
                      ${formatNumber(parseFloat(pool.volume_24h || "0"))}
                    </div>
                    <div className="text-xs text-gray-500">24h 交易量</div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => onAddLiquidity(pool)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4" />
                        添加流动性
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页信息 */}
      {sortedPools.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 pt-4">
          <div>
            显示 {Math.min(10, sortedPools.length)} 个，共 {sortedPools.length}{" "}
            个池子
          </div>
          <div className="flex items-center gap-3">
            <span>每页显示</span>
            <select className="bg-white border border-gray-300 text-gray-700 rounded px-2 py-1 text-sm">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>第 1 页，共 {Math.ceil(sortedPools.length / 10)} 页</span>
            <div className="flex items-center gap-1">
              <button
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled
              >
                ‹‹
              </button>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled
              >
                ‹
              </button>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled
              >
                ›
              </button>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled
              >
                ››
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
