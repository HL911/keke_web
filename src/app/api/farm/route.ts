import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { foundry } from 'viem/chains';
import { masterConfig, kekeTokenConfig, syrupBarConfig } from '@/config/contract-config';
import { getDatabase, getAllActivePairs, getTokenByAddress, getUserPositions } from '@/app/api/utils/sqlite-db';


/**
 * 农场池接口
 */
interface FarmPool {
  id: number;
  name: string;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  token0Name: string;
  token1Name: string;
  token0Decimals: number;
  token1Decimals: number;
  token0Logo?: string;
  token1Logo?: string;
  totalSupply: string;
  reserve0: string;
  reserve1: string;
  tvlUsd: number;
  volume24h: string;
  apr: string;
  totalValueLocked: string;
  totalStakers: number;
  rewardToken: string;
  allocPoint: number;
  userStaked: string;
  userPendingReward: string;
  userLPBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 农场统计数据接口
 */
interface FarmStats {
  totalTVL: string;
  totalUsers: number;
  averageAPR: string;
  totalRewardsDistributed: string;
  activePools: number;
}



/**
 * GET /api/farm
 * 获取农场池列表和统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress') || undefined;
    
    // 创建区块链客户端
    const client = createPublicClient({
      chain: foundry,
      transport: http('http://127.0.0.1:8545')
    });
    
    // 读取Master合约信息
    const poolLength = await client.readContract({
      address: masterConfig.address,
      abi: masterConfig.abi,
      functionName: 'poolLength'
    }) as bigint;
    
    const kekePerBlock = await client.readContract({
      address: masterConfig.address,
      abi: masterConfig.abi,
      functionName: 'kekePerBlock'
    }) as bigint;
    
    const totalAllocPoint = await client.readContract({
      address: masterConfig.address,
      abi: masterConfig.abi,
      functionName: 'totalAllocPoint'
    }) as bigint;
    
    // 读取KEKE代币信息
    const kekeSymbol = await client.readContract({
      address: kekeTokenConfig.address,
      abi: kekeTokenConfig.abi,
      functionName: 'symbol'
    }) as string;
    
    // 从数据库获取流动性池数据
    const db = await getDatabase();
    const dbPairs = await getAllActivePairs();
    
    // 生成农场池数据
    const farmPools: FarmPool[] = [];
    
    // 首先添加KEKE质押池（池子ID 0）
    try {
      const poolInfo = await client.readContract({
        address: masterConfig.address,
        abi: masterConfig.abi,
        functionName: 'poolInfo',
        args: [BigInt(0)]
      }) as [string, bigint, bigint, bigint];
      
      const [lpToken, allocPoint, lastRewardBlock, accKekePerShare] = poolInfo;
      
      // 读取用户信息（如果提供了用户地址）
      let userStaked = '0';
      let userPendingReward = '0';
      
      if (userAddress) {
        try {
          const userInfo = await client.readContract({
            address: masterConfig.address,
            abi: masterConfig.abi,
            functionName: 'userInfo',
            args: [BigInt(0), userAddress as `0x${string}`]
          }) as [bigint, bigint];
          
          const pendingReward = await client.readContract({
            address: masterConfig.address,
            abi: masterConfig.abi,
            functionName: 'getPoolKEKEReward',
            args: [BigInt(0), userAddress as `0x${string}`]
          }) as bigint;
          
          userStaked = formatEther(userInfo[0]);
          userPendingReward = formatEther(pendingReward);
        } catch (error) {
          console.log(`读取用户 ${userAddress} 在KEKE质押池的信息失败:`, error);
        }
      }
      
      // 计算APR（简化计算）
      // 使用更合理的奖励参数：每块0.1个KEKE而不是10个
      const adjustedKekePerBlock = 0.1;
      const poolRewardPerBlock = adjustedKekePerBlock * Number(allocPoint) / Number(totalAllocPoint);
      const blocksPerDay = 7200; // 以太坊每天约7200个块（12秒一个块）
      const dailyReward = poolRewardPerBlock * blocksPerDay;
      const yearlyReward = dailyReward * 365;
      const kekePrice = 0.1; // 假设KEKE价格为0.1美元
      const poolTVL = 15000; // KEKE质押池TVL
      const estimatedAPR = (yearlyReward * kekePrice / poolTVL) * 100; // 转换为百分比
      
      farmPools.push({
        id: 0,
        name: 'KEKE Staking',
        pairAddress: lpToken,
        token0Symbol: kekeSymbol,
        token1Symbol: '',
        token0Address: lpToken,
        token1Address: '',
        token0Name: 'KekeToken',
        token1Name: '',
        token0Decimals: 18,
        token1Decimals: 18,
        totalSupply: '0',
        reserve0: '0',
        reserve1: '0',
        tvlUsd: 15000, // 模拟TVL
        volume24h: '0',
        apr: estimatedAPR.toFixed(2),
        totalValueLocked: '15000',
        totalStakers: 50,
        rewardToken: kekeSymbol,
        allocPoint: Number(allocPoint),
        userStaked,
        userPendingReward,
        userLPBalance: '0',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('读取KEKE质押池信息失败:', error);
    }
    
    // 然后添加流动性池（从池子ID 1开始）
    for (let i = 0; i < dbPairs.length; i++) {
      const pair = dbPairs[i];
      const poolId = i + 1; // 从1开始，因为0是KEKE质押池
      
      try {
        // 获取代币信息
        const token0 = await getTokenByAddress(pair.token0_address);
        const token1 = await getTokenByAddress(pair.token1_address);
        
        if (!token0 || !token1) {
          console.log(`跳过池子 ${pair.pair_address}，代币信息不完整`);
          continue;
        }
        
        // 尝试从合约读取池子信息（如果存在）
        let allocPoint = 100; // 默认分配点数
        let userStaked = '0';
        let userPendingReward = '0';
        
        try {
          // 检查合约中是否存在这个池子
          if (poolId < Number(poolLength)) {
            const poolInfo = await client.readContract({
              address: masterConfig.address,
              abi: masterConfig.abi,
              functionName: 'poolInfo',
              args: [BigInt(poolId)]
            }) as [string, bigint, bigint, bigint];
            
            allocPoint = Number(poolInfo[1]);
            
            // 读取用户信息（如果提供了用户地址）
            if (userAddress) {
              try {
                const userInfo = await client.readContract({
                  address: masterConfig.address,
                  abi: masterConfig.abi,
                  functionName: 'userInfo',
                  args: [BigInt(poolId), userAddress as `0x${string}`]
                }) as [bigint, bigint];
                
                const pendingReward = await client.readContract({
                  address: masterConfig.address,
                  abi: masterConfig.abi,
                  functionName: 'getPoolKEKEReward',
                  args: [BigInt(poolId), userAddress as `0x${string}`]
                }) as bigint;
                
                userStaked = formatEther(userInfo[0]);
                userPendingReward = formatEther(pendingReward);
              } catch (error) {
                console.log(`读取用户 ${userAddress} 在池子 ${poolId} 的信息失败:`, error);
              }
            }
          }
        } catch (error) {
          console.log(`池子 ${poolId} 在合约中不存在，使用默认值`);
        }
        
        // 计算APR（简化计算）
        // 使用更合理的奖励参数：每块0.1个KEKE而不是10个
        const adjustedKekePerBlock = 0.1;
        const poolRewardPerBlock = adjustedKekePerBlock * allocPoint / Number(totalAllocPoint);
        const blocksPerDay = 7200; // 以太坊每天约7200个块（12秒一个块）
        const dailyReward = poolRewardPerBlock * blocksPerDay;
        const yearlyReward = dailyReward * 365;
        const kekePrice = 0.1; // 假设KEKE价格为0.1美元
        const estimatedAPR = pair.tvl_usd > 0 ? (yearlyReward * kekePrice / pair.tvl_usd) * 100 : 0; // 转换为百分比
        
        farmPools.push({
          id: poolId,
          name: `${token0.symbol}/${token1.symbol}`,
          pairAddress: pair.pair_address,
          token0Symbol: token0.symbol,
          token1Symbol: token1.symbol,
          token0Address: pair.token0_address,
          token1Address: pair.token1_address,
          token0Name: token0.name,
          token1Name: token1.name,
          token0Decimals: token0.decimals,
          token1Decimals: token1.decimals,
          token0Logo: token0.logo_uri,
          token1Logo: token1.logo_uri,
          totalSupply: pair.total_supply,
          reserve0: pair.reserve0,
          reserve1: pair.reserve1,
          tvlUsd: pair.tvl_usd,
          volume24h: pair.volume_24h,
          apr: estimatedAPR.toFixed(2),
          totalValueLocked: pair.tvl_usd.toFixed(2),
          totalStakers: Math.floor(pair.tvl_usd / 1000) + 10, // 模拟质押者数量
          rewardToken: kekeSymbol,
          allocPoint,
          userStaked,
          userPendingReward,
          userLPBalance: '0', // 这里可以从用户位置表获取
          isActive: pair.is_active,
          createdAt: pair.created_at,
          updatedAt: pair.updated_at
        });
        
      } catch (error) {
        console.error(`处理池子 ${pair.pair_address} 失败:`, error);
      }
    }
    
    // 计算农场统计数据
    const farmStats: FarmStats = {
      totalTVL: farmPools.reduce((sum, pool) => sum + parseFloat(pool.totalValueLocked), 0).toFixed(2),
      totalUsers: farmPools.reduce((sum, pool) => sum + pool.totalStakers, 0),
      averageAPR: farmPools.length > 0 ? (farmPools.reduce((sum, pool) => sum + parseFloat(pool.apr), 0) / farmPools.length).toFixed(2) : '0',
      totalRewardsDistributed: formatEther(kekePerBlock),
      activePools: farmPools.length
    };
    
    // 用户农场数据
    const userFarmData = {
      totalStakedValue: farmPools.reduce((sum, pool) => sum + parseFloat(pool.userStaked), 0).toFixed(4),
      totalPendingRewards: farmPools.reduce((sum, pool) => sum + parseFloat(pool.userPendingReward), 0).toFixed(4),
      activePools: farmPools.filter(pool => parseFloat(pool.userStaked) > 0).length
    };
    
    return NextResponse.json({
      success: true,
      data: {
        farmPools,
        farmStats,
        userFarmData
      }
    });
    
  } catch (error) {
    console.error('获取农场数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取农场数据失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/farm
 * 农场操作（质押、取消质押、收获奖励）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, poolId, amount, userAddress } = body;
    
    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: '用户地址不能为空' },
        { status: 400 }
      );
    }
    
    // 模拟操作结果（实际应该调用智能合约）
    let result;
    
    switch (action) {
      case 'stake':
        if (!amount || parseFloat(amount) <= 0) {
          return NextResponse.json(
            { success: false, error: '质押数量必须大于0' },
            { status: 400 }
          );
        }
        result = {
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          action: 'stake',
          poolId,
          amount,
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'unstake':
        if (!amount || parseFloat(amount) <= 0) {
          return NextResponse.json(
            { success: false, error: '取消质押数量必须大于0' },
            { status: 400 }
          );
        }
        result = {
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          action: 'unstake',
          poolId,
          amount,
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'harvest':
        result = {
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          action: 'harvest',
          poolId,
          rewardAmount: (Math.random() * 10).toFixed(4),
          timestamp: new Date().toISOString()
        };
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作类型' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('农场操作失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '农场操作失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}