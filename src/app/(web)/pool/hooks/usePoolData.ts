"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { PoolWithTokens } from "../components/PoolsList";
import { PositionWithValue } from "../components/PositionsList";

interface UsePoolDataReturn {
  // 池子数据
  pools: PoolWithTokens[];
  positions: PositionWithValue[];

  // 加载状态
  loading: boolean;
  error: string | null;

  // 操作函数
  refresh: () => Promise<void>;
  fetchPools: (params?: {
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    page?: number;
  }) => Promise<void>;
  fetchPositions: (userAddress?: string) => Promise<void>;
}

interface FetchPoolsParams {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  page?: number;
}

/**
 * 流动性池数据管理 Hook
 *
 * 功能包括：
 * - 获取流动性池列表（支持分页、搜索、排序）
 * - 获取用户持仓信息
 * - 数据刷新
 * - 错误处理和加载状态管理
 */
export function usePoolData(): UsePoolDataReturn {
  const { address } = useAccount();

  // 状态管理
  const [pools, setPools] = useState<PoolWithTokens[]>([]);
  const [positions, setPositions] = useState<PositionWithValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取流动性池数据
   */
  const fetchPools = useCallback(async (params: FetchPoolsParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();

      // 设置查询参数
      if (params.search) searchParams.set("search", params.search);
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params.limit) searchParams.set("limit", params.limit.toString());
      if (params.page) searchParams.set("page", params.page.toString());

      const response = await fetch(`/api/pools?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error || "获取池子数据失败");
      }

      setPools(result.data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "获取池子数据失败";
      setError(errorMessage);
      console.error("获取池子数据失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取用户持仓数据
   */
  const fetchPositions = useCallback(
    async (userAddress?: string) => {
      if (!userAddress && !address) {
        setPositions([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const targetAddress = userAddress || address;
        const response = await fetch(`/api/positions?user=${targetAddress}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "获取持仓数据失败");
        }

        setPositions(result.data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "获取持仓数据失败";
        setError(errorMessage);
        console.error("获取持仓数据失败:", err);
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  /**
   * 刷新所有数据
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行获取池子数据和持仓数据
      await Promise.all([
        fetchPools(),
        address ? fetchPositions() : Promise.resolve(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "刷新数据失败";
      setError(errorMessage);
      console.error("刷新数据失败:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchPools, fetchPositions, address]);

  // 初始化数据加载
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // 当用户地址变化时，重新获取持仓数据
  useEffect(() => {
    if (address) {
      fetchPositions();
    } else {
      setPositions([]);
    }
  }, [address, fetchPositions]);

  return {
    pools,
    positions,
    loading,
    error,
    refresh,
    fetchPools,
    fetchPositions,
  };
}
