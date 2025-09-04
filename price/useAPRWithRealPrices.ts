import { useMemo } from 'react';
import { Address } from 'viem';
import { usePriceCalculator } from './usePriceCalculator';

export interface APRCalculationParams {
  kekePerBlock: bigint;
  allocPoint: bigint;
  totalAllocPoint: bigint;
  totalStaked: bigint;
  lpTokenAddress?: Address;
  kekeTokenAddress?: Address;
}

export interface APRResult {
  apr: number;
  isLoading: boolean;
  error: Error | null;
  priceData: {
    ethPrice: number;
    kekePrice: number;
    lpTokenValue: number;
    lpTokenType: 'V2' | 'V4';
    lpTokenName: string;
  } | null;
}

/**
 * 使用真实价格计算APR的Hook
 * 这个hook结合了价格获取和APR计算逻辑
 */
export function useAPRWithRealPrices(params: APRCalculationParams): APRResult {
  const {
    kekePerBlock,
    allocPoint,
    totalAllocPoint,
    totalStaked,
    lpTokenAddress,
    kekeTokenAddress
  } = params;

  // 获取真实价格数据
  const { data: priceData, isLoading, error } = usePriceCalculator();

  // 计算APR
  const apr = useMemo(() => {
    if (!totalStaked || totalStaked === BigInt(0)) return 0;
    
    // 每天大约产生6400个区块（假设15秒一个区块）
    const blocksPerDay = BigInt(6400);
    const blocksPerYear = blocksPerDay * BigInt(365);
    
    // 计算该池子每年的KEKE奖励 - 将BigInt转换为Number
    const poolKekePerYear = (Number(kekePerBlock) * Number(allocPoint) * Number(blocksPerYear)) / Number(totalAllocPoint);
    
    // 使用真实价格或默认价格
    let kekePrice = 1;
    let lpTokenValue = 1;
    
    if (priceData && kekeTokenAddress && lpTokenAddress) {
      kekePrice = priceData.kekePrice;
      lpTokenValue = priceData.lpTokenValue;
    }
    
    // 计算年化奖励价值（美元）- 将BigInt转换为Number
    const yearlyRewardValue = Number(poolKekePerYear) * kekePrice / 1e18; // 假设KEKE是18位小数
    
    // 计算总质押价值（美元）- 将BigInt转换为Number
    const totalStakedValue = Number(totalStaked) * lpTokenValue / 1e18; // 假设LP代币是18位小数
    
    if (totalStakedValue === 0) return 0;
    
    // APR = (年化奖励价值 / 总质押价值) * 100
    return (yearlyRewardValue / totalStakedValue) * 100;
  }, [
    kekePerBlock,
    allocPoint,
    totalAllocPoint,
    totalStaked,
    priceData,
    kekeTokenAddress,
    lpTokenAddress
  ]);

  return {
    apr,
    isLoading,
    error,
    priceData
  };
}

/**
 * 计算APR的辅助函数（保持向后兼容）
 * 这个函数现在返回默认值，真实计算应该使用useAPRWithRealPrices hook
 */
export function calculateAPR(
  kekePerBlock: bigint,
  allocPoint: bigint,
  totalAllocPoint: bigint,
  totalStaked: bigint,
  lpTokenAddress?: Address,
  kekeTokenAddress?: Address
): number {
  if (!totalStaked || totalStaked === BigInt(0)) return 0;
  
  // 每天大约产生6400个区块（假设15秒一个区块）
  const blocksPerDay = BigInt(6400);
  const blocksPerYear = blocksPerDay * BigInt(365);
  
  // 计算该池子每年的KEKE奖励
  const poolKekePerYear = (kekePerBlock * allocPoint * blocksPerYear) / totalAllocPoint;
  
  // 默认价格（作为fallback）
  let kekePrice = 1;
  let lpTokenValue = 1;
  
  // 注意：这里不能使用hooks，所以只能返回基于默认价格的计算
  // 如果需要真实价格，请在组件中使用useAPRWithRealPrices hook
  
  // 计算年化奖励价值（美元）
  const yearlyRewardValue = Number(poolKekePerYear) * kekePrice / 1e18;
  
  // 计算总质押价值（美元）
  const totalStakedValue = Number(totalStaked) * lpTokenValue / 1e18;
  
  if (totalStakedValue === 0) return 0;
  
  // APR = (年化奖励价值 / 总质押价值) * 100
  return (yearlyRewardValue / totalStakedValue) * 100;
}

/**
 * 格式化APR显示
 */
export function formatAPR(apr: number, decimals: number = 2): string {
  return `${apr.toFixed(decimals)}%`;
}

/**
 * 获取LP代币显示名称
 */
export function getLPTokenDisplayName(lpTokenAddress: Address): string {
  // 根据地址判断是V2还是V4
  const V2_PAIR = '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2'; // WETH9_KEKE_PAIR
  const V4_LP = '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4'; // KEKE_WETH_V4
  
  if (lpTokenAddress.toLowerCase() === V2_PAIR.toLowerCase()) {
    return 'WETH9-KEKE (V2)';
  } else if (lpTokenAddress.toLowerCase() === V4_LP.toLowerCase()) {
    return 'KEKE-ETH (V4)';
  }
  
  return 'LP Token';
}

/**
 * 判断LP代币版本
 */
export function getLPTokenVersion(lpTokenAddress: Address): 'V2' | 'V4' | 'Unknown' {
  const V2_PAIR = '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2';
  const V4_LP = '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4';
  
  if (lpTokenAddress.toLowerCase() === V2_PAIR.toLowerCase()) {
    return 'V2';
  } else if (lpTokenAddress.toLowerCase() === V4_LP.toLowerCase()) {
    return 'V4';
  }
  
  return 'Unknown';
}