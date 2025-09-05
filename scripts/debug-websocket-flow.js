#!/usr/bin/env node

/**
 * WebSocket数据流调试脚本
 * 全面诊断：交易监听 -> K线生成 -> WebSocket推送 -> 前端接收
 */

const WebSocket = require('ws');

// 调试配置
const DEBUG_CONFIG = {
  websocketUrl: 'ws://localhost:8081/kline-ws',
  network: 'sepolia',
  pairAddress: '0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C', // 默认测试地址
  monitorDuration: 60000, // 监听60秒
  checkInterval: 10000 // 每10秒检查一次状态
};

// 诊断结果
const diagnostics = {
  websocketConnection: null,
  subscriptionStatus: null,
  messagesReceived: [],
  klineUpdatesCount: 0,
  lastKlineUpdate: null,
  serverStatus: null,
  errors: []
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

// 检查WebSocket服务器状态
async function checkWebSocketServerStatus() {
  log('info', '🔍 检查WebSocket服务器状态...');
  
  try {
    const response = await fetch('http://localhost:8081/health');
    if (response.ok) {
      const data = await response.json();
      diagnostics.serverStatus = { healthy: true, data };
      log('success', '✅ WebSocket服务器健康检查通过', data);
    } else {
      diagnostics.serverStatus = { healthy: false, status: response.status };
      log('warning', `⚠️ WebSocket服务器状态异常: ${response.status}`);
    }
  } catch (error) {
    diagnostics.serverStatus = { healthy: false, error: error.message };
    log('info', '💡 WebSocket服务器没有HTTP健康检查端点 (这是正常的)');
  }
}

// 检查数据库中的K线数据
async function checkDatabaseKlineData() {
  log('info', '🗄️ 检查数据库K线数据...');
  
  try {
    const response = await fetch(`http://localhost:3000/api/klines?network=${DEBUG_CONFIG.network}&pair_address=${DEBUG_CONFIG.pairAddress}&interval=1m&limit=10`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        log('success', `✅ 数据库中有 ${data.data.length} 条K线记录`);
        log('info', '最新K线记录:', {
          timestamp: data.data[0].timestamp,
          close: data.data[0].close,
          volume: data.data[0].volume
        });
        return data.data;
      } else {
        log('warning', '⚠️ 数据库中没有K线数据');
        return [];
      }
    } else {
      log('error', `❌ 无法访问K线API: ${response.status}`);
      return null;
    }
  } catch (error) {
    log('error', `❌ 检查数据库K线数据失败: ${error.message}`);
    return null;
  }
}

// 检查交易事件监听状态
async function checkTradeEventListener() {
  log('info', '👂 检查交易事件监听状态...');
  
  try {
    // 检查最近的交易记录
    const response = await fetch('http://localhost:3000/api/database-monitor');
    
    if (response.ok) {
      const data = await response.json();
      const tradeEvents = data.tables?.find(table => table.name === 'trade_events');
      
      if (tradeEvents && tradeEvents.count > 0) {
        log('success', `✅ 数据库中有 ${tradeEvents.count} 条交易记录`);
        
        // 获取最新交易
        const latestResponse = await fetch('http://localhost:3000/api/positions');
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          if (latestData.length > 0) {
            const latest = latestData[0];
            log('info', '最新交易记录:', {
              timestamp: latest.timestamp,
              tokenAddress: latest.token_address,
              price: latest.price,
              volume: latest.token_amount
            });
          }
        }
        
        return tradeEvents.count;
      } else {
        log('warning', '⚠️ 数据库中没有交易记录');
        return 0;
      }
    } else {
      log('error', `❌ 无法访问数据库监控API: ${response.status}`);
      return null;
    }
  } catch (error) {
    log('error', `❌ 检查交易事件监听失败: ${error.message}`);
    return null;
  }
}

// 监听WebSocket消息
async function monitorWebSocketMessages() {
  return new Promise((resolve, reject) => {
    log('info', '📡 开始监听WebSocket消息...');
    
    let ws;
    const monitorTimeout = setTimeout(() => {
      if (ws) ws.close();
      log('info', '⏰ 监听时间结束');
      resolve(diagnostics);
    }, DEBUG_CONFIG.monitorDuration);
    
    try {
      ws = new WebSocket(DEBUG_CONFIG.websocketUrl);
      
      ws.on('open', () => {
        diagnostics.websocketConnection = { status: 'connected', timestamp: new Date().toISOString() };
        log('success', '✅ WebSocket连接建立成功');
        
        // 发送订阅消息
        const subscribeMsg = {
          type: 'subscribe',
          data: {
            network: DEBUG_CONFIG.network,
            pairAddress: DEBUG_CONFIG.pairAddress,
            intervals: ['1m', '15m']
          },
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(subscribeMsg));
        log('info', '📨 发送订阅消息:', subscribeMsg.data);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          diagnostics.messagesReceived.push({
            type: message.type,
            timestamp: new Date().toISOString(),
            dataSize: JSON.stringify(message).length
          });
          
          log('info', `📬 收到消息: ${message.type}`);
          
          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              log('debug', '💓 心跳响应');
              break;
              
            case 'subscribe':
              diagnostics.subscriptionStatus = { confirmed: true, timestamp: new Date().toISOString() };
              log('success', '✅ 订阅确认');
              break;
              
            case 'kline_update':
              diagnostics.klineUpdatesCount++;
              diagnostics.lastKlineUpdate = {
                timestamp: new Date().toISOString(),
                dataCount: message.data?.klines?.length || 0
              };
              
              log('success', `🎉 收到K线更新 #${diagnostics.klineUpdatesCount}`);
              
              if (message.data?.klines && Array.isArray(message.data.klines)) {
                message.data.klines.forEach((kline, index) => {
                  log('info', `📊 K线数据 ${index + 1}:`, {
                    network: kline.network,
                    pair_address: kline.pair_address,
                    interval: kline.interval_type,
                    timestamp: new Date(typeof kline.timestamp === 'number' ? kline.timestamp : kline.timestamp).toISOString(),
                    prices: `O:${kline.open_price} H:${kline.high_price} L:${kline.low_price} C:${kline.close_price}`,
                    volume: kline.volume,
                    complete: kline.is_complete
                  });
                });
              }
              break;
              
            case 'trade_update':
              log('info', '💰 收到交易更新:', message.data);
              break;
              
            case 'error':
              diagnostics.errors.push({ type: 'websocket_server_error', message: message.data });
              log('error', '❌ 服务器错误:', message.data);
              break;
              
            default:
              log('debug', `收到其他消息: ${message.type}`);
          }
        } catch (error) {
          diagnostics.errors.push({ type: 'message_parse_error', message: error.message });
          log('error', '❌ 消息解析失败:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        diagnostics.errors.push({ type: 'websocket_connection_error', message: error.message });
        log('error', '❌ WebSocket错误:', error.message);
        clearTimeout(monitorTimeout);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        log('info', `WebSocket连接关闭: ${code} - ${reason || 'N/A'}`);
        clearTimeout(monitorTimeout);
        resolve(diagnostics);
      });
      
      // 定期检查状态
      const statusCheck = setInterval(() => {
        log('info', '📊 当前统计:', {
          连接状态: diagnostics.websocketConnection?.status || 'unknown',
          订阅状态: diagnostics.subscriptionStatus?.confirmed ? '已确认' : '未确认',
          消息总数: diagnostics.messagesReceived.length,
          K线更新: diagnostics.klineUpdatesCount,
          错误数量: diagnostics.errors.length
        });
      }, DEBUG_CONFIG.checkInterval);
      
      setTimeout(() => {
        clearInterval(statusCheck);
      }, DEBUG_CONFIG.monitorDuration);
      
    } catch (error) {
      diagnostics.errors.push({ type: 'websocket_creation_error', message: error.message });
      log('error', '❌ 创建WebSocket连接失败:', error.message);
      clearTimeout(monitorTimeout);
      reject(error);
    }
  });
}

// 生成诊断报告
function generateDiagnosticsReport(diagnostics, dbKlineData, tradeCount) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 WebSocket数据流诊断报告');
  console.log('='.repeat(80));
  
  // 1. 连接状态
  console.log('\n📡 WebSocket连接状态:');
  if (diagnostics.websocketConnection?.status === 'connected') {
    console.log('  ✅ WebSocket连接正常');
  } else {
    console.log('  ❌ WebSocket连接失败');
  }
  
  // 2. 订阅状态
  console.log('\n📊 订阅状态:');
  if (diagnostics.subscriptionStatus?.confirmed) {
    console.log('  ✅ K线数据订阅已确认');
  } else {
    console.log('  ❌ K线数据订阅未确认');
  }
  
  // 3. 数据库状态
  console.log('\n🗄️ 数据库状态:');
  if (tradeCount > 0) {
    console.log(`  ✅ 交易记录: ${tradeCount} 条`);
  } else {
    console.log('  ❌ 没有交易记录');
  }
  
  if (dbKlineData && dbKlineData.length > 0) {
    console.log(`  ✅ K线数据: ${dbKlineData.length} 条`);
  } else if (dbKlineData !== null) {
    console.log('  ❌ 没有K线数据');
  } else {
    console.log('  ⚠️ 无法检查K线数据');
  }
  
  // 4. WebSocket消息
  console.log('\n📬 WebSocket消息统计:');
  console.log(`  总消息数: ${diagnostics.messagesReceived.length}`);
  console.log(`  K线更新: ${diagnostics.klineUpdatesCount} 次`);
  
  if (diagnostics.lastKlineUpdate) {
    console.log(`  最后更新: ${diagnostics.lastKlineUpdate.timestamp}`);
  }
  
  // 5. 错误分析
  if (diagnostics.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    diagnostics.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. [${error.type}] ${error.message}`);
    });
  }
  
  // 6. 问题诊断
  console.log('\n🔧 问题诊断:');
  
  const issues = [];
  const suggestions = [];
  
  if (!diagnostics.websocketConnection || diagnostics.websocketConnection.status !== 'connected') {
    issues.push('WebSocket连接失败');
    suggestions.push('检查WebSocket服务器是否正在运行 (端口8081)');
  }
  
  if (!diagnostics.subscriptionStatus?.confirmed) {
    issues.push('订阅未确认');
    suggestions.push('检查订阅消息格式和服务器订阅处理逻辑');
  }
  
  if (tradeCount === 0) {
    issues.push('没有交易数据');
    suggestions.push('确认交易事件监听器正在运行并连接到正确的区块链网络');
  }
  
  if (dbKlineData !== null && dbKlineData.length === 0 && tradeCount > 0) {
    issues.push('有交易但没有K线数据');
    suggestions.push('检查K线聚合服务是否正常工作');
  }
  
  if (dbKlineData && dbKlineData.length > 0 && diagnostics.klineUpdatesCount === 0) {
    issues.push('有K线数据但WebSocket没有推送');
    suggestions.push('检查WebSocket广播逻辑和客户端订阅匹配');
  }
  
  if (issues.length === 0) {
    console.log('  🎉 没有发现明显问题！');
    console.log('  💡 如果图表仍不更新，请检查前端组件的数据处理逻辑');
  } else {
    console.log('  发现以下问题:');
    issues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue}`);
    });
    
    console.log('\n💡 建议解决方案:');
    suggestions.forEach((suggestion, index) => {
      console.log(`    ${index + 1}. ${suggestion}`);
    });
  }
  
  // 7. 详细信息
  console.log('\n📋 详细信息:');
  console.table({
    'WebSocket URL': DEBUG_CONFIG.websocketUrl,
    '网络': DEBUG_CONFIG.network,
    '交易对地址': DEBUG_CONFIG.pairAddress,
    '监听时长': `${DEBUG_CONFIG.monitorDuration/1000}秒`,
    '连接状态': diagnostics.websocketConnection?.status || 'unknown',
    '订阅确认': diagnostics.subscriptionStatus?.confirmed ? 'Yes' : 'No',
    '收到消息': diagnostics.messagesReceived.length,
    'K线更新': diagnostics.klineUpdatesCount,
    '错误数量': diagnostics.errors.length
  });
  
  console.log('='.repeat(80));
}

// 主函数
async function runDiagnostics() {
  console.log('🔍 启动WebSocket数据流全面诊断');
  console.log(`目标: ${DEBUG_CONFIG.websocketUrl}`);
  console.log(`网络: ${DEBUG_CONFIG.network}`);
  console.log(`交易对: ${DEBUG_CONFIG.pairAddress}`);
  console.log(`监听时长: ${DEBUG_CONFIG.monitorDuration/1000}秒`);
  console.log('='.repeat(80));
  
  try {
    // 1. 检查服务器状态
    await checkWebSocketServerStatus();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. 检查数据库数据
    const dbKlineData = await checkDatabaseKlineData();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 检查交易事件
    const tradeCount = await checkTradeEventListener();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 监听WebSocket消息
    log('info', `⏰ 开始 ${DEBUG_CONFIG.monitorDuration/1000} 秒监听...`);
    const finalDiagnostics = await monitorWebSocketMessages();
    
    // 5. 生成报告
    generateDiagnosticsReport(finalDiagnostics, dbKlineData, tradeCount);
    
  } catch (error) {
    log('error', '诊断执行失败:', error.message);
    console.error(error);
  }
}

// 运行诊断
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics };
