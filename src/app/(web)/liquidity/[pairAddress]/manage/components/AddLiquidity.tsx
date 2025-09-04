"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Info, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { Token } from "../../../components/TokenSelector";
import { AmountInput } from "../../../components/AmountInput";
import { useAddLiquidity } from "../../../hooks/useAddLiquidity";

interface AddLiquidityProps {
  token0: Token | null;
  token1: Token | null;
  pairInfoLoading: boolean;
  onSuccess?: () => void;
}

export default function AddLiquidity({
  token0,
  token1,
  pairInfoLoading,
  onSuccess,
}: AddLiquidityProps) {
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  // 使用添加流动性hook，传入父组件的token信息
  const { state, actions } = useAddLiquidity(token0, token1);

  // 滑点预设选项
  const slippagePresets = ["0.1", "0.5", "1.0", "3.0"];

  // 处理添加流动性成功
  const handleAddLiquiditySuccess = async () => {
    try {
      await actions.handleAddLiquidity();
      alert("流动性添加成功！");
      onSuccess?.();
    } catch (error) {
      // 错误已经在hook中处理
    }
  };

  // 如果正在加载配对信息，显示加载页面
  if (pairInfoLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">添加流动性</h2>
          <p className="text-gray-600">正在加载配对信息，请稍候...</p>
        </div>

        {/* 加载状态卡片 */}
        <Card className="bg-white border border-gray-200 rounded-xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* 加载动画 */}
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>

              {/* 加载文本 */}
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  正在加载配对信息
                </h3>
                <p className="text-gray-600 text-sm">
                  请稍候，我们正在获取代币配对的最新信息
                </p>
              </div>

              {/* 加载步骤指示器 */}
              <div className="flex items-center space-x-2 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">获取代币信息</span>
                </div>
                <div className="w-4 h-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-400">计算价格比率</span>
                </div>
                <div className="w-4 h-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-400">准备交易界面</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <Card className="bg-blue-50 border border-blue-200 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-2">正在准备交易环境</p>
                <ul className="space-y-1 text-sm text-blue-600">
                  <li>• 获取代币的实时价格信息</li>
                  <li>• 计算最优的流动性比例</li>
                  <li>• 准备交易参数和滑点设置</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* 添加流动性 - 代币选择区域 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              代币数量
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              为当前交易对添加流动性，输入您要存入的代币数量
            </p>

            <div className="space-y-1">
              {/* 第一个代币输入 */}
              <AmountInput
                value={state.amountA}
                onChange={actions.setAmountA}
                selectedToken={state.tokenA}
                onTokenSelect={actions.handleTokenASelect}
                showBalance={isConnected}
                showUSDValue={true}
                excludeTokens={state.tokenB ? [state.tokenB.address] : []}
                className="border border-gray-200 bg-white rounded-xl hover:border-gray-300 transition-colors"
                onFocus={() => actions.setActiveInput("A")}
                enableTokenSelection={false}
              />

              {/* 第二个代币输入 */}
              <AmountInput
                value={state.amountB}
                onChange={actions.setAmountB}
                selectedToken={state.tokenB}
                onTokenSelect={actions.handleTokenBSelect}
                showBalance={isConnected}
                showUSDValue={true}
                excludeTokens={state.tokenA ? [state.tokenA.address] : []}
                className="border border-gray-200 bg-white rounded-xl hover:border-gray-300 transition-colors"
                onFocus={() => actions.setActiveInput("B")}
                enableTokenSelection={false}
              />
            </div>
          </div>

          {/* 滑点区域 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              滑点设置
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              设置滑点容忍度，滑点越大交易越容易成功但价格偏差越大
            </p>

            {/* 滑点预设选项 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                滑点设置
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                设置滑点容忍度，滑点越大交易越容易成功但价格偏差越大
              </p>

              {/* 滑点预设选项 */}
              <div className="mb-4">
                <div className="flex gap-2 items-center">
                  {slippagePresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => actions.handleSlippagePreset(preset)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        state.slippage === preset && !state.customSlippage
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}

                  {/* 自定义滑点输入 */}
                  <div className="relative w-32">
                    <input
                      type="number"
                      value={state.customSlippage}
                      onChange={(e) =>
                        actions.handleCustomSlippageChange(e.target.value)
                      }
                      placeholder="自定义"
                      className="w-full px-3 py-2 pr-6 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="50"
                      step="0.1"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                {/* 滑点警告 */}
                {((state.customSlippage &&
                  parseFloat(state.customSlippage) > 5) ||
                  (!state.customSlippage &&
                    parseFloat(state.slippage) > 5)) && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-xs">
                      ⚠️ 滑点过高，可能导致较大的价格偏差
                    </p>
                  </div>
                )}
              </div>

              {/* 价格和池信息 */}
              {state.tokenA && state.tokenB && state.priceRatio && (
                <Card className="bg-gray-50 border-0 rounded-xl mb-6">
                  <CardContent className="p-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          1 {state.tokenA.symbol}
                        </span>
                        <span className="font-medium text-gray-900">
                          {state.priceRatio.ratioAtoB.toFixed(6)}{" "}
                          {state.tokenB.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          1 {state.tokenB.symbol}
                        </span>
                        <span className="font-medium text-gray-900">
                          {state.priceRatio.ratioBtoA.toFixed(6)}{" "}
                          {state.tokenA.symbol}
                        </span>
                      </div>
                      <div className="h-px bg-gray-200"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">总价值</span>
                        <span className="font-semibold text-gray-900">
                          ${state.totalValue}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 最小数量信息 */}
              {state.minAmounts && (
                <Card className="bg-blue-50 border border-blue-200 rounded-xl">
                  <CardContent className="p-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-900">
                          最小数量 (滑点 {state.minAmounts.slippagePercent}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">
                          最小 {state.tokenA?.symbol}
                        </span>
                        <span className="font-medium text-blue-900">
                          {state.minAmounts.minAmountA.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">
                          最小 {state.tokenB?.symbol}
                        </span>
                        <span className="font-medium text-blue-900">
                          {state.minAmounts.minAmountB.toFixed(6)}
                        </span>
                      </div>
                      <p className="text-blue-600 text-xs mt-2">
                        交易将保证您至少获得这些数量的代币
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

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

          {/* 授权状态提示 */}
          {state.isValidInput && isConnected && !state.allApproved && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">需要授权代币</span>
              </div>
              <p className="text-sm text-yellow-500 mt-1">
                在添加流动性之前，需要先授权代币给路由器合约
              </p>
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
                {!state.amountA || !state.amountB
                  ? "请输入金额"
                  : "无效的代币对"}
              </Button>
            ) : !state.allApproved ? (
              <Button
                onClick={actions.approveAll}
                disabled={state.anyApproving}
                className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-base"
                size="lg"
              >
                {state.anyApproving ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    授权中...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    授权代币
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleAddLiquiditySuccess}
                disabled={state.isLoading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base"
                size="lg"
              >
                {state.isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    添加流动性中...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    添加流动性
                  </>
                )}
              </Button>
            )}

            {/* 提示信息 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">流动性提供者奖励</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• 根据您的池份额比例赚取所有交易的 0.3% 手续费</li>
                    <li>• 手续费会添加到池中并实时累积</li>
                    <li>• 您可以随时提取资金</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
