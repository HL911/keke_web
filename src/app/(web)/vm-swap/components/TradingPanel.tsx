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
import { useTokenConfig } from '@/hooks/tokens/useTokenConfig';
import { useKekeswapRouterAddress } from '@/hooks/useContract';
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
  const [memeTokenInfo, setMemeTokenInfo] = useState<any>(null);

  // 获取系统代币信息
  const { tokenInfo: systemTokenInfo, loading: systemTokenLoading } = useTokenConfig(symbol);
  // 获取 ETH 信息（交易对）
  const { tokenInfo: ethInfo } = useTokenConfig("WETH");

  // 如果不是系统代币，尝试从 meme 代币获取
  useEffect(() => {
    const fetchMemeTokenInfo = async () => {
      if (systemTokenInfo || systemTokenLoading) return; // 如果已经找到系统代币，不需要查询 meme 代币
      
      try {
        // 先尝试通过 symbol 搜索
        const searchResponse = await fetch(`/api/meme-tokens?action=search&search=${symbol}`);
        const searchResult = await searchResponse.json();
        if (searchResult.success && searchResult.data.tokens.length > 0) {
          // 找到匹配的 meme 代币
          const exactMatch = searchResult.data.tokens.find((token: any) => {
            return token.symbol.toLowerCase() === symbol.toLowerCase()
          }                        
          );
          
          if (exactMatch) {
            setMemeTokenInfo(exactMatch);
            console.log('找到 meme 代币:', exactMatch);
          }
        }
      } catch (error) {
        console.error('获取 meme 代币信息失败:', error);
      }
    };

    fetchMemeTokenInfo();
  }, [symbol, systemTokenInfo, systemTokenLoading]);

  // 当前代币信息（优先使用系统代币，其次是 meme 代币）
  const currentTokenInfo = systemTokenInfo || memeTokenInfo;
  
  // 获取代币小数位数
  const getTokenDecimals = (tokenSymbol: string) => {
    if ((tokenSymbol === "ETH" || tokenSymbol === "WETH") && ethInfo) return ethInfo.decimals;
    if (tokenSymbol === symbol && currentTokenInfo) return currentTokenInfo.decimals;
    // 默认值：ETH/WETH 18位，其他 18位
    return 18;
  };

  const {
    isLoading,
    useTokenBalance,
    useTokenAllowance,
    approveToken,
    executeBuy,
    executeSell,
  } = useTrading();

  // 获取代币余额
  const { data: tokenBalance } = useTokenBalance(symbol);
  const { data: ethBalance } = useTokenBalance("WETH");
  
  // 动态获取路由地址
  const routerAddress = useKekeswapRouterAddress();
  
  // 获取授权状态
  const { data: ethAllowance } = useTokenAllowance("WETH", routerAddress || "0x0");
  const { data: tokenAllowance } = useTokenAllowance(symbol, routerAddress || "0x0");

  // 格式化余额显示 - 使用正确的小数位数
  const formatBalance = (balance: unknown, tokenSymbol: string) => {
    if (!balance || typeof balance !== 'bigint') return "0.00";
    const decimals = getTokenDecimals(tokenSymbol);
    return parseFloat(formatUnits(balance, decimals)).toFixed(decimals === 6 ? 6 : 4);
  };

  const balances = {
    [symbol]: formatBalance(tokenBalance, symbol),
    ETH: formatBalance(ethBalance, "WETH"),
  };

  // 检查是否需要授权
  useEffect(() => {
    if (buyAmount && ethAllowance && typeof ethAllowance === 'bigint') {
      const totalETH = parseFloat(buyAmount) * parseFloat(buyPrice);
      const ethDecimals = getTokenDecimals("WETH");
      const allowanceFormatted = parseFloat(formatUnits(ethAllowance, ethDecimals));
      setNeedsApproval(totalETH > allowanceFormatted);
    }
  }, [buyAmount, buyPrice, ethAllowance, getTokenDecimals]);

  const calculateTotal = (amount: string, price: string) => {
    const numAmount = parseFloat(amount) || 0;
    const numPrice = parseFloat(price) || 0;
    return (numAmount * numPrice).toFixed(4);
  };

  const handleBuy = async () => {
    if (!buyAmount || !buyPrice) return;
    
    // 如果需要授权，先执行授权
    if (needsApproval) {
      const totalETH = (parseFloat(buyAmount) * parseFloat(buyPrice)).toString();
      const approved = await approveToken("WETH", totalETH);
      if (!approved) return;
    }

    console.log('买入----symbol', symbol)
    console.log('memeTokenInfo', memeTokenInfo)
    console.log('buyAmount', buyAmount)
    console.log('buyPrice', buyPrice)
    
          // 执行买入
      await executeBuy({
        tokenSymbol: symbol,
        systemTokenInfo: memeTokenInfo,
        amount: buyAmount,
        price: buyPrice,
        type: 'buy'
      });
  };

  const handleSell = async () => {
    if (!sellAmount || !sellPrice) return;

    // 检查代币授权
    if (tokenAllowance && typeof tokenAllowance === 'bigint') {
      const tokenDecimals = getTokenDecimals(symbol);
      const allowanceFormatted = parseFloat(formatUnits(tokenAllowance, tokenDecimals));
      if (parseFloat(sellAmount) > allowanceFormatted) {
        const approved = await approveToken(symbol, sellAmount);
        if (!approved) return;
      }
    }

    // 执行卖出
    await executeSell({
      tokenSymbol: symbol,
      systemTokenInfo: systemTokenInfo,
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
          <span>{symbol}: {balances[symbol]}</span>
          <span>ETH: {balances.ETH}</span>
          {!currentTokenInfo && (
            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
              代币信息加载中...
            </Badge>
          )}
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
                <label className="text-sm text-gray-400 mb-2 block">价格 (ETH)</label>
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
              </div>

              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">总计 (ETH)</span>
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
                <label className="text-sm text-gray-400 mb-2 block">价格 (ETH)</label>
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
              </div>

              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">总计 (ETH)</span>
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
