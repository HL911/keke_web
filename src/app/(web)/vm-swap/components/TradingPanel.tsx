"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';
import sepoliaAddresses from '@/config/address/sepolia.json'

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

  // 获取 ETH 信息（交易对）
  const { tokenInfo: ethInfo } = useTokenConfig("WETH");
  
  // 获取代币小数位数
  const getTokenDecimals = useCallback((tokenSymbol: string) => {
    if ((tokenSymbol === "ETH" || tokenSymbol === "WETH") && ethInfo) return ethInfo.decimals;    
    // 默认值：ETH/WETH 18位，其他 18位
    return 18;
  }, [ethInfo, symbol]);

  const {
    isLoading,
    transactionStatus,
    isConfirming,
    isConfirmed,
    shouldUseNativeETH,
    useTokenBalance,
    useMemeTokenBalance,
    registerMemeTokenRefresh,
    useTokenAllowance,
    approveToken,
    executeBuy,
    executeSell,
    refreshBalances,
    // Meme 代币相关
    memeTokenInfo,
    fetchMemeTokenInfo,
  } = useTrading();

  // 获取 meme 代币信息
  useEffect(() => {
    console.log('fetchMemeTokenInfo-1', symbol);
    fetchMemeTokenInfo(symbol);
  }, [symbol]);

  // 获取代币余额 - 只处理 meme 代币和 ETH
  const tokenBalanceQuery = useMemeTokenBalance(memeTokenInfo?.address, symbol)    

  const { data: tokenBalance, refetch: refetchTokenBalance } = tokenBalanceQuery;
  const { data: ethBalance, refetch: refetchETHBalance } = useTokenBalance("WETH");

  // 注册 meme 代币余额刷新
  useEffect(() => {
    if (memeTokenInfo?.address && refetchTokenBalance) {
      registerMemeTokenRefresh(symbol, memeTokenInfo.address, refetchTokenBalance);
    }
  }, [memeTokenInfo?.address, symbol, refetchTokenBalance, registerMemeTokenRefresh]);
  
  // 动态获取路由地址
  const routerAddress = useKekeswapRouterAddress();
  
  // 获取授权状态
  const { data: ethAllowance } = useTokenAllowance("WETH", routerAddress || "0x0");
  const { data: tokenAllowance } = useTokenAllowance(symbol, routerAddress || "0x0");

  // 格式化余额显示 - 使用正确的小数位数
  const formatBalance = useCallback((balance: unknown, tokenSymbol: string) => {
    if (!balance || typeof balance !== 'bigint') return "0.00";
    const decimals = getTokenDecimals(tokenSymbol);
    return parseFloat(formatUnits(balance, decimals)).toFixed(decimals === 6 ? 6 : 4);
  }, [getTokenDecimals]);

  const balances = {
    [symbol]: formatBalance(tokenBalance, symbol),
    ETH: formatBalance(ethBalance, "WETH"),
  };

  // 检查是否需要授权
  useEffect(() => {
    if (buyAmount && buyPrice) {
      // 如果使用原生 ETH，不需要授权
      if (shouldUseNativeETH) {
        setNeedsApproval(false);
        return;
      }
      
      // 检查 ETH/WETH 授权
      if (ethAllowance && typeof ethAllowance === 'bigint') {
        const totalETH = parseFloat(buyAmount) * parseFloat(buyPrice);
        const ethDecimals = getTokenDecimals("WETH");
        const allowanceFormatted = parseFloat(formatUnits(ethAllowance, ethDecimals));
        setNeedsApproval(totalETH > allowanceFormatted);
      } else {
        setNeedsApproval(true); // 如果无法获取授权状态，默认需要授权
      }
    } else {
      setNeedsApproval(false);
    }
  }, [buyAmount, buyPrice, ethAllowance, getTokenDecimals, shouldUseNativeETH]);

  // 监听交易确认状态，自动刷新余额
  useEffect(() => {
    if (isConfirmed) {
      console.log('🔄 交易已确认，自动刷新余额...');
      const refreshTimer = setTimeout(() => {
        refreshBalances();
        toast.success('余额已更新！');
      }, 2000);
      return () => clearTimeout(refreshTimer);
    }
  }, [isConfirmed]);

  const calculateTotal = (amount: string, price: string) => {
    const numAmount = parseFloat(amount) || 0;
    const numPrice = parseFloat(price) || 0;
    return (numAmount * numPrice).toFixed(4);
  };

  const handleBuy = async () => {
    if (!buyAmount || !buyPrice) {
      toast.error('请输入买入数量和价格');
      return;
    }
       

    try {
      // 如果需要授权，先执行授权
      if (needsApproval && !shouldUseNativeETH) {
        toast.info('正在授权 ETH...');
        const totalETH = (parseFloat(buyAmount) * parseFloat(buyPrice)).toString();
        const approved = await approveToken("WETH", totalETH);
        if (!approved) {
          toast.error('授权失败，无法继续买入');
          return;
        }
        toast.success('授权成功！开始买入...');
      }

      console.log('🛒 开始买入交易:', {
        symbol,
        memeTokenInfo,        
        buyAmount,
        buyPrice,
        needsApproval,
        shouldUseNativeETH,
      });
      
      // 执行买入 - 统一使用 ETH
      const success = await executeBuy({
        tokenSymbol: symbol,
        memeTokenInfo,
        amount: buyAmount,
        price: buyPrice,
        type: 'buy'
      });

      if (success) {
        // 清空输入框
        setBuyAmount("");
        // 手动触发余额刷新
        setTimeout(() => {
          refreshBalances();
        }, 1000);
      }
    } catch (error) {
      console.error('买入流程失败:', error);
      toast.error('买入流程失败');
    }
  };

  const handleSell = async () => {
    if (!sellAmount || !sellPrice) {
      toast.error('请输入卖出数量和价格');
      return;
    }  

    try {
      // 检查余额是否足够
      if (tokenBalance && typeof tokenBalance === 'bigint') {
        const tokenDecimals = getTokenDecimals(symbol);
        const balanceFormatted = parseFloat(formatUnits(tokenBalance, tokenDecimals));
        if (parseFloat(sellAmount) > balanceFormatted) {
          toast.error(`余额不足！当前余额: ${balanceFormatted.toFixed(4)} ${symbol}`);
          return;
        }
      }

      // 检查代币授权
      if (tokenAllowance && typeof tokenAllowance === 'bigint') {
        const tokenDecimals = getTokenDecimals(symbol);
        const allowanceFormatted = parseFloat(formatUnits(tokenAllowance, tokenDecimals));
        if (parseFloat(sellAmount) > allowanceFormatted) {
          toast.info(`正在授权 ${symbol}...`);
          const approved = await approveToken(symbol, sellAmount);
          if (!approved) {
            toast.error('授权失败，无法继续卖出');
            return;
          }
          toast.success('授权成功！开始卖出...');
        }
      } else {
        // 如果无法获取授权状态，尝试授权
        toast.info(`正在授权 ${symbol}...`);
        const approved = await approveToken(symbol, sellAmount);
        if (!approved) {
          toast.error('授权失败，无法继续卖出');
          return;
        }
      }

      console.log('💰 开始卖出交易:', {
        symbol,
        memeTokenInfo,
        sellAmount,
        sellPrice,
      });

      // 执行卖出 - 使用 meme 代币信息
      const success = await executeSell({
        tokenSymbol: symbol,
        memeTokenInfo,
        amount: sellAmount,
        price: sellPrice,
        type: 'sell'
      });

      if (success) {
        // 清空输入框
        setSellAmount("");
        // 手动触发余额刷新
        setTimeout(() => {
          refreshBalances();
        }, 1000);
      }
    } catch (error) {
      console.error('卖出流程失败:', error);
      toast.error('卖出流程失败');
    }
  };

  return (
    <Card className="bg-gray-900 text-white border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">现货交易</CardTitle>
        <div className="space-y-2">
          <div className="flex gap-2 text-sm">
            <span className="text-gray-400">可用余额:</span>
            <span>{symbol}: {balances[symbol]}</span>
            <span>{shouldUseNativeETH ? 'ETH' : 'WETH'}: {balances.ETH}</span>
          </div>
          
          <div className="flex gap-2 items-center">            
            
            {shouldUseNativeETH && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                使用原生 ETH
              </Badge>
            )}
            
            {transactionStatus === 'pending' && (
              <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
                交易处理中...
              </Badge>
            )}
            
            {transactionStatus === 'success' && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                交易已提交
              </Badge>
            )}
            
            {isConfirming && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                等待确认...
              </Badge>
            )}
            
            {isConfirmed && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                交易已确认
              </Badge>
            )}
          </div>
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
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (buyPrice && balances.ETH) {
                        const maxTokens = (parseFloat(balances.ETH) * 0.25) / parseFloat(buyPrice);
                        setBuyAmount(maxTokens.toFixed(4));
                      }
                    }}
                    disabled={!buyPrice || !balances.ETH}
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (buyPrice && balances.ETH) {
                        const maxTokens = (parseFloat(balances.ETH) * 0.5) / parseFloat(buyPrice);
                        setBuyAmount(maxTokens.toFixed(4));
                      }
                    }}
                    disabled={!buyPrice || !balances.ETH}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (buyPrice && balances.ETH) {
                        const maxTokens = (parseFloat(balances.ETH) * 0.75) / parseFloat(buyPrice);
                        setBuyAmount(maxTokens.toFixed(4));
                      }
                    }}
                    disabled={!buyPrice || !balances.ETH}
                  >
                    75%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (buyPrice && balances.ETH) {
                        const maxTokens = parseFloat(balances.ETH) / parseFloat(buyPrice);
                        setBuyAmount(maxTokens.toFixed(4));
                      }
                    }}
                    disabled={!buyPrice || !balances.ETH}
                  >
                    最大
                  </Button>
                </div>
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
                disabled={!isConnected || !buyAmount || !buyPrice || isLoading }
              >
                {!isConnected 
                  ? "连接钱包"                                     
                  : isLoading || isConfirming
                  ? (isConfirming ? "确认中..." : "处理中...")
                  : needsApproval && !shouldUseNativeETH
                  ? "授权并买入"
                  : `买入 ${symbol}`
                }
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
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (balances[symbol]) {
                        const amount = (parseFloat(balances[symbol]) * 0.25).toFixed(4);
                        setSellAmount(amount);
                      }
                    }}
                    disabled={!balances[symbol] || parseFloat(balances[symbol]) === 0}
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (balances[symbol]) {
                        const amount = (parseFloat(balances[symbol]) * 0.5).toFixed(4);
                        setSellAmount(amount);
                      }
                    }}
                    disabled={!balances[symbol] || parseFloat(balances[symbol]) === 0}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (balances[symbol]) {
                        const amount = (parseFloat(balances[symbol]) * 0.75).toFixed(4);
                        setSellAmount(amount);
                      }
                    }}
                    disabled={!balances[symbol] || parseFloat(balances[symbol]) === 0}
                  >
                    75%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (balances[symbol]) {
                        setSellAmount(balances[symbol]);
                      }
                    }}
                    disabled={!balances[symbol] || parseFloat(balances[symbol]) === 0}
                  >
                    最大
                  </Button>
                </div>
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
                disabled={!isConnected || !sellAmount || !sellPrice || isLoading || parseFloat(balances[symbol]) === 0}
              >
                {!isConnected 
                  ? "连接钱包"                   
                  : parseFloat(balances[symbol]) === 0
                  ? "余额不足"
                  : isLoading || isConfirming
                  ? (isConfirming ? "确认中..." : "处理中...")
                  : `卖出 ${symbol}`
                }
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
