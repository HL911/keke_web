"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { useAccount } from "wagmi";
import { Token } from "../../../components/TokenSelector";

// 格式化数字
const formatNumber = (value: number, decimals: number = 2): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(decimals) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(decimals) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(decimals) + "K";
  return value.toFixed(decimals);
};

// 持仓数据类型定义
export interface PositionData {
  token0Balance: string;
  token1Balance: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Price: number;
  token1Price: number;
  totalValueUSD: number;
  token0LogoURI: string;
  token1LogoURI: string;
}

// 组件 Props 接口
interface UserPositionCardProps {
  pairAddress: string;
  token0: Token | null;
  token1: Token | null;
  pairInfoLoading: boolean;
  onConnectWallet: () => void;
  onPositionUpdate?: () => void; // 持仓更新时的回调
  onPositionDataChange?: (
    positionData: (PositionData & { lpTokenBalance: string }) | null
  ) => void; // 持仓数据变化时的回调
}

export default function UserPositionCard({
  pairAddress,
  token0,
  token1,
  pairInfoLoading,
  onConnectWallet,
  onPositionUpdate,
  onPositionDataChange,
}: UserPositionCardProps) {
  const { isConnected, address } = useAccount();

  // 持仓数据状态管理
  const [positionData, setPositionData] = useState<PositionData | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  // 获取用户持仓数据
  const fetchPositionData = async () => {
    if (!isConnected || !address) return;

    setPositionLoading(true);
    setPositionError(null);

    try {
      const response = await fetch(
        `/api/positions?user=${address}&pair=${pairAddress}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        const position = result.data;
        const token0Value =
          parseFloat(position.token0_balance || "0") * (token0?.price || 0);
        const token1Value =
          parseFloat(position.token1_balance || "0") * (token1?.price || 0);

        const newPositionData = {
          token0Balance: position.token0_balance || "0",
          token1Balance: position.token1_balance || "0",
          token0Symbol: token0?.symbol || "Token0",
          token1Symbol: token1?.symbol || "Token1",
          token0Price: token0?.price || 0,
          token1Price: token1?.price || 0,
          totalValueUSD: token0Value + token1Value,
          token0LogoURI: token0?.logoURI || "",
          token1LogoURI: token1?.logoURI || "",
          lpTokenBalance: position.lp_balance || "0",
        };

        setPositionData(newPositionData);

        // 通知父组件持仓数据变化
        if (onPositionDataChange) {
          onPositionDataChange(newPositionData);
        }
      } else {
        setPositionData(null);
        // 通知父组件持仓数据为 null
        if (onPositionDataChange) {
          onPositionDataChange(null);
        }
      }
    } catch (error) {
      console.error("获取持仓数据失败:", error);
      setPositionError("获取持仓数据失败");
      setPositionData(null);
      // 通知父组件持仓数据为 null
      if (onPositionDataChange) {
        onPositionDataChange(null);
      }
    } finally {
      setPositionLoading(false);
    }
  };

  // 监听连接状态和地址变化，获取持仓数据
  useEffect(() => {
    if (isConnected && address) {
      fetchPositionData();
    } else {
      setPositionData(null);
    }
  }, [isConnected, address, pairAddress]);

  // 监听 token 变化，更新持仓数据中的代币信息
  useEffect(() => {
    if (positionData && token0 && token1) {
      setPositionData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          token0Symbol: token0.symbol || prev.token0Symbol,
          token1Symbol: token1.symbol || prev.token1Symbol,
          token0Price: token0.price || prev.token0Price,
          token1Price: token1.price || prev.token1Price,
          token0LogoURI: token0.logoURI || prev.token0LogoURI,
          token1LogoURI: token1.logoURI || prev.token1LogoURI,
        };
      });
    }
  }, [token0, token1]);

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardContent className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">我的持仓</h4>

        {!isConnected ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-2">请连接钱包查看持仓</p>
            <Button
              onClick={onConnectWallet}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              连接钱包
            </Button>
          </div>
        ) : positionLoading || pairInfoLoading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
            <p className="text-gray-500 text-sm">加载持仓数据中...</p>
          </div>
        ) : positionError ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-500 text-sm mb-2">{positionError}</p>
            <Button
              onClick={fetchPositionData}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              重试
            </Button>
          </div>
        ) : positionData &&
          (parseFloat(positionData.token0Balance) > 0 ||
            parseFloat(positionData.token1Balance) > 0) ? (
          <div>
            {/* 总价值 */}
            <div className="mb-6">
              <p className="text-2xl font-bold text-gray-900">
                ${formatNumber(positionData.totalValueUSD)}
              </p>
              <p className="text-sm text-gray-500">总价值</p>
            </div>

            {/* 代币持仓列表 */}
            <div className="space-y-3">
              <p className="text-sm text-gray-500 font-medium">Staked</p>

              {/* 代币A持仓 */}
              {parseFloat(positionData.token0Balance) > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      {positionData.token0LogoURI ? (
                        <img
                          src={positionData.token0LogoURI}
                          alt={positionData.token0Symbol}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {positionData.token0Symbol?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {positionData.token0Symbol}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {parseFloat(positionData.token0Balance).toFixed(6)}
                    </p>
                    <p className="text-sm text-gray-500">
                      $
                      {formatNumber(
                        parseFloat(positionData.token0Balance) *
                          positionData.token0Price
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* 代币B持仓 */}
              {parseFloat(positionData.token1Balance) > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      {positionData.token1LogoURI ? (
                        <img
                          src={positionData.token1LogoURI}
                          alt={positionData.token1Symbol}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-600 font-semibold text-sm">
                          {positionData.token1Symbol?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {positionData.token1Symbol}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {parseFloat(positionData.token1Balance).toFixed(6)}
                    </p>
                    <p className="text-sm text-gray-500">
                      $
                      {formatNumber(
                        parseFloat(positionData.token1Balance) *
                          positionData.token1Price
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Info className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">暂无持仓</p>
            <p className="text-gray-400 text-xs mt-1">
              添加流动性后，您的持仓将显示在这里
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
