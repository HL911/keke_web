import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import TokenImageUpload from './TokenImageUpload';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  iconAddress: string;
  enableTrading: boolean;
  tradingStartTime: string;
  image: File | null;
}

interface TokenFormProps {
  onSubmit: (data: TokenFormData, amount?: string) => void;
  isLoading?: boolean;
}

export function TokenForm({ onSubmit, isLoading = false }: TokenFormProps) {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [Amount, setAmount] = useState('');
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    iconAddress: '',
    enableTrading: false,
    tradingStartTime: '',
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState<Partial<TokenFormData>>({});
  
  // 获取当前网络的原生代币符号
  const getNativeTokenSymbol = () => {
    switch (chainId) {
      case 56: // BSC Mainnet
      case 97: // BSC Testnet
        return 'BNB';
      case 1: // Ethereum Mainnet
      case 11155111: // Sepolia
        return 'ETH';
      default:
        return 'BNB';
    }
  };
  
  // 处理创建代币
  const createTokenWithAmount = async (imageFile: File | null, formData: TokenFormData, amount?: string) => {
    onSubmit(formData, amount);
  };
  
  const handleCreateToken = async (amount?: string) => {
    await createTokenWithAmount(imageFile, formData, amount);
    setShowBuyModal(false);
  };

  const handleInputChange = (field: keyof TokenFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageUpload = (file: File) => {
    setFormData(prev => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TokenFormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入代币名称';
    }
    
    if (!formData.symbol.trim()) {
      newErrors.symbol = '请输入代币符号';
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = '代币符号不能超过10个字符';
    }
    
  
    
    // 如果启用交易，验证开始时间
    if (formData.enableTrading && !formData.tradingStartTime) {
      newErrors.tradingStartTime = '请设置交易开始时间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      open();
      return;
    }
    if (validateForm()) {
      // 弹出购买代币模态框
      setShowBuyModal(true);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 代币图片 */}
      <div className="space-y-2">
        <Label>代币图片</Label>
        <TokenImageUpload
          onImageUpload={handleImageUpload}
          imagePreview={imagePreview}
        />
      </div>

      {/* 代币名称 */}
      <div className="space-y-2">
        <Label htmlFor="name">代币名称 *</Label>
        <Input
          id="name"
          placeholder="例如：Bitcoin"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={errors.name ? 'border-red-300' : ''}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* 代币符号 */}
      <div className="space-y-2">
        <Label htmlFor="symbol">代币符号 *</Label>
        <Input
          id="symbol"
          placeholder="例如：BTC"
          value={formData.symbol}
          onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
          className={errors.symbol ? 'border-red-300' : ''}
          maxLength={10}
        />
        {errors.symbol && <p className="text-xs text-red-500">{errors.symbol}</p>}
      </div>

      {/* 网站链接 */}
      <div className="space-y-2">
        <Label htmlFor="website">网站链接</Label>
        <Input
          id="website"
          placeholder="https://example.com"
          value={formData.website}
          onChange={(e) => handleInputChange('website', e.target.value)}
          className={errors.website ? 'border-red-300' : ''}
        />
        {errors.website && <p className="text-xs text-red-500">{errors.website}</p>}
      </div>

      {/* Twitter链接 */}
      <div className="space-y-2">
        <Label htmlFor="twitter">Twitter链接</Label>
        <Input
          id="twitter"
          placeholder="https://twitter.com/username"
          value={formData.twitter}
          onChange={(e) => handleInputChange('twitter', e.target.value)}
          className={errors.twitter ? 'border-red-300' : ''}
        />
        {errors.twitter && <p className="text-xs text-red-500">{errors.twitter}</p>}
      </div>

      {/* Telegram链接 */}
      <div className="space-y-2">
        <Label htmlFor="telegram">Telegram链接</Label>
        <Input
          id="telegram"
          placeholder="https://t.me/username"
          value={formData.telegram}
          onChange={(e) => handleInputChange('telegram', e.target.value)}
          className={errors.telegram ? 'border-red-300' : ''}
        />
        {errors.telegram && <p className="text-xs text-red-500">{errors.telegram}</p>}
      </div>

      {/* 启用交易开关 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="enableTrading"
            checked={formData.enableTrading}
            onCheckedChange={(checked) => handleInputChange('enableTrading', checked)}
          />
          <Label htmlFor="enableTrading">启用交易</Label>
        </div>
      </div>

      {/* 交易开始时间（仅在启用交易时显示） */}
      {formData.enableTrading && (
        <div className="space-y-2">
          <Label htmlFor="tradingStartTime">交易开始时间 *</Label>
          <Input
            id="tradingStartTime"
            type="datetime-local"
            value={formData.tradingStartTime}
            onChange={(e) => handleInputChange('tradingStartTime', e.target.value)}
            className={errors.tradingStartTime ? 'border-red-300' : ''}
          />
          {errors.tradingStartTime && <p className="text-xs text-red-500">{errors.tradingStartTime}</p>}
        </div>
      )}

      {/* 代币描述 */}
      <div className="space-y-2">
        <Label htmlFor="description">代币描述</Label>
        <Textarea
          id="description"
          placeholder="描述您的代币用途和特点..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={4}
        />
      </div>

      {/* 提交按钮 */}
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-white font-medium py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
        disabled={isLoading}
      >
        {!isConnected ? '连接钱包' : (isLoading ? '创建中...' : '创建代币')}
      </Button>
    </form>
    
    {/* 购买代币弹出框 */}
    <Dialog open={showBuyModal} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="sm:max-w-md bg-white border-gray-200 text-gray-900 shadow-2xl" showCloseButton={false}>
        <DialogHeader className="relative">
          <button
            onClick={() => setShowBuyModal(false)}
            className="absolute right-0 top-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <DialogTitle className="text-blue-600 text-xl font-bold pr-8">
            购买 {formData.name || 'Token'}
          </DialogTitle>
          <p className="text-gray-600 text-sm mt-2">
            这是可选的，但购买少量代币有助於保护您的代币免受狙击手的攻击。
          </p>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-gray-900 text-sm font-medium">
              输入 {getNativeTokenSymbol()} 金额（可选）：
            </Label>
            <div className="text-gray-500 text-xs mt-1">
              余额: {balance ? parseFloat(balance.formatted).toFixed(5) : '0.00000'} {getNativeTokenSymbol()}
            </div>
            <div className="relative mt-2">
              <Input
                type="number"
                placeholder={`${getNativeTokenSymbol()}数量`}
                value={Amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 pr-16 focus:border-blue-500 focus:ring-blue-500"
                step="0.001"
                min="0"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <span className="text-orange-600 text-sm font-medium">{getNativeTokenSymbol()}</span>
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">₿</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button
            onClick={() => handleCreateToken(Amount)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            {Amount && parseFloat(Amount) > 0 ? '创建并购买代币' : '创建代币'}
          </Button>
        </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
    </>
  );
}

export type { TokenFormData };