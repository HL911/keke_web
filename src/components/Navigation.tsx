"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  Coins,
  Award,
  BarChart3,
  Home,
  ChevronDown,
  Check,
  Layers,
  Plus,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppKit } from "@reown/appkit/react";
import { useDisconnect, useAccount, useChainId, useSwitchChain } from "wagmi";

export function Navigation() {
  const pathname = usePathname();

  const navigationItems = [
    {
      title: "首页",
      href: "/",
      icon: <Home className="w-4 h-4" />,
    },
    {
      title: "交易",
      href: "/swap",
      icon: <Coins className="w-4 h-4" />,
    },
    {
      title: "流动性",
      href: "/pool",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      title: "创建代币",
      href: "/create-token",
      icon: <Plus className="w-4 h-4" />,
    },
    {
      title: "农场",
      href: "/farm",
      icon: <Award className="w-4 h-4" />,
    },
    {
      title: "数据",
      href: "/analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      title: "交易监控",
      href: "/trade-monitor",
      icon: <Monitor className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex h-16 items-center">
        <div className="mr-12">
          <Link
            href="/"
            className="flex items-center space-x-2 group hover:scale-105 transition-transform duration-200"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:shadow-lg transition-shadow duration-200">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl group-hover:text-blue-600 transition-colors duration-200">
              Keke Swap
            </span>
          </Link>
        </div>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "flex items-center gap-2 transition-all duration-200 hover:bg-accent/80 hover:text-accent-foreground hover:scale-105",
                    pathname === item.href && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link href={item.href}>
                    {item.icon}
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center">
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}

// 网络显示和切换组件
function NetworkDisplay() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const networks = [
    {
      id: 1,
      name: "Ethereum",
      color: "bg-green-100 text-green-700 border-green-200",
    },
    {
      id: 11155111,
      name: "Ethereum Sepolia",
      color: "bg-purple-100 text-purple-700 border-purple-200",
    },
    {
      id: 10,
      name: "Optimism",
      color: "bg-red-100 text-red-700 border-red-200",
    },
    {
      id: 137,
      name: "Polygon",
      color: "bg-purple-100 text-purple-700 border-purple-200",
    },
    {
      id: 56,
      name: "BSC",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    {
      id: 31337,
      name: "Foundry",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
  ];

  const currentNetwork = networks.find((network) => network.id === chainId) || {
    id: chainId,
    name: `链ID: ${chainId}`,
    color: "bg-gray-100 text-gray-700 border-gray-200",
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNetworkSwitch = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId });
      setIsOpen(false);
    } catch (error) {
      console.error("网络切换失败:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 当前网络显示 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium border ${currentNetwork.color} transition-colors duration-200 hover:opacity-80 flex items-center gap-1 cursor-pointer`}
      >
        {currentNetwork.name}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 网络选择下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkSwitch(network.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  network.id === chainId
                    ? "bg-blue-50 text-blue-700"
                    : "text-blue-700"
                }`}
              >
                <span>{network.name}</span>
                {network.id === chainId && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 钱包连接组件
function ConnectWallet() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="flex items-center gap-3">
      {isConnected && <NetworkDisplay />}
      {isConnected ? (
        <>
          <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-mono border border-gray-200">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect()}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all duration-150"
          >
            断开连接
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => open()}
          className="flex items-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 active:scale-95 transition-all duration-150"
        >
          <Wallet className="w-4 h-4 mr-2" />
          连接钱包
        </Button>
      )}
    </div>
  );
}
