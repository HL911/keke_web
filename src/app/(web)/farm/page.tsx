import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, TrendingUp, Users, Zap } from "lucide-react";

export default function FarmPage() {
  const farmPools = [
    {
      id: 1,
      name: "KEKE-ETH LP",
      apy: "45.2%",
      tvl: "$2.5M",
      staked: "1,234",
      rewards: "KEKE",
      icon: "🌾",
    },
    {
      id: 2,
      name: "USDC-ETH LP",
      apy: "32.8%",
      tvl: "$1.8M",
      staked: "856",
      rewards: "KEKE",
      icon: "🌾",
    },
    {
      id: 3,
      name: "WBTC-ETH LP",
      apy: "28.5%",
      tvl: "$3.2M",
      staked: "567",
      rewards: "KEKE",
      icon: "🌾",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">农场挖矿</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            质押流动性代币赚取KEKE奖励，参与DeFi生态建设
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">$7.5M</p>
              <p className="text-sm text-gray-600">总锁定价值</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">2,657</p>
              <p className="text-sm text-gray-600">活跃农场用户</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <Zap className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">35.5%</p>
              <p className="text-sm text-gray-600">平均年化收益率</p>
            </CardContent>
          </Card>
        </div>

        {/* Farm Pools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">农场池</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farmPools.map((pool) => (
              <Card key={pool.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{pool.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {pool.rewards} 奖励
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">年化收益率</span>
                      <span className="font-semibold text-green-600">
                        {pool.apy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">总锁定价值</span>
                      <span className="font-semibold">{pool.tvl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">质押用户</span>
                      <span className="font-semibold">{pool.staked}</span>
                    </div>
                    <Separator />
                    <Button className="w-full" size="sm">
                      质押代币
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How to Farm */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600" />
              如何开始农场挖矿
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">添加流动性</h3>
                <p className="text-sm text-gray-600">
                  在交易页面添加代币对流动性，获得LP代币
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">质押LP代币</h3>
                <p className="text-sm text-gray-600">
                  将LP代币质押到农场池中开始赚取奖励
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">收获奖励</h3>
                <p className="text-sm text-gray-600">
                  定期收获KEKE代币奖励，或复投增加收益
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
