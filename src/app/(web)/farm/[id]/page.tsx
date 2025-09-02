'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, Users, Coins, Plus, Minus, Gift } from 'lucide-react';
import { useFarm } from '@/hooks/useFarm';
import { useMaster } from '@/hooks/useMaster';
import { toast } from 'sonner';

/**
 * 农场池详情页面
 * 用户可以在这里进行质押、取消质押和收获奖励操作
 */
export default function FarmPoolPage() {
  const router = useRouter();
  const params = useParams();
  const { address, isConnected } = useAccount();
  const { farmPools, refreshFarmData, isLoading } = useFarm();
  const { 
    deposit, 
    withdraw, 
    emergencyWithdraw,
    harvest,
    isLoading: masterLoading 
  } = useMaster();
  
  const poolId = parseInt(params.id as string);
  const pool = farmPools.find(p => p.id === poolId);
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState('stake');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);

  /**
   * 格式化数字显示
   */
  const formatNumber = (value: string | number, decimals = 4) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(decimals)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  };

  /**
   * 质押代币
   */
  const handleStake = async () => {
    if (!pool || !stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('请输入有效的质押数量');
      return;
    }

    try {
      setIsStaking(true);
      
      if (pool.id === 0) {
        // KEKE质押池
        await deposit(0, stakeAmount);
        toast.success('KEKE质押成功！');
      } else {
        // LP代币质押池
        await deposit(pool.id, stakeAmount);
        toast.success('LP代币质押成功！');
      }
      
      setStakeAmount('');
      await refreshFarmData();
    } catch (error) {
      console.error('质押失败:', error);
      toast.error('质押失败，请重试');
    } finally {
      setIsStaking(false);
    }
  };

  /**
   * 取消质押
   */
  const handleUnstake = async () => {
    if (!pool || !unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error('请输入有效的取消质押数量');
      return;
    }

    try {
      setIsUnstaking(true);
      await withdraw(pool.id, unstakeAmount);
      toast.success('取消质押成功！');
      setUnstakeAmount('');
      await refreshFarmData();
    } catch (error) {
      console.error('取消质押失败:', error);
      toast.error('取消质押失败，请重试');
    } finally {
      setIsUnstaking(false);
    }
  };

  /**
   * 收获奖励
   */
  const handleHarvest = async () => {
    if (!pool) return;

    try {
      setIsHarvesting(true);
      await harvest(pool.id);
      toast.success('收获奖励成功！');
      await refreshFarmData();
    } catch (error) {
      console.error('收获奖励失败:', error);
      toast.error('收获奖励失败，请重试');
    } finally {
      setIsHarvesting(false);
    }
  };

  /**
   * 设置最大数量
   */
  const setMaxStake = () => {
    // 这里应该获取用户的代币余额
    // 暂时设置为用户当前LP余额
    setStakeAmount(pool?.userLPBalance || '0');
  };

  const setMaxUnstake = () => {
    setUnstakeAmount(pool?.userStaked || '0');
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">请连接钱包</h1>
          <p className="text-muted-foreground">
            请先连接钱包以查看农场池详情
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !pool) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回农场
      </Button>

      {/* 池子信息 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：池子详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 池子基本信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {pool.token0Logo && (
                      <img src={pool.token0Logo} alt={pool.token0Symbol} className="w-8 h-8 rounded-full" />
                    )}
                    {pool.token1Logo && (
                      <img src={pool.token1Logo} alt={pool.token1Symbol} className="w-8 h-8 rounded-full" />
                    )}
                    <span>{pool.name}</span>
                  </div>
                </CardTitle>
                <Badge variant={parseFloat(pool.userStaked) > 0 ? "default" : "secondary"}>
                  {parseFloat(pool.userStaked) > 0 ? "已质押" : "未质押"}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* APR */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">APR</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">{pool.apr}%</p>
                </div>

                {/* TVL */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">TVL</span>
                  </div>
                  <p className="text-2xl font-bold">${formatNumber(pool.totalValueLocked)}</p>
                </div>

                {/* 质押者数量 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">质押者</span>
                  </div>
                  <p className="text-2xl font-bold">{pool.totalStakers}</p>
                </div>

                {/* 分配点数 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">分配点数</span>
                  </div>
                  <p className="text-2xl font-bold">{pool.allocPoint}</p>
                </div>
              </div>

              {/* 用户数据 */}
              {parseFloat(pool.userStaked) > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">我的质押</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(pool.userStaked)} {pool.id === 0 ? pool.token0Symbol : 'LP'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">待收获奖励</p>
                      <p className="text-lg font-semibold text-orange-500">
                        {formatNumber(pool.userPendingReward)} KEKE
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 池子详细信息 */}
          {pool.id !== 0 && (
            <Card>
              <CardHeader>
                <CardTitle>流动性池信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{pool.token0Symbol} 储备</p>
                    <p className="font-semibold">{formatNumber(pool.reserve0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{pool.token1Symbol} 储备</p>
                    <p className="font-semibold">{formatNumber(pool.reserve1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">总供应量</p>
                    <p className="font-semibold">{formatNumber(pool.totalSupply)} LP</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">24h交易量</p>
                    <p className="font-semibold">${formatNumber(pool.volume24h)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：操作面板 */}
        <div className="space-y-6">
          {/* 收获奖励 */}
          {parseFloat(pool.userPendingReward) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  收获奖励
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold text-orange-500">
                    {formatNumber(pool.userPendingReward)} KEKE
                  </p>
                  <p className="text-sm text-muted-foreground">待收获奖励</p>
                </div>
                <Button 
                  onClick={handleHarvest}
                  disabled={isHarvesting || masterLoading}
                  className="w-full"
                >
                  {isHarvesting ? '收获中...' : '收获奖励'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 质押/取消质押 */}
          <Card>
            <CardHeader>
              <CardTitle>质押操作</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stake">质押</TabsTrigger>
                  <TabsTrigger value="unstake">取消质押</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stake" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      质押数量 ({pool.id === 0 ? pool.token0Symbol : 'LP'})
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                      />
                      <Button variant="outline" onClick={setMaxStake}>
                        最大
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      余额: {formatNumber(pool.userLPBalance)} {pool.id === 0 ? pool.token0Symbol : 'LP'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleStake}
                    disabled={isStaking || masterLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isStaking ? '质押中...' : '质押'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="unstake" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      取消质押数量 ({pool.id === 0 ? pool.token0Symbol : 'LP'})
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                      />
                      <Button variant="outline" onClick={setMaxUnstake}>
                        最大
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      已质押: {formatNumber(pool.userStaked)} {pool.id === 0 ? pool.token0Symbol : 'LP'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleUnstake}
                    disabled={isUnstaking || masterLoading || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                    variant="destructive"
                    className="w-full"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    {isUnstaking ? '取消质押中...' : '取消质押'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 紧急提取 */}
          {parseFloat(pool.userStaked) > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">紧急提取</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  紧急提取将放弃所有待收获的奖励，仅在紧急情况下使用。
                </p>
                <Button 
                  onClick={() => emergencyWithdraw(pool.id)}
                  disabled={masterLoading}
                  variant="destructive"
                  className="w-full"
                >
                  紧急提取
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}