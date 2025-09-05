import { useState, useCallback, useRef, useEffect } from "react";
import { useReadContract, usePublicClient } from "wagmi";

interface UpdateReserveParams {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Decimals: number;
  token1Decimals: number;
}

interface BatchUpdateReserveParams {
  pairs: UpdateReserveParams[];
}

interface UpdateReserveResult {
  success: boolean;
  data?: {
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    pairAddress: string;
  };
  error?: string;
}

interface BatchUpdateResult {
  success: boolean;
  results: UpdateReserveResult[];
  totalSuccess: number;
  totalFailed: number;
}

interface UseUpdatePariReserveReturn {
  updateReserves: (params: UpdateReserveParams) => Promise<UpdateReserveResult>;
  batchUpdateReserves: (
    params: BatchUpdateReserveParams
  ) => Promise<BatchUpdateResult>;
  startAutoUpdate: (params: UpdateReserveParams, intervalMs?: number) => void;
  stopAutoUpdate: () => void;
  isUpdating: boolean;
  isAutoUpdating: boolean;
  error: string | null;
}

export function useUpdatePariReserve(): UseUpdatePariReserveReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();
  const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateReserves = useCallback(
    async ({
      pairAddress,
      token0Address,
      token1Address,
      token0Decimals,
      token1Decimals,
    }: UpdateReserveParams): Promise<UpdateReserveResult> => {
      if (!pairAddress || !publicClient) {
        return {
          success: false,
          error: "缺少交易对地址或客户端连接",
        };
      }

      setIsUpdating(true);
      setError(null);

      try {
        // 1. 从合约获取储备量
        const reserves = await publicClient.readContract({
          address: pairAddress as `0x${string}`,
          abi: [
            {
              name: "getReserves",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [
                { name: "reserve0", type: "uint112" },
                { name: "reserve1", type: "uint112" },
                { name: "blockTimestampLast", type: "uint32" },
              ],
            },
          ],
          functionName: "getReserves",
        });

        const [reserve0, reserve1] = reserves as [bigint, bigint, number];

        // 2. 获取总供应量
        const totalSupply = await publicClient.readContract({
          address: pairAddress as `0x${string}`,
          abi: [
            {
              name: "totalSupply",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "totalSupply",
        });

        // 3. 将原始数据转换为字符串格式
        const reserve0String = reserve0.toString();
        const reserve1String = reserve1.toString();
        const totalSupplyString = totalSupply.toString();

        // 4. 调用API更新数据库
        const response = await fetch("/api/pools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pairAddress,
            token0Address,
            token1Address,
            reserve0: reserve0String,
            reserve1: reserve1String,
            totalSupply: totalSupplyString,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "更新储备量失败");
        }

        return {
          success: true,
          data: {
            reserve0: reserve0String,
            reserve1: reserve1String,
            totalSupply: totalSupplyString,
            pairAddress,
          },
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "未知错误";
        setError(errorMessage);
        console.error("更新储备量失败:", err);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [publicClient]
  );

  // 批量更新储备量
  const batchUpdateReserves = useCallback(
    async ({ pairs }: BatchUpdateReserveParams): Promise<BatchUpdateResult> => {
      setIsUpdating(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          pairs.map((pair) => updateReserves(pair))
        );

        const updateResults: UpdateReserveResult[] = results.map((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          } else {
            return {
              success: false,
              error: result.reason?.message || "更新失败",
            };
          }
        });

        const totalSuccess = updateResults.filter((r) => r.success).length;
        const totalFailed = updateResults.length - totalSuccess;

        return {
          success: totalSuccess > 0,
          results: updateResults,
          totalSuccess,
          totalFailed,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "批量更新失败";
        setError(errorMessage);
        console.error("批量更新储备量失败:", err);

        return {
          success: false,
          results: [],
          totalSuccess: 0,
          totalFailed: pairs.length,
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [updateReserves]
  );

  // 开始自动更新
  const startAutoUpdate = useCallback(
    (
      params: UpdateReserveParams,
      intervalMs: number = 30000 // 默认30秒
    ) => {
      if (autoUpdateIntervalRef.current) {
        clearInterval(autoUpdateIntervalRef.current);
      }

      setIsAutoUpdating(true);
      setError(null);

      // 立即执行一次
      updateReserves(params).catch(console.error);

      // 设置定时器
      autoUpdateIntervalRef.current = setInterval(() => {
        updateReserves(params).catch(console.error);
      }, intervalMs);
    },
    [updateReserves]
  );

  // 停止自动更新
  const stopAutoUpdate = useCallback(() => {
    if (autoUpdateIntervalRef.current) {
      clearInterval(autoUpdateIntervalRef.current);
      autoUpdateIntervalRef.current = null;
    }
    setIsAutoUpdating(false);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoUpdateIntervalRef.current) {
        clearInterval(autoUpdateIntervalRef.current);
      }
    };
  }, []);

  return {
    updateReserves,
    batchUpdateReserves,
    startAutoUpdate,
    stopAutoUpdate,
    isUpdating,
    isAutoUpdating,
    error,
  };
}
