"use client";

import { ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import {
  optimism,
  mainnet,
  foundry,
  sepolia,
  polygon,
  bsc,
} from "@reown/appkit/networks";
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// ==================== AppKit 相关配置 =======================
// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId from https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

// 2. 元数据在在钱包连接界面中显示 - Wallet Connect 扫码时将看到此信息
const metadata = {
  name: "KekeSwap",
  description: "",
  url: "https://reown.com/appkit",
  icons: ["../../public/favicon.ico"],
};

// 自定义网络配置，指定RPC节点
const customNetworks = {
  mainnet,

  // Sepolia测试网 - 使用Infura RPC (需要设置环境变量 INFURA_API_KEY)
  sepolia: defineChain({
    ...sepolia,
    rpcUrls: {
      default: {
        http: [
          process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_1 || "",
          process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_2 || "",
        ],
      },
      public: {
        http: [
          "https://rpc.sepolia.org",
          "https://ethereum-sepolia.publicnode.com",
        ],
      },
    },
  }),

  // 本地Foundry/Anvil网络 - 自定义RPC
  foundry: defineChain({
    ...foundry,
    rpcUrls: {
      default: { http: ["http://127.0.0.1:8545"] },
      public: { http: ["http://127.0.0.1:8545"] },
    },
  }),

  optimism,
  polygon,
  bsc,
};

const networks = [
  customNetworks.mainnet,
  customNetworks.sepolia,
  customNetworks.foundry,
  customNetworks.optimism,
  customNetworks.polygon,
  customNetworks.bsc,
] as [
  typeof customNetworks.mainnet,
  typeof customNetworks.sepolia,
  typeof customNetworks.foundry,
  typeof customNetworks.optimism,
  typeof customNetworks.polygon,
  typeof customNetworks.bsc
];

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 5. 钱包连接模态框， 在调用 useAppKit 的 open 函数时显示
createAppKit({
  adapters: [wagmiAdapter], // 与 wagmi 框架集成，负责处理底层的钱包连接、网络切换等操作
  networks,
  projectId,
  metadata,
  features: {
    analytics: true,
  },
});

export default function AppkitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
