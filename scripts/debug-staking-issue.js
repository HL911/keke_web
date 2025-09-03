const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 读取配置文件
const configPath = path.join(__dirname, '../src/config/address/sepolia.json');
const sepoliaConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 读取ABI文件
const masterAbiPath = path.join(__dirname, '../src/abi/Master.json');
const erc20AbiPath = path.join(__dirname, '../src/abi/KekeMockERC20.json');
const masterAbi = JSON.parse(fs.readFileSync(masterAbiPath, 'utf8'));
const erc20Abi = JSON.parse(fs.readFileSync(erc20AbiPath, 'utf8'));

// Sepolia RPC URL
const RPC_URL = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'; // 需要替换为实际的RPC URL

async function debugStakingIssue() {
  try {
    console.log('🔍 开始调试质押问题...');
    console.log('');

    // 连接到网络
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    
    // 用户地址（需要替换为实际的用户地址）
    const userAddress = '0xYourUserAddress'; // 请替换为实际的用户地址
    
    // 合约地址
    const masterAddress = sepoliaConfig.MASTER;
    const lpTokenAddress = sepoliaConfig.KEKE_WETH_V4; // KEKE-WETH V4 LP
    
    console.log('📋 合约地址信息:');
    console.log('  Master合约:', masterAddress);
    console.log('  LP Token地址:', lpTokenAddress);
    console.log('  用户地址:', userAddress);
    console.log('');
    
    // 创建合约实例
    const masterContract = new ethers.Contract(masterAddress, masterAbi, provider);
    const lpTokenContract = new ethers.Contract(lpTokenAddress, erc20Abi, provider);
    
    // 1. 检查LP token基本信息
    console.log('🪙 LP Token 基本信息:');
    try {
      const name = await lpTokenContract.name();
      const symbol = await lpTokenContract.symbol();
      const decimals = await lpTokenContract.decimals();
      const totalSupply = await lpTokenContract.totalSupply();
      
      console.log('  名称:', name);
      console.log('  符号:', symbol);
      console.log('  小数位数:', decimals.toString());
      console.log('  总供应量:', ethers.formatUnits(totalSupply, decimals), symbol);
    } catch (error) {
      console.log('  ❌ 获取LP token信息失败:', error.message);
    }
    console.log('');
    
    // 2. 检查用户LP token余额
    console.log('💰 用户LP Token余额:');
    try {
      const balance = await lpTokenContract.balanceOf(userAddress);
      const decimals = await lpTokenContract.decimals();
      console.log('  余额:', ethers.formatUnits(balance, decimals), 'LP tokens');
      
      if (balance === 0n) {
        console.log('  ⚠️  用户没有LP token余额！');
        console.log('  💡 建议: 请先获取LP token（通过添加流动性等方式）');
      }
    } catch (error) {
      console.log('  ❌ 获取用户余额失败:', error.message);
    }
    console.log('');
    
    // 3. 检查用户对Master合约的授权
    console.log('🔐 授权状态检查:');
    try {
      const allowance = await lpTokenContract.allowance(userAddress, masterAddress);
      const decimals = await lpTokenContract.decimals();
      console.log('  当前授权额度:', ethers.formatUnits(allowance, decimals), 'LP tokens');
      
      if (allowance === 0n) {
        console.log('  ❌ 用户未授权LP token给Master合约！');
        console.log('  💡 解决方案: 需要先调用LP token的approve函数授权');
        console.log('  📝 授权命令示例:');
        console.log(`     lpToken.approve("${masterAddress}", "${ethers.MaxUint256}")`);
      } else {
        console.log('  ✅ 用户已授权LP token给Master合约');
      }
    } catch (error) {
      console.log('  ❌ 检查授权失败:', error.message);
    }
    console.log('');
    
    // 4. 检查Master合约中的池子信息
    console.log('🏊 Master合约池子信息:');
    try {
      const poolLength = await masterContract.poolLength();
      console.log('  池子总数:', poolLength.toString());
      
      // 查找KEKE-WETH V4 LP对应的池子ID
      let targetPoolId = -1;
      for (let i = 0; i < poolLength; i++) {
        const poolInfo = await masterContract.poolInfo(i);
        console.log(`  池子 ${i}:`);
        console.log(`    LP Token: ${poolInfo.lpToken}`);
        console.log(`    分配权重: ${poolInfo.allocPoint}`);
        console.log(`    上次奖励区块: ${poolInfo.lastRewardBlock}`);
        
        if (poolInfo.lpToken.toLowerCase() === lpTokenAddress.toLowerCase()) {
          targetPoolId = i;
          console.log(`    ✅ 这是目标LP token的池子！`);
        }
        console.log('');
      }
      
      if (targetPoolId === -1) {
        console.log('  ❌ 未找到KEKE-WETH V4 LP对应的池子！');
        console.log('  💡 建议: 需要先将该LP token添加到Master合约中');
      } else {
        console.log(`  ✅ 找到目标池子，ID: ${targetPoolId}`);
        
        // 检查用户在该池子的质押信息
        const userInfo = await masterContract.userInfo(targetPoolId, userAddress);
        console.log(`  用户在池子${targetPoolId}的信息:`);
        console.log(`    已质押数量: ${ethers.formatEther(userInfo.amount)} LP tokens`);
        console.log(`    奖励债务: ${ethers.formatEther(userInfo.rewardDebt)} KEKE`);
      }
    } catch (error) {
      console.log('  ❌ 检查池子信息失败:', error.message);
    }
    console.log('');
    
    // 5. 检查Master合约的基本状态
    console.log('⚙️  Master合约状态:');
    try {
      const owner = await masterContract.owner();
      const kekePerBlock = await masterContract.kekePerBlock();
      const totalAllocPoint = await masterContract.totalAllocPoint();
      const startBlock = await masterContract.startBlock();
      const currentBlock = await provider.getBlockNumber();
      
      console.log('  合约所有者:', owner);
      console.log('  每区块KEKE奖励:', ethers.formatEther(kekePerBlock), 'KEKE');
      console.log('  总分配权重:', totalAllocPoint.toString());
      console.log('  开始区块:', startBlock.toString());
      console.log('  当前区块:', currentBlock.toString());
      
      if (currentBlock < startBlock) {
        console.log('  ⚠️  挖矿尚未开始！');
      } else {
        console.log('  ✅ 挖矿已开始');
      }
    } catch (error) {
      console.log('  ❌ 检查Master合约状态失败:', error.message);
    }
    console.log('');
    
    // 6. 总结和建议
    console.log('📝 问题诊断总结:');
    console.log('  常见的"Unauthorized"错误原因:');
    console.log('  1. 用户未授权LP token给Master合约');
    console.log('  2. 用户LP token余额不足');
    console.log('  3. LP token合约地址错误');
    console.log('  4. Master合约中未添加对应的池子');
    console.log('  5. 网络或RPC连接问题');
    console.log('');
    console.log('  💡 解决步骤:');
    console.log('  1. 确保用户有足够的LP token余额');
    console.log('  2. 调用LP token的approve函数授权给Master合约');
    console.log('  3. 确认要质押的池子ID正确');
    console.log('  4. 检查交易的gas费用设置');
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行调试
if (require.main === module) {
  console.log('⚠️  请先修改脚本中的用户地址 (userAddress) 为实际地址');
  console.log('⚠️  如果需要，请修改RPC_URL为可用的Sepolia RPC端点');
  console.log('');
  debugStakingIssue().catch(console.error);
}

module.exports = { debugStakingIssue };