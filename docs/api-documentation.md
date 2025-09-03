# KekeSwap API 接口文档

## 概述

KekeSwap 提供了完整的 RESTful API 和 WebSocket 服务，支持去中心化交易所的所有核心功能，包括代币管理、交易对查询、用户持仓、K线数据等。

## 基础信息

- **API 基础 URL**: `http://localhost:3000/api`
- **WebSocket URL**: `ws://localhost:8081/kline-ws`
- **API 版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "details": "详细错误信息",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## REST API 接口

### 1. 系统健康检查

#### GET /api/health
获取系统健康状态和基本统计信息。

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "status": "connected",
    "activePairs": 15,
    "totalTVL": 1000000,
    "totalVolume24h": 500000
  }
}
```

### 2. 数据库监控

#### GET /api/database-monitor
获取数据库详细监控信息。

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "data": {
    "tables": {
      "trading_pairs": { "count": 50, "data": [...] },
      "tokens": { "count": 100, "data": [...] },
      "transactions": { "count": 1000, "data": [...] },
      "user_positions": { "count": 200, "data": [...] },
      "price_history": { "count": 5000, "data": [...] }
    },
    "database_info": {...},
    "table_list": [...]
  }
}
```

### 3. 代币管理

#### GET /api/tokens
获取代币列表或查询特定代币信息。

**查询参数**:
- `action`: 操作类型 (`verified`, `get`, `search`)
- `address`: 代币合约地址
- `symbol`: 代币符号
- `search`: 搜索关键词
- `limit`: 返回数量限制 (默认: 50)
- `offset`: 偏移量 (默认: 0)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "address": "0x...",
      "symbol": "KEKE",
      "name": "Keke Token",
      "decimals": 18,
      "total_supply": "1000000000",
      "price_usd": "1.25",
      "market_cap": "1250000000",
      "volume_24h": "5000000",
      "description": "KekeSwap平台代币",
      "logo_uri": "https://...",
      "is_verified": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/tokens
创建新代币记录。

**请求体**:
```json
{
  "address": "0x...",
  "symbol": "TOKEN",
  "name": "Token Name",
  "decimals": 18,
  "total_supply": "1000000",
  "price_usd": "1.0",
  "description": "代币描述",
  "logo_uri": "https://...",
  "twitterAddress": "@token",
  "telegramAddress": "@token_tg",
  "websiteAddress": "https://token.com",
  "is_verified": false
}
```

#### PUT /api/tokens
更新代币信息。

#### PATCH /api/tokens
更新代币价格。

### 4. Meme 代币管理

#### GET /api/meme-tokens
获取 Meme 代币列表。

**查询参数**:
- `action`: 操作类型 (`stats`, `latest`, `exists`, `get`, `search`)
- `address`: 代币地址
- `search`: 搜索关键词
- `limit`: 返回数量 (默认: 50)
- `offset`: 偏移量 (默认: 0)
- `orderBy`: 排序字段 (`created_at`, `market_cap`, `volume_24h`)
- `orderDirection`: 排序方向 (`ASC`, `DESC`)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "address": "0x...",
      "symbol": "MEME",
      "name": "Meme Token",
      "decimals": 18,
      "total_supply": "1000000",
      "price_usd": "0.001",
      "market_cap": "1000",
      "volume_24h": "500",
      "description": "有趣的Meme代币",
      "logo_uri": "https://...",
      "twitter_address": "@meme",
      "telegram_address": "@meme_tg",
      "website_address": "https://meme.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/meme-tokens
创建新的 Meme 代币。

#### PUT /api/meme-tokens
更新 Meme 代币信息。

### 5. 流动性池管理

#### GET /api/pools
获取流动性池列表。

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `sortBy`: 排序字段 (`tvl_usd`, `volume_24h`, `created_at`)
- `sortOrder`: 排序方向 (`asc`, `desc`)
- `search`: 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "pair_address": "0x...",
      "token0_address": "0x...",
      "token1_address": "0x...",
      "token0_symbol": "KEKE",
      "token1_symbol": "ETH",
      "reserve0": "1000000",
      "reserve1": "500",
      "tvl_usd": "1000000",
      "volume_24h": "50000",
      "apy": 45.2,
      "priceChange24h": 2.5,
      "feesGenerated24h": "150",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### POST /api/pools
创建新的流动性池记录。

### 6. 用户持仓管理

#### GET /api/positions
获取用户流动性持仓。

**查询参数**:
- `user`: 用户地址 (必需)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "user_address": "0x...",
      "pair_address": "0x...",
      "lp_balance": "1000",
      "token0_balance": "500",
      "token1_balance": "0.25",
      "totalValueUSD": 1250.50,
      "token0ValueUSD": 625.25,
      "token1ValueUSD": 625.25,
      "share": 0.1,
      "unrealizedPnL": 125.50,
      "fees24h": 5.25,
      "last_updated": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### PUT /api/positions
更新用户持仓信息。

**请求体**:
```json
{
  "userAddress": "0x...",
  "pairAddress": "0x...",
  "lpBalance": "1000",
  "token0Balance": "500",
  "token1Balance": "0.25"
}
```

### 7. K线数据查询

#### GET /api/klines
获取历史K线数据。

**查询参数**:
- `network`: 网络标识 (必需)
- `pair_address`: 交易对地址 (必需)
- `limit`: 返回条数 (默认: 100, 最大: 1000)
- `interval`: K线周期 (`30s`, `1m`, `15m`, 默认: `1m`)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "network": "11155111",
      "pair_address": "0x...",
      "interval_type": "1m",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "open": "100.0",
      "high": "105.0",
      "low": "98.0",
      "close": "103.0",
      "volume": "1000.0"
    }
  ],
  "count": 50
}
```

### 8. WebSocket 服务管理

#### GET /api/websocket
获取 WebSocket 服务器状态。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "port": 8081,
    "clientCount": 5,
    "clients": [
      {
        "id": "client-123",
        "subscriptions": [
          {
            "network": "ethereum",
            "pairAddress": "0x...",
            "intervals": ["30s", "1m"]
          }
        ]
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/websocket
WebSocket 服务器管理操作。

**请求体**:
```json
{
  "action": "status"
}
```

## WebSocket 接口

### 连接信息

- **WebSocket URL**: `ws://localhost:8081/kline-ws`
- **协议**: WebSocket
- **数据格式**: JSON

### 消息格式

所有 WebSocket 消息都使用以下基础格式：

```json
{
  "type": "消息类型",
  "data": {},
  "timestamp": 1640995200000
}
```

### 1. 订阅 K线数据

#### 发送订阅消息
```json
{
  "type": "subscribe",
  "data": {
    "network": "ethereum",
    "pairAddress": "0x...",
    "intervals": ["30s", "1m", "15m"]
  }
}
```

#### 订阅确认响应
```json
{
  "type": "subscription_confirmed",
  "data": {
    "network": "ethereum",
    "pairAddress": "0x...",
    "intervals": ["30s", "1m", "15m"],
    "subscriptionKey": "ethereum:0x...:30s,1m,15m"
  },
  "timestamp": 1640995200000
}
```

### 2. 取消订阅

#### 发送取消订阅消息
```json
{
  "type": "unsubscribe",
  "data": {
    "network": "ethereum",
    "pairAddress": "0x...",
    "intervals": ["30s"]
  }
}
```

### 3. K线数据推送

#### 接收 K线数据
```json
{
  "type": "kline_update",
  "data": {
    "network": "ethereum",
    "pairAddress": "0x...",
    "interval": "1m",
    "kline": {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "open_price": "100.0",
      "high_price": "105.0",
      "low_price": "98.0",
      "close_price": "103.0",
      "volume": "1000.0",
      "is_complete": true
    }
  },
  "timestamp": 1640995200000
}
```

### 4. 心跳检测

#### 发送心跳
```json
{
  "type": "ping"
}
```

#### 接收心跳响应
```json
{
  "type": "pong",
  "timestamp": 1640995200000
}
```

### 5. 错误消息

#### 错误响应格式
```json
{
  "type": "error",
  "data": {
    "code": "INVALID_SUBSCRIPTION",
    "message": "无效的订阅参数",
    "details": "network 参数不能为空"
  },
  "timestamp": 1640995200000
}
```

### 订阅策略

#### 1. 单个交易对订阅
```json
{
  "type": "subscribe",
  "data": {
    "network": "ethereum",
    "pairAddress": "0x...",
    "intervals": ["1m"]
  }
}
```

#### 2. 多时间间隔订阅
```json
{
  "type": "subscribe",
  "data": {
    "network": "ethereum",
    "pairAddress": "0x...",
    "intervals": ["30s", "1m", "15m"]
  }
}
```

#### 3. 多交易对订阅
发送多个订阅消息，每个消息订阅一个交易对。

### 连接管理

#### 自动重连机制
客户端应实现自动重连逻辑：

```javascript
class KlineWebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket 连接已建立');
      this.reconnectAttempts = 0;
      // 重新订阅之前的订阅
      this.resubscribe();
    };

    this.ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectInterval);
    }
  }
}
```

## 错误代码

### HTTP 状态码

- `200`: 请求成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误
- `503`: 服务不可用

### WebSocket 错误代码

- `INVALID_MESSAGE_FORMAT`: 消息格式无效
- `INVALID_SUBSCRIPTION`: 订阅参数无效
- `SUBSCRIPTION_NOT_FOUND`: 订阅不存在
- `NETWORK_NOT_SUPPORTED`: 不支持的网络
- `PAIR_NOT_FOUND`: 交易对不存在
- `INTERVAL_NOT_SUPPORTED`: 不支持的时间间隔

## 使用示例

### JavaScript/Node.js 示例

```javascript
// REST API 调用示例
async function getTokens() {
  const response = await fetch('http://localhost:3000/api/tokens');
  const data = await response.json();
  console.log(data);
}

// WebSocket 连接示例
const ws = new WebSocket('ws://localhost:8081/kline-ws');

ws.onopen = () => {
  // 订阅 KEKE/ETH 交易对的 1分钟 K线数据
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      network: 'ethereum',
      pairAddress: '0x...',
      intervals: ['1m']
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'kline_update') {
    console.log('收到K线数据:', message.data);
  }
};
```

### Python 示例

```python
import requests
import websocket
import json

# REST API 调用
response = requests.get('http://localhost:3000/api/tokens')
data = response.json()
print(data)

# WebSocket 连接
def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'kline_update':
        print('收到K线数据:', data['data'])

def on_open(ws):
    subscription = {
        'type': 'subscribe',
        'data': {
            'network': 'ethereum',
            'pairAddress': '0x...',
            'intervals': ['1m']
        }
    }
    ws.send(json.dumps(subscription))

ws = websocket.WebSocketApp('ws://localhost:8081/kline-ws',
                          on_message=on_message,
                          on_open=on_open)
ws.run_forever()
```

## 性能优化建议

### 1. API 调用优化

- 使用分页参数控制返回数据量
- 合理设置缓存策略
- 避免频繁调用相同接口

### 2. WebSocket 连接优化

- 实现连接池管理
- 合理设置心跳间隔
- 及时取消不需要的订阅
- 实现数据缓存机制

### 3. 数据处理优化

- 使用增量更新而非全量刷新
- 实现本地数据缓存
- 合理设置数据更新频率

## 部署说明

### 环境变量配置

```bash
# WebSocket 服务端口
WEBSOCKET_PORT=8081

# 数据库配置
DATABASE_URL=sqlite:./data/kekeswap.db

# API 限流配置
API_RATE_LIMIT=100
API_RATE_WINDOW=60000
```

### 启动服务

```bash
# 启动开发服务器
npm run dev

# 启动 WebSocket 服务
npm run start:websocket

# 启动 K线生成服务
npm run start:kline
```

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 实现基础 REST API 接口
- 实现 WebSocket K线数据推送
- 支持多时间间隔 K线数据
- 实现用户持仓管理
- 支持 Meme 代币管理

---

**注意**: 本文档描述的是开发环境配置，生产环境部署时请确保修改相应的 URL 和端口配置。