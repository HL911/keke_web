const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 读取配置文件
const sepoliaConfig = {
  MASTER: '0x7C8122cfb2918BB2D9073f4C7b39ef09E0d32735',
  KEKE_WETH_V4: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4'
};

// 读取ABI文件
const erc20AbiPath = path.join(__dirname, '../src/abi/KekeMockERC20.json');
const erc20Abi = JSON.parse(fs.readFileSync(erc20AbiPath, 'utf8'));

async function checkAuthorization() {
  try {
    console.log('🔍 检查LP token授权状态...');
    console.log('');

    // 连接到网络
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    
    // 合约地址
    const masterAddress = sepoliaConfig.MASTER;
    const lpTokenAddress = sepoliaConfig.KEKE_WETH_V4; // KEKE-WETH V4 LP
    
    console.log('📋 合约地址:');
    console.log('  Master合约:', masterAddress);
    console.log('  LP Token:', lpTokenAddress);
    console.log('');
    
    // 创建LP token合约实例
    const lpTokenContract = new ethers.Contract(lpTokenAddress, erc20Abi, provider);
    
    // 检查LP token基本信息
    console.log('🪙 LP Token信息:');
    try {
      const name = await lpTokenContract.name();
      const symbol = await lpTokenContract.symbol();
      const decimals = await lpTokenContract.decimals();
      
      console.log('  名称:', name);
      console.log('  符号:', symbol);
      console.log('  小数位数:', decimals.toString());
    } catch (error) {
      console.log('  ❌ 无法获取LP token信息:', error.message);
      console.log('  💡 可能原因: LP token地址无效或合约不存在');
      return;
    }
    console.log('');
    
    console.log('📝 授权检查说明:');
    console.log('  要检查特定用户的授权状态，请提供用户地址');
    console.log('  示例用法:');
    console.log('  node check-authorization.js 0x用户地址');
    console.log('');
    
    // 如果提供了用户地址参数
    const userAddress = process.argv[2];
    if (userAddress && ethers.isAddress(userAddress)) {
      console.log('👤 检查用户:', userAddress);
      console.log('');
      
      // 检查用户余额
      try {
        const balance = await lpTokenContract.balanceOf(userAddress);
        const decimals = await lpTokenContract.decimals();
        console.log('💰 用户LP token余额:', ethers.formatUnits(balance, decimals));
        
        if (balance === 0n) {
          console.log('  ⚠️  用户没有LP token！需要先获取LP token');
        }
      } catch (error) {
        console.log('  ❌ 获取余额失败:', error.message);
      }
      
      // 检查授权
      try {
        const allowance = await lpTokenContract.allowance(userAddress, masterAddress);
        const decimals = await lpTokenContract.decimals();
        console.log('🔐 授权额度:', ethers.formatUnits(allowance, decimals));
        
        if (allowance === 0n) {
          console.log('  ❌ 未授权！需要先授权LP token给Master合约');
          console.log('');
          console.log('  💡 解决方案:');
          console.log('  1. 在前端点击"授权代币"按钮');
          console.log('  2. 或者直接调用LP token合约的approve函数:');
          console.log(`     approve("${masterAddress}", "${ethers.MaxUint256}")`);
        } else {
          console.log('  ✅ 已授权！可以进行质押');
        }
      } catch (error) {
        console.log('  ❌ 检查授权失败:', error.message);
      }
    } else {
      console.log('💡 使用方法:');
      console.log('  node check-authorization.js <用户地址>');
      console.log('  例如: node check-authorization.js 0x1234567890123456789012345678901234567890');
    }
    
    console.log('');
    console.log('🔧 常见问题排查:');
    console.log('  1. "Unauthorized" 错误通常是因为:');
    console.log('     - 未授权LP token给Master合约');
    console.log('     - LP token余额不足');
    console.log('     - 使用了错误的池子ID');
    console.log('');
    console.log('  2. 授权步骤:');
    console.log('     - 连接钱包到Sepolia测试网');
    console.log('     - 在农场页面点击"授权代币"');
    console.log('     - 确认授权交易');
    console.log('     - 等待交易确认后再进行质押');
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
  }
}

// 运行检查
checkAuthorization().catch(console.error);