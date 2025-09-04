# VM-Swap 模块使用指南

## 概述

VM-Swap 是 KekeSwap 平台的虚拟交易模块，主要用于 launchpad 发射池中 meme token 的交易。该模块已集成了以下核心功能：

## 核心功能

### 1. TradingChart - 实时交易图表
- ✅ **实时 WebSocket 数据连接**: 连接到 `ws://localhost:8081/kline-ws`
- ✅ **多时间间隔支持**: 支持 30s, 1m, 15m 等多个时间间隔
- ✅ **动态图表更新**: 实时接收和显示 K线数据
- ✅ **连接状态指示**: 显示实时数据、连接中、离线等状态

### 2. TradingPanel - 交易面板
- ✅ **智能合约交互**: 直接与 MemeToken.json ABI 交互
- ✅ **代币余额查询**: 实时查询用户代币余额
- ✅ **交易功能**: 支持买入/卖出操作
- ✅ **授权管理**: 自动处理代币授权流程
- ✅ **滑点保护**: 内置 5% 滑点保护机制

### 3. 交易对基础信息展示
- ✅ **实时价格显示**: 从智能合约获取当前价格
- ✅ **市场统计**: 显示 24h 成交量、市值、持有人数等
- ✅ **流动性信息**: 显示交易对储备量信息
- ✅ **加载状态**: 显示数据加载状态

### 4. OrderBook - 订单簿
- ⏸️ **暂未实现**: 按照文档要求，当前显示模拟数据

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 初始化代币配置
npm run seed-tokens

# 检查配置
npm run check-config
```

### 2. 启动服务

```bash
# 启动开发服务器
npm run dev

# 启动 WebSocket 服务 (如果需要)
npm run start:websocket
```

### 3. 访问页面

```
http://localhost:3000/vm-swap
```

## 功能测试

### 集成测试
```bash
npm run test:integration
```

### 单独测试
```bash
# 验证配置
npm run verify-config

# 检查并修复配置
npm run check-config

# 测试数据库
npm run test:db
```

## 配置说明

### 合约地址配置

#### Foundry 本地网络
文件: `src/config/address/foundry.json`
```json
{
  "tokenFactoryAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "poolAddress": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "kekeswapRouterAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  "kekeswapFactoryAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
}
```

#### Sepolia 测试网
文件: `src/config/address/sepolia.json`
```json
{
  "tokenFactoryAddress": "0x126DA8A2083B7b16358897aaCcf419A63BBBB24E",
  "poolAddress": "0xf7Eaf5FA85D8dbac581B2594D931558DA969102c",
  "kekeswapRouterAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "kekeswapFactoryAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
```

### 代币配置

系统会自动初始化以下代币：
- **KEKE**: KekeSwap 平台代币
- **USDT**: 美元稳定币
- **WETH**: 包装以太坊
- **USDC**: USD 稳定币
- **WBNB**: 包装 BNB
- **WBTC**: 包装比特币

## API 接口

### WebSocket 接口
- **URL**: `ws://localhost:8081/kline-ws`
- **协议**: 参考 `docs/api-documentation.md`

### REST API
- **健康检查**: `GET /api/health`
- **代币信息**: `GET /api/tokens`
- **交易对信息**: `GET /api/pools`
- **WebSocket 状态**: `GET /api/websocket`

## 技术实现

### 核心 Hooks

#### useWebSocket
```typescript
const { isConnected, subscribe, connect } = useWebSocket({
  onKlineUpdate: handleKlineUpdate,
  onConnect: () => console.log('连接成功'),
});
```

#### useTrading
```typescript
const {
  isLoading,
  useTokenBalance,
  approveToken,
  executeBuy,
  executeSell,
} = useTrading();
```

#### usePairInfo
```typescript
const pairInfo = usePairInfo({
  token0Symbol: 'KEKE',
  token1Symbol: 'USDT',
  token0Address: kekeConfig.tokenInfo?.address,
  token1Address: usdtConfig.tokenInfo?.address,
});
```

### 组件结构

```
src/app/(web)/vm-swap/
├── components/
│   ├── TradingChart.tsx     # 交易图表组件
│   ├── TradingPanel.tsx     # 交易面板组件
│   ├── OrderBook.tsx        # 订单簿组件 (模拟)
│   └── index.ts             # 组件导出
├── hooks/
│   └── useTrading.ts        # 交易逻辑 Hook
├── page.tsx                 # 主页面
└── vm-swap.md              # 模块文档
```

## 故障排除

### 常见问题

1. **WebSocket 连接失败**
   - 检查服务是否启动: `npm run dev`
   - 验证端口 8081 是否可用

2. **代币配置缺失**
   - 运行: `npm run seed-tokens`
   - 检查数据库连接

3. **交易失败**
   - 检查钱包连接
   - 验证合约地址配置
   - 确认代币授权

4. **图表不显示**
   - 检查 WebSocket 连接状态
   - 验证交易对地址配置

### 调试命令

```bash
# 检查所有配置
npm run check-config

# 运行完整测试
npm run test:integration

# 验证 API 状态
curl http://localhost:3000/api/health
```

## 开发说明

### 添加新代币

1. 在 `scripts/seed-tokens.ts` 中添加代币配置
2. 运行 `npm run seed-tokens` 更新数据库
3. 在 `useTrading` hook 中添加代币支持

### 自定义交易对

1. 更新 `usePairInfo` hook 配置
2. 确保合约地址正确配置
3. 测试 WebSocket 订阅

### 扩展功能

1. **添加新的时间间隔**: 修改 WebSocket 订阅配置
2. **自定义图表指标**: 扩展 `TradingChart` 组件
3. **增强交易功能**: 扩展 `useTrading` hook

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 运行测试: `npm run test:integration`
5. 创建 Pull Request

---

**最后更新**: 2025-09-03  
**版本**: v1.0.0  
**维护者**: dreamworks.cnn@gmail.com
