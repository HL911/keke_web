#!/usr/bin/env node

/**
 * WebSocket集成测试脚本
 * 验证完整的K线数据流：数据生成 -> WebSocket推送 -> 前端接收
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');

// 测试配置
const TEST_CONFIG = {
  websocketUrl: 'ws://localhost:8081/kline-ws',
  network: 'sepolia',
  pairAddress: '0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C',
  testDurationMs: 30000, // 30秒测试时间
  expectedKlineUpdates: 3 // 预期至少收到3个K线更新
};

// 测试结果统计
const testResults = {
  websocketConnected: false,
  subscriptionConfirmed: false,
  klineUpdatesReceived: 0,
  uniqueKlineIntervals: new Set(),
  validKlineData: 0,
  invalidKlineData: 0,
  errors: [],
  receivedKlines: []
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data && typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else if (data) {
    console.log(data);
  }
}

// 验证K线数据格式
function validateKlineData(kline) {
  const requiredFields = [
    'network', 'pair_address', 'interval_type', 'timestamp',
    'open_price', 'high_price', 'low_price', 'close_price', 'volume'
  ];
  
  const errors = [];
  
  // 检查必需字段
  for (const field of requiredFields) {
    if (!(field in kline)) {
      errors.push(`缺少字段: ${field}`);
    }
  }
  
  // 检查数值字段
  const numericFields = ['open_price', 'high_price', 'low_price', 'close_price', 'volume'];
  for (const field of numericFields) {
    if (kline[field] !== undefined) {
      const value = parseFloat(kline[field]);
      if (isNaN(value) || value < 0) {
        errors.push(`${field}不是有效的正数: ${kline[field]}`);
      }
    }
  }
  
  // 检查OHLC关系
  if (kline.high_price && kline.low_price && kline.open_price && kline.close_price) {
    const high = parseFloat(kline.high_price);
    const low = parseFloat(kline.low_price);
    const open = parseFloat(kline.open_price);
    const close = parseFloat(kline.close_price);
    
    if (high < Math.max(open, close) || low > Math.min(open, close)) {
      errors.push('OHLC关系不合理: high < max(open,close) 或 low > min(open,close)');
    }
  }
  
  return errors;
}

// 启动数据模拟器
function startDataSimulator() {
  return new Promise((resolve, reject) => {
    log('info', '🚀 启动数据模拟器...');
    
    const simulator = spawn('node', ['scripts/simulate-kline-data.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let simulatorOutput = '';
    
    simulator.stdout.on('data', (data) => {
      const output = data.toString();
      simulatorOutput += output;
      // 显示模拟器输出
      console.log(`[SIMULATOR] ${output.trim()}`);
    });
    
    simulator.stderr.on('data', (data) => {
      console.error(`[SIMULATOR ERROR] ${data.toString()}`);
    });
    
    simulator.on('error', (error) => {
      log('error', '数据模拟器启动失败:', error.message);
      reject(error);
    });
    
    // 等待一段时间让模拟器启动
    setTimeout(() => {
      log('success', '✅ 数据模拟器已启动');
      resolve({
        process: simulator,
        output: simulatorOutput
      });
    }, 2000);
  });
}

// 测试WebSocket连接和数据接收
function testWebSocketDataFlow() {
  return new Promise((resolve, reject) => {
    log('info', '📡 开始WebSocket数据流测试...');
    
    let ws;
    const testTimeout = setTimeout(() => {
      if (ws) ws.close();
      log('warning', '⏰ 测试超时');
      resolve(testResults);
    }, TEST_CONFIG.testDurationMs);
    
    try {
      ws = new WebSocket(TEST_CONFIG.websocketUrl);
      
      ws.on('open', () => {
        log('success', '✅ WebSocket连接建立');
        testResults.websocketConnected = true;
        
        // 发送订阅消息
        const subscription = {
          type: 'subscribe',
          data: {
            network: TEST_CONFIG.network,
            pairAddress: TEST_CONFIG.pairAddress,
            intervals: ['1m', '15m']
          },
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(subscription));
        log('info', '📨 发送订阅消息:', subscription.data);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'ping':
              // 回复pong
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
              
            case 'subscribe':
              log('success', '✅ 订阅确认');
              testResults.subscriptionConfirmed = true;
              break;
              
            case 'kline_update':
              testResults.klineUpdatesReceived++;
              log('info', `📊 收到K线更新 #${testResults.klineUpdatesReceived}`);
              
              if (message.data?.klines && Array.isArray(message.data.klines)) {
                message.data.klines.forEach(kline => {
                  // 验证K线数据
                  const errors = validateKlineData(kline);
                  if (errors.length === 0) {
                    testResults.validKlineData++;
                    testResults.uniqueKlineIntervals.add(kline.interval_type);
                    testResults.receivedKlines.push({
                      interval: kline.interval_type,
                      timestamp: kline.timestamp,
                      price: kline.close_price,
                      volume: kline.volume
                    });
                    
                    log('success', `✅ 有效K线数据 (${kline.interval_type}):`, {
                      price: kline.close_price,
                      volume: kline.volume,
                      timestamp: new Date(typeof kline.timestamp === 'number' ? kline.timestamp : kline.timestamp).toISOString()
                    });
                  } else {
                    testResults.invalidKlineData++;
                    testResults.errors.push(`K线数据验证失败: ${errors.join(', ')}`);
                    log('error', '❌ 无效K线数据:', errors);
                  }
                });
              }
              break;
              
            case 'error':
              testResults.errors.push(`WebSocket服务器错误: ${JSON.stringify(message.data)}`);
              log('error', '❌ 服务器错误:', message.data);
              break;
              
            default:
              log('debug', `收到其他类型消息: ${message.type}`);
          }
          
        } catch (error) {
          testResults.errors.push(`消息解析错误: ${error.message}`);
          log('error', '❌ 消息解析失败:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        testResults.errors.push(`WebSocket连接错误: ${error.message}`);
        log('error', '❌ WebSocket错误:', error.message);
        clearTimeout(testTimeout);
        reject(error);
      });
      
      ws.on('close', () => {
        log('info', 'WebSocket连接关闭');
        clearTimeout(testTimeout);
        resolve(testResults);
      });
      
    } catch (error) {
      testResults.errors.push(`创建WebSocket连接失败: ${error.message}`);
      log('error', '❌ 创建连接失败:', error.message);
      clearTimeout(testTimeout);
      reject(error);
    }
  });
}

// 生成测试报告
function generateTestReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 WebSocket集成测试报告');
  console.log('='.repeat(80));
  
  const testsPassed = [];
  const testsFailed = [];
  const testsWarning = [];
  
  // 连接测试
  if (results.websocketConnected) {
    testsPassed.push('WebSocket连接建立');
  } else {
    testsFailed.push('WebSocket连接失败');
  }
  
  // 订阅测试
  if (results.subscriptionConfirmed) {
    testsPassed.push('K线数据订阅成功');
  } else {
    testsFailed.push('K线数据订阅失败');
  }
  
  // K线数据接收测试
  if (results.klineUpdatesReceived >= TEST_CONFIG.expectedKlineUpdates) {
    testsPassed.push(`K线更新接收正常 (${results.klineUpdatesReceived}/${TEST_CONFIG.expectedKlineUpdates})`);
  } else if (results.klineUpdatesReceived > 0) {
    testsWarning.push(`K线更新数量不足 (${results.klineUpdatesReceived}/${TEST_CONFIG.expectedKlineUpdates})`);
  } else {
    testsFailed.push('未收到K线更新数据');
  }
  
  // 数据质量测试
  if (results.validKlineData > 0) {
    testsPassed.push(`K线数据格式验证通过 (${results.validKlineData}条)`);
  }
  
  if (results.invalidKlineData > 0) {
    testsFailed.push(`发现无效K线数据 (${results.invalidKlineData}条)`);
  }
  
  // 时间间隔测试
  if (results.uniqueKlineIntervals.size > 0) {
    testsPassed.push(`K线时间间隔覆盖: ${Array.from(results.uniqueKlineIntervals).join(', ')}`);
  }
  
  // 显示测试结果
  console.log('\n✅ 通过的测试:');
  testsPassed.forEach(test => console.log(`  ✓ ${test}`));
  
  if (testsWarning.length > 0) {
    console.log('\n⚠️ 警告:');
    testsWarning.forEach(test => console.log(`  ⚠ ${test}`));
  }
  
  if (testsFailed.length > 0) {
    console.log('\n❌ 失败的测试:');
    testsFailed.forEach(test => console.log(`  ✗ ${test}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n🐛 错误详情:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // 统计摘要
  console.log('\n📈 统计摘要:');
  console.table({
    'WebSocket连接': results.websocketConnected ? '成功' : '失败',
    '订阅确认': results.subscriptionConfirmed ? '成功' : '失败',
    'K线更新次数': results.klineUpdatesReceived,
    '有效K线数据': results.validKlineData,
    '无效K线数据': results.invalidKlineData,
    '时间间隔种类': results.uniqueKlineIntervals.size,
    '错误数量': results.errors.length
  });
  
  // 最新K线数据样例
  if (results.receivedKlines.length > 0) {
    console.log('\n📊 最新K线数据样例:');
    console.table(results.receivedKlines.slice(-3)); // 显示最新3条
  }
  
  // 总体评估
  const totalTests = testsPassed.length + testsFailed.length + testsWarning.length;
  const passRate = (testsPassed.length / totalTests * 100).toFixed(1);
  
  console.log('\n🎯 总体评估:');
  if (testsFailed.length === 0) {
    console.log(`🎉 所有测试通过! (通过率: ${passRate}%)`);
    console.log('✅ WebSocket实时K线数据推送功能正常工作');
  } else if (testsFailed.length <= testsWarning.length) {
    console.log(`⚠️ 部分功能正常 (通过率: ${passRate}%)`);
    console.log('💡 建议检查失败的测试项并优化');
  } else {
    console.log(`❌ 测试失败 (通过率: ${passRate}%)`);
    console.log('🔧 需要修复主要功能问题');
  }
  
  console.log('='.repeat(80));
}

// 主测试函数
async function runIntegrationTest() {
  console.log('🧪 WebSocket K线数据集成测试');
  console.log('='.repeat(80));
  
  let simulator = null;
  
  try {
    // 1. 启动数据模拟器
    log('info', '第1步: 启动数据模拟器');
    const simResult = await startDataSimulator();
    simulator = simResult.process;
    
    // 2. 等待一段时间让K线数据生成
    log('info', '第2步: 等待K线数据生成...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. 测试WebSocket数据流
    log('info', '第3步: 测试WebSocket数据接收');
    const results = await testWebSocketDataFlow();
    
    // 4. 生成测试报告
    log('info', '第4步: 生成测试报告');
    generateTestReport(results);
    
  } catch (error) {
    log('error', '集成测试失败:', error.message);
    console.error(error);
  } finally {
    // 清理：停止模拟器
    if (simulator && !simulator.killed) {
      log('info', '🧹 清理: 停止数据模拟器');
      simulator.kill('SIGTERM');
      setTimeout(() => {
        if (!simulator.killed) {
          simulator.kill('SIGKILL');
        }
      }, 2000);
    }
  }
}

// 运行测试
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

module.exports = { runIntegrationTest, validateKlineData };
