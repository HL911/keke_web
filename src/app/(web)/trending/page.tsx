"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Star,
  BarChart3,
  DollarSign,
  Activity,
} from "lucide-react";
import { useState } from "react";
import { TokenList } from "./components/TokenList";
import { useMemeTokens } from "./hook/useMemeTokens";

export default function TrendingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"market_cap" | "volume_24h" | "created_at">("market_cap");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  
  const { tokens, loading, error, stats } = useMemeTokens({
    search: searchTerm,
    orderBy: sortBy,
    orderDirection: sortDirection,
    limit: 50,
  });

  const handleSortChange = (value: string) => {
    setSortBy(value as "market_cap" | "volume_24h" | "created_at");
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "ASC" ? "DESC" : "ASC");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  
        {/* Token List */}
        <TokenList tokens={tokens} loading={loading} error={error} />
      </div>
    </div>
  );
}