/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 23:54:32
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-04 15:49:05
 * @FilePath: /keke_web/src/app/(web)/vm-swap/hooks/useTokenInfo.ts
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */
"use client";

import { useState, useCallback, useRef } from 'react';
import { useNetworkInfo } from './useNetworkInfo';

/**
 * 代币信息相关 Hook - 只处理 meme 代币和 ETH
 */
export function useTokenInfo() {
  const [memeTokenInfo, setMemeTokenInfo] = useState<any>(null);
  const [memeTokenLoading, setMemeTokenLoading] = useState(false);
  const lastFetchedSymbol = useRef<string>('');
  const isLoadingRef = useRef(false);
  
  const { getETHInfo } = useNetworkInfo();

  // 获取代币配置的辅助函数 - 只支持 ETH 和 meme 代币
  const getTokenConfigBySymbol = useCallback((symbol: string) => {
    if (symbol === 'ETH' || symbol === 'WETH') return getETHInfo();
    // 对于 meme 代币，返回从 API 获取的信息
    return memeTokenInfo;
  }, [getETHInfo, memeTokenInfo]);

  // 获取 meme 代币信息 - 修复无限循环问题
  const fetchMemeTokenInfo = useCallback(async (symbol: string) => {    
    
    // 避免重复请求相同的 symbol 或正在加载中
    if (isLoadingRef.current || lastFetchedSymbol.current === symbol) {
      console.log('🔄 跳过重复请求:', symbol);
      return; 
    }

    try {
      isLoadingRef.current = true;
      setMemeTokenLoading(true);
      lastFetchedSymbol.current = symbol;
      
      console.log('🚀 开始获取代币信息:', symbol);
      
      // 先尝试通过 symbol 搜索 meme 代币
      const searchResponse = await fetch(`/api/meme-tokens?action=search&search=${symbol}`);
      const searchResult = await searchResponse.json();
      
      if (searchResult.success && searchResult.data.tokens.length > 0) {
        // 找到匹配的 meme 代币
        const exactMatch = searchResult.data.tokens.find((token: any) => {
          return token.symbol.toLowerCase() === symbol.toLowerCase();
        });
        
        if (exactMatch) {
          console.log('✅ 找到匹配的代币:', exactMatch);
          setMemeTokenInfo(exactMatch);
          return exactMatch;
        }
      }
      
      console.log(`⚠️ 未找到 symbol 为 "${symbol}" 的 meme 代币`);
      return null;
    } catch (error) {
      console.error('❌ 获取 meme 代币信息失败:', error);
      return null;
    } finally {
      isLoadingRef.current = false;
      setMemeTokenLoading(false);
    }
  }, []); // 移除 memeTokenLoading 依赖，使用 useRef 跟踪状态

  

  // 重置代币信息 - 当切换代币时清理状态
  const resetTokenInfo = useCallback(() => {
    console.log('🧹 重置代币信息');
    setMemeTokenInfo(null);
    setMemeTokenLoading(false);
    lastFetchedSymbol.current = '';
    isLoadingRef.current = false;
  }, []);

  return {
    // 状态
    memeTokenInfo,
    memeTokenLoading,
    
    // 函数
    fetchMemeTokenInfo,
    getTokenConfigBySymbol,
    resetTokenInfo,
  };
}
