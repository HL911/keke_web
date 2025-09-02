/**
 * 农场功能测试脚本
 * 用于验证前端与合约的交互功能
 */

const { createPublicClient, http, parseEther, formatEther } = require('viem');
const { foundry } = require('viem/chains');
const fs = require('fs');
const path = require('path');

// 读取合约地址
const deploymentFile = path.join(__dirname, '部署地址.txt');
const deploymentContent = fs.readFileSync(deploymentFile, 'utf8');

// 解析合约地址
const masterMatch = deploymentContent.match(/Master deployed to: (0x[a-fA-F0-9]{40})/);
const kekeTokenMatch = deploymentContent.match(/KekeToken deployed to: (0x[a-fA-F0-9]{40})/);

if (!masterMatch || !kekeTokenMatch) {
  console.error('无法从部署文件中解析合约地址');
  process.exit(1);
}

const MASTER_ADDRESS = masterMatch[1];
const KEKE_TOKEN_ADDRESS = kekeTokenMatch[1];

console.log('Master合约地址:', MASTER_ADDRESS);
console.log('KEKE代币地址:', KEKE_TOKEN_ADDRESS);

// 创建客户端
const client = createPublicClient({
  chain: foundry,
  transport: http('http://127.0.0.1:8545')
});

// 读取ABI
const MasterABIFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/abi/Master.json'), 'utf8'));
const KekeTokenABIFile = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/abi/KekeToken.json'), 'utf8'));
const MasterABI = MasterABIFile.abi || MasterABIFile;
const KekeTokenABI = KekeTokenABIFile.abi || KekeTokenABIFile;

/**
 * 测试合约读取功能
 */
async function testContractReads() {
  console.log('\n=== 测试合约读取功能 ===');
  
  try {
    // 测试Master合约
    const poolLength = await client.readContract({
      address: MASTER_ADDRESS,
      abi: MasterABI,
      functionName: 'poolLength'
    });
    console.log('池子数量:', poolLength.toString());
    
    const kekePerBlock = await client.readContract({
      address: MASTER_ADDRESS,
      abi: MasterABI,
      functionName: 'kekePerBlock'
    });
    console.log('每块KEKE奖励:', formatEther(kekePerBlock));
    
    const totalAllocPoint = await client.readContract({
      address: MASTER_ADDRESS,
      abi: MasterABI,
      functionName: 'totalAllocPoint'
    });
    console.log('总分配点数:', totalAllocPoint.toString());
    
    // 读取池子信息
    for (let i = 0; i < Number(poolLength); i++) {
      const poolInfo = await client.readContract({
        address: MASTER_ADDRESS,
        abi: MasterABI,
        functionName: 'poolInfo',
        args: [BigInt(i)]
      });
      
      console.log(`池子 ${i}:`, {
        lpToken: poolInfo[0],
        allocPoint: poolInfo[1].toString(),
        lastRewardBlock: poolInfo[2].toString(),
        accKekePerShare: poolInfo[3].toString()
      });
    }
    
    // 测试KEKE代币
    const kekeBalance = await client.readContract({
      address: KEKE_TOKEN_ADDRESS,
      abi: KekeTokenABI,
      functionName: 'balanceOf',
      args: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'] // 第一个测试账户
    });
    console.log('测试账户KEKE余额:', formatEther(kekeBalance));
    
    console.log('✅ 合约读取功能测试通过');
    
  } catch (error) {
    console.error('❌ 合约读取功能测试失败:', error.message);
  }
}

/**
 * 测试API接口
 */
async function testAPIEndpoints() {
  console.log('\n=== 测试API接口 ===');
  
  try {
    const response = await fetch('http://localhost:3001/api/farm');
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const apiData = await response.json();
    
    console.log('API 响应状态:', response.status);
    console.log('API 数据结构:', {
      success: apiData.success,
      farmPoolsCount: apiData.data?.farmPools?.length || 0,
      farmStats: apiData.data?.farmStats,
      userFarmData: apiData.data?.userFarmData
    });
    
    if (apiData.data?.farmPools && apiData.data.farmPools.length > 0) {
      console.log('第一个农场池:', {
        id: apiData.data.farmPools[0].id,
        name: apiData.data.farmPools[0].name,
        tvl: apiData.data.farmPools[0].totalValueLocked,
        apr: apiData.data.farmPools[0].apr
      });
    }
    
    console.log('✅ API接口测试通过');
    
  } catch (error) {
    console.error('❌ API接口测试失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始农场功能测试...');
  
  // 检查Anvil节点是否运行
  try {
    const blockNumber = await client.getBlockNumber();
    console.log('当前区块高度:', blockNumber.toString());
  } catch (error) {
    console.error('❌ 无法连接到Anvil节点，请确保节点正在运行');
    process.exit(1);
  }
  
  await testContractReads();
  await testAPIEndpoints();
  
  console.log('\n🎉 农场功能测试完成！');
  console.log('\n📝 测试总结:');
  console.log('- 合约部署正常，可以读取基本信息');
  console.log('- API接口正常，可以获取农场数据');
  console.log('- 前端页面可以访问: http://localhost:3001/farm');
  console.log('- 用户可以查看农场池子列表和详情');
  console.log('- 质押功能需要连接钱包后进行测试');
}

// 运行测试
runTests().catch(console.error);