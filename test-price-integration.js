const { createPublicClient, http, formatUnits } = require('viem')
const { sepolia } = require('viem/chains')

// 使用Sepolia RPC
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/53a58eac66a04d69bd2577334f365651'

// 合约地址
const ADDRESSES = {
  MASTER: '0x7C8122cfb2918BB2D9073f4C7b39ef09E0d32735',
  KEKE_TOKEN: '0xEc724C6EAB8f5a1212DEE12c792139fc8f57D858',
  WETH9_KEKE_PAIR: '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2',
  KEKE_WETH_V4: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
  KEKE_WETH_V2: '0x8ec7180599B575B6998C8192c9F9030a505271af',
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306'
}

// ABIs
const MASTER_ABI = [
  {
    inputs: [],
    name: 'poolLength',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_pid', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { name: 'lpToken', type: 'address' },
      { name: 'allocPoint', type: 'uint256' },
      { name: 'lastRewardBlock', type: 'uint256' },
      { name: 'accKekePerShare', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'kekePerBlock',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalAllocPoint',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]

const ERC20_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
]

// 创建客户端
const client = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC)
})

/**
 * 获取ETH价格
 */
async function getETHPrice() {
  try {
    const result = await client.readContract({
      address: ADDRESSES.CHAINLINK_ETH_USD,
      abi: CHAINLINK_ABI,
      functionName: 'latestRoundData'
    })
    
    const price = Number(formatUnits(result[1], 8))
    console.log(`📊 ETH价格: $${price.toFixed(2)}`)
    return price
  } catch (error) {
    console.error('❌ 获取ETH价格失败:', error.message)
    return 0
  }
}

/**
 * 获取Master合约信息
 */
async function getMasterInfo() {
  try {
    const [poolLength, kekePerBlock, totalAllocPoint] = await Promise.all([
      client.readContract({
        address: ADDRESSES.MASTER,
        abi: MASTER_ABI,
        functionName: 'poolLength'
      }),
      client.readContract({
        address: ADDRESSES.MASTER,
        abi: MASTER_ABI,
        functionName: 'kekePerBlock'
      }),
      client.readContract({
        address: ADDRESSES.MASTER,
        abi: MASTER_ABI,
        functionName: 'totalAllocPoint'
      })
    ])
    
    console.log(`🏭 Master合约信息:`)
    console.log(`   池子数量: ${poolLength}`)
    console.log(`   每区块KEKE: ${formatUnits(kekePerBlock, 18)}`)
    console.log(`   总分配点数: ${totalAllocPoint}`)
    
    return { poolLength, kekePerBlock, totalAllocPoint }
  } catch (error) {
    console.error('❌ 获取Master信息失败:', error.message)
    return null
  }
}

/**
 * 获取池子信息
 */
async function getPoolInfo(poolId) {
  try {
    const poolInfo = await client.readContract({
      address: ADDRESSES.MASTER,
      abi: MASTER_ABI,
      functionName: 'poolInfo',
      args: [BigInt(poolId)]
    })
    
    // 获取LP代币总供应量
    let totalSupply = BigInt(0)
    try {
      totalSupply = await client.readContract({
        address: poolInfo[0],
        abi: ERC20_ABI,
        functionName: 'totalSupply'
      })
    } catch (e) {
      console.log(`   ⚠️  无法获取池子${poolId}的总供应量`)
    }
    
    console.log(`🏊 池子${poolId}信息:`)
    console.log(`   LP代币地址: ${poolInfo[0]}`)
    console.log(`   分配点数: ${poolInfo[1]}`)
    console.log(`   最后奖励区块: ${poolInfo[2]}`)
    console.log(`   累计奖励份额: ${poolInfo[3]}`)
    console.log(`   总供应量: ${formatUnits(totalSupply, 18)}`)
    
    return {
      lpToken: poolInfo[0],
      allocPoint: poolInfo[1],
      lastRewardBlock: poolInfo[2],
      accKekePerShare: poolInfo[3],
      totalSupply
    }
  } catch (error) {
    console.error(`❌ 获取池子${poolId}信息失败:`, error.message)
    return null
  }
}

/**
 * 计算APR
 */
function calculateAPR(kekePerBlock, allocPoint, totalAllocPoint, totalStaked, kekePrice, lpTokenValue) {
  if (!totalStaked || totalStaked === BigInt(0)) return 0
  
  const blocksPerDay = BigInt(6400)
  const blocksPerYear = blocksPerDay * BigInt(365)
  
  const poolKekePerYear = (kekePerBlock * allocPoint * blocksPerYear) / totalAllocPoint
  const yearlyRewardValue = Number(formatUnits(poolKekePerYear, 18)) * kekePrice
  const totalStakedValue = Number(formatUnits(totalStaked, 18)) * lpTokenValue
  
  if (totalStakedValue === 0) return 0
  
  return (yearlyRewardValue / totalStakedValue) * 100
}

/**
 * 计算TVL
 */
function calculateTVL(totalStaked, tokenPrice) {
  return Number(formatUnits(totalStaked, 18)) * tokenPrice
}

/**
 * 主测试函数
 */
async function testPriceIntegration() {
  console.log('🚀 开始测试价格集成功能...')
  console.log(`🌐 使用RPC: ${SEPOLIA_RPC}\n`)
  
  try {
    // 1. 获取ETH价格
    const ethPrice = await getETHPrice()
    if (!ethPrice) return
    
    // 2. 获取Master合约信息
    const masterInfo = await getMasterInfo()
    if (!masterInfo) return
    
    console.log('\n' + '='.repeat(50))
    
    // 3. 测试所有池子
    const poolCount = Number(masterInfo.poolLength)
    const pools = []
    
    for (let i = 0; i < poolCount; i++) {
      console.log(`\n📋 测试池子 ${i}:`)
      const poolInfo = await getPoolInfo(i)
      if (poolInfo) {
        pools.push({ id: i, ...poolInfo })
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('💰 价格和TVL计算结果:')
    
    // 4. 计算价格和TVL
    const kekePrice = ethPrice * 0.001 // 模拟KEKE价格
    const lpTokenValue = ethPrice * 0.01 // 模拟LP代币价格
    
    console.log(`\n💎 价格信息:`)
    console.log(`   ETH价格: $${ethPrice.toFixed(2)}`)
    console.log(`   KEKE价格: $${kekePrice.toFixed(6)}`)
    console.log(`   LP代币价格: $${lpTokenValue.toFixed(6)}`)
    
    let totalTVL = 0
    
    pools.forEach(pool => {
      const isKekePool = pool.id === 0 // 假设池子0是KEKE单币池
      const tokenPrice = isKekePool ? kekePrice : lpTokenValue
      const tvl = calculateTVL(pool.totalSupply, tokenPrice)
      const apr = calculateAPR(
        masterInfo.kekePerBlock,
        pool.allocPoint,
        masterInfo.totalAllocPoint,
        pool.totalSupply,
        kekePrice,
        tokenPrice
      )
      
      totalTVL += tvl
      
      console.log(`\n🏊 池子${pool.id} (${isKekePool ? 'KEKE' : 'LP'}):`)
      console.log(`   TVL: $${tvl.toFixed(2)}`)
      console.log(`   APR: ${apr.toFixed(2)}%`)
    })
    
    console.log(`\n🏆 总TVL: $${totalTVL.toFixed(2)}`)
    
    console.log('\n✅ 价格集成测试完成!')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
if (require.main === module) {
  testPriceIntegration().catch(console.error)
}

module.exports = {
  testPriceIntegration,
  getETHPrice,
  getMasterInfo,
  getPoolInfo,
  calculateAPR,
  calculateTVL
}