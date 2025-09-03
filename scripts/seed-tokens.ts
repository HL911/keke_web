/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 18:30:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 18:30:00
 * @FilePath: /keke_web/scripts/seed-tokens.ts
 * @Description: 代币数据种子脚本
 */

import { insertToken } from '../src/app/api/utils/token-queries';

// Foundry 本地网络的代币地址配置
const FOUNDRY_TOKENS = [
  {
    address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', // KEKE Token
    symbol: 'KEKE',
    name: 'Keke Token',
    decimals: 18,
    total_supply: '1000000000',
    price_usd: '0.42814',
    market_cap: '428140000',
    volume_24h: '5000000',
    description: 'KekeSwap 平台原生代币',
    logo_uri: '/token-logos/keke-logo.png',
    is_verified: true,
  },
  {
    address: '0x0165878A594ca255338adfa4d48449f69242Eb8F', // USDT
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
    total_supply: '1000000000',
    price_usd: '1.00',
    market_cap: '1000000000',
    volume_24h: '50000000',
    description: '美元稳定币',
    logo_uri: '/token-logos/usdt-logo.png',
    is_verified: true,
  },
  {
    address: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', // WETH
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    total_supply: '10000000',
    price_usd: '2500.00',
    market_cap: '25000000000',
    volume_24h: '100000000',
    description: '包装以太坊',
    logo_uri: '/token-logos/weth-logo.png',
    is_verified: true,
  },
  {
    address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6', // USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    total_supply: '500000000',
    price_usd: '1.00',
    market_cap: '500000000',
    volume_24h: '30000000',
    description: 'USD 稳定币',
    logo_uri: '/token-logos/usdc-logo.png',
    is_verified: true,
  },
  {
    address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318', // WBNB
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    decimals: 18,
    total_supply: '200000000',
    price_usd: '300.00',
    market_cap: '60000000000',
    volume_24h: '20000000',
    description: '包装 BNB',
    logo_uri: '/token-logos/wbnb-logo.png',
    is_verified: true,
  },
  {
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // WBTC
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
    total_supply: '21000000',
    price_usd: '45000.00',
    market_cap: '945000000000',
    volume_24h: '80000000',
    description: '包装比特币',
    logo_uri: '/token-logos/wbtc-logo.png',
    is_verified: true,
  },
];

// Sepolia 测试网的代币地址配置
const SEPOLIA_TOKENS = [
  {
    address: '0x1234567890123456789012345678901234567890', // KEKE Token (需要实际部署地址)
    symbol: 'KEKE',
    name: 'Keke Token',
    decimals: 18,
    total_supply: '1000000000',
    price_usd: '0.42814',
    market_cap: '428140000',
    volume_24h: '5000000',
    description: 'KekeSwap 平台原生代币 (Sepolia)',
    logo_uri: '/token-logos/keke-logo.png',
    is_verified: true,
  },
  {
    address: '0x2345678901234567890123456789012345678901', // USDT (需要实际部署地址)
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
    total_supply: '1000000000',
    price_usd: '1.00',
    market_cap: '1000000000',
    volume_24h: '50000000',
    description: '美元稳定币 (Sepolia)',
    logo_uri: '/token-logos/usdt-logo.png',
    is_verified: true,
  },
];

async function seedTokens() {
  console.log('开始初始化代币数据...');

  try {
    // 初始化 Foundry 网络代币
    console.log('初始化 Foundry 本地网络代币...');
    for (const token of FOUNDRY_TOKENS) {
      try {
        await insertToken(token);
        console.log(`✅ 已添加代币: ${token.symbol} (${token.address})`);
      } catch (error) {
        console.log(`⚠️  代币 ${token.symbol} 可能已存在，跳过添加`);
      }
    }

    // 初始化 Sepolia 网络代币
    console.log('初始化 Sepolia 测试网代币...');
    for (const token of SEPOLIA_TOKENS) {
      try {
        await insertToken(token);
        console.log(`✅ 已添加代币: ${token.symbol} (${token.address})`);
      } catch (error) {
        console.log(`⚠️  代币 ${token.symbol} 可能已存在，跳过添加`);
      }
    }

    console.log('🎉 代币数据初始化完成！');
  } catch (error) {
    console.error('❌ 代币数据初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedTokens();
}

export { seedTokens, FOUNDRY_TOKENS, SEPOLIA_TOKENS };
