"use client";

import { useState, useEffect } from 'react';

interface MemeToken {
  id: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  total_supply: string;
  price_usd?: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_24h?: number;
  description?: string;
  logo_uri?: string;
  website_address?: string;
  twitter_address?: string;
  telegram_address?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface MemeTokenStats {
  totalTokens: number;
  totalMarketCap: number;
  totalVolume24h: number;
  verifiedTokens: number;
}

interface UseMemeTokensOptions {
  search?: string;
  orderBy?: 'market_cap' | 'volume_24h' | 'created_at';
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

interface UseMemeTokensReturn {
  tokens: MemeToken[];
  loading: boolean;
  error: string | null;
  stats: MemeTokenStats | null;
  refetch: () => void;
}

export function useMemeTokens(options: UseMemeTokensOptions = {}): UseMemeTokensReturn {
  const [tokens, setTokens] = useState<MemeToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemeTokenStats | null>(null);

  const {
    search = '',
    orderBy = 'market_cap',
    orderDirection = 'DESC',
    limit = 50,
    offset = 0,
  } = options;

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      // 构建查询参数
      const params = new URLSearchParams();
      
      if (search) {
        params.append('action', 'search');
        params.append('search', search);
      }
      
      params.append('orderBy', orderBy);
      params.append('orderDirection', orderDirection);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      // 获取代币列表
      const tokensResponse = await fetch(`/api/meme-tokens?${params.toString()}`);
      const tokensResult = await tokensResponse.json();

      if (!tokensResult.success) {
        throw new Error(tokensResult.error || '获取代币列表失败');
      }

      // API 返回的数据结构是 { tokens: MemeToken[], total: number }
      const tokenData = tokensResult.data;
      if (tokenData && Array.isArray(tokenData.tokens)) {
        setTokens(tokenData.tokens);
      } else if (Array.isArray(tokensResult.data)) {
        // 兼容直接返回数组的情况
        setTokens(tokensResult.data);
      } else {
        setTokens([]);
      }

      // 获取统计数据
      const statsResponse = await fetch('/api/meme-tokens?action=stats');
      const statsResult = await statsResponse.json();

      if (statsResult.success) {
        setStats(statsResult.data);
      }

    } catch (err) {
      console.error('获取 Meme 代币失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchTokens();
  };

  useEffect(() => {
    fetchTokens();
  }, [search, orderBy, orderDirection, limit, offset]);

  return {
    tokens,
    loading,
    error,
    stats,
    refetch,
  };
}