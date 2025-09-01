"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, Settings, Info } from "lucide-react";
import { useAccount } from "wagmi";

export default function SwapPage() {
  const { address } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">代币交换</h1>
          <p className="text-gray-600">快速、安全地交换各种数字资产</p>
          <p className="text-gray-600">当前钱包地址: {address}</p>
        </div>

        {/* Swap Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>交换代币</CardTitle>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">从</label>
              <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <Input
                  type="number"
                  placeholder="0.0"
                  className="border-0 bg-transparent text-lg font-semibold"
                />
                <Button variant="outline" size="sm">
                  KEKE
                </Button>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>余额: 1,000.00</span>
                <Button variant="link" size="sm" className="p-0 h-auto">
                  最大
                </Button>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <ArrowDown className="w-5 h-5 text-gray-600" />
              </div>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">到</label>
              <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Ξ</span>
                </div>
                <Input
                  type="number"
                  placeholder="0.0"
                  className="border-0 bg-transparent text-lg font-semibold"
                />
                <Button variant="outline" size="sm">
                  ETH
                </Button>
              </div>
            </div>

            {/* Swap Info */}
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">兑换率</span>
                <span>1 KEKE = 0.0000234 ETH</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">滑点容差</span>
                <span>0.5%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">网络费用</span>
                <span>~$2.50</span>
              </div>
            </div>

            {/* Swap Button */}
            <Button className="w-full" size="lg">
              交换代币
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-16">
              <div className="text-center">
                <div className="font-medium">添加流动性</div>
                <div className="text-sm text-gray-600">赚取交易费用</div>
              </div>
            </Button>
            <Button variant="outline" className="h-16">
              <div className="text-center">
                <div className="font-medium">农场挖矿</div>
                <div className="text-sm text-gray-600">质押赚取奖励</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Market Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              市场信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">KEKE 价格:</span>
                <div className="font-semibold">$0.0234</div>
              </div>
              <div>
                <span className="text-gray-600">24h 变化:</span>
                <div className="font-semibold text-green-600">+12.5%</div>
              </div>
              <div>
                <span className="text-gray-600">24h 交易量:</span>
                <div className="font-semibold">$2.8M</div>
              </div>
              <div>
                <span className="text-gray-600">流动性:</span>
                <div className="font-semibold">$5.2M</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
