import { useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import PoolABI from "../../abi/Pool.json";

interface BondingCurveData {
  tokenMint: string;
  virtualTokenReserves: bigint;
  virtualEthReserves: bigint;
  realTokenReserves: bigint;
  realEthReserves: bigint;
  tokenTotalSupply: bigint;
  mcapLimit: bigint;
  presaleOpen: boolean;
  tradingOpen: boolean;
  poolFail: boolean;
}

interface UsePoolReturn {
  // 创建池子
  createPool: (tokenAddress: `0x${string}`, amount: string) => Promise<void>;
  // 预售：用ETH购买代币
  presaleSwapETHForToken: (
    tokenAddress: `0x${string}`,
    ethAmount: string,
    to?: `0x${string}`
  ) => Promise<void>;
  // 预售：用代币换ETH
  presaleSwapTokenForETH: (
    tokenAddress: `0x${string}`,
    tokenAmount: string,
    to?: `0x${string}`
  ) => Promise<void>;
  // 计算预售：ETH换代币
  calculateETHForToken: (
    tokenAddress: `0x${string}`,
    ethAmount: string
  ) => bigint | undefined;
  // 计算预售：代币换ETH
  calculateTokenForETH: (
    tokenAddress: `0x${string}`,
    tokenAmount: string
  ) => bigint | undefined;
  // 获取绑定曲线数据
  getBondingCurve: (
    tokenAddress: `0x${string}`
  ) => BondingCurveData | undefined;
  // 获取市值
  getMarketCap: (tokenAddress: `0x${string}`) => bigint | undefined;
  // 获取创建费用
  createFee: bigint | undefined;
  // 状态
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: string | undefined;
}

export function usePool(contractAddress: `0x${string}`): UsePoolReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 写入合约的hook
  const { writeContract, data: hash, error: writeError } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 读取创建费用
  const { data: createFee } = useReadContract({
    address: contractAddress,
    abi: PoolABI,
    functionName: "createFee",
  });

  // 创建池子
  const createPool = async (tokenAddress: `0x${string}`, amount: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: contractAddress,
        abi: PoolABI,
        functionName: "createPool",
        args: [tokenAddress, parseEther(amount)],
        value: createFee as bigint,
      });
    } catch (err: any) {
      setError(err.message || "创建池子失败");
      console.error("创建池子失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 预售：用ETH购买代币
  const presaleSwapETHForToken = async (
    tokenAddress: `0x${string}`,
    ethAmount: string,
    to?: `0x${string}`
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: contractAddress,
        abi: PoolABI,
        functionName: "presaleSwapETHForToken",
        args: [tokenAddress, to || tokenAddress],
        value: parseEther(ethAmount),
      });
    } catch (err: any) {
      setError(err.message || "购买代币失败");
      console.error("购买代币失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 预售：用代币换ETH
  const presaleSwapTokenForETH = async (
    tokenAddress: `0x${string}`,
    tokenAmount: string,
    to?: `0x${string}`
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await writeContract({
        address: contractAddress,
        abi: PoolABI,
        functionName: "presaleSwapTokenForETH",
        args: [tokenAddress, to || tokenAddress, parseEther(tokenAmount)],
      });
    } catch (err: any) {
      setError(err.message || "出售代币失败");
      console.error("出售代币失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取绑定曲线数据
  const getBondingCurve = (tokenAddress: `0x${string}`) => {
    const { data } = useReadContract({
      address: contractAddress,
      abi: PoolABI,
      functionName: "bondingCurve",
      args: [tokenAddress],
    });

    if (!data) return undefined;

    const [
      tokenMint,
      virtualTokenReserves,
      virtualEthReserves,
      realTokenReserves,
      realEthReserves,
      tokenTotalSupply,
      mcapLimit,
      presaleOpen,
      tradingOpen,
      poolFail,
    ] = data as any[];

    return {
      tokenMint,
      virtualTokenReserves,
      virtualEthReserves,
      realTokenReserves,
      realEthReserves,
      tokenTotalSupply,
      mcapLimit,
      presaleOpen,
      tradingOpen,
      poolFail,
    } as BondingCurveData;
  };

  // 获取市值
  const getMarketCap = (tokenAddress: `0x${string}`) => {
    const { data } = useReadContract({
      address: contractAddress,
      abi: PoolABI,
      functionName: "mCap",
      args: [tokenAddress],
    });
    return data as bigint | undefined;
  };

  // 计算预售：ETH换代币
  const calculateETHForToken = (
    tokenAddress: `0x${string}`,
    ethAmount: string
  ) => {
    const { data } = useReadContract({
      address: contractAddress,
      abi: PoolABI,
      functionName: "calPresaleSwapETHForToken",
      args: [tokenAddress, parseEther(ethAmount)],
    });
    return data as bigint | undefined;
  };

  // 计算预售：代币换ETH
  const calculateTokenForETH = (
    tokenAddress: `0x${string}`,
    tokenAmount: string
  ) => {
    const { data } = useReadContract({
      address: contractAddress,
      abi: PoolABI,
      functionName: "calPresaleSwapTokenForETH",
      args: [tokenAddress, parseEther(tokenAmount)],
    });
    return data as bigint | undefined;
  };

  return {
    createPool,
    presaleSwapETHForToken,
    presaleSwapTokenForETH,
    calculateETHForToken,
    calculateTokenForETH,
    getBondingCurve,
    getMarketCap,
    createFee: createFee as bigint | undefined,
    isLoading: isLoading || isConfirming,
    isSuccess,
    error: error || writeError?.message || null,
    txHash: hash,
  };
}

// 导出类型
export type { BondingCurveData, UsePoolReturn };
