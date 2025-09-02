import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Coins,
  Activity,
} from "lucide-react";

export default function AnalyticsPage() {
  const marketData = [
    {
      pair: "KEKE/ETH",
      price: "$0.0234",
      change24h: "+12.5%",
      volume24h: "$2.8M",
      liquidity: "$5.2M",
      changeType: "up",
    },
    {
      pair: "KEKE/USDC",
      price: "$0.0231",
      change24h: "-3.2%",
      volume24h: "$1.5M",
      liquidity: "$3.8M",
      changeType: "down",
    },
    {
      pair: "ETH/USDC",
      price: "$3,245.67",
      change24h: "+2.1%",
      volume24h: "$8.9M",
      liquidity: "$12.1M",
      changeType: "up",
    },
  ];

  const recentTransactions = [
    {
      id: "0x1234...5678",
      type: "swap",
      pair: "KEKE → ETH",
      amount: "1,000 KEKE",
      value: "$23.40",
      time: "2分钟前",
    },
    {
      id: "0x8765...4321",
      type: "add",
      pair: "添加流动性",
      amount: "ETH + USDC",
      value: "$5,000",
      time: "5分钟前",
    },
    {
      id: "0x9876...5432",
      type: "swap",
      pair: "USDC → KEKE",
      amount: "500 USDC",
      value: "21,739 KEKE",
      time: "8分钟前",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">数据分析</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            实时监控Keke Swap平台数据，了解市场动态和交易趋势
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <Coins className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">$125.8M</p>
              <p className="text-sm text-gray-600">总锁定价值</p>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">+5.2%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <Activity className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">$2.8B</p>
              <p className="text-sm text-gray-600">24小时交易量</p>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">+12.8%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">12,453</p>
              <p className="text-sm text-gray-600">活跃用户</p>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">+8.4%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">156</p>
              <p className="text-sm text-gray-600">交易对数量</p>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">+3</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Data */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">市场数据</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>热门交易对</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketData.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{item.pair}</Badge>
                          <span className="font-semibold">{item.price}</span>
                        </div>
                        <div className="text-right">
                          <div
                            className={`flex items-center ${
                              item.changeType === "up"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {item.changeType === "up" ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            {item.change24h}
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.volume24h}
                          </div>
                        </div>
                      </div>
                      {index < marketData.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>最近交易</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((tx, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              tx.type === "swap"
                                ? "bg-blue-500"
                                : "bg-green-500"
                            }`}
                          />
                          <div>
                            <div className="font-medium">{tx.pair}</div>
                            <div className="text-sm text-gray-600">{tx.id}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{tx.amount}</div>
                          <div className="text-sm text-gray-600">
                            {tx.value}
                          </div>
                          <div className="text-xs text-gray-500">{tx.time}</div>
                        </div>
                      </div>
                      {index < recentTransactions.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Placeholder */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              交易量趋势图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>图表组件将在这里显示</p>
                <p className="text-sm">集成Chart.js或Recharts库</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
