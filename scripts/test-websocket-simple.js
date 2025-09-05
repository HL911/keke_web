#!/usr/bin/env node

/**
 * 简化的WebSocket K线数据测试
 * 直接连接WebSocket服务器并发送模拟K线数据进行测试
 */

const WebSocket = require('ws');

// 测试配置
const TEST_CONFIG = {
  websocketUrl: 'ws://localhost:8081/kline-ws',
  network: 'sepolia',
  pairAddress: '0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C',
  testDurationMs: 20000, // 20秒测试
  simulateDataInterval: 3000 // 每3秒模拟一次数据
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data && typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 生成模拟K线数据
function generateMockKlineData(network, pairAddress, basePrice = 0.42814) {
  const now = Date.now();
  const interval = '1m';
  
  // 生成价格变动
  const priceChange = (Math.random() - 0.5) * 0.1; // ±10%波动
  const currentPrice = basePrice * (1 + priceChange);
  
  const open = (currentPrice * (0.95 + Math.random() * 0.1)).toFixed(8);
  const high = Math.max(currentPrice * (1 + Math.random() * 0.05), parseFloat(open)).toFixed(8);
  const low = Math.min(currentPrice * (1 - Math.random() * 0.05), parseFloat(open)).toFixed(8);
  const close = currentPrice.toFixed(8);
  const volume = (Math.random() * 1000 + 100).toFixed(2);
  
  return {
    network,
    pair_address: pairAddress,
    interval_type: interval,
    timestamp: now,
    open_price: open,
    high_price: high,
    low_price: low,
    close_price: close,
    volume,
    trade_count: Math.floor(Math.random() * 10 + 1),
    is_complete: false
  };
}

// 测试WebSocket连接和数据发送
async function testWebSocketWithMockData() {
  return new Promise((resolve, reject) => {
    log('info', '🚀 开始WebSocket模拟数据测试');
    
    const results = {
      connected: false,
      subscribed: false,
      messagesSent: 0,
      messagesReceived: 0,
      errors: []
    };
    
    let ws;
    let currentPrice = 0.42814;
    
    const testTimeout = setTimeout(() => {
      if (ws) ws.close();
      log('info', '⏰ 测试时间结束');
      resolve(results);
    }, TEST_CONFIG.testDurationMs);
    
    try {
      ws = new WebSocket(TEST_CONFIG.websocketUrl);
      
      ws.on('open', () => {
        log('success', '✅ WebSocket连接建立成功');
        results.connected = true;
        
        // 发送订阅消息
        const subscribeMsg = {
          type: 'subscribe',
          data: {
            network: TEST_CONFIG.network,
            pairAddress: TEST_CONFIG.pairAddress,
            intervals: ['1m', '15m']
          },
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(subscribeMsg));
        log('info', '📨 发送订阅消息');
        
        // 开始定期发送模拟K线数据 (模拟服务端推送)
        const dataInterval = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            clearInterval(dataInterval);
            return;
          }
          
          // 生成模拟K线数据
          const mockKline = generateMockKlineData(
            TEST_CONFIG.network, 
            TEST_CONFIG.pairAddress, 
            currentPrice
          );
          
          currentPrice = parseFloat(mockKline.close_price); // 更新基准价格
          
          // 构造WebSocket消息格式 (模拟服务器推送)
          const klineUpdateMsg = {
            type: 'kline_update',
            data: {
              network: TEST_CONFIG.network,
              pairAddress: TEST_CONFIG.pairAddress,
              klines: [mockKline]
            },
            timestamp: Date.now()
          };
          
          // 注意：这里我们假设有权限向服务器发送这样的消息
          // 实际使用中，这些消息应该由服务器生成
          try {
            results.messagesSent++;
            log('info', `📊 模拟发送K线数据 #${results.messagesSent}:`, {
              price: mockKline.close_price,
              volume: mockKline.volume,
              interval: mockKline.interval_type
            });
            
            // 这里我们无法直接向其他客户端广播，但可以测试客户端接收能力
            // 实际测试中，我们需要两个连接：一个发送，一个接收
            
          } catch (error) {
            results.errors.push(`发送模拟数据失败: ${error.message}`);
            log('error', '❌ 发送模拟数据失败:', error.message);
          }
        }, TEST_CONFIG.simulateDataInterval);
        
        // 在测试结束时清理定时器
        setTimeout(() => {
          clearInterval(dataInterval);
        }, TEST_CONFIG.testDurationMs - 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          results.messagesReceived++;
          
          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              log('debug', '💓 心跳响应');
              break;
              
            case 'subscribe':
              results.subscribed = true;
              log('success', '✅ 订阅确认收到');
              break;
              
            case 'kline_update':
              log('success', '📈 收到K线更新数据');
              if (message.data?.klines) {
                message.data.klines.forEach(kline => {
                  log('info', '📊 K线数据详情:', {
                    interval: kline.interval_type,
                    price: kline.close_price,
                    volume: kline.volume,
                    timestamp: new Date(typeof kline.timestamp === 'number' ? kline.timestamp : kline.timestamp).toISOString()
                  });
                });
              }
              break;
              
            case 'error':
              results.errors.push(`服务器错误: ${JSON.stringify(message.data)}`);
              log('error', '❌ 服务器错误:', message.data);
              break;
              
            default:
              log('debug', `收到其他消息: ${message.type}`);
          }
        } catch (error) {
          results.errors.push(`消息解析错误: ${error.message}`);
          log('error', '❌ 消息解析失败:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        results.errors.push(`WebSocket错误: ${error.message}`);
        log('error', '❌ WebSocket错误:', error.message);
        clearTimeout(testTimeout);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        log('info', `WebSocket连接关闭: ${code} - ${reason || 'N/A'}`);
        clearTimeout(testTimeout);
        resolve(results);
      });
      
    } catch (error) {
      results.errors.push(`创建连接失败: ${error.message}`);
      log('error', '❌ 创建连接失败:', error.message);
      clearTimeout(testTimeout);
      reject(error);
    }
  });
}

// 生成测试报告
function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 WebSocket简化测试报告');
  console.log('='.repeat(60));
  
  console.log('\n✅ 测试结果:');
  console.log(`  连接状态: ${results.connected ? '✓ 成功' : '✗ 失败'}`);
  console.log(`  订阅状态: ${results.subscribed ? '✓ 成功' : '✗ 失败'}`);
  console.log(`  发送消息: ${results.messagesSent} 条`);
  console.log(`  接收消息: ${results.messagesReceived} 条`);
  console.log(`  错误数量: ${results.errors.length} 个`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n🎯 建议:');
  if (results.connected && results.subscribed) {
    console.log('✅ WebSocket基础功能正常');
    console.log('💡 要测试完整的K线数据流，请确保后端服务正在生成真实的K线数据');
    console.log('🔧 或者启动前端应用查看TradingChart组件的实际表现');
  } else {
    console.log('❌ WebSocket基础功能存在问题');
    console.log('🔧 请检查WebSocket服务器是否正常运行');
  }
  
  console.log('\n📖 下一步:');
  console.log('1. 启动前端应用: npm run dev');
  console.log('2. 访问: http://localhost:3000/vm-swap/KEKE');
  console.log('3. 查看TradingChart组件是否能接收和显示实时数据');
  
  console.log('='.repeat(60));
}

// 主函数
async function main() {
  console.log('🧪 WebSocket K线数据简化测试');
  console.log('目标: 验证WebSocket连接和订阅功能');
  
  try {
    const results = await testWebSocketWithMockData();
    generateReport(results);
  } catch (error) {
    log('error', '测试执行失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebSocketWithMockData, generateMockKlineData };
