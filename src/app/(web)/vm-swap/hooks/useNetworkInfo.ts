"use client";

import { useCallback } from 'react';
import { useChainId } from 'wagmi';
import { useTokenConfig } from '@/hooks';
import { foundry, mainnet, sepolia } from 'viem/chains';

/**
 * 网络信息相关 Hook - 只处理 ETH 相关逻辑
 */
export function useNetworkInfo() {
  const chainId = useChainId();
  const wethConfig = useTokenConfig('WETH');

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

  // 获取 ETH/WETH 信息
  const getETHInfo = useCallback(() => {
    if (shouldUseNativeETH()) {
      // 返回原生 ETH 信息（用于显示，实际交易时会转换为 WETH）
      return {
        address: '0x0000000000000000000000000000000000000000', // 原生 ETH 地址
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        wethAddress: wethConfig.tokenInfo?.address, // WETH 合约地址，用于 DEX 交易
      };
    } else {
      // 返回 WETH 信息
      return {
        ...wethConfig.tokenInfo,
        symbol: 'WETH',
        isNative: false,
        wethAddress: wethConfig.tokenInfo?.address,
      };
    }
  }, [shouldUseNativeETH, wethConfig.tokenInfo]);

  return {
    chainId,
    isNativeETHNetwork: isNativeETHNetwork(),
    shouldUseNativeETH: shouldUseNativeETH(),
    getETHInfo,
  };
}
