import { startTradeListener } from '../services/trade-listener'
import { startKlineWebSocketServer } from '../services/websocket-server'

// 全局标志防止重复初始化
let isInitialized = false;

// 应用启动时初始化事件监听
export async function initializeApp() {
  // 防止重复初始化
  if (isInitialized) {
    console.log('Application already initialized, skipping...');
    return;
  }
  // 只在服务端环境中启动事件监听器
  if (typeof window === 'undefined') {
    console.log('Initializing application...')
    
    try {
      // 设置初始化标志
      isInitialized = true;
      
      // 启动WebSocket服务器
      await startKlineWebSocketServer()
      console.log('K-line WebSocket server started')
      
      // 启动Trade事件监听
      await startTradeListener()
      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      // 重置标志以允许重试
      isInitialized = false;
    }
  }
}

// 全局标志防止重复执行模块级初始化
let moduleInitialized = false;

// 延迟执行以确保在服务端环境中正确初始化
if (typeof window === 'undefined' && !moduleInitialized) {
  moduleInitialized = true;
  setTimeout(() => {
    initializeApp()
  }, 1000)
}