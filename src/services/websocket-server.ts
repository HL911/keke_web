import { getCachedKlineData } from './kline';
import { createServer, IncomingMessage } from 'http';
import { Socket } from 'net';

// 动态导入ws库以避免Next.js兼容性问题
let WebSocketServerClass: any;
let WebSocketClass: any;

// 类型定义
interface WebSocketType {
  readyState: number;
  on(event: string, listener: (...args: any[]) => void): void;
  send(data: string): void;
  close(): void;
}

interface WebSocketServerType {
  on(event: string, listener: (...args: any[]) => void): void;
  close(callback?: () => void): void;
}

if (typeof window === 'undefined') {
  // 只在服务端环境导入ws
  try {
    const ws = require('ws');
    WebSocketServerClass = ws.WebSocketServer || ws.Server;
    WebSocketClass = ws.WebSocket || ws;
  } catch (error) {
    console.warn('WebSocket library not available:', error);
  }
}

// 常量定义
const WEBSOCKET_OPEN = 1;

// WebSocket消息类型定义
export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'kline_update' | 'trade_update' | 'ping' | 'pong' | 'error';
  data?: any;
  timestamp?: number;
}

// 订阅信息接口
export interface Subscription {
  network?: string;
  pairAddress?: string;
  intervals?: string[]; // ['30s', '1m', '15m']
}

// 客户端连接信息
interface ClientConnection {
  ws: WebSocketType;
  id: string;
  subscriptions: Subscription[];
  lastPing: number;
}

// WebSocket服务器类
export class KlineWebSocketServer {
  private wss: WebSocketServerType | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private server: any = null;
  private port: number;
  private pingInterval: NodeJS.Timeout | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(port: number = 8081) { // 改为8081避免端口冲突
    this.port = port;
  }

  /**
   * 启动WebSocket服务器
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 检查是否已经在运行
        if (this.isRunning) {
          console.log(`WebSocket server is already running on port ${this.port}`);
          resolve();
          return;
        }

        // 创建HTTP服务器
        this.server = createServer();
        
        // 创建WebSocket服务器
        if (!WebSocketServerClass) {
          throw new Error('WebSocket library not available');
        }
        this.wss = new WebSocketServerClass({ 
          server: this.server,
          path: '/kline-ws'
        });

        // 处理WebSocket连接
        this.wss!.on('connection', (ws: WebSocketType, request: IncomingMessage) => {
          this.handleConnection(ws, request);
        });

        // 启动HTTP服务器
        this.server.listen(this.port, () => {
          console.log(`K-line WebSocket server started on port ${this.port}`);
          this.isRunning = true;
          
          // 启动心跳检测
          this.startPingInterval();
          
          // 启动定时广播
          this.startBroadcastInterval();
          
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('WebSocket server error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Failed to start WebSocket server:', error);
        reject(error);
      }
    });
  }

  /**
   * 停止WebSocket服务器
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = false;
      
      // 清理定时器
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      if (this.broadcastInterval) {
        clearInterval(this.broadcastInterval);
        this.broadcastInterval = null;
      }

      // 关闭所有客户端连接
      this.clients.forEach((client) => {
        if (client.ws.readyState === WEBSOCKET_OPEN) {
          client.ws.close();
        }
      });
      this.clients.clear();

      // 关闭WebSocket服务器
      if (this.wss) {
        this.wss.close(() => {
          console.log('WebSocket server closed');
        });
      }

      // 关闭HTTP服务器
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 处理新的WebSocket连接
   */
  private handleConnection(ws: WebSocketType, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      ws,
      id: clientId,
      subscriptions: [],
      lastPing: Date.now()
    };

    this.clients.set(clientId, client);
    console.log(`New WebSocket client connected: ${clientId}`);

    // 发送欢迎消息
    this.sendMessage(client, {
      type: 'ping',
      data: { message: 'Connected to K-line WebSocket server', clientId },
      timestamp: Date.now()
    });

    // 处理消息
    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.sendError(client, 'Invalid message format');
      }
    });

    // 处理连接关闭
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    // 处理连接错误
    ws.on('error', (error: Error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
      this.clients.delete(clientId);
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(client: ClientConnection, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(client, message.data);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscribe(client, message.data);
        break;
        
      case 'pong':
        client.lastPing = Date.now();
        break;
        
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * 处理订阅请求
   */
  private handleSubscribe(client: ClientConnection, subscription: Subscription): void {
    try {
      // 验证订阅参数
      if (!subscription.network || !subscription.pairAddress) {
        this.sendError(client, 'Missing required subscription parameters: network and pairAddress');
        return;
      }

      // 添加订阅
      client.subscriptions.push(subscription);
      
      console.log(`Client ${client.id} subscribed to:`, subscription);
      
      // 发送确认消息
      this.sendMessage(client, {
        type: 'subscribe',
        data: { 
          message: 'Subscription successful', 
          subscription 
        },
        timestamp: Date.now()
      });
      
      // 立即发送当前缓存的K线数据
      this.sendCurrentKlineData(client, subscription);
      
    } catch (error) {
      console.error('Error handling subscription:', error);
      this.sendError(client, 'Failed to process subscription');
    }
  }

  /**
   * 处理取消订阅请求
   */
  private handleUnsubscribe(client: ClientConnection, subscription: Subscription): void {
    try {
      // 移除匹配的订阅
      client.subscriptions = client.subscriptions.filter(sub => 
        !(sub.network === subscription.network && sub.pairAddress === subscription.pairAddress)
      );
      
      console.log(`Client ${client.id} unsubscribed from:`, subscription);
      
      this.sendMessage(client, {
        type: 'unsubscribe',
        data: { 
          message: 'Unsubscription successful', 
          subscription 
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error handling unsubscription:', error);
      this.sendError(client, 'Failed to process unsubscription');
    }
  }

  /**
   * 发送当前K线数据给客户端
   */
  private sendCurrentKlineData(client: ClientConnection, subscription: Subscription): void {
    try {
      const klineData = getCachedKlineData(subscription.network, subscription.pairAddress);
      
      if (klineData.length > 0) {
        this.sendMessage(client, {
          type: 'kline_update',
          data: {
            network: subscription.network,
            pairAddress: subscription.pairAddress,
            klines: klineData
          },
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error sending current kline data:', error);
    }
  }

  /**
   * 广播交易数据给所有订阅的客户端
   */
  public broadcastTradeUpdate(tradeData: any): void {
    console.log(`[DEBUG] broadcastTradeUpdate called for ${tradeData.network}:${tradeData.token_address}`);
    console.log(`[DEBUG] Server running: ${this.isRunning}`);
    
    if (!this.isRunning) return;
    
    try {
      const message: WSMessage = {
        type: 'trade_update',
        data: {
          network: tradeData.network,
          pairAddress: tradeData.token_address,
          trade: {
            txHash: tradeData.tx_hash,
            userAddress: tradeData.user_address,
            tokenAmount: tradeData.token_amount,
            ethAmount: tradeData.eth_amount,
            tokenAddress: tradeData.token_address,
            isBuy: tradeData.isBuy,
            price: tradeData.price,
            timestamp: tradeData.timestamp
          }
        },
        timestamp: Date.now()
      };

      console.log(`[DEBUG] Total clients: ${this.clients.size}`);
      
      // 发送给所有订阅了该交易对的客户端
      let sentCount = 0;
      this.clients.forEach((client) => {
        console.log(`[DEBUG] Client ${client.id} subscriptions:`, client.subscriptions);
        
        const hasSubscription = client.subscriptions.some(sub => 
          sub.network === tradeData.network && sub.pairAddress === tradeData.token_address
        );
        
        console.log(`[DEBUG] Client ${client.id} has subscription: ${hasSubscription}, readyState: ${client.ws.readyState}`);
        
        if (hasSubscription && client.ws.readyState === WEBSOCKET_OPEN) {
          this.sendMessage(client, message);
          sentCount++;
          console.log(`[DEBUG] Sent trade_update to client ${client.id}`);
        }
      });
      
      console.log(`[DEBUG] Sent trade_update to ${sentCount} clients`);
      
    } catch (error) {
      console.error('Error broadcasting trade update:', error);
    }
  }

  /**
   * 广播K线更新给所有订阅的客户端
   */
  public broadcastKlineUpdate(network: string, pairAddress: string): void {
    console.log(`[DEBUG] broadcastKlineUpdate called for ${network}:${pairAddress}`);
    console.log(`[DEBUG] Server running: ${this.isRunning}`);
    
    if (!this.isRunning) return;
    
    try {
      const klineData = getCachedKlineData(network, pairAddress);

      
      if (klineData.length === 0) {
        console.log(`[DEBUG] No kline data to broadcast, returning`);
        return;
      }
      
      const message: WSMessage = {
        type: 'kline_update',
        data: {
          network,
          pairAddress,
          klines: klineData
        },
        timestamp: Date.now()
      };

      console.log(`[DEBUG] Total clients: ${this.clients.size}`);
      
      // 发送给所有订阅了该交易对的客户端
      let sentCount = 0;
      this.clients.forEach((client) => {
        console.log(`[DEBUG] Client ${client.id} subscriptions:`, client.subscriptions);
        
        const hasSubscription = client.subscriptions.some(sub => 
          sub.network === network && sub.pairAddress === pairAddress
        );
        
        console.log(`[DEBUG] Client ${client.id} has subscription: ${hasSubscription}, readyState: ${client.ws.readyState}`);
        
        if (hasSubscription && client.ws.readyState === WEBSOCKET_OPEN) {
          this.sendMessage(client, message);
          sentCount++;
          console.log(`[DEBUG] Sent kline_update to client ${client.id}`);
        }
      });
      
      console.log(`[DEBUG] Sent kline_update to ${sentCount} clients`);
      
    } catch (error) {
      console.error('Error broadcasting kline update:', error);
    }
  }

  /**
   * 定时广播所有缓存的K线数据
   */
  private broadcastAllKlineData(): void {
    if (!this.isRunning) return;
    
    try {
      // 获取所有缓存的K线数据
      const allKlineData = getCachedKlineData();
      
      if (allKlineData.length === 0) return;
      
      // 按network和pairAddress分组
      const groupedData = new Map<string, any[]>();
      
      allKlineData.forEach(kline => {
        const key = `${kline.network}:${kline.pair_address}`;
        if (!groupedData.has(key)) {
          groupedData.set(key, []);
        }
        groupedData.get(key)!.push(kline);
      });
      
      // 广播每个交易对的数据
      groupedData.forEach((klines, key) => {
        const [network, pairAddress] = key.split(':');
        
        const message: WSMessage = {
          type: 'kline_update',
          data: {
            network,
            pairAddress,
            klines
          },
          timestamp: Date.now()
        };
        
        // 发送给订阅了该交易对的客户端
        this.clients.forEach((client) => {
          const hasSubscription = client.subscriptions.some(sub => 
            sub.network === network && sub.pairAddress === pairAddress
          );
          
          if (hasSubscription && client.ws.readyState === WEBSOCKET_OPEN) {
            this.sendMessage(client, message);
          }
        });
      });
      
    } catch (error) {
      console.error('Error broadcasting all kline data:', error);
    }
  }

  /**
   * 发送消息给客户端
   */
  private sendMessage(client: ClientConnection, message: WSMessage): void {
    try {
      if (client.ws.readyState === WEBSOCKET_OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  }

  /**
   * 发送错误消息给客户端
   */
  private sendError(client: ClientConnection, errorMessage: string): void {
    this.sendMessage(client, {
      type: 'error',
      data: { error: errorMessage },
      timestamp: Date.now()
    });
  }

  /**
   * 启动心跳检测
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30秒超时
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > timeout) {
          console.log(`Client ${clientId} ping timeout, closing connection`);
          client.ws.close();
          this.clients.delete(clientId);
        } else if (client.ws.readyState === WEBSOCKET_OPEN) {
          // 发送ping消息
          this.sendMessage(client, {
            type: 'ping',
            timestamp: now
          });
        }
      });
    }, 15000); // 每15秒检查一次
  }

  /**
   * 启动定时广播
   */
  private startBroadcastInterval(): void {
    this.broadcastInterval = setInterval(() => {
      this.broadcastAllKlineData();
    }, 1000); // 每1秒广播一次
  }

  /**
   * 生成客户端ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接状态
   */
  public getStatus(): {
    isRunning: boolean;
    port: number;
    clientCount: number;
    clients: { id: string; subscriptions: Subscription[] }[];
  } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      clientCount: this.clients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        subscriptions: client.subscriptions
      }))
    };
  }
}

// 导出单例实例
export const klineWebSocketServer = new KlineWebSocketServer(
  parseInt(process.env.WEBSOCKET_PORT || '8081', 10)
);

// 导出便捷函数
export function startKlineWebSocketServer(): Promise<void> {
  return klineWebSocketServer.start();
}

export function stopKlineWebSocketServer(): Promise<void> {
  return klineWebSocketServer.stop();
}

export function broadcastKlineUpdate(network: string, pairAddress: string): void {
  const klineData = getCachedKlineData(network, pairAddress);
  
  
  klineWebSocketServer.broadcastKlineUpdate(network, pairAddress);
}

export function broadcastTradeUpdate(tradeData: any): void {
  console.log(`[DEBUG] broadcastTradeUpdate called for ${tradeData.network}:${tradeData.token_address}`);
  klineWebSocketServer.broadcastTradeUpdate(tradeData);
}

export function getWebSocketServerStatus() {
  return klineWebSocketServer.getStatus();
}