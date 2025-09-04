import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { useTokenApproval } from "@/hooks/tokens/useTokenApproval";
import { useSwapRouter } from "@/hooks/swap/useSwapRouter";
import {
  useKekeswapRouterAddress,
  useKekeswapFactoryAddress,
} from "@/hooks/useContract";
import { useAllTokenConfigs } from "@/hooks/tokens/useTokenConfig";
import {
  useBidirectionalCalculateAmount,
  CalculateToken,
} from "@/hooks/liquidity/useCalculateAmount";
import { Token } from "../../liquidity/components/TokenSelector";

export interface SwapParams {
  tokenA: Token | null;
  tokenB: Token | null;
  amountA: string;
  amountB: string;
  slippage: string;
  customSlippage: string;
}

export interface SwapState {
  // 基础状态
  tokenA: Token | null;
  tokenB: Token | null;
  amountA: string;
  amountB: string;
  slippage: string;
  customSlippage: string;
  isLoading: boolean;
  error: string | null;

  // 计算值
  isValidInput: boolean;
  priceRatio: { ratioAtoB: number; ratioBtoA: number } | null;
  totalValue: number;
  minAmounts: {
    minAmountA: number;
    minAmountB: number;
    slippagePercent: number;
  } | null;

  // 实时计算状态
  isCalculating: boolean;
  calculationError: string | null;
  calculatedAmountA: string;
  calculatedAmountB: string;
  isAutoCalculating: boolean; // 是否正在自动计算

  // 授权状态
  approvals: Record<string, boolean>;
  allApproved: boolean;
  anyApproving: boolean;
  approvalError: string | null;
}

export interface SwapActions {
  // 代币选择
  setTokenA: (token: Token | null) => void;
  setTokenB: (token: Token | null) => void;
  handleTokenASelect: (token: Token) => void;
  handleTokenBSelect: (token: Token) => void;

  // 数量设置
  setAmountA: (amount: string) => void;
  setAmountB: (amount: string) => void;
  setActiveInput: (input: "A" | "B") => void;

  // 实时计算
  enableAutoCalculation: () => void;
  disableAutoCalculation: () => void;
  calculateAmountB: () => void;
  calculateAmountA: () => void;

  // 滑点设置
  setSlippage: (slippage: string) => void;
  setCustomSlippage: (slippage: string) => void;
  handleSlippagePreset: (preset: string) => void;
  handleCustomSlippageChange: (value: string) => void;

  // 授权操作
  approveAll: () => Promise<void>;

  // 添加流动性
  handleSwap: () => Promise<void>;

  // 重置
  resetForm: () => void;
  setError: (error: string | null) => void;
}

// 转换Token类型为CalculateToken类型的辅助函数
const convertToCalculateToken = (
  token: Token | null
): CalculateToken | null => {
  if (!token) return null;
  return {
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
    isNative: token.symbol === "ETH",
  };
};

export function useSwap(
  initialTokenA?: Token | null,
  initialTokenB?: Token | null
) {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const searchParams = useSearchParams();

  const tokenAAddress = searchParams.get("tokenA");
  const tokenBAddress = searchParams.get("tokenB");
  const allTokenConfigs = useAllTokenConfigs();

  // 基础状态
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 实时计算状态
  const [isAutoCalculating, setIsAutoCalculating] = useState(true);
  const [calculatedAmountA, setCalculatedAmountA] = useState("");
  const [calculatedAmountB, setCalculatedAmountB] = useState("");
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<"A" | "B">("A"); // 当前活跃的输入字段

  // 初始化token状态 - 优先使用传入的参数
  useEffect(() => {
    if (initialTokenA) {
      setTokenA(initialTokenA);
    } else if (
      tokenAAddress &&
      allTokenConfigs &&
      allTokenConfigs.tokenConfigs
    ) {
      const tokenAConfig = Object.values(allTokenConfigs.tokenConfigs).find(
        (token) => token.address.toLowerCase() === tokenAAddress.toLowerCase()
      );
      if (tokenAConfig) {
        setTokenA({
          address: tokenAConfig.address,
          symbol: tokenAConfig.symbol,
          decimals: tokenAConfig.decimals,
          name: tokenAConfig.name,
          logoURI: tokenAConfig.logo_uri,
        });
      }
    }

    if (initialTokenB) {
      setTokenB(initialTokenB);
    } else if (
      tokenBAddress &&
      allTokenConfigs &&
      allTokenConfigs.tokenConfigs
    ) {
      const tokenBConfig = Object.values(allTokenConfigs.tokenConfigs).find(
        (token) => token.address.toLowerCase() === tokenBAddress.toLowerCase()
      );
      if (tokenBConfig) {
        setTokenB({
          address: tokenBConfig.address,
          symbol: tokenBConfig.symbol,
          decimals: tokenBConfig.decimals,
          name: tokenBConfig.name,
          logoURI: tokenBConfig.logo_uri,
        });
      }
    }
  }, [
    initialTokenA,
    initialTokenB,
    tokenAAddress,
    tokenBAddress,
    allTokenConfigs,
  ]);

  // 获取swap router实例
  const { swapExactTokensForTokens, getDeadline, calculateMinAmount } =
    useSwapRouter();

  // 双向计算
  const calculateTokenA = convertToCalculateToken(tokenA);
  const calculateTokenB = convertToCalculateToken(tokenB);

  const {
    calculatedAmountA: calculatedAmountAFromHook,
    calculatedAmountB: calculatedAmountBFromHook,
    isLoading: isCalculating,
    error: calculationErrorFromHook,
    refresh: refreshCalculation,
  } = useBidirectionalCalculateAmount({
    tokenA: calculateTokenA!,
    tokenB: calculateTokenB!,
    amountA,
    amountB,
    activeInput,
  });

  // 处理实时计算结果
  useEffect(() => {
    if (isAutoCalculating && !isCalculating) {
      // 检查当前输入是否为空或为0，如果是则不进行自动计算
      const isCurrentInputEmpty =
        (activeInput === "A" &&
          (!amountA ||
            amountA === "0" ||
            amountA === "0." ||
            amountA === "0.0" ||
            amountA === "0.00")) ||
        (activeInput === "B" &&
          (!amountB ||
            amountB === "0" ||
            amountB === "0." ||
            amountB === "0.0" ||
            amountB === "0.00"));

      if (isCurrentInputEmpty) {
        // 如果当前输入为空，清空另一个输入框
        if (activeInput === "A") {
          setAmountB("");
        } else if (activeInput === "B") {
          setAmountA("");
        }
        setCalculationError(null);
        return;
      }

      if (activeInput === "A" && calculatedAmountBFromHook) {
        setCalculatedAmountB(calculatedAmountBFromHook);
        setAmountB(calculatedAmountBFromHook);
      } else if (activeInput === "B" && calculatedAmountAFromHook) {
        setCalculatedAmountA(calculatedAmountAFromHook);
        setAmountA(calculatedAmountAFromHook);
      }
      setCalculationError(null);
    }
  }, [
    calculatedAmountAFromHook,
    calculatedAmountBFromHook,
    isCalculating,
    isAutoCalculating,
    activeInput,
    amountA,
    amountB,
  ]);

  // 处理计算错误
  useEffect(() => {
    if (calculationErrorFromHook) {
      setCalculationError(calculationErrorFromHook);
    }
  }, [calculationErrorFromHook]);

  // 验证输入
  const isValidInput = useMemo(() => {
    return !!(
      tokenA &&
      tokenB &&
      amountA &&
      amountB &&
      parseFloat(amountA) > 0 &&
      parseFloat(amountB) > 0 &&
      tokenA.address !== tokenB.address
    );
  }, [tokenA, tokenB, amountA, amountB]);

  // 获取router地址和factory地址
  const routerAddress = useKekeswapRouterAddress();
  const factoryAddress = useKekeswapFactoryAddress();

  // 获取代币授权状态 - 只授权卖出的代币（tokenA）
  const tokenAApproval = useTokenApproval({
    tokenAddress: tokenA?.address || "",
    spenderAddress:
      routerAddress || "0x0000000000000000000000000000000000000000",
    requiredAmount: amountA || "0",
    decimals: tokenA?.decimals || 18,
    enabled: !!(isValidInput && isConnected && tokenA && amountA),
  });

  // 授权状态（只需要授权 tokenA）
  const allApproved = tokenAApproval.isApproved;
  const anyApproving = tokenAApproval.isApproving;
  const approvalError = tokenAApproval.error;

  // 授权卖出的代币函数
  const approveAll = useCallback(async () => {
    if (tokenA && amountA && !tokenAApproval.isApproved) {
      await tokenAApproval.approve(amountA);
    }
  }, [tokenA, amountA, tokenAApproval]);

  // 计算价格比率
  const priceRatio = useMemo(() => {
    if (!tokenA || !tokenB || !amountA || !amountB) return null;
    const ratioAtoB = parseFloat(amountB) / parseFloat(amountA);
    const ratioBtoA = parseFloat(amountA) / parseFloat(amountB);
    return { ratioAtoB, ratioBtoA };
  }, [tokenA, tokenB, amountA, amountB]);

  // 计算总价值
  // todo: 根据token的实际价格计算
  const totalValue = useMemo(() => {
    let total = 0;
    if (tokenA && amountA && tokenA.price) {
      total += parseFloat(amountA) * tokenA.price;
    }
    if (tokenB && amountB && tokenB.price) {
      total += parseFloat(amountB) * tokenB.price;
    }
    return total;
  }, [tokenA, tokenB, amountA, amountB]);

  // 计算最小数量（考虑滑点）
  const minAmounts = useMemo(() => {
    if (!tokenA || !tokenB || !amountA || !amountB) return null;

    const currentSlippage = customSlippage
      ? parseFloat(customSlippage)
      : parseFloat(slippage);
    const slippageMultiplier = 1 - currentSlippage / 100;

    const minAmountA = parseFloat(amountA) * slippageMultiplier;
    const minAmountB = parseFloat(amountB) * slippageMultiplier;

    return {
      minAmountA,
      minAmountB,
      slippagePercent: currentSlippage,
    };
  }, [tokenA, tokenB, amountA, amountB, slippage, customSlippage]);

  // 代币选择处理函数
  const handleTokenASelect = useCallback(
    (token: Token) => {
      setTokenA(token);
      if (tokenB && token.address === tokenB.address) {
        setTokenB(null);
        setAmountB("");
      }
    },
    [tokenB]
  );

  const handleTokenBSelect = useCallback(
    (token: Token) => {
      setTokenB(token);
      if (tokenA && token.address === tokenA.address) {
        setTokenA(null);
        setAmountA("");
      }
    },
    [tokenA]
  );

  // 数量设置处理函数
  const handleAmountAChange = useCallback((amount: string) => {
    setAmountA(amount);
    setActiveInput("A");
  }, []);

  const handleAmountBChange = useCallback((amount: string) => {
    setAmountB(amount);
    setActiveInput("B");
  }, []);

  // 滑点处理函数
  const handleSlippagePreset = useCallback((preset: string) => {
    setSlippage(preset);
    setCustomSlippage("");
  }, []);

  const handleCustomSlippageChange = useCallback((value: string) => {
    setCustomSlippage(value);
    if (value) {
      setSlippage("");
    }
  }, []);

  // 计算相关actions
  const enableAutoCalculation = useCallback(() => {
    setIsAutoCalculating(true);
  }, []);

  const disableAutoCalculation = useCallback(() => {
    setIsAutoCalculating(false);
  }, []);

  const calculateAmountB = useCallback(() => {
    if (calculateTokenA && calculateTokenB && amountA) {
      refreshCalculation();
    }
  }, [calculateTokenA, calculateTokenB, amountA, refreshCalculation]);

  const calculateAmountA = useCallback(() => {
    if (calculateTokenA && calculateTokenB && amountB) {
      refreshCalculation();
    }
  }, [calculateTokenA, calculateTokenB, amountB, refreshCalculation]);

  // 重置表单
  const resetForm = useCallback(() => {
    setAmountA("");
    setAmountB("");
    setCalculatedAmountA("");
    setCalculatedAmountB("");
    setCalculationError(null);
    // setTokenA(null);
    // setTokenB(null);
    setError(null);
  }, []);

  // 交易处理函数
  const handleSwap = useCallback(async (): Promise<void> => {
    if (!isValidInput || !isConnected || !routerAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const deadline = getDeadline(20); // 20分钟截止时间
      const currentSlippage = customSlippage
        ? parseFloat(customSlippage)
        : parseFloat(slippage);

      // 对于 swap，amountIn 是输入金额，amountOutMin 是期望的最小输出金额
      const amountIn = parseUnits(amountA, tokenA!.decimals).toString();
      const expectedAmountOut = parseUnits(
        amountB,
        tokenB!.decimals
      ).toString();
      const amountOutMin = calculateMinAmount(
        expectedAmountOut,
        currentSlippage
      );

      // 检查是否需要授权
      if (!allApproved) {
        setError("请先授权代币");
        return;
      }

      //   amountIn: string;
      //   amountOutMin: string;

      // 调用 Swap
      const result = await swapExactTokensForTokens({
        amountIn,
        amountOutMin,
        path: [tokenA!.address, tokenB!.address],
        to: address!,
        deadline,
      });

      console.log("交易成功:", result);

      // 获取交易哈希（从addLiquidity的返回值中获取）
      const transactionHash = result.hash;

      // todo：交易成功后，向数据库中插入一条交易数据

      // 重置表单
      resetForm();
    } catch (error: unknown) {
      console.error("交易失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "交易失败，请重试";
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    isValidInput,
    isConnected,
    routerAddress,
    factoryAddress,
    publicClient,
    customSlippage,
    slippage,
    amountA,
    amountB,
    tokenA,
    tokenB,
    allApproved,
    address,
    totalValue,
    getDeadline,
    calculateMinAmount,
    swapExactTokensForTokens,
    resetForm,
  ]);

  // 状态对象
  const state: SwapState = {
    tokenA,
    tokenB,
    amountA,
    amountB,
    slippage,
    customSlippage,
    isLoading,
    error,
    isValidInput,
    priceRatio,
    totalValue,
    minAmounts,
    isCalculating,
    calculationError,
    calculatedAmountA,
    calculatedAmountB,
    isAutoCalculating,
    approvals: {
      [tokenA?.address || "tokenA"]: tokenAApproval.isApproved,
    },
    allApproved: allApproved || false,
    anyApproving: anyApproving || false,
    approvalError: approvalError || null,
  };

  // 操作对象
  const actions: SwapActions = {
    setTokenA,
    setTokenB,
    handleTokenASelect,
    handleTokenBSelect,
    setAmountA: handleAmountAChange,
    setAmountB: handleAmountBChange,
    setActiveInput,
    enableAutoCalculation,
    disableAutoCalculation,
    calculateAmountB,
    calculateAmountA,
    setSlippage,
    setCustomSlippage,
    handleSlippagePreset,
    handleCustomSlippageChange,
    approveAll,
    handleSwap,
    resetForm,
    setError,
  };

  return {
    state,
    actions,
  };
}
