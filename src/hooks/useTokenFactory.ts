import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import TokenFactoryABI from '../abi/TokenFactory.json';

interface CreateTokenParams {
  name: string;
  symbol: string;
  description: string;
  iconAddress: string;
  twitterAddress: string;
  telegramAddress: string;
  websiteAddress: string;
}

interface CreateTokenResult {
  tokenAddress: string;
  txHash: string;
}

interface UseTokenFactoryReturn {
  // 创建代币（不购买）
  createToken: (params: CreateTokenParams) => Promise<CreateTokenResult | null>;
  // 创建代币并购买
  createTokenAndBuy: (params: CreateTokenParams, ethAmount: string) => Promise<CreateTokenResult | null>;
  // 获取当前代币索引
  currentTokenIndex: bigint | undefined;
  // 获取所有代币
  tokens: any[] | undefined;
  // 状态
  isCreating: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: string | undefined;
}

export function useTokenFactory(contractAddress: `0x${string}`): UseTokenFactoryReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 写入合约的hook
  const { writeContract, data: hash, error: writeError, reset } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // 读取当前代币索引
  const { data: currentTokenIndex } = useReadContract({
    address: contractAddress,
    abi: TokenFactoryABI,
    functionName: 'currentTokenIndex',
  });

  // 读取所有代币
  const { data: tokens } = useReadContract({
    address: contractAddress,
    abi: TokenFactoryABI,
    functionName: 'getTokens',
  });

  const publicClient = usePublicClient();

  // 创建代币（不购买）
  const createToken = async (params: CreateTokenParams): Promise<CreateTokenResult | null> => {
    return new Promise((resolve, reject) => {
      setIsCreating(true);
      setError(null);
      setIsSuccess(false);
      reset(); // 重置 writeContract 状态

      // 调用合约写入函数
      writeContract({
        address: contractAddress,
        abi: TokenFactoryABI,
        functionName: 'createBump',
        args: [
          params.name,
          params.symbol,
          params.description,
          params.iconAddress,
          params.twitterAddress,
          params.telegramAddress,
          params.websiteAddress,
        ],
      }, {
        onSuccess: async (txHash) => {
          try {
            if (!publicClient) {
              throw new Error('Public client not available');
            }

            // 等待交易确认并获取回执
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            
            // 从交易回执的日志中解析代币地址
            let tokenAddress = '';
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: TokenFactoryABI,
                  data: log.data,
                  topics: log.topics,
                });
                
                // 解析 MemeDeployed 事件，获取代币地址
                if (decoded.eventName === 'MemeDeployed' && decoded.args) {
                  tokenAddress = (decoded.args as unknown as Record<string, unknown>).tokenAddr as string;
                  break;
                }
              } catch {
                // 忽略解码失败的日志
                continue;
              }
            }

            if (!tokenAddress) {
              throw new Error('无法从交易回执中获取代币地址');
            }

            setIsSuccess(true);
            setIsCreating(false);
            resolve({
              tokenAddress,
              txHash,
            });
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '解析代币地址失败';
            setError(errorMessage);
            setIsCreating(false);
            reject(new Error(errorMessage));
          }
        },
        onError: (error) => {
          const errorMessage = error.message || '创建代币失败';
          setError(errorMessage);
          setIsCreating(false);
          reject(new Error(errorMessage));
        }
      });
    });
  };

  // 创建代币并购买
  const createTokenAndBuy = async (params: CreateTokenParams, ethAmount: string): Promise<CreateTokenResult | null> => {
    return new Promise((resolve, reject) => {
      setIsCreating(true);
      setError(null);
      setIsSuccess(false);
      reset(); // 重置 writeContract 状态

      writeContract({
        address: contractAddress,
        abi: TokenFactoryABI,
        functionName: 'createBumpAndBuy',
        args: [
          params.name,
          params.symbol,
          params.description,
          params.iconAddress,
          params.twitterAddress,
          params.telegramAddress,
          params.websiteAddress,
        ],
        value: parseEther(ethAmount),
      }, {
        onSuccess: async (txHash) => {
          try {
            if (!publicClient) {
              throw new Error('Public client not available');
            }

            // 等待交易确认并获取回执
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            
            // 从交易回执的日志中解析代币地址
            let tokenAddress = '';
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: TokenFactoryABI,
                  data: log.data,
                  topics: log.topics,
                });
                
                // 解析 MemeDeployed 事件，获取代币地址
                if (decoded.eventName === 'MemeDeployed' && decoded.args) {
                  tokenAddress = (decoded.args as unknown as Record<string, unknown>).tokenAddr as string;
                  break;
                }
              } catch {
                // 忽略解码失败的日志
                continue;
              }
            }

            if (!tokenAddress) {
              throw new Error('无法从交易回执中获取代币地址');
            }

            setIsSuccess(true);
            setIsCreating(false);
            resolve({
              tokenAddress,
              txHash,
            });
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '解析代币地址失败';
            setError(errorMessage);
            setIsCreating(false);
            reject(new Error(errorMessage));
          }
        },
        onError: (error) => {
          const errorMessage = error.message || '创建代币并购买失败';
          setError(errorMessage);
          setIsCreating(false);
          reject(new Error(errorMessage));
        }
      });
    });
  };

  return {
    createToken,
    createTokenAndBuy,
    currentTokenIndex: currentTokenIndex as bigint | undefined,
    tokens: tokens as unknown[] | undefined,
    isCreating: isCreating || isConfirming,
    isSuccess,
    error: error || writeError?.message || null,
    txHash: hash,
  };
}

// 导出类型
export type { CreateTokenParams, CreateTokenResult, UseTokenFactoryReturn };