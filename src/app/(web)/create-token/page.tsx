"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreateToken } from './hook/useCreateToken'
import { TokenForm, type TokenFormData } from './components/TokenForm'
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

export default function CreateTokenPage() {
  const { isCreating, createToken } = useCreateToken();
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  const handleFormSubmit = async (data: TokenFormData, amount?: string) => {
    if (!isConnected) {
      open();
      return;
    }
    await createToken(data.image, data, amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            代币创建平台
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">创建代币</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            在KekeSwap上创建您自己的代币，简单快捷，安全可靠
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-900">代币信息</CardTitle>
            </CardHeader>
            <CardContent>
              <TokenForm
                onSubmit={handleFormSubmit}
                isLoading={isCreating}
              />
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}