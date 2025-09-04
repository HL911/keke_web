import { NextRequest, NextResponse } from 'next/server';
import { getKlines } from '../utils/klines-queries';

// 网络名称到 Chain ID 的映射
const NETWORK_MAPPING: Record<string, string> = {
  'ethereum': '11155111',    // 开发环境使用 Sepolia 测试网
  'sepolia': '11155111',     // Sepolia 测试网
  'mainnet': '1',            // 以太坊主网
  'goerli': '5',             // Goerli 测试网 (已弃用)
  'polygon': '137',          // Polygon 主网
  'mumbai': '80001',         // Polygon Mumbai 测试网
  'bsc': '56',               // BSC 主网
  'bsc-testnet': '97',       // BSC 测试网
  'arbitrum': '42161',       // Arbitrum One
  'optimism': '10',          // Optimism
  'localhost': '31337',      // 本地开发网络
  'foundry': '31337',        // Foundry 本地网络
};

// 将网络名称转换为 Chain ID
function normalizeNetworkId(network: string): string {
  // 如果已经是数字 ID，直接返回
  if (/^\d+$/.test(network)) {
    return network;
  }
  
  // 查找映射
  const chainId = NETWORK_MAPPING[network.toLowerCase()];
  if (chainId) {
    return chainId;
  }
  
  // 如果没有找到映射，返回原值（可能是自定义网络）
  return network;
}

/**
 * GET /api/klines
 * 获取历史K线数据
 * 
 * 查询参数:
 * - network: 网络标识 (必需)
 * - pair_address: 交易对地址 (必需)
 * - limit: 返回条数，默认100，最大1000 (可选)
 * - interval: K线周期，支持 '30s', '1m', '15m'，默认'1m' (可选)
 * 
 * 返回格式:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "network": "11155111",
 *       "pair_address": "0x...",
 *       "interval_type": "1m",
 *       "timestamp": "2024-01-01T00:00:00.000Z",
 *       "open": "100.0",
 *       "high": "105.0",
 *       "low": "98.0",
 *       "close": "103.0",
 *       "volume": "1000.0"
 *     }
 *   ],
 *   "count": 50
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const rawNetwork = searchParams.get('network');
    const pairAddress = searchParams.get('pair_address');
    const limitParam = searchParams.get('limit');
    const interval = searchParams.get('interval') || '1m';
    
    // 验证必需参数
    if (!rawNetwork) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: network' 
        },
        { status: 400 }
      );
    }
    
    // 标准化网络ID
    const network = normalizeNetworkId(rawNetwork);
    
    if (!pairAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: pair_address' 
        },
        { status: 400 }
      );
    }
    
    // 验证interval参数
    const validIntervals = ['30s', '1m', '15m'];
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // 处理limit参数
    let limit = 100; // 默认值
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid limit parameter. Must be a positive integer.' 
          },
          { status: 400 }
        );
      }
      
      // 限制最大值
      limit = Math.min(parsedLimit, 1000);
    }
    
    // 添加调试信息
    console.log('🔍 K线查询参数:', {
      rawNetwork,
      normalizedNetwork: network,
      pairAddress,
      intervalType: interval,
      limit,
      orderDirection: 'DESC'
    });
    
    // 查询K线数据
    const klines = await getKlines({
      network,
      pairAddress,
      intervalType: interval as '30s' | '1m' | '15m',
      limit,
      orderDirection: 'DESC'
    });
    
    console.log('✅ K线查询结果:', {
      resultCount: klines.length,
      firstResult: klines[0] || null
    });
    
    return NextResponse.json({
      success: true,
      data: klines,
      count: klines.length,
      params: {
        network: rawNetwork,          // 原始网络参数
        normalizedNetwork: network,   // 标准化后的网络参数
        pair_address: pairAddress,
        interval,
        limit
      },
      debug: {
        networkMapping: { from: rawNetwork, to: network },
        queryParams: { network, pairAddress, intervalType: interval, limit },
        resultCount: klines.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching klines:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while fetching klines data' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/klines
 * 手动触发K线数据完成（用于测试和管理）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { network, pair_address, before_timestamp } = body;
    
    if (!network || !pair_address) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: network and pair_address' 
        },
        { status: 400 }
      );
    }
    
    // 导入K线服务
    const { forceCompleteKlineData } = await import('../../../services/kline');
    
    // 强制完成K线
    await forceCompleteKlineData(network, pair_address, before_timestamp);
    
    return NextResponse.json({
      success: true,
      message: 'K-line data completion triggered successfully'
    });
    
  } catch (error) {
    console.error('Error triggering kline completion:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while triggering kline completion' 
      },
      { status: 500 }
    );
  }
}