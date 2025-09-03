import { ethers } from 'ethers';
import MasterABI from '../src/abi/Master.json';
import { readFileSync } from 'fs';
import { join } from 'path';

// 读取合约地址配置
const earnConfig = JSON.parse(readFileSync(join(__dirname, '../earn.json'), 'utf8'));
const sepoliaConfig = earnConfig.sepolia;

async function checkMasterPools() {
  try {
    // 连接到 Sepolia 测试网
    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
    
    // 创建 Master 合约实例
    const masterContract = new ethers.Contract(
      sepoliaConfig.Master,
      MasterABI,
      provider
    );

    console.log('🔍 检查 Master 合约状态...');
    console.log('Master 合约地址:', sepoliaConfig.Master);
    console.log('');

    // 获取池子数量
    const poolLength = await masterContract.poolLength();
    console.log('📊 当前池子数量:', poolLength.toString());
    console.log('');

    // 获取每个池子的信息
    for (let i = 0; i < poolLength; i++) {
      try {
        const poolInfo = await masterContract.poolInfo(i);
        console.log(`🏊 池子 ${i} 信息:`);
        console.log('  LP Token 地址:', poolInfo.lpToken);
        console.log('  分配权重:', poolInfo.allocPoint.toString());
        console.log('  上次奖励区块:', poolInfo.lastRewardBlock.toString());
        console.log('  累计奖励份额:', poolInfo.accKekePerShare.toString());
        console.log('');
      } catch (error) {
        console.error(`❌ 获取池子 ${i} 信息失败:`, error);
      }
    }

    // 获取总分配权重
    const totalAllocPoint = await masterContract.totalAllocPoint();
    console.log('📈 总分配权重:', totalAllocPoint.toString());

    // 获取每区块 KEKE 奖励
    const kekePerBlock = await masterContract.kekePerBlock();
    console.log('🎁 每区块 KEKE 奖励:', ethers.formatEther(kekePerBlock), 'KEKE');

    // 获取开始区块
    const startBlock = await masterContract.startBlock();
    console.log('🚀 开始区块:', startBlock.toString());

    console.log('');
    console.log('📋 可用的 LP 代币地址:');
    console.log('  WETH9_KEKE_PAIR:', sepoliaConfig.WETH9_KEKE_PAIR);
    console.log('  KEKE_WETH_V4:', sepoliaConfig.KEKE_WETH_V4);

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
checkMasterPools().catch(console.error);