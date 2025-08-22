"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Coins,
  TrendingUp,
  Shield,
  Users,
  Globe,
  Zap,
  Award,
  BarChart3,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: <Coins className="w-8 h-8 text-blue-600" />,
      title: "交易",
      description: "快速、安全地交换各种数字资产",
      href: "/swap",
    },
    {
      icon: <Award className="w-8 h-8 text-orange-600" />,
      title: "农场",
      description: "参与农场赚取收益",
      href: "/farm",
    },
  ];

  const stats = [
    {
      label: "总锁定价值",
      value: "$125.8M",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    { label: "活跃用户", value: "12,453", icon: <Users className="w-5 h-5" /> },
    { label: "交易量", value: "$2.8B", icon: <Zap className="w-5 h-5" /> },
    {
      label: "平均APY",
      value: "4.2%",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              去中心化交易平台
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Keke Swap
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              提供安全、高效、低成本的代币交易服务，以及农场收益挖矿服务
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/swap">
                  开始交易 <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">核心功能</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            提供完整的DeFi生态系统，让您轻松参与代币交易和农场挖矿
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={feature.href}>
                    了解更多 <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-white/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">如何运作</h2>
            <p className="text-lg text-gray-600">开始您的Web3之旅</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">连接钱包</h3>
              <p className="text-gray-600">
                连接您的Web3钱包，安全地管理您的资产
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">选择交易</h3>
              <p className="text-gray-600">选择优质的代币进行交易，获得代币</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">获得收益</h3>
              <p className="text-gray-600">抵押LP代币，获得收益</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center mb-4">
                  <Shield className="w-8 h-8 text-green-600 mr-3" />
                  <h2 className="text-2xl font-bold">安全保障</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  我们采用最先进的区块链技术和安全协议，确保您的投资安全可靠。
                  所有智能合约都经过严格审计，资产透明可查。
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">智能合约经过多重审计</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">资产完全去中心化管理</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">实时透明的收益分配</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="w-48 h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-24 h-24 text-green-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">KekeSwap</h3>
              <p className="text-gray-400">
                提供安全、高效、低成本的代币交易服务，以及农场收益挖矿服务
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">产品</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/swap" className="hover:text-white">
                    代币交换
                  </Link>
                </li>
                <li>
                  <Link href="/swap" className="hover:text-white">
                    todo
                  </Link>
                </li>
                <li>
                  <Link href="/swap" className="hover:text-white">
                    todo
                  </Link>
                </li>
                <li>
                  <Link href="/swap" className="hover:text-white">
                    todo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">资源</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    白皮书
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    技术文档
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    安全审计
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    社区
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">联系我们</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    官网
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white flex items-center">
                    📧 邮箱
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white flex items-center">
                    🐦 推特
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <Separator className="my-8 bg-gray-700" />
          <div className="text-center text-gray-400">
            <p>&copy; 2025 KekeSwap. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
