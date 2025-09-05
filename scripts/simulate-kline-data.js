#!/usr/bin/env node

/**
 * K线数据模拟器 - 用于测试WebSocket实时数据推送功能
 * 模拟交易数据并触发K线生成，验证前端组件的实时更新
 */

// 使用动态 import 加载 TypeScript 模块
let klineService;
let broadcastKlineUpdate;

async function loadServices() {
  try {
    // 使用动态 import 加载服务模块 (需要先编译)
    const klineModule = await import('../src/services/kline.ts');
    const wsModule = await import('../src/services/websocket-server.ts');
    
    klineService = klineModule.klineService;
    broadcastKlineUpdate = wsModule.broadcastKlineUpdate;
    
    return true;
  } catch (error) {
    log('error', '无法加载服务模块，使用模拟模式:', error.message);
    
    // 创建模拟服务
    klineService = {
      startKlineGenerationForPair: (network, pairAddress) => {
        log('info', `🎭 [模拟模式] 启动K线生成: ${network}:${pairAddress}`);
      },
      processTradeData: async (tradeData) => {
        log('info', `🎭 [模拟模式] 处理交易数据:`, {
          price: tradeData.price,
          amount: tradeData.amount
        });
        return Promise.resolve();
      },
      getCachedKlines: (network, pairAddress) => {
        log('info', `🎭 [模拟模式] 获取缓存K线: ${network}:${pairAddress}`);
        return [];
      },
      getActivePairs: () => ['sepolia:0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C']
    };
    
    broadcastKlineUpdate = (network, pairAddress) => {
      log('info', `🎭 [模拟模式] 广播K线更新: ${network}:${pairAddress}`);
    };
    
    return false;
  }
}

// 模拟配置
const SIMULATION_CONFIG = {
  network: 'sepolia',
  pairAddress: '0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C',
  basePrice: 0.42814, // KEKE代币基础价格
  volatility: 0.05,   // 价格波动率 (5%)
  intervalMs: 5000,   // 每5秒生成一个交易
  maxTrades: 20       // 最多生成20个交易
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 生成随机价格变动
function generatePriceChange(currentPrice, volatility) {
  const change = (Math.random() - 0.5) * 2 * volatility; // -5% 到 +5%
  const newPrice = currentPrice * (1 + change);
  return Math.max(newPrice, 0.001); // 确保价格不为负
}

// 生成随机交易量
function generateVolume() {
  return (Math.random() * 1000 + 100).toFixed(2); // 100-1100 之间的随机数
}

// 生成模拟交易数据
function generateTradeData(network, pairAddress, price) {
  const amount = generateVolume();
  
  return {
    amount: amount,
    price: price.toFixed(8),
    address: pairAddress,
    network: network,
    timestamp: Date.now()
  };
}

// 启动K线数据模拟器
async function startKlineSimulation() {
  log('info', '🚀 启动K线数据模拟器');
  log('info', '配置信息:', SIMULATION_CONFIG);
  
  // 加载服务模块
  log('info', '📦 加载服务模块...');
  const servicesLoaded = await loadServices();
  
  if (!servicesLoaded) {
    log('warning', '⚠️ 服务模块加载失败，将使用模拟模式进行测试');
  } else {
    log('success', '✅ 服务模块加载成功');
  }
  
  let currentPrice = SIMULATION_CONFIG.basePrice;
  let tradeCount = 0;
  
  // 启动该交易对的K线生成
  log('info', '📊 启动K线生成服务...');
  klineService.startKlineGenerationForPair(
    SIMULATION_CONFIG.network, 
    SIMULATION_CONFIG.pairAddress
  );
  
  const interval = setInterval(async () => {
    try {
      // 生成新的价格
      currentPrice = generatePriceChange(currentPrice, SIMULATION_CONFIG.volatility);
      
      // 生成模拟交易数据
      const tradeData = generateTradeData(
        SIMULATION_CONFIG.network,
        SIMULATION_CONFIG.pairAddress,
        currentPrice
      );
      
      tradeCount++;
      log('info', `💰 生成第${tradeCount}个模拟交易:`, {
        price: tradeData.price,
        amount: tradeData.amount,
        timestamp: new Date(tradeData.timestamp).toISOString()
      });
      
      // 处理交易数据，生成K线
      await klineService.processTradeData(tradeData);
      log('success', '✅ K线数据已生成和缓存');
      
      // 广播K线更新（这会触发WebSocket推送）
      broadcastKlineUpdate(SIMULATION_CONFIG.network, SIMULATION_CONFIG.pairAddress);
      log('success', '📡 K线数据已广播给WebSocket客户端');
      
      // 检查是否达到最大交易数
      if (tradeCount >= SIMULATION_CONFIG.maxTrades) {
        log('info', `🎯 已达到最大交易数量 (${SIMULATION_CONFIG.maxTrades})，停止模拟`);
        clearInterval(interval);
        
        // 显示最终统计
        setTimeout(() => {
          showFinalStats();
        }, 2000);
      }
      
    } catch (error) {
      log('error', '生成模拟数据失败:', error);
    }
  }, SIMULATION_CONFIG.intervalMs);
  
  // 处理进程退出
  process.on('SIGINT', () => {
    log('info', '🛑 收到中断信号，停止模拟...');
    clearInterval(interval);
    showFinalStats();
    process.exit(0);
  });
  
  log('info', `⏰ 模拟器已启动，每${SIMULATION_CONFIG.intervalMs/1000}秒生成一个交易`);
  log('info', '使用 Ctrl+C 停止模拟');
}

// 显示最终统计信息
function showFinalStats() {
  log('info', '📊 模拟统计信息:');
  
  // 获取缓存的K线数据
  const cachedKlines = klineService.getCachedKlines(
    SIMULATION_CONFIG.network, 
    SIMULATION_CONFIG.pairAddress
  );
  
  console.table({
    '生成的交易数': tradeCount,
    '缓存的K线数': cachedKlines.length,
    '最终价格': currentPrice.toFixed(8),
    '价格变化': `${((currentPrice - SIMULATION_CONFIG.basePrice) / SIMULATION_CONFIG.basePrice * 100).toFixed(2)}%`
  });
  
  if (cachedKlines.length > 0) {
    log('info', '最新K线数据样例:');
    console.log(JSON.stringify(cachedKlines[cachedKlines.length - 1], null, 2));
  }
  
  // 获取活跃的交易对
  const activePairs = klineService.getActivePairs();
  log('info', `活跃的交易对: ${activePairs.length}个`);
  activePairs.forEach(pair => console.log(`  - ${pair}`));
}

// 运行模拟器
if (require.main === module) {
  startKlineSimulation().catch(error => {
    log('error', '模拟器启动失败:', error);
    process.exit(1);
  });
}

module.exports = { startKlineSimulation, generateTradeData };
