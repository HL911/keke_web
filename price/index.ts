// Price calculation modules
export * from './useLPPriceCalculator'
export * from './useAPRCalculator'

// Real price hooks
export {
  useRealPrices,
  useKEKETokenInfo,
  useLPTokenInfo,
  formatUSDPrice,
  SEPOLIA_ADDRESSES
} from './useRealPrices'

// Uniswap V4 price hooks
export {
  useUniswapV4PositionManager,
  useUserPositionBalance,
  useTokenInfo as useUniswapTokenInfo,
  calculatePriceFromSqrtPriceX96,
  formatTokenAmount
} from './useUniswapV4Price'

// Rename conflicting exports to avoid ambiguity
export {
  useChainlinkPrice as useLPChainlinkPrice,
  formatPrice as formatLPPrice
} from './useLPPriceCalculator'

export {
  useChainlinkETHPrice as useRealChainlinkETHPrice,
  formatPrice as formatRealPrice
} from './useRealPrices'

// Re-export commonly used functions with clear names
export {
  useLPTokenPrices,
  useTokenPriceFromLP,
  useChainlinkPrice,
  useTokenInfo,
  formatPrice as formatTokenPrice,
  formatTVL
} from './useLPPriceCalculator'

export {
  useAPRCalculator,
  useSimpleAPR,
  formatAPR,
  formatRewardValue
} from './useAPRCalculator'

// Price calculator hook
export { 
  usePriceCalculator,
  useLPTokenPrice,
  useETHPrice,
  useKEKETokenInfo as usePriceCalculatorKEKETokenInfo,
  useV2PairInfo,
  useV4PositionManagerInfo,
  formatPrice as formatCalculatorPrice,
  formatTokenAmount as formatPriceCalculatorTokenAmount,
  calculateV2KEKEPrice,
  calculateV2LPValue,
  SEPOLIA_ADDRESSES as PRICE_CALCULATOR_SEPOLIA_ADDRESSES
} from './usePriceCalculator'

// Export types
export type {
  TokenPriceInfo,
  LPTokenPriceResult
} from './useLPPriceCalculator'

export type {
  APRCalculationParams,
  APRResult
} from './useAPRCalculator'

export type { PriceData, TokenInfo } from './usePriceCalculator';

// APR with real prices
export {
  useAPRWithRealPrices,
  calculateAPR as calculateAPRWithDefaults,
  formatAPR as formatAPRWithRealPrices,
  getLPTokenDisplayName,
  getLPTokenVersion
} from './useAPRWithRealPrices';

export type { 
  APRCalculationParams as APRWithRealPricesParams, 
  APRResult as APRWithRealPricesResult 
} from './useAPRWithRealPrices';

