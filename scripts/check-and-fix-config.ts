/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 18:40:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 18:40:00
 * @FilePath: /keke_web/scripts/check-and-fix-config.ts
 * @Description: 检查并修复配置脚本
 */

import { getAllTokens } from '../src/app/api/utils/token-queries';
import { seedTokens } from './seed-tokens';
import FOUNDRY_ADDRESS from "../src/config/address/foundry.json";
import SEPOLIA_ADDRESS from "../src/config/address/sepolia.json";

interface ConfigIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
}

async function checkAndFixConfiguration() {
  console.log('🔧 检查并修复系统配置...\n');
  
  const issues: ConfigIssue[] = [];

  // 1. 检查合约地址配置
  console.log('📄 检查合约地址配置...');
  
  // 检查 Foundry 配置
  Object.entries(FOUNDRY_ADDRESS).forEach(([key, value]) => {
    if (value === '0x0000000000000000000000000000000000000000') {
      issues.push({
        type: 'error',
        category: 'Foundry 合约地址',
        message: `${key} 配置为零地址`,
        suggestion: '请在 src/config/address/foundry.json 中配置正确的合约地址'
      });
    } else {
      console.log(`✅ Foundry ${key}: ${value}`);
    }
  });

  // 检查 Sepolia 配置
  Object.entries(SEPOLIA_ADDRESS).forEach(([key, value]) => {
    if (value === '0x0000000000000000000000000000000000000000') {
      issues.push({
        type: 'warning',
        category: 'Sepolia 合约地址',
        message: `${key} 配置为零地址`,
        suggestion: '请在 src/config/address/sepolia.json 中配置正确的合约地址'
      });
    } else {
      console.log(`✅ Sepolia ${key}: ${value}`);
    }
  });

  // 2. 检查代币配置
  console.log('\n💰 检查代币配置...');
  try {
    const tokens = await getAllTokens();
    const tokenCount = Object.keys(tokens).length;
    console.log(`当前已配置 ${tokenCount} 个代币`);

    const requiredTokens = ['KEKE', 'USDT', 'WETH', 'USDC'];
    const missingTokens = requiredTokens.filter(symbol => !tokens[symbol]);

    if (missingTokens.length > 0) {
      issues.push({
        type: 'error',
        category: '代币配置',
        message: `缺少代币配置: ${missingTokens.join(', ')}`,
        suggestion: '将自动初始化缺失的代币配置'
      });

      // 自动修复：添加缺失的代币
      console.log('🔄 自动添加缺失的代币配置...');
      await seedTokens();
      console.log('✅ 代币配置已更新');
    } else {
      requiredTokens.forEach(symbol => {
        const token = tokens[symbol];
        console.log(`✅ ${symbol}: ${token.address} (${token.name})`);
      });
    }
  } catch (error) {
    issues.push({
      type: 'error',
      category: '数据库连接',
      message: '无法连接到数据库或查询代币信息',
      suggestion: '请检查数据库连接配置'
    });
  }

  // 3. 检查关键服务配置
  console.log('\n🔧 检查关键服务配置...');
  
  // 检查 WebSocket 服务
  try {
    const wsResponse = await fetch('http://localhost:8081/kline-ws');
    console.log('✅ WebSocket 服务运行正常');
  } catch (error) {
    issues.push({
      type: 'warning',
      category: 'WebSocket 服务',
      message: 'WebSocket 服务未运行',
      suggestion: '请启动 WebSocket 服务: npm run start:websocket'
    });
  }

  // 检查 API 服务
  try {
    const apiResponse = await fetch('http://localhost:3000/api/health');
    if (apiResponse.ok) {
      console.log('✅ API 服务运行正常');
    } else {
      issues.push({
        type: 'warning',
        category: 'API 服务',
        message: 'API 服务响应异常',
        suggestion: '请检查 API 服务状态'
      });
    }
  } catch (error) {
    issues.push({
      type: 'warning',
      category: 'API 服务',
      message: 'API 服务未运行',
      suggestion: '请启动开发服务器: npm run dev'
    });
  }

  // 4. 生成报告
  console.log('\n📋 配置检查报告:');
  
  if (issues.length === 0) {
    console.log('🎉 所有配置检查通过！系统配置正常。');
  } else {
    // 按类型分组显示问题
    const errors = issues.filter(issue => issue.type === 'error');
    const warnings = issues.filter(issue => issue.type === 'warning');
    const infos = issues.filter(issue => issue.type === 'info');

    if (errors.length > 0) {
      console.log('\n❌ 错误 (需要立即修复):');
      errors.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 建议: ${issue.suggestion}`);
        }
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  警告 (建议修复):');
      warnings.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 建议: ${issue.suggestion}`);
        }
      });
    }

    if (infos.length > 0) {
      console.log('\n📝 信息:');
      infos.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 建议: ${issue.suggestion}`);
        }
      });
    }

    console.log(`\n📊 总结: ${errors.length} 个错误, ${warnings.length} 个警告, ${infos.length} 个信息`);
  }

  return issues;
}

// 如果直接运行此脚本
if (require.main === module) {
  checkAndFixConfiguration().catch(console.error);
}

export { checkAndFixConfiguration };
