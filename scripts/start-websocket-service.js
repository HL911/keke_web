#!/usr/bin/env node

/**
 * WebSocket服务启动脚本
 * 用于启动K线WebSocket服务进行测试
 */

// 动态导入ES模块
async function startWebSocketService() {
  try {
    console.log('正在启动WebSocket K线服务...');
    
    // 导入WebSocket服务器模块
    const { startKlineWebSocketServer } = require('../src/services/websocket-server.ts');
    
    // 启动服务
    await startKlineWebSocketServer();
    
    console.log('✅ WebSocket K线服务启动成功');
    console.log('📡 服务地址: ws://localhost:8081/kline-ws');
    console.log('🔍 使用 Ctrl+C 停止服务');
    
    // 保持进程运行
    process.on('SIGINT', async () => {
      console.log('\n正在关闭WebSocket服务...');
      const { stopKlineWebSocketServer } = require('../src/services/websocket-server.ts');
      await stopKlineWebSocketServer();
      console.log('✅ WebSocket服务已关闭');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ 启动WebSocket服务失败:', error.message);
    
    // 错误分析
    if (error.message.includes('WebSocket library not available')) {
      console.log('\n💡 解决方案:');
      console.log('请安装WebSocket依赖: npm install ws @types/ws');
    } else if (error.message.includes('EADDRINUSE')) {
      console.log('\n💡 解决方案:');
      console.log('端口8081已被占用，请关闭其他WebSocket服务或更改端口');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  startWebSocketService();
}

module.exports = { startWebSocketService };
