const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 用户提供的信息
const USER_PRIVATE_KEY = '3d5659adb9128f1493aedcdef4acc56f504431281b6bd5a58ce8a2987cc8b142';
const LP_TOKEN_ADDRESS = '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4';
const RPC_URL = 'https://sepolia.infura.io/v3/53a58eac66a04d69bd2577334f365651';

// 合约地址配置
const sepoliaConfig = {
  MASTER: '0x7C8122cfb2918BB2D9073f4C7b39ef09E0d32735',
  KEKE_WETH_V4: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4'
};

// ERC20 ABI
const erc20Abi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

// Master合约ABI（简化版）
const masterAbi = [
  'function poolLength() view returns (uint256)',
  'function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accKekePerShare)',
  'function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt)',
  'function deposit(uint256 _pid, uint256 _amount)',
  'function withdraw(uint256 _pid, uint256 _amount)',
  'function emergencyWithdraw(uint256 _pid)'
];

async function debugUserAuthorization() {
  try {
    console.log('🔍 开始调试用户授权状态...');
    console.log('');

    // 连接到网络
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 创建钱包实例
    const wallet = new ethers.Wallet(USER_PRIVATE_KEY, provider);
    const userAddress = wallet.address;
    
    console.log('👤 用户信息:');
    console.log('  地址:', userAddress);
    console.log('  LP Token地址:', LP_TOKEN_ADDRESS);
    console.log('  Master合约:', sepoliaConfig.MASTER);
    console.log('');
    
    // 检查用户ETH余额
    const ethBalance = await provider.getBalance(userAddress);
    console.log('💰 用户ETH余额:', ethers.formatEther(ethBalance), 'ETH');
    console.log('');
    
    // 创建LP token合约实例
    const lpTokenContract = new ethers.Contract(LP_TOKEN_ADDRESS, erc20Abi, provider);
    
    // 检查LP token是否为有效的ERC20合约
    console.log('🪙 LP Token合约检查:');
    try {
      // 尝试调用基本的ERC20函数
      const name = await lpTokenContract.name();
      const symbol = await lpTokenContract.symbol();
      const decimals = await lpTokenContract.decimals();
      const totalSupply = await lpTokenContract.totalSupply();
      
      console.log('  ✅ LP Token是有效的ERC20合约');
      console.log('  名称:', name);
      console.log('  符号:', symbol);
      console.log('  小数位数:', decimals.toString());
      console.log('  总供应量:', ethers.formatUnits(totalSupply, decimals));
      
      // 检查用户LP token余额
      const userBalance = await lpTokenContract.balanceOf(userAddress);
      console.log('  用户余额:', ethers.formatUnits(userBalance, decimals), symbol);
      
      // 检查用户对Master合约的授权
      const allowance = await lpTokenContract.allowance(userAddress, sepoliaConfig.MASTER);
      console.log('  授权额度:', ethers.formatUnits(allowance, decimals), symbol);
      
      if (allowance > 0) {
        console.log('  ✅ 用户已授权Master合约');
      } else {
        console.log('  ❌ 用户未授权Master合约');
        console.log('  💡 需要先调用approve函数授权');
      }
      
    } catch (error) {
      console.log('  ❌ LP Token合约调用失败:', error.message);
      console.log('  💡 可能原因:');
      console.log('    - 地址不是有效的ERC20合约');
      console.log('    - 合约可能是Uniswap V4 Position Manager NFT');
      console.log('    - 网络连接问题');
      return;
    }
    console.log('');
    
    // 检查Master合约中的池子信息
    console.log('🏊 Master合约池子检查:');
    const masterContract = new ethers.Contract(sepoliaConfig.MASTER, masterAbi, provider);
    
    try {
      const poolLength = await masterContract.poolLength();
      console.log('  池子总数:', poolLength.toString());
      
      let targetPoolId = -1;
      for (let i = 0; i < poolLength; i++) {
        const poolInfo = await masterContract.poolInfo(i);
        console.log(`  池子 ${i}: ${poolInfo.lpToken}`);
        
        if (poolInfo.lpToken.toLowerCase() === LP_TOKEN_ADDRESS.toLowerCase()) {
          targetPoolId = i;
          console.log(`    ✅ 找到目标池子！`);
          console.log(`    分配权重: ${poolInfo.allocPoint}`);
          console.log(`    上次奖励区块: ${poolInfo.lastRewardBlock}`);
          
          // 检查用户在该池子的质押信息
          const userInfo = await masterContract.userInfo(i, userAddress);
          console.log(`    用户质押数量: ${userInfo.amount}`);
          console.log(`    用户奖励债务: ${userInfo.rewardDebt}`);
        }
      }
      
      if (targetPoolId === -1) {
        console.log('  ❌ 未找到LP token对应的池子');
        console.log('  💡 该LP token可能未添加到Master合约中');
      }
      
    } catch (error) {
      console.log('  ❌ Master合约调用失败:', error.message);
    }
    console.log('');
    
    // 尝试模拟授权交易
    console.log('🔧 模拟授权操作:');
    try {
      const lpTokenWithSigner = lpTokenContract.connect(wallet);
      
      // 估算gas费用
      const gasEstimate = await lpTokenWithSigner.approve.estimateGas(
        sepoliaConfig.MASTER,
        ethers.MaxUint256
      );
      console.log('  预估Gas费用:', gasEstimate.toString());
      
      // 获取当前gas价格
      const gasPrice = await provider.getFeeData();
      console.log('  当前Gas价格:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'Gwei');
      
      const estimatedCost = gasEstimate * gasPrice.gasPrice;
      console.log('  预估交易费用:', ethers.formatEther(estimatedCost), 'ETH');
      
      if (ethBalance < estimatedCost) {
        console.log('  ❌ ETH余额不足支付gas费用');
      } else {
        console.log('  ✅ ETH余额足够支付gas费用');
      }
      
    } catch (error) {
      console.log('  ❌ 模拟授权失败:', error.message);
    }
    console.log('');
    
    console.log('📋 诊断总结:');
    console.log('1. 检查LP token地址是否为有效的ERC20合约');
    console.log('2. 检查用户LP token余额');
    console.log('3. 检查用户对Master合约的授权状态');
    console.log('4. 检查Master合约中是否存在对应的池子');
    console.log('5. 检查用户ETH余额是否足够支付gas费用');
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }
}

// 运行调试
debugUserAuthorization().catch(console.error);