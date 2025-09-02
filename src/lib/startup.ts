import { startTradeListener } from '../services/trade-listener'

// 应用启动时初始化事件监听
export async function initializeApp() {
  // 只在服务端环境中启动事件监听器
  if (typeof window === 'undefined') {
    console.log('Initializing application...')
    
    try {
      // 启动Trade事件监听
      await startTradeListener()
      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
    }
  }
}

// 延迟执行以确保在服务端环境中正确初始化
if (typeof window === 'undefined') {
  setTimeout(() => {
    initializeApp()
  }, 1000)
}