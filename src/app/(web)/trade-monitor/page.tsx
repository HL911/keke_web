'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'


interface TradeData {
  txHash: string
  userAddress: string
  tokenAmount: string
  ethAmount: string
  tokenAddress: string
  isBuy: boolean
  price: string
  timestamp: string
}

interface WSMessage {
  type: string
  data?: {
    network: string
    pairAddress: string
    trade: TradeData
  }
  timestamp?: number
}

export default function TradeMonitorPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [trades, setTrades] = useState<TradeData[]>([])
  const [network, setNetwork] = useState('11155111') // Sepolia
  const [pairAddress, setPairAddress] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  const wsRef = useRef<WebSocket | null>(null)

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8081/kline-ws')
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('Connected')
        
        // 如果有配置的交易对地址，自动订阅
        if (pairAddress) {
          subscribe()
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          console.log('Received message:', message)
          
          if (message.type === 'trade_update' && message.data) {
            setTrades(prev => [message.data!.trade, ...prev.slice(0, 49)]) // 保留最新50条
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setConnectionStatus('Disconnected')
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('Error')
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setConnectionStatus('Failed to connect')
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const subscribe = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && pairAddress) {
      const subscribeMessage = {
        type: 'subscribe',
        data: {
          network,
          pairAddress
        }
      }
      wsRef.current.send(JSON.stringify(subscribeMessage))
      console.log('Subscribed to:', subscribeMessage)
    }
  }

  const unsubscribe = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && pairAddress) {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        data: {
          network,
          pairAddress
        }
      }
      wsRef.current.send(JSON.stringify(unsubscribeMessage))
      console.log('Unsubscribed from:', unsubscribeMessage)
    }
  }

  const clearTrades = () => {
    setTrades([])
  }

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(6)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          交易数据监控
        </h1>
        <p className="text-gray-600 mt-2">实时监控区块链交易数据</p>
      </div>

      {/* 连接控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            WebSocket 连接控制
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="network">网络 ID</Label>
              <Input
                id="network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="11155111 (Sepolia)"
              />
            </div>
            <div>
              <Label htmlFor="pairAddress">交易对地址</Label>
              <Input
                id="pairAddress"
                value={pairAddress}
                onChange={(e) => setPairAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={connectWebSocket} 
              disabled={isConnected}
              variant="default"
            >
              连接 WebSocket
            </Button>
            <Button 
              onClick={disconnect} 
              disabled={!isConnected}
              variant="outline"
            >
              断开连接
            </Button>
            <Button 
              onClick={subscribe} 
              disabled={!isConnected || !pairAddress}
              variant="secondary"
            >
              订阅交易数据
            </Button>
            <Button 
              onClick={unsubscribe} 
              disabled={!isConnected || !pairAddress}
              variant="secondary"
            >
              取消订阅
            </Button>
            <Button 
              onClick={clearTrades} 
              variant="destructive"
            >
              清空记录
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 交易数据展示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            实时交易数据
            <Badge variant="outline">
              {trades.length} 条记录
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] overflow-y-auto">
            {trades.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无交易数据，请连接 WebSocket 并订阅交易对
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade, index) => (
                  <Card key={`${trade.txHash}-${index}`} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500">交易哈希</Label>
                        <div className="font-mono">{formatAddress(trade.txHash)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">用户地址</Label>
                        <div className="font-mono">{formatAddress(trade.userAddress)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">交易类型</Label>
                        <Badge variant={trade.isBuy ? 'default' : 'destructive'}>
                          {trade.isBuy ? '买入' : '卖出'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">代币数量</Label>
                        <div>{formatAmount(trade.tokenAmount)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">ETH 数量</Label>
                        <div>{formatAmount(trade.ethAmount)} ETH</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">价格</Label>
                        <div>{formatAmount(trade.price)} ETH</div>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label className="text-xs text-gray-500">时间戳</Label>
                        <div>{new Date(trade.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}