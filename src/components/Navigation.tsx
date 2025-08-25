"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Wallet, Coins, Award, BarChart3, Home } from "lucide-react";
import { cn } from "@/lib/utils";

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
      title: "农场",
      href: "/farm",
      icon: <Award className="w-4 h-4" />,
    },
    {
      title: "数据",
      href: "/analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex h-16 items-center">
        <div className="mr-12">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl">Keke Swap</span>
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
                    "flex items-center gap-2",
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
          <Button variant="outline" size="sm">
            <Wallet className="w-4 h-4 mr-2" />
            连接钱包
          </Button>
        </div>
      </div>
    </header>
  );
}
