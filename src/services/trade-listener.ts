import { createPublicClient, http, webSocket } from 'viem'
import { sepolia, foundry } from 'viem/chains'
import { getDatabase } from '../app/api/utils/sqlite-db'
import { getAllNetworkPoolAddresses } from '../hooks/useContract'
import poolAbi from '../abi/Pool.json'

// 网络配置映射
const NETWORK_CONFIG: Record<number, {
  chain: any;
  wsUrls: string[];
  httpUrls: string[];
}> = {
  [sepolia.id]: {
    chain: sepolia,
    wsUrls: [
      process.env.RPC_URL_SEPOLIA_WEBSOCKETS_1,
      process.env.RPC_URL_SEPOLIA_WEBSOCKETS_2
    ].filter(Boolean) as string[],
    httpUrls: [
      process.env.RPC_URL_SEPOLIA_HTTPS_1,
      process.env.RPC_URL_SEPOLIA_HTTPS_2
    ].filter(Boolean) as string[]
  }
}

// 活跃的监听器映射
const activeListeners = new Map<number, () => void>()

// 为指定链ID创建客户端 - 优先使用WebSocket，失败时使用HTTP
const createClient = async (chainId: number) => {
  const config = NETWORK_CONFIG[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  // 优先尝试WebSocket连接
  for (const wsUrl of config.wsUrls) {
    try {
      console.log(`Attempting WebSocket connection for chain ${chainId}:`, wsUrl)
      const client = createPublicClient({
        chain: config.chain,
        transport: webSocket(wsUrl)
      })
      console.log(`WebSocket connection successful for chain ${chainId}`)
      return client
    } catch (error) {
      console.warn(`WebSocket connection failed for chain ${chainId}:`, error)
    }
  }

  // 回退到HTTP连接
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
      console.warn(`HTTP connection failed for chain ${chainId}:`, error)
    }
  }

  throw new Error(`Failed to create client for chain ${chainId}: no working RPC URLs`)
}

// 获取指定链的Pool合约地址
const getPoolAddress = (chainId: number): string | null => {
  const networkAddresses = getAllNetworkPoolAddresses()
  const network = networkAddresses.find(n => n.chainId === chainId)
  return network?.address || null
}

// 获取所有支持的链ID
const getSupportedChains = (): number[] => {
  return getAllNetworkPoolAddresses().map(n => n.chainId)
}

// 保存Trade事件到数据库
async function saveTradeEvent(event: any) {
  try {
    const db = await getDatabase()
    await db.run(`
      INSERT INTO trade_events (
        tx_hash, block_number, user_address, 
        token_amount, eth_amount, token_address, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      event.transactionHash,
      Number(event.blockNumber),
      event.args.user,
      event.args.tokenAmount.toString(),
      event.args.ethAmount.toString(),
      event.args.mint,
      new Date().toISOString()
    ])
    
    console.log(`Trade event saved for chain ${event.chainId}:`, event.transactionHash)
  } catch (error) {
    console.error('Error saving trade event:', error)
  }
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
        // 移除失败的监听器
        activeListeners.delete(chainId)
        // 尝试重新连接
        setTimeout(() => {
          console.log(`Attempting to restart listener for chain ${chainId}...`)
          startListenerForChain(chainId)
        }, 5000)
      }
    })
    
    // 保存监听器引用
    activeListeners.set(chainId, unwatch)
    console.log(`Trade event listener started successfully for chain ${chainId}`)
  } catch (error) {
    console.error(`Failed to start Trade event listener for chain ${chainId}:`, error)
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
  
  activeListeners.forEach((unwatch, chainId) => {
    try {
      unwatch()
      console.log(`Stopped listener for chain ${chainId}`)
    } catch (error) {
      console.error(`Error stopping listener for chain ${chainId}:`, error)
    }
  })
  
  activeListeners.clear()
  console.log('All Trade event listeners stopped')
}

