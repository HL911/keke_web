"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Settings,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPositionWithTokens } from "@/app/api/utils/db-core";

/**
 * 带价值计算的用户持仓
 */
export interface PositionWithValue extends UserPositionWithTokens {
  totalValueUSD: number;
  token0ValueUSD: number;
  token1ValueUSD: number;
  share: number; // 占池子的份额百分比
  unrealizedPnL?: number; // 未实现盈亏
  fees24h?: number; // 24小时收益
}

interface PositionsListProps {
  positions: PositionWithValue[];
  loading: boolean;
  onAddLiquidity: (position?: PositionWithValue) => void;
  onRemoveLiquidity?: (position: PositionWithValue) => void;
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
 * 用户持仓列表组件
 * 采用表格形式展示持仓信息
 */
export function PositionsList({
  positions,
  loading,
  onAddLiquidity,
}: PositionsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "pnl" | "yield">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterBy, setFilterBy] = useState<
    "all" | "profitable" | "loss" | "large"
  >("all");

  // 处理管理按钮点击
  const handleManage = (position: PositionWithValue) => {
    router.push(`/liquidity/${position.pair_address}/manage`);
  };

  // 搜索过滤
  const filteredPositions = positions.filter((position) => {
    const matchesSearch =
      position.token0_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.token1_symbol.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = (() => {
      switch (filterBy) {
        case "profitable":
          return position.unrealizedPnL && position.unrealizedPnL > 0;
        case "loss":
          return position.unrealizedPnL && position.unrealizedPnL < 0;
        case "large":
          return position.totalValueUSD && position.totalValueUSD > 1000;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  // 排序
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "value":
        comparison = (b.totalValueUSD || 0) - (a.totalValueUSD || 0);
        break;
      case "pnl":
        comparison = (b.unrealizedPnL || 0) - (a.unrealizedPnL || 0);
        break;
      case "yield":
        comparison = (b.fees24h || 0) - (a.fees24h || 0);
        break;
    }
    return sortOrder === "desc" ? comparison : -comparison;
  });

  const handleSort = (column: "value" | "pnl" | "yield") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* 搜索栏骨架屏 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-100 rounded animate-pulse"></div>
          <div className="flex gap-2">
            <div className="w-20 h-10 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>

        {/* 表格骨架屏 */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">
          <div className="h-12 bg-gray-50 animate-pulse"></div>
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="h-16 bg-white border-t border-gray-100 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 表格 */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 hover:bg-gray-50">
              <TableHead className="text-gray-700 font-medium">名称</TableHead>
              <TableHead className="text-gray-700 font-medium">
                价格区间
              </TableHead>
              <TableHead className="text-gray-700 font-medium">
                <button
                  onClick={() => handleSort("value")}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  仓位规模
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead className="text-gray-700 font-medium">
                <button
                  onClick={() => handleSort("yield")}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  未领取手续费
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead className="text-gray-700 font-medium text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl mb-4">📊</div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        暂无流动性持仓
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {searchTerm || filterBy !== "all"
                          ? "未找到符合您搜索条件的头寸。请尝试调整筛选器。"
                          : "创建您的第一个流动性持仓开始赚取手续费。"}
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
              sortedPositions.map((position) => {
                const pnl = position.unrealizedPnL || 0;
                const isProfitable = pnl > 0;

                return (
                  <TableRow
                    key={position.pair_address}
                    className="border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {/* Pool Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {position.token0_symbol}/{position.token1_symbol}
                          </div>
                          <div className="text-xs text-gray-500">
                            V2 • {formatPercentage(position.share || 0, 4)} of
                            pool
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          活跃
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Price Range */}
                    <TableCell>
                      <div className="text-gray-900 font-medium">全区间</div>
                      <div className="text-xs text-gray-500">0 ↔ ∞</div>
                    </TableCell>

                    {/* Position Size */}
                    <TableCell>
                      <div className="text-gray-900 font-medium">
                        ${formatNumber(position.totalValueUSD || 0)}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>
                          {position.token0_balance} {position.token0_symbol}
                        </div>
                        <div>
                          {position.token1_balance} {position.token1_symbol}
                        </div>
                      </div>
                    </TableCell>

                    {/* Unclaimed fees */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isProfitable ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                        <span
                          className={`font-medium ${
                            isProfitable ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isProfitable ? "+" : ""}$
                          {formatNumber(Math.abs(pnl))}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        24小时: +${formatNumber(position.fees24h || 0)}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManage(position)}
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        管理
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页信息 */}
      {sortedPositions.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 pt-4">
          <div>
            显示 {Math.min(10, sortedPositions.length)} 个，共{" "}
            {sortedPositions.length} 个头寸
          </div>
          <div className="flex items-center gap-3">
            <span>每页显示</span>
            <select className="bg-white border border-gray-300 text-gray-700 rounded px-2 py-1 text-sm">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>第 1 页，共 {Math.ceil(sortedPositions.length / 10)} 页</span>
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
