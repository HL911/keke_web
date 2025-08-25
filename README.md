# 🚀 Keke Swap - Web3 DeFi 交易平台

一个基于 Next.js 15 和 Web3 技术栈构建的去中心化金融交易平台，提供代币交换、农场挖矿和数据分析等核心功能。

## ✨ 核心功能

- **🔄 代币交换**: 支持多种代币对的快速交换
- **🌾 农场挖矿**: 质押 LP 代币赚取 KEKE 奖励
- **📊 数据分析**: 实时市场数据和交易统计
- **🔗 钱包连接**: 支持主流 Web3 钱包连接

## 🛠 技术栈

### 前端框架

- **Next.js 15**: 使用 App Router 的现代化 React 框架
- **React 18**: 最新的 React 版本
- **TypeScript**: 类型安全的 JavaScript 开发

### Web3 集成

- **Wagmi**: React Hooks for Ethereum
- **Viem**: 类型安全的以太坊客户端
- **Ethers.js**: 以太坊钱包集成

### UI 组件库

- **shadcn/ui**: 现代化、可定制的 UI 组件库
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Lucide React**: 精美的图标库

### 开发工具

- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **TypeScript**: 静态类型检查

## 📁 项目结构

相关合约代码仓库：https://github.com/HL911/keke_foundry

```
keke_web/
├── 📁 src/                          # 源代码目录
│   ├── 📁 app/                      # Next.js App Router
│   │   ├── 📁 swap/                # 代币交换页面
│   │   ├── 📁 farm/                # 农场挖矿页面
│   │   ├── 📁 analytics/           # 数据分析页面
│   │   ├── 📄 page.tsx             # 主页
│   │   └── 📄 layout.tsx           # 根布局
│   ├── 📁 components/              # React 组件
│   │   ├── 📁 ui/                  # shadcn/ui 组件
│   │   │   ├── 📄 button.tsx       # 按钮组件
│   │   │   ├── 📄 card.tsx         # 卡片组件
│   │   │   ├── 📄 input.tsx        # 输入框组件
│   │   │   ├── 📄 navigation-menu.tsx # 导航菜单组件
│   │   │   └── ...                 # 其他UI组件
│   │   ├── 📄 Navigation.tsx       # 导航栏组件
│   │   ├── 📄 ShadcnProvider.tsx   # UI提供者
│   │   └── 📄 WagmiProvider.tsx    # Web3提供者
│   ├── 📁 lib/                     # 工具库
│   │   └── 📄 utils.ts             # 通用工具函数
│   ├── 📁 config/                  # 配置文件
│   │   └── 📄 wagmi-config.ts      # Wagmi配置
│   └── 📁 style/                   # 样式文件
│       └── 📄 globals.css          # 全局样式
├── 📁 public/                      # 静态资源
├── 📄 package.json                 # 项目依赖配置
├── 📄 next.config.ts               # Next.js配置
├── 📄 tailwind.config.js           # Tailwind CSS配置
├── 📄 components.json              # shadcn/ui配置
└── 📄 tsconfig.json                # TypeScript配置
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **包管理器**: npm 或 yarn
- **Git**: 版本控制

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd keke_web
```

2. **安装依赖**

```bash
npm install
# 或
yarn install
```

3. **环境配置**

```bash
cp .env.example .env.local
# 编辑 .env.local 文件，配置必要的环境变量
```

4. **启动开发服务器**

```bash
npm run dev
# 或
yarn dev
```

5. **访问应用**
   打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 🔧 开发命令

### 基础命令

```bash
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 运行ESLint代码检查
npm run type-check   # 运行TypeScript类型检查
```

### 开发工具命令

```bash
npm run lint:fix     # 自动修复ESLint问题
npm run format       # 使用Prettier格式化代码
npm run clean        # 清理构建缓存
```

### 依赖管理

```bash
npm install          # 安装所有依赖
npm update           # 更新依赖包
npm audit            # 检查安全漏洞
npm audit fix        # 自动修复安全漏洞
```

## 📱 页面说明

### 主页 (`/`)

- 平台介绍和核心功能展示
- 统计数据展示（TVL、用户数、交易量等）
- 快速导航到各个功能模块

### 代币交换 (`/swap`)

- 代币交换界面
- 支持多种代币对
- 实时价格和滑点设置
- 交易历史和市场信息

### 农场挖矿 (`/farm`)

- 流动性挖矿池展示
- 年化收益率显示
- 质押和收获功能
- 农场池统计信息

### 数据分析 (`/analytics`)

- 市场数据概览
- 交易对价格变化
- 最近交易记录
- 平台统计数据

## 🎨 UI 组件使用

### 基础组件

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 使用示例
<Button variant="default" size="lg">
  点击按钮
</Button>

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
</Card>
```

### 导航组件

```tsx
import { Navigation } from "@/components/Navigation";

// 在布局中使用
<Navigation />
```

## 🔗 Web3 集成

### 钱包连接

项目使用 Wagmi 进行钱包连接管理，支持：

- MetaMask
- WalletConnect
- Coinbase Wallet
- 其他 EVM 兼容钱包

### 配置说明

Web3 配置位于 `src/config/wagmi-config.ts`，包含：

- 支持的链配置
- 钱包连接器设置
- RPC 节点配置

## 🚀 部署

### 构建生产版本

```bash
npm run build
```

### 部署到 Vercel

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

### 环境变量配置

```bash
# .env.local
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

## 🐛 常见问题

### 开发服务器启动失败

- 检查 Node.js 版本是否符合要求
- 确认所有依赖已正确安装
- 检查端口 3000 是否被占用

### 组件样式问题

- 确认 Tailwind CSS 配置正确
- 检查组件导入路径
- 验证 CSS 类名拼写

### Web3 连接问题

- 确认钱包已安装并解锁
- 检查网络连接
- 验证 RPC 节点配置

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -m '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 编写所有新代码
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 遵循组件命名约定

## 📄 许可证

本项目采用 MIT 许可证

## 📞 联系我们

- 项目 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
