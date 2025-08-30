"use client";

import { sepolia, foundry } from "viem/chains";
import { http } from "viem";
import KekeToken_ABI from "../abi/KekeToken.json" with { type: "json" };
import KekeswapRouter_ABI from "../abi/KekeswapRouter.json" with { type: "json" };
import KekeswapFactory_ABI from "../abi/KekeswapFactory.json" with { type: "json" };
import WETH9_ABI from "../abi/WETH9.json" with { type: "json" };

import KekeMockERC20_ABI from "../abi/KekeMockERC20.json" with { type: "json" };

// ============== 公共参数 ================

// const chain = sepolia;
export const chain = foundry;

// ============== 各个合约相关配置 ================

// keke_foundry/src/KekeToken.sol
export const kekeTokenConfig = {
  address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
  abi: KekeToken_ABI,
  chain,
};

// keke_foundry/src/swap/KekeswapRouter.sol
export const kekeSwapRouterConfig = {
  address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" as `0x${string}`,
  abi: KekeswapRouter_ABI,
  chain,
};

// keke_foundry/src/swap/KekeswapFactory.sol
export const kekeSwapFactoryConfig = {
  address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as `0x${string}`,
  abi: KekeswapFactory_ABI,
  chain,
};

// keke_foundry/src/swap/WETH9.sol
export const weth9Config = {
  address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`,
  abi: WETH9_ABI,
  chain,
};

// keke_foundry/src/mock/KekeMockERC20.sol
// export const erc20Config = {
//   address: "0xC044905455DBe3ba560FF064304161b9995B1898" as `0x${string}`,
//   abi: KekeMockERC20_ABI,
//   chain,
// };