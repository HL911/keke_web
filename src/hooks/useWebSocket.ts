/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 17:45:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 17:45:00
 * @FilePath: /keke_web/src/hooks/useWebSocket.ts
 * @Description: WebSocket 客户端 Hook
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'kline_update' | 'ping' | 'pong' | 'error' | 'subscription_confirmed';
  data?: any;
  timestamp?: number;
}

export interface Subscription {
  network: string;
  pairAddress: string;
  intervals: string[]; // ['30s', '1m', '15m']
}

export interface KlineData {
  timestamp: string;
  open_price: string;
  high_price: string;
  low_price: string;
  close_price: string;
  volume: string;
  is_complete: boolean;
}

interface UseWebSocketOptions {
  url?: string;
  onKlineUpdate?: (data: KlineData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8081/kline-ws',
    onKlineUpdate,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5  // 限制重试次数不超过5次
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Subscription[]>([]);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasReachedMaxRetries, setHasReachedMaxRetries] = useState(false);

  // 发送消息
  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket 未连接，无法发送消息:', message);
    return false;
  }, []);

  // 订阅 K线数据
  const subscribe = useCallback((subscription: Subscription) => {
    const success = sendMessage({
      type: 'subscribe',
      data: subscription,
      timestamp: Date.now()
    });

    if (success) {
      // 添加到本地订阅列表
      const exists = subscriptionsRef.current.find(sub => 
        sub.network === subscription.network && 
        sub.pairAddress === subscription.pairAddress
      );
      
      if (!exists) {
        subscriptionsRef.current.push(subscription);
      } else {
        // 合并 intervals
        exists.intervals = Array.from(new Set([...exists.intervals, ...subscription.intervals]));
      }
    }

    return success;
  }, [sendMessage]);

  // 取消订阅
  const unsubscribe = useCallback((subscription: Subscription) => {
    const success = sendMessage({
      type: 'unsubscribe',
      data: subscription,
      timestamp: Date.now()
    });

    if (success) {
      // 从本地订阅列表移除
      subscriptionsRef.current = subscriptionsRef.current.filter(sub => 
        !(sub.network === subscription.network && sub.pairAddress === subscription.pairAddress)
      );
    }

    return success;
  }, [sendMessage]);

  // 重新订阅所有订阅
  const resubscribe = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      sendMessage({
        type: 'subscribe',
        data: subscription,
        timestamp: Date.now()
      });
    });
  }, [sendMessage]);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      sendMessage({
        type: 'ping',
        timestamp: Date.now()
      });
    }, 30000); // 30秒心跳
  }, [sendMessage]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // 已经连接
    }

    // 检查是否已达到最大重试次数
    if (hasReachedMaxRetries) {
      console.warn(`WebSocket 连接被阻止: 已达到最大重试次数 (${maxReconnectAttempts} 次)`);
      const retryLimitError = new Error(`连接被阻止: 已达到最大重试次数 (${maxReconnectAttempts} 次)，请手动重试或检查服务器状态`);
      onError?.(retryLimitError);
      return;
    }

    // 检查 WebSocket 是否可用
    if (typeof WebSocket === 'undefined') {
      const error = new Error('WebSocket 不可用 - 可能运行在服务器端环境');
      console.error('WebSocket 连接失败:', error.message);
      onError?.(error);
      return;
    }

    setIsConnecting(true);

    try {
      console.log(`尝试连接 WebSocket: ${url}`);
      const ws = new WebSocket(url);

      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          const timeoutError = new Error(`WebSocket 连接超时: ${url}`);
          console.error('WebSocket 连接超时:', timeoutError.message);
          setIsConnecting(false);
          onError?.(timeoutError);
        }
      }, 10000); // 10秒超时

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket 连接成功:', url);
        setIsConnected(true);
        setIsConnecting(false);
        
        // 重置重试状态
        reconnectAttemptsRef.current = 0;
        setHasReachedMaxRetries(false);
        
        // 启动心跳
        startHeartbeat();
        
        // 重新订阅
        setTimeout(() => {
          resubscribe();
        }, 100);
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'kline_update':
              if (message.data?.kline) {
                onKlineUpdate?.(message.data.kline);
              }
              break;
            case 'pong':
              console.log('收到心跳响应');
              break;
            case 'subscription_confirmed':
              console.log('订阅确认:', message.data);
              break;
            case 'error':
              console.error('WebSocket 服务器错误:', message.data);
              onError?.(new Error(`服务器错误: ${JSON.stringify(message.data)}`));
              break;
            default:
              console.log('收到未知消息类型:', message.type);
          }
        } catch (error) {
          const parseError = new Error(`解析 WebSocket 消息失败: ${error instanceof Error ? error.message : String(error)}`);
          console.error('解析 WebSocket 消息失败:', parseError.message);
          onError?.(parseError);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        
        let closeReason = '未知原因';
        let shouldReconnect = false;
        
        switch (event.code) {
          case 1000:
            closeReason = '正常关闭';
            break;
          case 1001:
            closeReason = '页面离开';
            break;
          case 1002:
            closeReason = '协议错误';
            shouldReconnect = true;
            break;
          case 1003:
            closeReason = '数据类型错误';
            shouldReconnect = true;
            break;
          case 1006:
            closeReason = '连接异常断开';
            shouldReconnect = true;
            break;
          case 1011:
            closeReason = '服务器错误';
            shouldReconnect = true;
            break;
          case 1012:
            closeReason = '服务重启';
            shouldReconnect = true;
            break;
          default:
            closeReason = `关闭代码: ${event.code}`;
            shouldReconnect = event.code !== 1000; // 除了正常关闭，其他情况都尝试重连
        }
        
        console.log(`WebSocket 连接关闭: ${closeReason} (${event.code})`, event.reason || '');
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();
        
        onDisconnect?.();
        
        // 智能重连策略 - 限制重试次数不超过5次
        if (autoReconnect && shouldReconnect) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const backoffDelay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1); // 指数退避
            console.log(`尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) 延迟 ${Math.min(backoffDelay, 30000)}ms`);
            setTimeout(() => {
              connect();
            }, Math.min(backoffDelay, 30000)); // 最大延迟30秒
          } else {
            // 达到最大重试次数
            setHasReachedMaxRetries(true);
            const maxRetriesError = new Error(`WebSocket 重连失败: 已达到最大重试次数 (${maxReconnectAttempts} 次)`);
            console.error('WebSocket 重连失败:', maxRetriesError.message);
            console.warn('请检查网络连接或 WebSocket 服务器状态');
            onError?.(maxRetriesError);
          }
        }
      };

      ws.onerror = (errorEvent) => {
        clearTimeout(connectionTimeout);
        
        // WebSocket 错误事件通常不包含详细信息
        let errorMessage = 'WebSocket 连接错误';
        
        // 尝试从不同属性获取错误信息
        if (errorEvent instanceof ErrorEvent) {
          errorMessage = errorEvent.message || errorMessage;
        }
        
        // 根据连接状态提供更有用的错误信息
        switch (ws.readyState) {
          case WebSocket.CONNECTING:
            errorMessage = `WebSocket 连接失败: 无法连接到 ${url}`;
            break;
          case WebSocket.OPEN:
            errorMessage = `WebSocket 连接中断: ${url}`;
            break;
          case WebSocket.CLOSING:
            errorMessage = `WebSocket 关闭时发生错误: ${url}`;
            break;
          case WebSocket.CLOSED:
            errorMessage = `WebSocket 已关闭，无法发送数据: ${url}`;
            break;
        }
        
        const wsError = new Error(errorMessage);
        console.error('WebSocket 错误:', wsError.message);
        setIsConnecting(false);
        onError?.(wsError);
      };

      wsRef.current = ws;
    } catch (error) {
      const connectionError = new Error(`创建 WebSocket 连接失败: ${error instanceof Error ? error.message : String(error)}`);
      console.error('创建 WebSocket 连接失败:', connectionError.message);
      setIsConnecting(false);
      onError?.(connectionError);
    }
  }, [url, onKlineUpdate, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval, maxReconnectAttempts, hasReachedMaxRetries, startHeartbeat, stopHeartbeat, resubscribe]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      stopHeartbeat();
      wsRef.current.close(1000, '客户端主动断开');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, [stopHeartbeat]);

  // 重置重试状态 - 手动重置重试计数器，允许重新尝试连接
  const resetRetryState = useCallback(() => {
    console.log('手动重置 WebSocket 重试状态');
    reconnectAttemptsRef.current = 0;
    setHasReachedMaxRetries(false);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // 状态
    isConnected,
    isConnecting,
    hasReachedMaxRetries,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts,
    
    // 连接管理
    connect,
    disconnect,
    resetRetryState,
    
    // 订阅管理
    subscribe,
    unsubscribe,
    
    // 消息发送
    sendMessage,
  };
}
