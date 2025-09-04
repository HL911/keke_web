"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy,
  CheckCircle,
  Search,
  Funnel,
  Star,
  ArrowUpDown,
  Sparkles,
  Globe,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  holders?: number;
}

interface TokenListProps {
  tokens: MemeToken[];
  loading: boolean;
  error: string | null;
}

export function TokenList({ tokens, loading, error }: TokenListProps) {
  const router = useRouter();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const copyToClipboard = async (address: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  };

  const formatHolders = (num: number): string => {
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  };

  const handleTradeClick = (tokenSymbol: string) => {
    router.push(`/vm-swap/${tokenSymbol}`);
  };

  const toggleFavorite = (address: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(address)) {
      newFavorites.delete(address);
    } else {
      newFavorites.add(address);
    }
    setFavorites(newFavorites);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };



  const formatPrice = (price: number | undefined) => {
    if (!price) return '$0.00';
    if (price < 0.01) {
      // 将小数转换为字符串
      const priceStr = price.toString();
      
      // 检查是否为科学计数法
      if (priceStr.includes('e')) {
        const [base, exponent] = priceStr.split('e');
        const exp = Math.abs(parseInt(exponent));
        
        // 获取有效数字
        const significantDigits = base.replace('.', '').replace('-', '');
        
        // 格式化为 0.0₈44873 形式
        if (exp > 1) {
          const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
          const subscriptExp = (exp - 1).toString().split('').map(digit => subscriptNumbers[parseInt(digit)]).join('');
          return `$0.0${subscriptExp}${significantDigits.slice(0, 5)}`;
        }
      }
      
      // 处理普通小数
      const match = priceStr.match(/^0\.(0+)([1-9]\d*)/);
      if (match) {
        const zeros = match[1].length;
        const digits = match[2];
        
        if (zeros >= 4) {
          const subscriptNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
          const subscriptZeros = zeros.toString().split('').map(digit => subscriptNumbers[parseInt(digit)]).join('');
          return `$0.0${subscriptZeros}${digits.slice(0, 5)}`;
        }
      }
      
      return `$${price.toFixed(8)}`;
    }
    return `$${price.toFixed(4)}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const filteredAndSortedTokens = useMemo(() => {
    let filtered = tokens.filter(token => 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price_usd':
          aValue = a.price_usd || 0;
          bValue = b.price_usd || 0;
          break;
        case 'market_cap':
          aValue = a.market_cap || 0;
          bValue = b.market_cap || 0;
          break;
        case 'volume_24h':
          aValue = a.volume_24h || 0;
          bValue = b.volume_24h || 0;
          break;
        case 'holders':
          aValue = a.holders || Math.floor(Math.random() * 10000) + 100;
          bValue = b.holders || Math.floor(Math.random() * 10000) + 100;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.market_cap || 0;
          bValue = b.market_cap || 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [tokens, searchTerm, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-4">加载失败: {error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </CardContent>
      </Card>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">暂无代币数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Combined Filter Controls and Table Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden backdrop-blur-sm">
        {/* Filter Controls */}
        <div className="p-6 bg-gradient-to-r from-white to-slate-50/80">
          <div className="flex items-center gap-4">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`shrink-0 transition-all duration-300 ${
                showFilters 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md' 
                  : 'hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              <Funnel className="w-4 h-4" />
            </Button>
            
            {showFilters && (
              <>
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="搜索代币名称、符号或合约地址..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl bg-white/80 backdrop-blur-sm">
                    <SelectValue placeholder="排序方式" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white/95 backdrop-blur-sm">
                    <SelectItem value="market_cap" className="rounded-lg">💰 市值排序</SelectItem>
                    <SelectItem value="volume_24h" className="rounded-lg">📊 交易量排序</SelectItem>
                    <SelectItem value="price_usd" className="rounded-lg">💵 价格排序</SelectItem>
                    <SelectItem value="holders" className="rounded-lg">👥 持有人数</SelectItem>
                    <SelectItem value="created_at" className="rounded-lg">🕐 创建时间</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="shrink-0 hover:bg-blue-50 hover:border-blue-300 border-slate-200 rounded-xl transition-all duration-300"
                  title={sortOrder === 'desc' ? '降序排列' : '升序排列'}
                >
                  {sortOrder === 'desc' ? (
                    <TrendingDown className="w-4 h-4 text-slate-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-slate-600" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-6 bg-gradient-to-r from-white/80 to-slate-50/80 font-semibold text-sm text-slate-700 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            代币信息
          </div>
          <div className="text-right cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1 transition-colors" onClick={() => handleSort('price_usd')}>
            价格 <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="text-right cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1 transition-colors" onClick={() => handleSort('market_cap')}>
            市值 <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="text-right cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1 transition-colors" onClick={() => handleSort('volume_24h')}>
            交易量(24h) <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="text-right cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1 transition-colors" onClick={() => handleSort('holders')}>
            持有人数 <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="text-center">操作</div>
        </div>

        {/* Enhanced Token Rows */}
         {filteredAndSortedTokens.map((token, index) => (
           <div key={token.address} 
           onClick={() => handleTradeClick(token.symbol)}
           className="grid grid-cols-6 gap-4 p-6 border-b last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300 group">
             {/* Token Info Card with Favorite */}
             <div className="flex items-center gap-3">
               {/* Favorite Button */}
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={(e) => toggleFavorite(token.address, e)}
                 className="w-7 h-7 hover:bg-yellow-100 transition-colors flex-shrink-0"
               >
                 <Star 
                   className={`w-4 h-4 transition-all ${favorites.has(token.address) ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-slate-400 group-hover:text-yellow-400'}`} 
                 />
               </Button>
               <div 
                 className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center hover:scale-125 transition-transform duration-300 shadow-md flex-shrink-0"
               >
                 {token.logo_uri ? (
                   <Image
                     src={token.logo_uri}
                     alt={token.name}
                     width={48}
                     height={48}
                     className="w-full h-full object-cover"
                     onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       target.style.display = 'none';
                       target.nextElementSibling!.classList.remove('hidden');
                     }}
                   />
                 ) : null}
                 <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-600 ${token.logo_uri ? 'hidden' : ''}`}>
                   {token.symbol.slice(0, 2).toUpperCase()}
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/60 transition-opacity rounded-xl">
                   <ExternalLink className="w-4 h-4 text-white" />
                 </div>
                 {token.is_verified && (
                   <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                     <CheckCircle className="w-2.5 h-2.5 text-white" />
                   </div>
                 )}
               </div>
               <div className="min-w-0 flex-1">
                 <div className="mb-2">
                   <h3 className="font-semibold text-base text-slate-800 truncate">{token.name}</h3>
                 </div>
                 <div className="flex items-center gap-2">
                   <code className="text-xs font-mono text-slate-500 truncate">
                     {formatAddress(token.address)}
                   </code>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={(e) => copyToClipboard(token.address, e)}
                     className="w-5 h-5 hover:bg-blue-100 transition-colors shrink-0"
                     title="复制合约地址"
                   >
                     {copiedAddress === token.address ? (
                       <CheckCircle className="w-3 h-3 text-green-500" />
                     ) : (
                       <Copy className="w-3 h-3 text-slate-500 hover:text-blue-600" />
                     )}
                   </Button>
                 </div>
                 <div className="flex items-center gap-2 mt-1">
                   {token.website_address && (
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={(e) => { e.stopPropagation(); window.open(token.website_address, '_blank'); }}
                       className="w-6 h-6 hover:bg-blue-100 transition-colors"
                       title="访问官网"
                     >
                       <Globe className="w-4 h-4 text-blue-600" />
                     </Button>
                   )}
                   {token.twitter_address && (
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={(e) => { e.stopPropagation(); window.open(token.twitter_address, '_blank'); }}
                       className="w-6 h-6 hover:bg-blue-100 transition-colors"
                       title="Twitter"
                     >
                       <Twitter className="w-4 h-4 text-blue-400" />
                     </Button>
                   )}
                   {token.telegram_address && (
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={(e) => { e.stopPropagation(); window.open(token.telegram_address, '_blank'); }}
                       className="w-6 h-6 hover:bg-blue-100 transition-colors"
                       title="Telegram"
                     >
                       <MessageCircle className="w-4 h-4 text-blue-500" />
                     </Button>
                   )}
                 </div>
               </div>
             </div>
             
             {/* Price */}
             <div className="text-right">
               <div className="font-semibold text-slate-800">{formatPrice(token.price_usd)}</div>
             </div>
             
             {/* Market Cap */}
             <div className="text-right">
               <div className="font-semibold text-slate-800">{formatNumber(token.market_cap || 0)}</div>
             </div>
             
             {/* Volume */}
             <div className="text-right">
               <div className="font-semibold text-slate-800">{formatNumber(token.volume_24h || 0)}</div>
             </div>
             
             {/* Holders */}
             <div className="text-right">
               <div className="font-semibold text-slate-800">{formatHolders(Math.floor(Math.random() * 10000) + 100)}</div>
             </div>
             
             {/* Actions */}
             <div className="text-center">
               <div className="flex items-center justify-center gap-2">
                 <Button 
                   variant="default" 
                   size="sm"
                   className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                 >
                   交易
                 </Button>
                 {token.website_address && (
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={(e) => { e.stopPropagation(); window.open(token.website_address, '_blank'); }}
                     className="w-8 h-8 hover:bg-blue-100 transition-colors"
                     title="访问官网"
                   >
                     <Globe className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                   </Button>
                 )}
                 {token.twitter_address && (
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={(e) => { e.stopPropagation(); window.open(token.twitter_address, '_blank'); }}
                     className="w-8 h-8 hover:bg-blue-100 transition-colors"
                     title="Twitter"
                   >
                     <Twitter className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                   </Button>
                 )}
                 {token.telegram_address && (
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={(e) => { e.stopPropagation(); window.open(token.telegram_address, '_blank'); }}
                     className="w-8 h-8 hover:bg-blue-100 transition-colors"
                     title="Telegram"
                   >
                     <MessageCircle className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                   </Button>
                 )}
               </div>
             </div>
           </div>
         ))}

      </div>
    </div>
  );
}