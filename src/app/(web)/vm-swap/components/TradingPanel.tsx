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
import { useKekeswapRouterAddress } from '@/hooks/useContract';
import { usePoolPrice, useTradeQuote } from '@/hooks/usePoolPrice';
import { formatUnits } from 'viem';
import { toast } from 'sonner';
import sepoliaAddresses from '@/config/address/sepolia.json'

interface TradingPanelProps {
  symbol?: string;
  currentPrice?: string;
}

export default function TradingPanel({ symbol = "KEKE", currentPrice = "0.42814" }: TradingPanelProps) {
  const { address, isConnected } = useAccount();
  const [ethAmount, setEthAmount] = useState(""); // 统一使用ETH数量
  const [tokenAmount, setTokenAmount] = useState(""); // 代币数量
  const [needsApproval, setNeedsApproval] = useState(false);

  // 获取代币小数位数 - 使用静态配置，避免重复的API调用
  const getTokenDecimals = useCallback((tokenSymbol: string) => {
    // ETH/WETH 统一使用18位小数
    if (tokenSymbol === "ETH" || tokenSymbol === "WETH") return 18;    
    // 默认值：18位小数
    return 18;
  }, []);

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
  useEffect(()=>{
    fetchMemeTokenInfo(symbol)
  },[symbol])
  // 注意：memeTokenInfo 现在从页面组件通过 useTrading 传递过来
  // 不再在这里重复调用 fetchMemeTokenInfo，避免无限循环
  useEffect(() => {
    console.log('TradingPanel 收到代币信息:', symbol, memeTokenInfo);
  }, [symbol, memeTokenInfo]);

  // 获取基于Pool合约的价格信息
  const poolPrice = usePoolPrice(memeTokenInfo?.address, 3000); // 假设ETH价格为3000 USD
  
  // 获取买入报价 - 输入ETH数量，计算能得到的代币数量
  const buyQuote = useTradeQuote(memeTokenInfo?.address, 'buy', ethAmount);
  
  // 获取卖出报价 - 输入代币数量，计算能得到的ETH数量  
  const sellQuote = useTradeQuote(memeTokenInfo?.address, 'sell', tokenAmount);

  // 实时计算代币数量 - 当输入ETH数量时
  useEffect(() => {
    if (buyQuote.data && !buyQuote.isLoading && ethAmount) {
      setTokenAmount(buyQuote.data);
    }
  }, [buyQuote.data, buyQuote.isLoading, ethAmount]);

  // 计算回退价格 - 当Pool价格获取失败时使用交易报价估算
  const getEffectivePrice = useCallback(() => {
    // 如果Pool价格有效，直接使用
    if (poolPrice.priceInETH && parseFloat(poolPrice.priceInETH) > 0) {
      return poolPrice.priceInETH;
    }
    
    // 使用交易报价估算价格
    if (buyQuote.data && !buyQuote.isLoading && parseFloat(buyQuote.data) > 0) {
      // 1 ETH 能买到的代币数量
      const tokensFor1ETH = parseFloat(buyQuote.data);
      const estimatedPrice = (1 / tokensFor1ETH).toFixed(8);
      console.log('🔄 使用交易报价估算价格:', {
        tokensFor1ETH,
        estimatedPrice,
        buyQuoteData: buyQuote.data
      });
      return estimatedPrice;
    }
    
    return "0";
  }, [poolPrice.priceInETH, buyQuote.data, buyQuote.isLoading]);

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
    return parseFloat(formatUnits(balance, decimals)).toFixed(4);
  }, [getTokenDecimals]);

  const balances = {
    [symbol]: formatBalance(tokenBalance, symbol),
    ETH: formatBalance(ethBalance, "WETH"),
  };

  // 检查是否需要授权
  useEffect(() => {
    if (ethAmount) {
      // 如果使用原生 ETH，不需要授权
      if (shouldUseNativeETH) {
        setNeedsApproval(false);
        return;
      }
      
      // 检查 ETH/WETH 授权
      if (ethAllowance && typeof ethAllowance === 'bigint') {
        const totalETH = parseFloat(ethAmount);
        const ethDecimals = getTokenDecimals("WETH");
        const allowanceFormatted = parseFloat(formatUnits(ethAllowance, ethDecimals));
        setNeedsApproval(totalETH > allowanceFormatted);
      } else {
        setNeedsApproval(true); // 如果无法获取授权状态，默认需要授权
      }
    } else {
      setNeedsApproval(false);
    }
  }, [ethAmount, ethAllowance, getTokenDecimals, shouldUseNativeETH]);

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
  }, [isConfirmed, refreshBalances]);

  const handleBuy = async () => {
    if (!ethAmount) {
      toast.error('请输入ETH数量');
      return;
    }
       
    try {
      // 如果需要授权，先执行授权
      if (needsApproval && !shouldUseNativeETH) {
        toast.info('正在授权 ETH...');
        const approved = await approveToken("WETH", ethAmount, null);
        if (!approved) {
          toast.error('授权失败，无法继续买入');
          return;
        }
        toast.success('授权成功！开始买入...');
      }

      console.log('🛒 开始买入交易:', {
        symbol,
        memeTokenInfo,        
        ethAmount,
        expectedTokens: tokenAmount,
        needsApproval,
        shouldUseNativeETH,
      });
      const effectivePrice = getEffectivePrice();
      console.log('💰 交易价格信息:', {
        poolPriceInETH: poolPrice.priceInETH,
        effectivePrice,
        buyQuoteData: buyQuote.data,
        ethAmount,
        expectedTokens: tokenAmount
      });
      
      // 执行买入 - 使用ETH购买代币
      const success = await executeBuy({
        tokenSymbol: symbol,
        memeTokenInfo,
        amount: ethAmount, // ETH数量
        price: effectivePrice, // 使用有效价格
        type: 'buy'
      });

      if (success) {
        // 清空输入框
        setEthAmount("");
        setTokenAmount("");
        // 余额会在交易确认后自动刷新，无需手动触发
      }
    } catch (error) {
      console.error('买入流程失败:', error);
      toast.error('买入流程失败');
    }
  };

  const handleSell = async () => {
    if (!tokenAmount) {
      toast.error('请输入代币数量');
      return;
    }  

    try {
      // 检查余额是否足够
      if (tokenBalance && typeof tokenBalance === 'bigint') {
        const tokenDecimals = getTokenDecimals(symbol);
        const balanceFormatted = parseFloat(formatUnits(tokenBalance, tokenDecimals));
        if (parseFloat(tokenAmount) > balanceFormatted) {
          toast.error(`余额不足！当前余额: ${balanceFormatted.toFixed(4)} ${symbol}`);
          return;
        }
      }

      // 检查代币授权
      if (tokenAllowance && typeof tokenAllowance === 'bigint') {
        const tokenDecimals = getTokenDecimals(symbol);
        const allowanceFormatted = parseFloat(formatUnits(tokenAllowance, tokenDecimals));
        if (parseFloat(tokenAmount) > allowanceFormatted) {
          toast.info(`正在授权 ${symbol}...`);
          const approved = await approveToken(symbol, tokenAmount, memeTokenInfo);
          console.log('approved', approved);
          if (!approved) {
            toast.error('授权失败，无法继续卖出');
            return;
          }
          toast.success('授权成功！开始卖出...');
        }
      } else {
        // 如果无法获取授权状态，尝试授权
        toast.info(`正在授权 ${symbol}...`);
        const approved = await approveToken(symbol, tokenAmount, memeTokenInfo);
        if (!approved) {
          toast.error('授权失败，无法继续卖出');
          return;
        }
      }

      console.log('💰 开始卖出交易:', {
        symbol,
        memeTokenInfo,
        tokenAmount,
        expectedETH: sellQuote.data,
      });

      const effectivePrice = getEffectivePrice();
      console.log('💰 卖出交易价格信息:', {
        poolPriceInETH: poolPrice.priceInETH,
        effectivePrice,
        sellQuoteData: sellQuote.data,
        tokenAmount,
        expectedETH: sellQuote.data
      });
      
      // 执行卖出 - 使用代币数量
      const success = await executeSell({
        tokenSymbol: symbol,
        memeTokenInfo,
        amount: tokenAmount, // 代币数量
        price: effectivePrice, // 使用有效价格
        type: 'sell'
      });

      if (success) {
        // 清空输入框
        setTokenAmount("");
        setEthAmount("");
        // 余额会在交易确认后自动刷新，无需手动触发
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
          
          {(() => {
            const effectivePrice = getEffectivePrice();
            const effectivePriceNum = parseFloat(effectivePrice);
            const effectivePriceUSD = effectivePriceNum > 0 ? (effectivePriceNum * 3000).toFixed(6) : "0";
            
            return effectivePriceNum > 0 && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400">实时价格:</span>
                <span className="text-green-400">{effectivePrice} ETH</span>
                <span className="text-gray-400">(≈ ${effectivePriceUSD})</span>
                {!poolPrice.priceInETH || parseFloat(poolPrice.priceInETH) === 0 ? (
                  <span className="text-yellow-400 text-xs">(估算)</span>
                ) : null}
              </div>
            );
          })()}
          
          <div className="flex gap-2 items-center">            
            
            {poolPrice.presaleOpen && (
              <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
                预售开放
              </Badge>
            )}
            
            {poolPrice.tradingOpen && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                交易开放
              </Badge>
            )}
            
            {poolPrice.poolFail && (
              <Badge variant="outline" className="text-xs text-red-400 border-red-400">
                池子失败
              </Badge>
            )}
            
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
            <div className="space-y-4">
              {/* 余额显示 */}
              <div className="text-right text-sm text-gray-400">
                余额: {balances.ETH} ETH
              </div>
              
              {/* ETH数量输入 */}
              <div className="relative">
                <Input
                  type="number"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3 pr-16"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  ETH
                </span>
              </div>

              {/* 快速选择按钮 */}
              <div className="flex gap-2">
                {[0.01, 0.02, 0.5, 1].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => setEthAmount(amount.toString())}
                  >
                    {amount}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => setEthAmount(balances.ETH)}
                  disabled={!balances.ETH || parseFloat(balances.ETH) === 0}
                >
                  最大
                </Button>
              </div>

              {/* 预计获得代币数量 */}
              {ethAmount && tokenAmount && (
                <div className="text-center text-sm text-gray-400">
                  {ethAmount} ETH ≈ {parseFloat(tokenAmount).toFixed(2)} {symbol}
                </div>
              )}

              <Button
                onClick={handleBuy}
                className={`w-full font-semibold py-3 ${
                  !isConnected || !ethAmount || parseFloat(balances.ETH) < parseFloat(ethAmount || "0")
                    ? "bg-green-600/50 text-gray-300"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
                disabled={!isConnected || !ethAmount || isLoading || parseFloat(balances.ETH) < parseFloat(ethAmount || "0")}
              >
                {!isConnected 
                  ? "连接钱包"
                  : parseFloat(balances.ETH) < parseFloat(ethAmount || "0")
                  ? "余额不足请充值"
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
            <div className="space-y-4">
              {/* 余额显示 */}
              <div className="text-right text-sm text-gray-400">
                余额: {balances[symbol]} {symbol}
              </div>
              
              {/* 代币数量输入 */}
              <div className="relative">
                <Input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3 pr-20"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {symbol}
                </span>
              </div>

              {/* 快速选择按钮 */}
              <div className="flex gap-2">
                {[0.25, 0.5, 0.75, 1].map((percentage) => (
                  <Button
                    key={percentage}
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={() => {
                      if (balances[symbol]) {
                        const amount = (parseFloat(balances[symbol]) * percentage).toFixed(4);
                        setTokenAmount(amount);
                      }
                    }}
                    disabled={!balances[symbol] || parseFloat(balances[symbol]) === 0}
                  >
                    {percentage === 1 ? "最大" : `${percentage * 100}%`}
                  </Button>
                ))}
              </div>

              {/* 预计获得ETH数量 */}
              {tokenAmount && sellQuote.data && (
                <div className="text-center text-sm text-gray-400">
                  {tokenAmount} {symbol} ≈ {parseFloat(sellQuote.data).toFixed(4)} ETH
                </div>
              )}

              <Button
                onClick={handleSell}
                className={`w-full font-semibold py-3 ${
                  !isConnected || !tokenAmount || parseFloat(balances[symbol]) === 0
                    ? "bg-red-600/50 text-gray-300"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
                disabled={!isConnected || !tokenAmount || isLoading || parseFloat(balances[symbol]) === 0}
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
