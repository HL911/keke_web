"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, ChevronDown, Star, StarOff, ExternalLink } from "lucide-react";
import { useAllTokenConfigs } from "@/hooks/tokens/useTokenConfig";

// 代币接口
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  isNative?: boolean;
  isVerified?: boolean;
}

interface TokenSelectorProps {
  selectedToken?: Token | null;
  onTokenSelect: (token: Token) => void;
  disabled?: boolean;
  excludeTokens?: string[];
  className?: string;
  enableTokenSelection?: boolean;
}

export function TokenSelector({
  selectedToken,
  onTokenSelect,
  disabled = false,
  excludeTokens = [],
  className = "",
  enableTokenSelection = true,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Token[]>([]);

  const {
    tokenConfigs,
    loading: tokensLoading,
    error: tokensError,
  } = useAllTokenConfigs();

  // 将数据库 Token 格式转换为页面组件需要的格式
  const tokens: Token[] = useMemo(() => {
    return Object.values(tokenConfigs).map((dbToken) => ({
      address: dbToken.address,
      symbol: dbToken.symbol,
      name: dbToken.name,
      decimals: dbToken.decimals,
      logoURI: dbToken.logo_uri || "",
      price: dbToken.price_usd || 0,
    }));
  }, [tokenConfigs]);

  // 实现搜索功能
  const onSearch = useCallback(
    (query: string): Token[] => {
      if (!query.trim()) return tokens;

      const lowercaseQuery = query.toLowerCase();
      return tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(lowercaseQuery) ||
          token.name.toLowerCase().includes(lowercaseQuery) ||
          token.address.toLowerCase().includes(lowercaseQuery)
      );
    },
    [tokens]
  );

  // 搜索防抖
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const results = onSearch(searchTerm);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  // 筛选代币
  const filteredTokens = useMemo(() => {
    const tokensToFilter = searchTerm.trim() ? searchResults : tokens;

    const filtered = tokensToFilter.filter(
      (token) => !excludeTokens.includes(token.address)
    );

    // 排序：原生代币 > 已验证 > 按符号排序
    return filtered.sort((a, b) => {
      if (a.isNative && !b.isNative) return -1;
      if (!a.isNative && b.isNative) return 1;

      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;

      return a.symbol.localeCompare(b.symbol);
    });
  }, [tokens, searchResults, searchTerm, excludeTokens]);

  // 常用代币
  const popularTokens = useMemo(() => {
    return tokens
      .filter(
        (token) =>
          token.isNative ||
          ["USDT", "USDC", "BTC", "WETH", "SUSHI"].includes(token.symbol)
      )
      .slice(0, 6);
  }, [tokens]);

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchTerm("");
  };

  const toggleFavorite = (tokenAddress: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(tokenAddress)
        ? prev.filter((addr) => addr !== tokenAddress)
        : [...prev, tokenAddress]
    );
  };

  // 如果不启用选择功能，只显示固定的token信息
  if (!enableTokenSelection) {
    return (
      <div
        className={`w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg ${className}`}
      >
        {selectedToken ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {selectedToken.logoURI ? (
                <img
                  src={selectedToken.logoURI}
                  alt={selectedToken.symbol}
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                selectedToken.symbol[0]
              )}
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              {selectedToken.symbol}
            </span>
          </div>
        ) : (
          <span className="text-gray-500 text-sm">未选择代币</span>
        )}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={`w-full justify-between px-3 py-2 text-left ${className}`}
        >
          {selectedToken ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {selectedToken.logoURI ? (
                  <img
                    src={selectedToken.logoURI}
                    alt={selectedToken.symbol}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  selectedToken.symbol[0]
                )}
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                {selectedToken.symbol}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm">选择代币</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[600px] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            选择代币
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索代币名称、符号或地址..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={tokensLoading}
            />
          </div>

          {/* 加载状态 */}
          {tokensLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>加载代币列表...</span>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {tokensError && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-red-500 mb-2">加载代币失败</p>
                <p className="text-sm text-gray-500">{tokensError}</p>
              </div>
            </div>
          )}

          {/* 常用代币 */}
          {!tokensLoading &&
            !tokensError &&
            searchTerm === "" &&
            popularTokens.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  常用代币
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {popularTokens.map((token) => (
                    <Button
                      key={token.address}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTokenSelect(token)}
                      className="flex items-center gap-2 justify-start p-2 h-auto"
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {token.logoURI ? (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          token.symbol[0]
                        )}
                      </div>
                      <span className="text-sm truncate">{token.symbol}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

          {/* 代币列表 */}
          {!tokensLoading && !tokensError && (
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {filteredTokens.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>未找到匹配的代币</p>
                  <p className="text-sm mt-1">尝试修改搜索条件</p>
                </div>
              ) : (
                filteredTokens.map((token) => (
                  <div
                    key={token.address}
                    onClick={() => handleTokenSelect(token)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* 代币图标 */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                        {token.logoURI ? (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          token.symbol[0]
                        )}
                      </div>

                      {/* 代币信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {token.symbol}
                          </span>
                          {token.isNative && (
                            <Badge variant="secondary" className="text-xs">
                              原生
                            </Badge>
                          )}
                          {token.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {token.name}
                        </p>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => toggleFavorite(token.address, e)}
                        className="p-1 h-6 w-6"
                      >
                        {favorites.includes(token.address) ? (
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="w-3 h-3 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://etherscan.io/token/${token.address}`,
                            "_blank"
                          );
                        }}
                        className="p-1 h-6 w-6"
                      >
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
