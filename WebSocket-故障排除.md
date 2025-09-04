# WebSocket 连接故障排除指南

## 快速诊断

如果您遇到 WebSocket 连接错误，请按以下步骤进行排查：

### 1. 快速测试 WebSocket 连接

```bash
# 运行 WebSocket 连接测试
npm run test:websocket
```

这个命令会自动检测：
- WebSocket 服务器是否运行
- 端口 8081 是否可用
- 连接和心跳是否正常
- K线数据订阅是否工作

### 2. 常见错误和解决方案

#### 错误：WebSocket 连接失败: 无法连接到 ws://localhost:8081/kline-ws

**原因**: WebSocket 服务器未启动

**解决方案**:
```bash
# 启动开发服务器（包含 WebSocket 服务）
npm run dev
```

#### 错误：WebSocket 连接超时

**原因**: 服务器响应缓慢或端口被占用

**解决方案**:
```bash
# 检查端口占用
lsof -i :8081

# 如果端口被占用，杀死进程
kill -9 <PID>

# 重新启动服务
npm run dev
```

#### 错误：WebSocket 不可用 - 可能运行在服务器端环境

**原因**: 在服务器端渲染时尝试连接 WebSocket

**解决方案**: 这是正常现象，WebSocket 只在客户端环境中可用。

#### 错误：解析 WebSocket 消息失败

**原因**: 服务器发送的消息格式不正确

**解决方案**:
```bash
# 检查服务器端代码是否正确发送 JSON 格式消息
# 查看服务器端日志
npm run dev
```

### 3. 检查服务器状态

```bash
# 检查 WebSocket 服务器状态
curl http://localhost:3000/api/websocket

# 期望响应:
# {
#   "success": true,
#   "data": {
#     "isRunning": true,
#     "port": 8081,
#     "clientCount": 0
#   }
# }
```

### 4. 手动测试 WebSocket 连接

使用浏览器开发者工具测试：

```javascript
// 在浏览器控制台中运行
const ws = new WebSocket('ws://localhost:8081/kline-ws');

ws.onopen = () => {
  console.log('✅ WebSocket 连接成功');
  
  // 发送心跳
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
  }));
};

ws.onmessage = (event) => {
  console.log('📨 收到消息:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ WebSocket 错误:', error);
};

ws.onclose = (event) => {
  console.log('🔚 连接关闭:', event.code, event.reason);
};
```

### 5. 检查配置文件

确保配置文件正确：

**检查合约地址**:
```bash
npm run verify-config
```

**初始化代币数据**:
```bash
npm run seed-tokens
```

### 6. 网络和防火墙检查

#### macOS
```bash
# 检查防火墙是否阻止连接
sudo pfctl -sr | grep 8081
```

#### Windows
```powershell
# 检查防火墙规则
netsh firewall show state
```

#### Linux
```bash
# 检查 iptables 规则
sudo iptables -L | grep 8081
```

### 7. 环境变量检查

确保 WebSocket 端口配置正确：

```bash
# 检查环境变量
echo $WEBSOCKET_PORT

# 如果未设置，添加到 .env.local
echo "WEBSOCKET_PORT=8081" >> .env.local
```

### 8. 进阶调试

#### 启用详细日志
```bash
# 设置调试模式
DEBUG=websocket* npm run dev
```

#### 检查内存和 CPU 使用情况
```bash
# macOS/Linux
top -p $(pgrep -f "next-server")

# Windows
tasklist | findstr "node"
```

### 9. 重置和重新安装

如果以上方法都无效：

```bash
# 清理缓存
rm -rf .next
rm -rf node_modules

# 重新安装依赖
npm install

# 重新启动服务
npm run dev
```

### 10. 获取帮助

如果问题仍然存在，请收集以下信息：

1. **运行测试命令**:
   ```bash
   npm run test:websocket > websocket-test.log 2>&1
   ```

2. **系统信息**:
   ```bash
   node --version
   npm --version
   uname -a  # macOS/Linux
   # 或
   systeminfo  # Windows
   ```

3. **错误日志**: 浏览器开发者工具的 Console 标签中的错误信息

4. **网络信息**:
   ```bash
   netstat -an | grep 8081
   ```

然后将这些信息提供给开发团队以获得支持。

---

## 预防措施

1. **定期运行检查**:
   ```bash
   npm run check-config
   ```

2. **保持依赖更新**:
   ```bash
   npm audit fix
   ```

3. **监控服务状态**:
   ```bash
   npm run test:integration
   ```

---

**最后更新**: 2025-09-03  
**适用版本**: v1.0.0+
