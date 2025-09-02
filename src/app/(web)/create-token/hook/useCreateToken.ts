import { useState } from 'react';
import { toast } from 'sonner';
import { useTokenFactory } from '@/hooks/useTokenFactory';
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
    
    // 验证网站链接格式（可选）
    if (tokenData.website && !tokenData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = '请输入有效的网站链接（以http://或https://开头）';
    }
    
    // 验证Twitter链接格式（可选）
    if (tokenData.twitter && !tokenData.twitter.match(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/)) {
      newErrors.twitter = '请输入有效的Twitter链接';
    }
    
    // 验证Telegram链接格式（可选）
    if (tokenData.telegram && !tokenData.telegram.match(/^https?:\/\/(www\.)?t\.me\/.+/)) {
      newErrors.telegram = '请输入有效的Telegram链接';
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
        iconAddress: imageUrl,
        twitterAddress: tokenData.twitter,
        telegramAddress: tokenData.telegram,
        websiteAddress: tokenData.website,
      };

      if (amount && parseFloat(amount) > 0) {
        // 如果有金额，调用创建并购买
        await createTokenAndBuyContract(tokenParams, amount);
      } else {
        // 如果没有金额，只创建代币
        await createTokenContract(tokenParams);
      }

      // 如果合约调用成功，显示成功消息
      if (isSuccess) {
        toast.success('代币创建成功！');
        
        // 重置表单
        setFormData({
          name: '',
          symbol: '',
          description: '',
          website: '',
          twitter: '',
          telegram: '',
          enableTrading: false,
          tradingStartTime: '',
          image: null,
        });
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
    isCreating: isCreating || isContractCreating,
    createToken,
    errors,
  };
}