const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

console.log('🚀 Starting Master contract test...');

// 创建客户端
const client = createPublicClient({
  chain: sepolia,
  transport: http('https://sepolia.infura.io/v3/53a58eac66a04d69bd2577334f365651')
});

console.log('✅ Client created successfully');

// Master合约地址
const MASTER_ADDRESS = '0x7C8122cfb2918BB2D9073f4C7b39ef09E0d32735';

// Master合约ABI（只包含我们需要测试的函数）
const MASTER_ABI = [
  {
    "type": "function",
    "name": "poolLength",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "kekePerBlock",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalAllocPoint",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  }
];

async function testMasterContract() {
  console.log('🔍 Testing Master contract at:', MASTER_ADDRESS);
  
  try {
    // 检查合约是否存在（获取字节码）
    const bytecode = await client.getBytecode({ address: MASTER_ADDRESS });
    console.log('✅ Contract exists, bytecode length:', bytecode ? bytecode.length : 'null');
    
    if (!bytecode) {
      console.log('❌ No bytecode found - contract may not be deployed');
      return;
    }
    
    // 测试 poolLength
    try {
      const poolLength = await client.readContract({
        address: MASTER_ADDRESS,
        abi: MASTER_ABI,
        functionName: 'poolLength'
      });
      console.log('✅ poolLength:', poolLength.toString());
    } catch (error) {
      console.log('❌ poolLength failed:', error.message);
    }
    
    // 测试 kekePerBlock
    try {
      const kekePerBlock = await client.readContract({
        address: MASTER_ADDRESS,
        abi: MASTER_ABI,
        functionName: 'kekePerBlock'
      });
      console.log('✅ kekePerBlock:', kekePerBlock.toString());
    } catch (error) {
      console.log('❌ kekePerBlock failed:', error.message);
    }
    
    // 测试 totalAllocPoint
    try {
      const totalAllocPoint = await client.readContract({
        address: MASTER_ADDRESS,
        abi: MASTER_ABI,
        functionName: 'totalAllocPoint'
      });
      console.log('✅ totalAllocPoint:', totalAllocPoint.toString());
    } catch (error) {
      console.log('❌ totalAllocPoint failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Error testing contract:', error.message);
  }
}

testMasterContract();