/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 18:35:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 18:35:00
 * @FilePath: /keke_web/scripts/verify-config.ts
 * @Description: 验证配置脚本
 */

import { getAllTokens } from '../src/app/api/utils/token-queries';
import FOUNDRY_ADDRESS from "../src/config/address/foundry.json";
import SEPOLIA_ADDRESS from "../src/config/address/sepolia.json";

async function verifyConfiguration() {
  console.log('🔍 验证系统配置...\n');

  // 1. 验证合约地址配置
  console.log('📄 合约地址配置:');
  console.log('Foundry (本地):', FOUNDRY_ADDRESS);
  console.log('Sepolia (测试网):', SEPOLIA_ADDRESS);
  
  // 检查是否有零地址
  const foundryZeroAddresses = Object.entries(FOUNDRY_ADDRESS).filter(([key, value]) => 
    value === '0x0000000000000000000000000000000000000000'
  );
  const sepoliaZeroAddresses = Object.entries(SEPOLIA_ADDRESS).filter(([key, value]) => 
    value === '0x0000000000000000000000000000000000000000'
  );

  if (foundryZeroAddresses.length > 0) {
    console.log('⚠️  Foundry 网络存在零地址配置:', foundryZeroAddresses.map(([key]) => key));
  } else {
    console.log('✅ Foundry 网络合约地址配置正常');
  }

  if (sepoliaZeroAddresses.length > 0) {
    console.log('⚠️  Sepolia 网络存在零地址配置:', sepoliaZeroAddresses.map(([key]) => key));
  } else {
    console.log('✅ Sepolia 网络合约地址配置正常');
  }

  // 2. 验证代币配置
  console.log('\n💰 代币配置:');
  try {
    const tokens = await getAllTokens();
    console.log(`已配置代币数量: ${Object.keys(tokens).length}`);
    
    const requiredTokens = ['KEKE', 'USDT', 'WETH', 'USDC'];
    const missingTokens = requiredTokens.filter(symbol => !tokens[symbol]);
    
    if (missingTokens.length > 0) {
      console.log('⚠️  缺少以下代币配置:', missingTokens);
      console.log('💡 建议运行: npm run seed-tokens');
    } else {
      console.log('✅ 所有必需代币配置正常');
      
      // 显示代币详情
      requiredTokens.forEach(symbol => {
        const token = tokens[symbol];
        if (token) {
          console.log(`   ${symbol}: ${token.address} (${token.name})`);
        }
      });
    }
  } catch (error) {
    console.log('❌ 无法获取代币配置:', error);
  }

  // 3. 验证关键配置检查
  console.log('\n🔧 关键配置检查:');
  
  // 检查 router 地址是否配置
  if (FOUNDRY_ADDRESS.kekeswapRouterAddress === '0x0000000000000000000000000000000000000000') {
    console.log('❌ Foundry 网络未配置 KekeswapRouter 地址');
  } else {
    console.log('✅ Foundry 网络 KekeswapRouter 地址配置正常');
  }

  if (SEPOLIA_ADDRESS.kekeswapRouterAddress === '0x0000000000000000000000000000000000000000') {
    console.log('❌ Sepolia 网络未配置 KekeswapRouter 地址');
  } else {
    console.log('✅ Sepolia 网络 KekeswapRouter 地址配置正常');
  }

  // 检查 factory 地址是否配置
  if (FOUNDRY_ADDRESS.kekeswapFactoryAddress === '0x0000000000000000000000000000000000000000') {
    console.log('❌ Foundry 网络未配置 KekeswapFactory 地址');
  } else {
    console.log('✅ Foundry 网络 KekeswapFactory 地址配置正常');
  }

  if (SEPOLIA_ADDRESS.kekeswapFactoryAddress === '0x0000000000000000000000000000000000000000') {
    console.log('❌ Sepolia 网络未配置 KekeswapFactory 地址');
  } else {
    console.log('✅ Sepolia 网络 KekeswapFactory 地址配置正常');
  }

  console.log('\n📋 验证完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyConfiguration().catch(console.error);
}

export { verifyConfiguration };
