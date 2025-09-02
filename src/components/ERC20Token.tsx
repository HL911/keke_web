"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { chain } from "../config/contract-config";
import { parseEther } from "viem";

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "spender",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      {
        name: "spender",
        type: "address",
        internalType: "address",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "spender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
];

// 查询 token 的 balance
export function useERC20Balance(
  accountAddress: string,
  contractAddress: string
) {
  const {
    data: balance,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: ERC20_ABI,
    chainId: chain.id,
    functionName: "balanceOf",
    args: accountAddress ? [accountAddress] : undefined,
    query: { enabled: !!accountAddress && !!contractAddress },
  });

  return {
    balance,
    error,
    isLoading,
    refetch,
  };
}

// 调用 token 的 approve 方法
export function useERC20Approve(
  contractAddress: string,
  spenderAddress: string,
  amount: string
) {
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const {
    data: receipt,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = () => {
    if (!contractAddress || !spenderAddress || !amount) {
      console.error("Missing required parameters for approve");
      return;
    }

    try {
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, parseEther(amount)],
      });
    } catch (error) {
      console.error("Approve transaction failed:", error);
    }
  };

  return {
    approve,
    hash,
    receipt,
    isPending,
    isSuccess,
    isError,
    error,
  };
}

// 检查 token 的 allowance
export function useERC20Allowance(
  contractAddress: string,
  ownerAddress: string,
  spenderAddress: string
) {
  const {
    data: allowance,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: ERC20_ABI,
    chainId: chain.id,
    functionName: "allowance",
    args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: { enabled: !!contractAddress && !!ownerAddress && !!spenderAddress },
  });

  return {
    allowance,
    error,
    isLoading,
    refetch,
  };
}

// 使用示例：
/*
// 1. 获取代币余额
const { balance, isLoading: balanceLoading } = useERC20Balance(
  userAddress,
  tokenAddress
);

// 2. 检查授权额度
const { allowance, isLoading: allowanceLoading } = useERC20Allowance(
  tokenAddress,
  userAddress,
  spenderAddress
);

// 3. 授权代币
const { approve, isPending: approvePending, isSuccess: approveSuccess } = useERC20Approve(
  tokenAddress,
  spenderAddress,
  amount
);

// 在组件中使用
<Button 
  onClick={approve} 
  disabled={approvePending}
>
  {approvePending ? "授权中..." : "授权代币"}
</Button>

if (approveSuccess) {
  console.log("授权成功！");
}
*/
