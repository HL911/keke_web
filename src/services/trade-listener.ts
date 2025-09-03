import { createPublicClient, http, webSocket, formatEther } from 'viem'
import { sepolia, foundry } from 'viem/chains'
import { insertTradeEvent } from "../app/api/utils/trade-events-queries"
import { processTradeForKlines } from './kline'
import poolAbi from '../abi/Pool.json'
import sepoliaAddresses from '../config/address/sepolia.json'

// 网络配置映射
const NETWORK_CONFIG: Record<number, {
  chain: any;
  wsUrls: string[];
  httpUrls: string[];
}> = {
  [sepolia.id]: {
    chain: sepolia,
    wsUrls: [
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_WEBSOCKETS_1,
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_WEBSOCKETS_2
    ].filter(Boolean) as string[],
    httpUrls: [
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_1,
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_2
    ].filter(Boolean) as string[]
  }
}

// 活跃的监听器映射
const activeListeners = new Map<number, () => void>()

// 健康检查定时器映射
const healthCheckTimers = new Map<number, NodeJS.Timeout>()

// 连接状态映射
const connectionStatus = new Map<number, boolean>()

// WebSocket URL索引映射，用于轮换URL
const wsUrlIndex = new Map<number, number>()

// 错误计数映射，用于跟踪连续错误次数
const errorCount = new Map<number, number>()

// 为指定链ID创建客户端 - 优先使用WebSocket，失败时使用HTTP
const createClient = async (chainId: number) => {
  const config = NETWORK_CONFIG[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  // 获取当前WebSocket URL索引
  let currentIndex = wsUrlIndex.get(chainId) || 0
  const wsUrls = config.wsUrls
  
  // 尝试所有WebSocket连接，从当前索引开始
  for (let i = 0; i < wsUrls.length; i++) {
    const urlIndex = (currentIndex + i) % wsUrls.length
    const wsUrl = wsUrls[urlIndex]
    
    try {
      console.log(`Attempting WebSocket connection for chain ${chainId} (URL ${urlIndex + 1}/${wsUrls.length}):`, wsUrl)
      const client = createPublicClient({
        chain: config.chain,
        transport: webSocket(wsUrl)
      })
      
      // 连接成功，更新索引并重置错误计数
      wsUrlIndex.set(chainId, urlIndex)
      errorCount.set(chainId, 0)
      console.log(`WebSocket connection successful for chain ${chainId}`)
      return client
    } catch (error: any) {
      console.warn(`WebSocket connection failed for ${wsUrl}:`, error?.message || error)
      
      // 如果是429错误，立即切换到下一个URL
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        console.log(`Rate limit detected, switching to next WebSocket URL for chain ${chainId}`)
        continue
      }
    }
  }

  // 如果所有WebSocket连接都失败，尝试HTTP连接
  for (const httpUrl of config.httpUrls) {
    try {
      console.log(`Attempting HTTP connection for chain ${chainId}:`, httpUrl)
      const client = createPublicClient({
        chain: config.chain,
        transport: http(httpUrl)
      })
      console.log(`HTTP connection successful for chain ${chainId}`)
      return client
    } catch (error) {
      console.warn(`HTTP connection failed for ${httpUrl}:`, error)
      continue
    }
  }

  throw new Error(`All connection attempts failed for chain ${chainId}`)
}

// 服务端网络配置 - 避免调用客户端hook
const SERVER_NETWORK_CONTRACTS: Record<number, { poolAddress: string }> = {
  [sepolia.id]: {
    poolAddress: sepoliaAddresses.poolAddress
  }
}

// 获取指定链的Pool合约地址
const getPoolAddress = (chainId: number): string | null => {
  return SERVER_NETWORK_CONTRACTS[chainId]?.poolAddress || null
}

// 获取所有支持的链ID
const getSupportedChains = (): number[] => {
  return Object.keys(SERVER_NETWORK_CONTRACTS).map(Number)
}

// 保存Trade事件到数据库
async function saveTradeEvent(event: any) {
  try {
    const tradeEventData = {
      network: event.chainId.toString(),
      tx_hash: event.transactionHash,
      user_address: event.args.user,
      token_amount: formatEther(event.args.tokenAmount),
      eth_amount: formatEther(event.args.ethAmount),
      token_address: event.args.mint,
      isBuy: event.args.isBuy,
      price: (Number(event.args.ethAmount) / Number(event.args.tokenAmount)).toString(),
      timestamp: new Date().toISOString()
    }
    
    // 保存交易事件到数据库
    await insertTradeEvent(tradeEventData)
    console.log(`Trade event saved for chain ${event.chainId}:`, event.transactionHash)
    
    // 触发K线数据聚合
    const klineTradeData = {
      amount: tradeEventData.token_amount, 
      price: tradeEventData.price,
      address: tradeEventData.token_address, // 代币地址作为交易对地址
      network: tradeEventData.network
    }
    
    await processTradeForKlines(klineTradeData)
    console.log(`K-line data processed for trade:`, event.transactionHash)
    

    
  } catch (error) {
    console.error('Error saving trade event or processing K-line:', error)
  }
}

// 健康检查函数
const performHealthCheck = async (chainId: number, client: any) => {
  try {
    // 尝试获取最新区块号来检查连接状态
    await client.getBlockNumber()
    
    // 如果之前连接断开，现在恢复了
    if (!connectionStatus.get(chainId)) {
      console.log(`Connection restored for chain ${chainId}`)
      connectionStatus.set(chainId, true)
    }
    
    return true
  } catch (error) {
    console.warn(`Health check failed for chain ${chainId}:`, error)
    
    // 标记连接断开
    if (connectionStatus.get(chainId)) {
      console.error(`Connection lost for chain ${chainId}, attempting reconnection...`)
      connectionStatus.set(chainId, false)
      
      // 停止当前监听器
      const unwatch = activeListeners.get(chainId)
      if (unwatch) {
        try {
          unwatch()
        } catch (e) {
          console.warn(`Error stopping listener for chain ${chainId}:`, e)
        }
        activeListeners.delete(chainId)
      }
      
      // 立即尝试重连
      setTimeout(() => {
        startListenerForChain(chainId)
      }, 1000)
    }
    
    return false
  }
}

// 启动健康检查
const startHealthCheck = (chainId: number, client: any) => {
  // 清除之前的定时器
  const existingTimer = healthCheckTimers.get(chainId)
  if (existingTimer) {
    clearInterval(existingTimer)
  }
  
  // 每30秒进行一次健康检查
  const timer = setInterval(() => {
    performHealthCheck(chainId, client)
  }, 30000)
  
  healthCheckTimers.set(chainId, timer)
  console.log(`Health check started for chain ${chainId}`)
}

// 为特定链启动事件监听
const startListenerForChain = async (chainId: number) => {
  const poolAddress = getPoolAddress(chainId)
  
  if (!poolAddress) {
    console.error(`Pool contract address not found for chain ${chainId}`)
    return
  }

  try {
    // 创建客户端连接
    const client = await createClient(chainId)
    
    console.log(`Starting Trade event listener for chain ${chainId}...`)
    console.log(`Pool address: ${poolAddress}`)
    
    // 设置连接状态为已连接
    connectionStatus.set(chainId, true)
    
    // 启动健康检查
    startHealthCheck(chainId, client)
    
    // 监听Trade事件
    const unwatch = client.watchContractEvent({
      address: poolAddress as `0x${string}`,
      abi: poolAbi,
      eventName: 'Trade',
      onLogs: (logs: any[]) => {
        logs.forEach((log: any) => {
          // 添加链ID信息到事件数据
          saveTradeEvent({ ...log, chainId })
        })
      },
      onError: (error: any) => {
        console.error(`Trade listener error for chain ${chainId}:`, error)
        
        // 标记连接断开
        connectionStatus.set(chainId, false)
        
        // 移除失败的监听器
        activeListeners.delete(chainId)
        
        // 停止健康检查
        const timer = healthCheckTimers.get(chainId)
        if (timer) {
          clearInterval(timer)
          healthCheckTimers.delete(chainId)
        }
        
        // 增加错误计数
        const currentErrorCount = errorCount.get(chainId) || 0
        errorCount.set(chainId, currentErrorCount + 1)
        
        // 如果是429错误或连续错误次数较多，切换到下一个WebSocket URL
        if (error?.message?.includes('429') || error?.message?.includes('rate limit') || currentErrorCount >= 3) {
          const currentIndex = wsUrlIndex.get(chainId) || 0
          const config = NETWORK_CONFIG[chainId]
          if (config && config.wsUrls.length > 1) {
            const nextIndex = (currentIndex + 1) % config.wsUrls.length
            wsUrlIndex.set(chainId, nextIndex)
            console.log(`Switching to next WebSocket URL for chain ${chainId} (index: ${nextIndex})`)
            errorCount.set(chainId, 0) // 重置错误计数
          }
        }
        
        // 计算重连延迟，根据错误次数递增
        const retryDelay = Math.min(5000 + (currentErrorCount * 2000), 30000) // 最大30秒
        
        // 尝试重新连接
        setTimeout(() => {
          console.log(`Attempting to restart listener for chain ${chainId}... (retry delay: ${retryDelay}ms)`)
          startListenerForChain(chainId)
        }, retryDelay)
      }
    })
    
    // 保存监听器引用
    activeListeners.set(chainId, unwatch)
    console.log(`Trade event listener started successfully for chain ${chainId}`)
  } catch (error: any) {
    console.error(`Failed to start Trade event listener for chain ${chainId}:`, error)
    
    // 标记连接失败
    connectionStatus.set(chainId, false)
    
    // 增加错误计数
    const currentErrorCount = errorCount.get(chainId) || 0
    errorCount.set(chainId, currentErrorCount + 1)
    
    // 如果是429错误，切换到下一个WebSocket URL
    if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      const currentIndex = wsUrlIndex.get(chainId) || 0
      const config = NETWORK_CONFIG[chainId]
      if (config && config.wsUrls.length > 1) {
        const nextIndex = (currentIndex + 1) % config.wsUrls.length
        wsUrlIndex.set(chainId, nextIndex)
        console.log(`Rate limit detected, switching to next WebSocket URL for chain ${chainId} (index: ${nextIndex})`)
        errorCount.set(chainId, 0) // 重置错误计数
      }
    }
    
    // 计算重连延迟，根据错误次数递增
    const retryDelay = Math.min(10000 + (currentErrorCount * 3000), 60000) // 最大60秒
    
    // 延迟重试
    setTimeout(() => {
      console.log(`Retrying connection for chain ${chainId}... (retry delay: ${retryDelay}ms)`)
      startListenerForChain(chainId)
    }, retryDelay)
  }
}

// 启动所有支持网络的事件监听
export async function startTradeListener() {
  console.log('Starting Trade event listeners for all supported chains...')
  
  const supportedChains = getSupportedChains()
  
  // 为每个支持的网络启动监听器
  const promises = supportedChains.map(chainId => startListenerForChain(chainId))
  
  try {
    await Promise.allSettled(promises)
    console.log('All Trade event listeners initialization completed')
  } catch (error) {
    console.error('Error starting Trade event listeners:', error)
  }
}

// 停止所有事件监听
export function stopTradeListener() {
  console.log('Stopping all Trade event listeners...')
  
  // 停止所有监听器
  activeListeners.forEach((unwatch, chainId) => {
    try {
      unwatch()
      console.log(`Stopped listener for chain ${chainId}`)
    } catch (error) {
      console.error(`Error stopping listener for chain ${chainId}:`, error)
    }
  })
  
  // 停止所有健康检查定时器
  healthCheckTimers.forEach((timer, chainId) => {
    try {
      clearInterval(timer)
      console.log(`Stopped health check for chain ${chainId}`)
    } catch (error) {
      console.error(`Error stopping health check for chain ${chainId}:`, error)
    }
  })
  
  // 清空所有映射
  activeListeners.clear()
  healthCheckTimers.clear()
  connectionStatus.clear()
  
  console.log('All Trade event listeners and health checks stopped')
}

// 获取连接状态
export function getConnectionStatus(): Record<number, boolean> {
  const status: Record<number, boolean> = {}
  connectionStatus.forEach((isConnected, chainId) => {
    status[chainId] = isConnected
  })
  return status
}

// 获取当前WebSocket URL状态
export function getWebSocketStatus(): Record<number, { currentUrlIndex: number, errorCount: number, totalUrls: number }> {
  const status: Record<number, { currentUrlIndex: number, errorCount: number, totalUrls: number }> = {}
  
  for (const chainId of getSupportedChains()) {
    const config = NETWORK_CONFIG[chainId]
    if (config) {
      status[chainId] = {
        currentUrlIndex: wsUrlIndex.get(chainId) || 0,
        errorCount: errorCount.get(chainId) || 0,
        totalUrls: config.wsUrls.length
      }
    }
  }
  
  return status
}

// 手动切换WebSocket URL
export function switchWebSocketUrl(chainId: number): boolean {
  const config = NETWORK_CONFIG[chainId]
  if (!config || config.wsUrls.length <= 1) {
    return false
  }
  
  const currentIndex = wsUrlIndex.get(chainId) || 0
  const nextIndex = (currentIndex + 1) % config.wsUrls.length
  wsUrlIndex.set(chainId, nextIndex)
  errorCount.set(chainId, 0) // 重置错误计数
  
  console.log(`Manually switched WebSocket URL for chain ${chainId} to index ${nextIndex}`)
  
  // 重启监听器以使用新的URL
  if (activeListeners.has(chainId)) {
    stopTradeListener()
    setTimeout(() => {
      startListenerForChain(chainId)
    }, 1000)
  }
  
  return true
}

// 手动触发健康检查
export async function triggerHealthCheck(chainId?: number) {
  if (chainId) {
    // 检查特定链
    const client = await createClient(chainId)
    return await performHealthCheck(chainId, client)
  } else {
    // 检查所有链
    const results: Record<number, boolean> = {}
    for (const [chainId] of connectionStatus) {
      try {
        const client = await createClient(chainId)
        results[chainId] = await performHealthCheck(chainId, client)
      } catch (error) {
        console.error(`Failed to perform health check for chain ${chainId}:`, error)
        results[chainId] = false
      }
    }
    return results
  }
}

