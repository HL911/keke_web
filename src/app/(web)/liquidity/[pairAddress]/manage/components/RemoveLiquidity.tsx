"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Minus, Wallet, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { Token } from "../../../components/TokenSelector";
import { useRemoveLiquidity } from "@/app/(web)/liquidity/hooks/useRemoveLiquidity";
import { PairInfo } from "@/hooks/liquidity/usePairInfo";
import { PositionData } from "./UserPositionCard";

interface RemoveLiquidityProps {
  token0: Token | null;
  token1: Token | null;
  pairAddress: string;
  pairInfo: PairInfo | null;
  pairInfoLoading: boolean;
  positionData: (PositionData & { lpTokenBalance: string }) | null;
  onSuccess?: () => void;
}

export default function RemoveLiquidity({
  token0,
  token1,
  pairAddress,
  pairInfo,
  pairInfoLoading,
  positionData,
  onSuccess,
}: RemoveLiquidityProps) {
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  // 使用移除流动性hook
  const { state, actions } = useRemoveLiquidity(
    token0,
    token1,
    pairAddress,
    pairInfo,
    positionData
  );

  // 百分比预设选项
  const percentagePresets = [25, 50, 75, 100];

  // 处理移除流动性成功
  const handleRemoveLiquiditySuccess = async () => {
    try {
      await actions.removeLiquidity();
      alert("流动性移除成功！");
      onSuccess?.();
    } catch (error) {
      // 错误已经在hook中处理
    }
  };

  // 处理百分比预设点击
  const handlePercentagePreset = (percentage: number) => {
    actions.setRemovePercentage(percentage);
  };

  // 处理滑块变化
  const handleSliderChange = (value: number[]) => {
    actions.setRemovePercentage(value[0]);
  };

  // 处理自定义百分比输入
  const handleCustomPercentageChange = (value: string) => {
    actions.setCustomPercentage(value);
  };

  // 显示loading状态
  if (pairInfoLoading || !positionData) {
    return (
      <div className="space-y-6">
        {/* Loading标题 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            移除流动性
          </h3>
          <p className="text-gray-600 text-sm">正在加载数据...</p>
        </div>

        {/* Loading卡片 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600 text-sm">正在获取流动性数据...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 移除流动性标题 */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">移除流动性</h3>
        <p className="text-gray-600 text-sm">将您的LP代币兑换回基础代币</p>
      </div>

      {/* 移除百分比设置 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">移除数量</h4>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="0"
              value={state.customPercentage || state.removePercentage}
              onChange={(e) => handleCustomPercentageChange(e.target.value)}
              className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-right"
              min="0"
              max="100"
              step="0.1"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>

        {/* 百分比滑块 */}
        <div className="mb-4">
          <div className="relative px-2">
            <Slider
              value={[state.removePercentage]}
              onValueChange={handleSliderChange}
              max={100}
              step={0.1}
              className="w-full [&_.slider-track]:bg-gray-300 [&_.slider-track]:h-2 [&_.slider-track]:rounded-full [&_.slider-track]:border [&_.slider-track]:border-gray-200 [&_.slider-range]:bg-blue-500 [&_.slider-range]:h-2 [&_.slider-range]:rounded-full [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_[role=slider]]:shadow-lg [&_[role=slider]]:focus:outline-none [&_[role=slider]]:focus:ring-2 [&_[role=slider]]:focus:ring-blue-300 [&_[role=slider]]:focus:ring-opacity-50"
            />
          </div>
        </div>

        {/* 百分比预设按钮 */}
        <div className="flex gap-2 mb-4">
          {percentagePresets.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePercentagePreset(preset)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                state.removePercentage === preset
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-white border border-gray-200 rounded-xl">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 text-center">
              您将收到
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    {state.positionData?.token0LogoURI ? (
                      <img
                        src={state.positionData.token0LogoURI}
                        alt={state.positionData.token0Symbol}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-semibold text-xs">
                        {state.positionData?.token0Symbol?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {state.positionData?.token0Symbol}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {parseFloat(
                      state.removeAmounts?.token0Amount || "0"
                    ).toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${state.removeAmounts?.token0ValueUSD.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    {state.positionData?.token1LogoURI ? (
                      <img
                        src={state.positionData.token1LogoURI}
                        alt={state.positionData.token1Symbol}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-600 font-semibold text-xs">
                        {state.positionData?.token1Symbol?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {state.positionData?.token1Symbol}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {parseFloat(
                      state.removeAmounts?.token1Amount || "0"
                    ).toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${state.removeAmounts?.token1ValueUSD.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">总计</span>
              <span className="text-sm font-semibold text-gray-900">
                ${state.removeAmounts?.totalValueUSD.toFixed(2)}
              </span>
            </div>

            {/* 至少收到提示 */}
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                您将收到至少: {state.removeAmounts?.totalValueUSD.toFixed(2)}{" "}
                USD
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">操作失败</span>
          </div>
          <p className="text-sm text-red-500 mt-1">{state.error}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-4">
        {!isConnected ? (
          <Button
            onClick={() => open()}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base"
            size="lg"
          >
            <Wallet className="w-5 h-5 mr-2" />
            连接钱包
          </Button>
        ) : !state.isValidInput ? (
          <Button
            disabled
            className="w-full h-14 bg-gray-200 text-gray-500 font-semibold rounded-xl text-base cursor-not-allowed"
            size="lg"
          >
            无流动性持仓
          </Button>
        ) : state.removePercentage === 0 ? (
          <Button
            disabled
            className="w-full h-14 bg-gray-200 text-gray-500 font-semibold rounded-xl text-base cursor-not-allowed"
            size="lg"
          >
            请选择移除数量
          </Button>
        ) : !state.isApproved ? (
          <Button
            onClick={actions.approveLPToken}
            disabled={state.isApproving}
            className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-base"
            size="lg"
          >
            {state.isApproving ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                授权中...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                授权LP代币
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleRemoveLiquiditySuccess}
            disabled={state.isLoading}
            className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-base"
            size="lg"
          >
            {state.isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                移除流动性中...
              </>
            ) : (
              <>
                <Minus className="w-5 h-5 mr-2" />
                移除流动性
              </>
            )}
          </Button>
        )}

        {/* 提示信息 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">移除流动性说明</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 移除流动性后，您将收到相应比例的基础代币</li>
                <li>• 移除的流动性将不再产生交易手续费收益</li>
                <li>• 请确保滑点设置合理，避免交易失败</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
