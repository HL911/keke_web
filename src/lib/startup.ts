import { startTradeListener } from '../services/trade-listener'

// 应用启动时初始化事件监听
export async function initializeApp() {
  console.log('Initializing application...')
  
  try {
    // 启动Trade事件监听
    await startTradeListener()
    console.log('Application initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
  }
}

initializeApp()