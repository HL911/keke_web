"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Info,
  Wallet,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { AmountInput } from "../components/AmountInput";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useAddLiquidity } from "../hooks/useAddLiquidity";

// 网络配置
interface Network {
  id: string;
  name: string;
  chainId: number;
}

const NETWORKS: Network[] = [
  { id: "ethereum", name: "Ethereum", chainId: 1 },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111 },
  { id: "optimism", name: "Optimism", chainId: 10 },
  { id: "polygon", name: "Polygon", chainId: 137 },
  { id: "bsc", name: "BNB Smart Chain", chainId: 56 },
  { id: "foundry", name: "Foundry", chainId: 31337 },
];

// 格式化数字
const formatNumber = (value: number, decimals: number = 2): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(decimals) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(decimals) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(decimals) + "K";
  return value.toFixed(decimals);
};

export default function AddLiquidityPage() {
  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const router = useRouter();

  // 使用添加流动性hook
  const { state, actions } = useAddLiquidity();

  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0]);

  // 滑点预设选项
  const slippagePresets = ["0.1", "0.5", "1.0", "3.0"];

  // 处理网络切换
  const handleNetworkChange = (networkId: string) => {
    const network = NETWORKS.find((n) => n.id === networkId);
    if (network) {
      setSelectedNetwork(network);
      // 网络切换时重置代币选择和金额
      actions.resetForm();
    }
  };

  // 处理添加流动性成功
  const handleAddLiquiditySuccess = async () => {
    try {
      await actions.handleAddLiquidity();
      alert("流动性添加成功！");
    } catch {
      // 错误已经在hook中处理
    }
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
              <h1 className="text-3xl font-bold text-gray-900">添加流动性</h1>
            </div>
            <p className="text-gray-600">
              创建新的资金池或在现有资金池中添加流动性。
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <section className="flex flex-col flex-1">
        <div className="bg-gray-50 border-t border-gray-200 pt-8 pb-20 min-h-screen">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="max-w-lg mx-auto space-y-8">
              {/* 网络选择区域 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  网络
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  选择您想要提供流动性的网络。
                </p>
                <Select
                  value={selectedNetwork.id}
                  onValueChange={handleNetworkChange}
                >
                  <SelectTrigger className="w-full h-14 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600"></div>
                        <span className="font-medium">
                          {selectedNetwork.name}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {NETWORKS.map((network) => (
                      <SelectItem key={network.id} value={network.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-600"></div>
                          <span className="font-medium">{network.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 代币选择区域 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  代币数量
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  选择代币对添加流动性，选择您要存入的代币数量
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
                            ${formatNumber(state.totalValue)}
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
                    {!state.tokenA || !state.tokenB
                      ? "请选择代币"
                      : !state.amountA || !state.amountB
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
          </div>
        </div>
      </section>
    </div>
  );
}
