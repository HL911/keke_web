"use client";

import { useCallback } from 'react';
import { useChainId } from 'wagmi';
import { foundry, mainnet, sepolia } from 'viem/chains';

// 静态WETH地址配置，避免动态获取
const WETH_ADDRESSES = {
  [sepolia.id]: '0x75B2245a13c46677Ff66B140b6dA1751Ed96d9d6',
  [mainnet.id]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [foundry.id]: '0x75B2245a13c46677Ff66B140b6dA1751Ed96d9d6', // 使用sepolia地址
};

/**
 * 网络信息相关 Hook - 只处理 ETH 相关逻辑
 */
export function useNetworkInfo() {
  const chainId = useChainId();

  // 判断当前网络是否支持原生 ETH
  const isNativeETHNetwork = useCallback(() => {
    return chainId === mainnet.id || chainId === sepolia.id;
  }, [chainId]);

  // 判断是否使用原生 ETH 进行交易
  const shouldUseNativeETH = useCallback(() => {
    // 在主网和测试网上，如果用户选择使用 ETH，优先使用原生 ETH
    // 在本地 Foundry 网络上，使用 WETH
    return isNativeETHNetwork() && chainId !== foundry.id;
  }, [chainId, isNativeETHNetwork]);

  // 获取 ETH/WETH 信息 - 使用静态配置
  const getETHInfo = useCallback(() => {
    const wethAddress = WETH_ADDRESSES[chainId as keyof typeof WETH_ADDRESSES];
    
    if (shouldUseNativeETH()) {
      // 返回原生 ETH 信息
      return {
        address: '0x0000000000000000000000000000000000000000', // 原生 ETH 地址
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        wethAddress, // WETH 合约地址，用于 DEX 交易
      };
    } else {
      // 返回 WETH 信息
      return {
        address: wethAddress,
        symbol: 'WETH',
        name: 'Wrapped Ethereum',
        decimals: 18,
        isNative: false,
        wethAddress,
      };
    }
  }, [shouldUseNativeETH, chainId]);

  return {
    chainId,
    isNativeETHNetwork: isNativeETHNetwork(),
    shouldUseNativeETH: shouldUseNativeETH(),
    getETHInfo,
  };
}
