"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAccount } from "wagmi";
import { useTrading } from '../hooks/useTrading';
import { formatUnits } from 'viem';

interface TradingPanelProps {
  symbol?: string;
  currentPrice?: string;
}

export default function TradingPanel({ symbol = "KEKE", currentPrice = "0.42814" }: TradingPanelProps) {
  const { address, isConnected } = useAccount();
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState(currentPrice);
  const [sellPrice, setSellPrice] = useState(currentPrice);
  const [needsApproval, setNeedsApproval] = useState(false);

  const {
    isLoading,
    useTokenBalance,
    useTokenAllowance,
    approveToken,
    executeBuy,
    executeSell,
  } = useTrading();

  // 获取代币余额
  const { data: kekeBalance } = useTokenBalance(symbol);
  const { data: usdtBalance } = useTokenBalance("USDT");
  
  // 获取授权状态
  const { data: usdtAllowance } = useTokenAllowance("USDT", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"); // Router地址
  const { data: kekeAllowance } = useTokenAllowance(symbol, "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

  // 格式化余额显示
  const formatBalance = (balance: unknown) => {
    if (!balance || typeof balance !== 'bigint') return "0.00";
    return parseFloat(formatUnits(balance, 18)).toFixed(2);
  };

  const balances = {
    KEKE: formatBalance(kekeBalance),
    USDT: formatBalance(usdtBalance),
  };

  // 检查是否需要授权
  useEffect(() => {
    if (buyAmount && usdtAllowance && typeof usdtAllowance === 'bigint') {
      const totalUSDT = parseFloat(buyAmount) * parseFloat(buyPrice);
      const allowanceFormatted = parseFloat(formatUnits(usdtAllowance, 18));
      setNeedsApproval(totalUSDT > allowanceFormatted);
    }
  }, [buyAmount, buyPrice, usdtAllowance]);

  const calculateTotal = (amount: string, price: string) => {
    const numAmount = parseFloat(amount) || 0;
    const numPrice = parseFloat(price) || 0;
    return (numAmount * numPrice).toFixed(4);
  };

  const handleBuy = async () => {
    if (!buyAmount || !buyPrice) return;
    
    // 如果需要授权，先执行授权
    if (needsApproval) {
      const totalUSDT = (parseFloat(buyAmount) * parseFloat(buyPrice)).toString();
      const approved = await approveToken("USDT", totalUSDT);
      if (!approved) return;
    }

    // 执行买入
    await executeBuy({
      tokenSymbol: symbol,
      amount: buyAmount,
      price: buyPrice,
      type: 'buy'
    });
  };

  const handleSell = async () => {
    if (!sellAmount || !sellPrice) return;

    // 检查KEKE授权
    if (kekeAllowance && typeof kekeAllowance === 'bigint') {
      const allowanceFormatted = parseFloat(formatUnits(kekeAllowance, 18));
      if (parseFloat(sellAmount) > allowanceFormatted) {
        const approved = await approveToken(symbol, sellAmount);
        if (!approved) return;
      }
    }

    // 执行卖出
    await executeSell({
      tokenSymbol: symbol,
      amount: sellAmount,
      price: sellPrice,
      type: 'sell'
    });
  };

  return (
    <Card className="bg-gray-900 text-white border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">现货交易</CardTitle>
        <div className="flex gap-2 text-sm">
          <span className="text-gray-400">可用余额:</span>
          <span>{symbol}: {balances.KEKE}</span>
          <span>USDT: {balances.USDT}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="buy" className="text-green-400 data-[state=active]:bg-green-600">
              买入 {symbol}
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-red-400 data-[state=active]:bg-red-600">
              卖出 {symbol}
            </TabsTrigger>
          </TabsList>

          {/* 买入面板 */}
          <TabsContent value="buy" className="space-y-4 mt-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">价格 (USDT)</label>
                <Input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">数量 ({symbol})</label>
                <Input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0.00"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setBuyAmount((parseFloat(balances.USDT) * 0.25 / parseFloat(buyPrice)).toFixed(2))}
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setBuyAmount((parseFloat(balances.USDT) * 0.5 / parseFloat(buyPrice)).toFixed(2))}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setBuyAmount((parseFloat(balances.USDT) * 0.75 / parseFloat(buyPrice)).toFixed(2))}
                  >
                    75%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setBuyAmount((parseFloat(balances.USDT) / parseFloat(buyPrice)).toFixed(2))}
                  >
                    最大
                  </Button>
                </div>
              </div>

              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">总计 (USDT)</span>
                  <span className="text-white">{calculateTotal(buyAmount, buyPrice)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">手续费 (0.1%)</span>
                  <span className="text-white">{(parseFloat(calculateTotal(buyAmount, buyPrice)) * 0.001).toFixed(4)}</span>
                </div>
              </div>

              <Button
                onClick={handleBuy}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                disabled={!isConnected || !buyAmount || !buyPrice || isLoading}
              >
                {isLoading ? "处理中..." : isConnected ? (needsApproval ? "授权并买入" : `买入 ${symbol}`) : "连接钱包"}
              </Button>
            </div>
          </TabsContent>

          {/* 卖出面板 */}
          <TabsContent value="sell" className="space-y-4 mt-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">价格 (USDT)</label>
                <Input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">数量 ({symbol})</label>
                <Input
                  type="number"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0.00"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setSellAmount((parseFloat(balances.KEKE) * 0.25).toFixed(2))}
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setSellAmount((parseFloat(balances.KEKE) * 0.5).toFixed(2))}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setSellAmount((parseFloat(balances.KEKE) * 0.75).toFixed(2))}
                  >
                    75%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setSellAmount(balances.KEKE)}
                  >
                    最大
                  </Button>
                </div>
              </div>

              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">总计 (USDT)</span>
                  <span className="text-white">{calculateTotal(sellAmount, sellPrice)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">手续费 (0.1%)</span>
                  <span className="text-white">{(parseFloat(calculateTotal(sellAmount, sellPrice)) * 0.001).toFixed(4)}</span>
                </div>
              </div>

              <Button
                onClick={handleSell}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
                disabled={!isConnected || !sellAmount || !sellPrice || isLoading}
              >
                {isLoading ? "处理中..." : isConnected ? `卖出 ${symbol}` : "连接钱包"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
