'use client'

import { useState } from 'react';
import { toast } from 'sonner';
import { useTokenFactory, type CreateTokenResult } from '@/hooks/launchPool/useTokenFactory';
import { useTokenFactoryAddress } from '@/hooks/useContract';
import type { TokenFormData } from '../components/TokenForm';

interface FormErrors {
  name?: string;
  symbol?: string;
  image?: string;
}

export function useCreateToken() {
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    logo_uri: '',
    enableTrading: false,
    tradingStartTime: '',
    image: null,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const updateFormData = (field: keyof TokenFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateFormData = (tokenData: TokenFormData, imageFile: File | null): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!tokenData.name.trim()) {
      newErrors.name = '请输入代币名称';
    }
    
    if (!tokenData.symbol.trim()) {
      newErrors.symbol = '请输入代币符号';
    } else if (tokenData.symbol.length > 10) {
      newErrors.symbol = '代币符号不能超过10个字符';
    }
    

    
    // 如果启用交易，验证开始时间
    if (tokenData.enableTrading && !tokenData.tradingStartTime) {
      newErrors.tradingStartTime = '请设置交易开始时间';
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (imageFile: File | null): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '代币名称不能为空';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = '代币符号不能为空';
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = '代币符号不能超过10个字符';
    }

    if (!imageFile) {
      newErrors.image = '请上传代币图标';
    } else if (imageFile.size > 5 * 1024 * 1024) {
      newErrors.image = '图片大小不能超过5MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 获取TokenFactory合约地址
  const tokenFactoryAddress = useTokenFactoryAddress();
  
  // 使用TokenFactory hook（只有在有合约地址时才调用）
  const { 
    createToken: createTokenContract, 
    createTokenAndBuy: createTokenAndBuyContract,
    isCreating: isContractCreating, 
    error: contractError, 
    isSuccess 
  } = useTokenFactory(
    (tokenFactoryAddress || "0x0000000000000000000000000000000000000000") as `0x${string}`
  );

  const createToken = async (imageFile: File | null, tokenData: TokenFormData, amount?: string) => {
    if (!tokenFactoryAddress) {
      toast.error('合约地址未配置，请检查网络连接');
      return;
    }
    
    if (!validateFormData(tokenData, imageFile)) {
      toast.error('请检查表单信息');
      return;
    }

    setIsCreating(true);
    
    try {
      // 上传图片到IPFS或其他存储服务
      let imageUrl = '';
      if (imageFile) {
        // 这里应该实际上传到IPFS
        // 目前使用临时URL作为占位符
        imageUrl = URL.createObjectURL(imageFile);
        // TODO: 实现IPFS上传
        // imageUrl = await uploadToIPFS(imageFile);
      }

      // 根据是否有金额决定调用哪个合约方法
      const tokenParams = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description,
        logo_uri: imageUrl,
        twitterAddress: tokenData.twitter,
        telegramAddress: tokenData.telegram,
        websiteAddress: tokenData.website,
      };

      let contractResult: CreateTokenResult | null = null;
      if (amount && parseFloat(amount) > 0) {
        // 如果有金额，调用创建并购买
        contractResult = await createTokenAndBuyContract(tokenParams, amount);
      } else {
        // 如果没有金额，只创建代币
        contractResult = await createTokenContract(tokenParams);
      }

      // 如果合约调用成功，保存到数据库
      if (contractResult && contractResult.tokenAddress) {
        // 立即重置创建状态
        setIsCreating(false);
        
        try {
          // 保存代币信息到 meme_tokens 表
          const response = await fetch('/api/meme-tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: contractResult.tokenAddress,
              symbol: tokenData.symbol,
              name: tokenData.name,
              decimals: 18, // 默认18位小数
              total_supply: '1000000000000000000000000', // 默认1M代币，18位小数
              logo_uri: imageUrl,
              description: tokenData.description,
              twitterAddress: tokenData.twitter,
              telegramAddress: tokenData.telegram,
              websiteAddress: tokenData.website,
              is_verified: false
            })
          });

          const result = await response.json();
          if (!result.success) {
            console.warn('保存代币到数据库失败:', result.error);
            // 不阻断用户流程，只记录警告
          }
        } catch (dbError) {
          console.warn('保存代币到数据库时发生错误:', dbError);
          // 不阻断用户流程，只记录警告
        }

        toast.success('代币创建成功！');
        
        // 重置表单
        setFormData({
          name: '',
          symbol: '',
          description: '',
          website: '',
          twitter: '',
          telegram: '',
          logo_uri: '',
          enableTrading: false,
          tradingStartTime: '',
          image: null,
        });
        
        return; // 提前返回，避免执行 finally 块
      }
      
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error(contractError || '创建代币失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  return {
    formData,
    updateFormData,
    isCreating: isCreating, // 只使用本地状态，不依赖合约状态
    createToken,
    errors,
  };
}