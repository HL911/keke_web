# VM-Swap 路由参数使用指南

## 功能说明

VM-Swap 现在支持通过 URL 路由参数来指定要交易的 meme 币，实现了动态代币交易功能。

## 路由结构

### 1. 默认页面
- 路径: `/vm-swap`  
- 功能: 自动重定向到默认代币 (KEKE)
- 实际跳转: `/vm-swap/KEKE`

### 2. 动态代币页面
- 路径: `/vm-swap/[tokenSymbol]`  
- 功能: 显示指定代币的交易页面
- 示例:
  - `/vm-swap/KEKE` - 交易 KEKE 代币
  - `/vm-swap/PEPE` - 交易 PEPE 代币  
  - `/vm-swap/DOGE` - 交易 DOGE 代币
  - `/vm-swap/SHIB` - 交易 SHIB 代币

## 使用方法

### 从其他页面跳转
```javascript
import { useRouter } from 'next/navigation';

const router = useRouter();

// 跳转到特定代币交易页面
const navigateToToken = (tokenSymbol) => {
  router.push(`/vm-swap/${tokenSymbol}`);
};

// 示例使用
navigateToToken('PEPE'); // 跳转到 PEPE 交易页面
```

### 链接方式
```jsx
import Link from 'next/link';

<Link href="/vm-swap/PEPE">
  交易 PEPE
</Link>
```

## 技术实现

### 1. 文件结构
```
src/app/(web)/vm-swap/
├── [tokenSymbol]/
│   └── page.tsx          # 动态路由页面
├── page.tsx              # 默认重定向页面
├── components/           # 组件目录
└── hooks/               # Hooks 目录
```

### 2. 关键特性

- **动态路由**: 使用 Next.js 13+ 的 `[tokenSymbol]` 动态路由
- **参数传递**: 自动从 URL 参数中提取 `tokenSymbol`
- **URL 解码**: 支持特殊字符的代币符号
- **默认重定向**: 访问 `/vm-swap` 自动跳转到 KEKE
- **灵活配置**: 可轻松支持任何 meme 代币

### 3. 代码示例

动态页面接收参数：
```tsx
interface VMSwapPageProps {
  params: {
    tokenSymbol: string;
  };
}

export default function VMSwapPage({ params }: VMSwapPageProps) {
  const { tokenSymbol } = params;
  const decodedTokenSymbol = decodeURIComponent(tokenSymbol);
  
  // 使用 tokenSymbol 进行交易
  return (
    <TradingPanel symbol={decodedTokenSymbol} currentPrice={currentPrice} />
  );
}
```

## 测试方法

1. 访问 `http://localhost:3000/vm-swap` - 应该重定向到 KEKE
2. 访问 `http://localhost:3000/vm-swap/PEPE` - 应该显示 PEPE 交易页面
3. 访问 `http://localhost:3000/vm-swap/DOGE` - 应该显示 DOGE 交易页面
4. 检查页面标题和交易面板是否显示正确的代币符号

## 扩展说明

该实现支持从任何前端路由传递 `memeToken` 字段，例如：
- 从代币列表页面点击代币时传递参数
- 从趋势页面跳转到具体交易
- 通过搜索功能直接跳转到代币交易

这样就实现了您要求的"可交易的meme币需要来源于前端路由上的memeToken字段来确认"的功能。
