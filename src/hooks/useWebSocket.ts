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
    maxReconnectAttempts = 10
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Subscription[]>([]);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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

    setIsConnecting(true);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket 连接成功');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        
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
              onError?.(message.data);
              break;
            default:
              console.log('收到未知消息类型:', message.type);
          }
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket 连接关闭:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();
        
        onDisconnect?.();
        
        // 自动重连
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        setIsConnecting(false);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      setIsConnecting(false);
      onError?.(error);
    }
  }, [url, onKlineUpdate, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval, maxReconnectAttempts, startHeartbeat, stopHeartbeat, resubscribe]);

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
    
    // 连接管理
    connect,
    disconnect,
    
    // 订阅管理
    subscribe,
    unsubscribe,
    
    // 消息发送
    sendMessage,
  };
}
