"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VMSwapDefaultPage() {
  const router = useRouter();
  
  useEffect(() => {
    // 默认重定向到 KEKE 代币的交易页面
    router.replace('/vm-swap/KEKE');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <p className="text-gray-600">正在跳转到默认交易页面...</p>
        </div>
      </div>
    </div>
  );
}
