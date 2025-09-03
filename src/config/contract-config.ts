import { Address } from 'viem'

// 合约地址配置
export const CONTRACT_ADDRESSES = {
  sepolia: {
    WETH9: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address,
    KEKE: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e' as Address,
    WETH9_KEKE_PAIR: '0x8B5e2f8c8B5e2f8c8B5e2f8c8B5e2f8c8B5e2f8c' as Address,
    Master: '0x1234567890123456789012345678901234567890' as Address,
    SyrupBar: '0x0987654321098765432109876543210987654321' as Address,
    SmartChef: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
  }
} as const

// 获取当前网络的合约地址
export function getContractAddresses(chainId: number = 11155111) {
  switch (chainId) {
    case 11155111: // Sepolia
      return CONTRACT_ADDRESSES.sepolia
    default:
      return CONTRACT_ADDRESSES.sepolia
  }
}

// 代币配置
export const TOKEN_CONFIG = {
  KEKE: {
    symbol: 'KEKE',
    name: 'Keke Token',
    decimals: 18,
    price: 0.25, // USD
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    price: 2000, // USD
  }
} as const

export type ContractAddresses = typeof CONTRACT_ADDRESSES.sepolia
export type TokenSymbol = keyof typeof TOKEN_CONFIG