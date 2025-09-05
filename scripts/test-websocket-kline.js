#!/usr/bin/env node

/**
 * WebSocket K线数据推送测试脚本
 * 用于验证WebSocket服务的数据推送能力和数据格式
 */

const WebSocket = require('ws');

// 测试配置
const WS_URL = 'ws://localhost:8081/kline-ws';
const TEST_CONFIG = {
  network: 'sepolia',
  pairAddress: '0x123...', // 测试用的交易对地址
  intervals: ['1m', '15m']
};

// 消息统计
const messageStats = {
  connected: false,
  totalMessages: 0,
  klineUpdates: 0,
  tradeUpdates: 0,
  pingPongs: 0,
  errors: 0
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function testWebSocketKline() {
  log('info', '开始WebSocket K线数据测试');
  log('info', `连接目标: ${WS_URL}`);
  
  return new Promise((resolve, reject) => {
    let ws;
    let testTimeout;
    let connectionTimeout;
    
    try {
      ws = new WebSocket(WS_URL);
      
      // 连接超时设置
      connectionTimeout = setTimeout(() => {
        log('error', 'WebSocket连接超时');
        ws.terminate();
        reject(new Error('Connection timeout'));
      }, 10000);
      
      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        messageStats.connected = true;
        log('info', 'WebSocket连接成功建立');
        
        // 发送订阅消息
        const subscribeMessage = {
          type: 'subscribe',
          data: {
            network: TEST_CONFIG.network,
            pairAddress: TEST_CONFIG.pairAddress,
            intervals: TEST_CONFIG.intervals
          },
          timestamp: Date.now()
        };
        
        log('info', '发送订阅消息:', subscribeMessage);
        ws.send(JSON.stringify(subscribeMessage));
        
        // 设置测试持续时间为30秒
        testTimeout = setTimeout(() => {
          log('info', '测试时间结束，关闭连接');
          ws.close();
        }, 30000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messageStats.totalMessages++;
          
          log('info', `收到消息 [类型: ${message.type}]`);
          
          switch (message.type) {
            case 'ping':
              messageStats.pingPongs++;
              log('debug', 'Ping消息', message);
              
              // 回复pong
              const pongMessage = {
                type: 'pong',
                timestamp: Date.now()
              };
              ws.send(JSON.stringify(pongMessage));
              log('debug', '发送Pong回复');
              break;
              
            case 'subscribe':
              log('info', '订阅确认', message);
              break;
              
            case 'kline_update':
              messageStats.klineUpdates++;
              log('info', 'K线数据更新', {
                network: message.data?.network,
                pairAddress: message.data?.pairAddress,
                klinesCount: message.data?.klines?.length || 0,
                sampleKline: message.data?.klines?.[0] || 'N/A'
              });
              
              // 验证K线数据格式
              if (message.data?.klines?.length > 0) {
                const kline = message.data.klines[0];
                const expectedFields = [
                  'network', 'pair_address', 'interval_type', 'timestamp',
                  'open_price', 'high_price', 'low_price', 'close_price', 'volume'
                ];
                
                const missingFields = expectedFields.filter(field => !(field in kline));
                if (missingFields.length > 0) {
                  log('warning', `K线数据缺少字段: ${missingFields.join(', ')}`, kline);
                } else {
                  log('success', 'K线数据格式验证通过');
                  
                  // 检查数据类型
                  log('debug', 'K线数据类型检查:', {
                    timestamp: typeof kline.timestamp + ' (' + kline.timestamp + ')',
                    open_price: typeof kline.open_price + ' (' + kline.open_price + ')',
                    high_price: typeof kline.high_price + ' (' + kline.high_price + ')',
                    low_price: typeof kline.low_price + ' (' + kline.low_price + ')',
                    close_price: typeof kline.close_price + ' (' + kline.close_price + ')',
                    volume: typeof kline.volume + ' (' + kline.volume + ')'
                  });
                }
              }
              break;
              
            case 'trade_update':
              messageStats.tradeUpdates++;
              log('info', '交易数据更新', message.data);
              break;
              
            case 'error':
              messageStats.errors++;
              log('error', 'WebSocket错误消息', message.data);
              break;
              
            default:
              log('warning', `未知消息类型: ${message.type}`, message);
          }
        } catch (error) {
          log('error', 'JSON解析失败', { error: error.message, rawData: data.toString() });
          messageStats.errors++;
        }
      });
      
      ws.on('close', (code, reason) => {
        clearTimeout(testTimeout);
        clearTimeout(connectionTimeout);
        
        log('info', `WebSocket连接关闭 [代码: ${code}, 原因: ${reason || 'N/A'}]`);
        
        // 打印统计信息
        log('info', '测试统计结果:');
        console.table(messageStats);
        
        if (messageStats.totalMessages > 0) {
          log('success', 'WebSocket测试完成');
          resolve(messageStats);
        } else {
          log('warning', '未收到任何消息，可能服务未运行或配置错误');
          resolve(messageStats);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(testTimeout);
        clearTimeout(connectionTimeout);
        
        log('error', 'WebSocket连接错误', { 
          message: error.message,
          code: error.code,
          address: error.address,
          port: error.port 
        });
        messageStats.errors++;
        
        // 常见错误分析
        if (error.code === 'ECONNREFUSED') {
          log('error', '连接被拒绝 - WebSocket服务可能未启动');
          log('info', '解决方案: 请确保运行了WebSocket服务器');
        } else if (error.code === 'ENOTFOUND') {
          log('error', '域名解析失败 - 请检查连接地址');
        }
        
        reject(error);
      });
      
    } catch (error) {
      log('error', '创建WebSocket连接失败', error);
      reject(error);
    }
  });
}

// 检查WebSocket服务器状态
async function checkWebSocketServerStatus() {
  log('info', '检查WebSocket服务器状态...');
  
  // 尝试通过HTTP检查服务器健康状态（如果有健康检查端点）
  try {
    const fetch = require('node-fetch').default;
    const healthUrl = 'http://localhost:8081/health';
    const response = await fetch(healthUrl, { timeout: 5000 });
    
    if (response.ok) {
      const data = await response.json();
      log('success', 'WebSocket服务器健康检查通过', data);
      return true;
    } else {
      log('warning', `WebSocket服务器健康检查失败: ${response.status}`);
    }
  } catch (error) {
    log('info', 'WebSocket服务器HTTP健康检查不可用 (这是正常的)');
  }
  
  return false;
}

// 主测试函数
async function main() {
  console.log('='.repeat(60));
  console.log('WebSocket K线数据推送测试');
  console.log('='.repeat(60));
  
  try {
    // 检查服务器状态
    await checkWebSocketServerStatus();
    
    // 执行WebSocket测试
    const result = await testWebSocketKline();
    
    // 分析测试结果
    if (result.connected) {
      if (result.klineUpdates > 0) {
        log('success', '✅ WebSocket K线数据推送功能正常');
      } else if (result.totalMessages > 0) {
        log('warning', '⚠️ WebSocket连接正常，但未收到K线更新数据');
        log('info', '可能原因: 没有活跃的交易对或K线数据尚未生成');
      } else {
        log('warning', '⚠️ WebSocket连接建立但未收到任何消息');
      }
    } else {
      log('error', '❌ WebSocket连接失败');
    }
    
  } catch (error) {
    log('error', '测试执行失败:', error);
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebSocketKline, checkWebSocketServerStatus };
