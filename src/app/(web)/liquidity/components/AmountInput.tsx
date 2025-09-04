"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet, AlertTriangle, RefreshCw } from "lucide-react";
import { Token, TokenSelector } from "./TokenSelector";
import {
  useTokenBalance,
  useNativeBalance,
} from "@/hooks/tokens/useTokenBalance";

interface AmountInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  selectedToken?: Token | null;
  onTokenSelect: (token: Token) => void;
  disabled?: boolean;
  excludeTokens?: string[];
  showBalance?: boolean;
  showUSDValue?: boolean;
  error?: string;
  className?: string;
  enableTokenSelection?: boolean;
  onFocus?: () => void;
  readOnly?: boolean;
}

// 格式化数字显示
const formatNumber = (value: number, decimals: number = 2): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(decimals) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(decimals) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(decimals) + "K";
  return value.toFixed(decimals);
};

export function AmountInput({
  label,
  value,
  onChange,
  selectedToken,
  onTokenSelect,
  disabled = false,
  excludeTokens = [],
  showBalance = true,
  showUSDValue = true,
  error,
  className = "",
  enableTokenSelection = true,
  onFocus,
  readOnly = false,
}: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // 使用 useTokenBalance hook 获取代币余额
  const tokenBalance = useTokenBalance({
    tokenAddress: selectedToken?.address || "",
    decimals: selectedToken?.decimals || 18,
    symbol: selectedToken?.symbol || "",
  });

  // 使用 useNativeBalance hook 获取原生代币余额
  const nativeBalance = useNativeBalance();

  // 获取当前余额（代币或原生代币）
  const currentBalance = useMemo(() => {
    if (!selectedToken) return 0;

    if (selectedToken.isNative) {
      const balance = nativeBalance.balance;
      if (!balance) return 0;
      return Number(balance) / Math.pow(10, 18); // ETH 默认 18 位小数
    } else {
      const balance = tokenBalance.balance;
      if (!balance) return 0;
      return Number(balance) / Math.pow(10, selectedToken.decimals);
    }
  }, [selectedToken, tokenBalance.balance, nativeBalance.balance]);

  // 格式化余额显示
  const formattedBalance = useMemo(() => {
    if (!selectedToken) return "0";

    if (selectedToken.isNative) {
      return nativeBalance.formatted || "0";
    } else {
      return tokenBalance.formatted || "0";
    }
  }, [selectedToken, tokenBalance.formatted, nativeBalance.formatted]);

  // 获取余额加载状态
  const isBalanceLoading = useMemo(() => {
    if (!selectedToken) return false;
    return selectedToken.isNative
      ? nativeBalance.isLoading
      : tokenBalance.isLoading;
  }, [selectedToken, tokenBalance.isLoading, nativeBalance.isLoading]);

  // 获取余额错误
  const balanceError = useMemo(() => {
    if (!selectedToken) return null;
    return selectedToken.isNative ? nativeBalance.error : tokenBalance.error;
  }, [selectedToken, tokenBalance.error, nativeBalance.error]);

  // 刷新余额
  const refreshBalance = () => {
    if (!selectedToken) return;
    if (selectedToken.isNative) {
      nativeBalance.refresh();
    } else {
      tokenBalance.refresh();
    }
  };

  // 计算USD价值
  const usdValue = useMemo(() => {
    const amount = parseFloat(value || "0");
    if (!amount || !selectedToken?.price) return 0;
    return amount * selectedToken.price;
  }, [value, selectedToken]);

  // 验证输入
  const inputError = useMemo(() => {
    if (error) return error;

    const amount = parseFloat(value || "0");
    if (value && amount < 0) return "金额必须大于0";
    if (amount > currentBalance && currentBalance > 0) return "余额不足";
    if (amount > 1e15) return "金额过大";

    return "";
  }, [value, currentBalance, error]);

  const handleInputChange = (inputValue: string) => {
    // 如果输入框是只读的，不允许用户输入
    if (readOnly) return;

    // 只允许数字和小数点
    const sanitized = inputValue.replace(/[^0-9.]/g, "");

    // 防止多个小数点
    const parts = sanitized.split(".");
    if (parts.length > 2) return;

    // 限制小数位数
    if (parts[1] && parts[1].length > 18) return;

    onChange(sanitized);
  };

  // 快捷金额按钮
  const quickAmounts = [
    { label: "25%", value: 0.25 },
    { label: "50%", value: 0.5 },
    { label: "75%", value: 0.75 },
    { label: "MAX", value: 1 },
  ];

  const handleQuickAmount = (percentage: number) => {
    if (currentBalance > 0) {
      const amount = currentBalance * percentage;
      onChange(amount.toString());
    }
  };

  // 获取输入框样式
  const getInputStyle = () => {
    if (inputError) {
      return {
        borderColor:
          "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200",
        bgColor: "bg-red-50",
      };
    }
    if (isFocused) {
      return {
        borderColor: "border-blue-500 focus:ring-1 focus:ring-blue-200",
        bgColor: "bg-white",
      };
    }
    return {
      borderColor: "border-gray-300",
      bgColor: "bg-white",
    };
  };

  const inputStyle = getInputStyle();

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 标签 */}
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700">{label}</label>
        </div>
      )}

      {/* 主输入区域 */}
      <div
        className={`border rounded-xl transition-all ${inputStyle.bgColor} ${
          inputStyle.borderColor
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${
          readOnly ? "opacity-75 cursor-default" : ""
        } ${className.includes("bg-gray-50") ? "bg-gray-50" : "bg-white"}`}
      >
        <div className="flex items-center p-4">
          {/* 数量输入 */}
          <div className="flex-1">
            <Input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (!readOnly) {
                  setIsFocused(true);
                  onFocus?.();
                }
              }}
              onBlur={() => setIsFocused(false)}
              placeholder="0.0"
              disabled={disabled}
              readOnly={readOnly}
              className={`border-0 p-0 pl-2 text-2xl font-semibold bg-transparent focus:ring-0 focus:outline-none placeholder:text-gray-400 ${
                readOnly
                  ? "cursor-default focus:ring-0 focus:outline-none focus:border-transparent"
                  : ""
              }`}
            />

            {/* USD价值 */}
            {showUSDValue && usdValue > 0 && (
              <div className="text-sm text-gray-500 mt-1 font-medium">
                ≈ ${formatNumber(usdValue)}
              </div>
            )}
          </div>

          {/* 代币选择器 */}
          <div className="ml-4 min-w-[140px]">
            <TokenSelector
              selectedToken={selectedToken}
              onTokenSelect={onTokenSelect}
              disabled={disabled}
              excludeTokens={excludeTokens}
              enableTokenSelection={enableTokenSelection}
              className="h-10 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            />
          </div>
        </div>

        {/* 余额显示和快捷金额按钮 */}
        {showBalance && selectedToken && (
          <div className="flex items-center justify-between gap-4 p-3 border-t border-gray-100">
            {/* 余额显示 */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="w-4 h-4" />
              <span>
                余额:{" "}
                {isBalanceLoading
                  ? "加载中..."
                  : balanceError
                  ? "获取失败"
                  : `${formattedBalance} ${selectedToken.symbol}`}
              </span>

              {/* 刷新按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalance}
                disabled={isBalanceLoading}
                className="h-auto p-1 text-gray-400 hover:text-gray-600 text-xs"
              >
                <RefreshCw
                  className={`w-3 h-3 ${
                    isBalanceLoading ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>

            {/* 快捷金额按钮 */}
            {currentBalance > 0 &&
              !isBalanceLoading &&
              !balanceError &&
              !readOnly && (
                <div className="flex gap-1">
                  {quickAmounts.map((quick) => (
                    <Button
                      key={quick.label}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAmount(quick.value)}
                      className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg"
                    >
                      {quick.label}
                    </Button>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {(inputError || balanceError) && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{inputError || balanceError}</span>
        </div>
      )}
    </div>
  );
}
