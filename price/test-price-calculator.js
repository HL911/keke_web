const { createPublicClient, http, formatUnits } = require('viem');
const { sepolia } = require('viem/chains');

// 配置RPC客户端
const client = createPublicClient({
  chain: sepolia,
  transport: http('https://sepolia.infura.io/v3/')
});

// 地址配置
const ADDRESSES = {
  // V2版本地址
  WETH9: '0x75B2245a13c46677Ff66B140b6dA1751Ed96d9d6',
  KEKE: '0xEc724C6EAB8f5a1212DEE12c792139fc8f57D858',
  WETH9_KEKE_PAIR: '0x8f920Db2db284C87343a8e0c3999Bdd0b6669fE2', // V2 Pair
  
  // V4版本地址
  KEKE_WETH_V4: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4', // V4 Position Manager
  WETH: '0xb16F35c0Ae2912430DAc15764477E179D9B9EbEa',
  
  // 价格预言机
  CHAINLINK_ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
};

// ABI定义
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
];

const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const UNISWAP_V2_PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const UNISWAP_V4_POSITION_MANAGER_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// 工具函数
function formatPrice(price, decimals = 6) {
  return price.toFixed(decimals);
}

function formatTokenAmount(amount, decimals) {
  return formatUnits(amount, decimals);
}

function calculateV2KEKEPrice(reserves, token0, token1, ethPrice) {
  const [reserve0, reserve1] = reserves;
  
  // 确定哪个是KEKE，哪个是WETH
  const isToken0KEKE = token0.toLowerCase() === ADDRESSES.KEKE.toLowerCase();
  const kekeReserve = isToken0KEKE ? reserve0 : reserve1;
  const wethReserve = isToken0KEKE ? reserve1 : reserve0;
  
  if (kekeReserve === BigInt(0) || wethReserve === BigInt(0)) return 0;
  
  // KEKE价格 = (WETH储备量 / KEKE储备量) * ETH价格
  const kekePerWeth = Number(formatUnits(kekeReserve, 18)) / Number(formatUnits(wethReserve, 18));
  return ethPrice / kekePerWeth;
}

function calculateV2LPValue(reserves, token0, token1, ethPrice, kekePrice) {
  const [reserve0, reserve1] = reserves;
  
  const isToken0KEKE = token0.toLowerCase() === ADDRESSES.KEKE.toLowerCase();
  const kekeReserve = isToken0KEKE ? reserve0 : reserve1;
  const wethReserve = isToken0KEKE ? reserve1 : reserve0;
  
  // 计算池子总价值（KEKE价值 + WETH价值）
  const kekeValue = Number(formatUnits(kekeReserve, 18)) * kekePrice;
  const wethValue = Number(formatUnits(wethReserve, 18)) * ethPrice;
  
  return kekeValue + wethValue;
}

function calculateAPR(kekePerBlock, allocPoint, totalAllocPoint, totalStaked, kekePrice, lpTokenValue) {
  if (!totalStaked || totalStaked === BigInt(0)) return 0;
  
  // 每天大约产生6400个区块（假设15秒一个区块）
  const blocksPerDay = BigInt(6400);
  const blocksPerYear = blocksPerDay * BigInt(365);
  
  // 计算该池子每年的KEKE奖励
  const poolKekePerYear = (kekePerBlock * allocPoint * blocksPerYear) / totalAllocPoint;
  
  // 计算年化奖励价值（美元）
  const yearlyRewardValue = Number(poolKekePerYear) * kekePrice / 1e18;
  
  // 计算总质押价值（美元）
  const totalStakedValue = Number(totalStaked) * lpTokenValue / 1e18;
  
  if (totalStakedValue === 0) return 0;
  
  // APR = (年化奖励价值 / 总质押价值) * 100
  return (yearlyRewardValue / totalStakedValue) * 100;
}

function getLPTokenDisplayName(lpTokenAddress) {
  if (lpTokenAddress.toLowerCase() === ADDRESSES.WETH9_KEKE_PAIR.toLowerCase()) {
    return 'WETH9-KEKE (V2)';
  } else if (lpTokenAddress.toLowerCase() === ADDRESSES.KEKE_WETH_V4.toLowerCase()) {
    return 'KEKE-ETH (V4)';
  }
  return 'LP Token';
}

// 主要测试函数
async function testPriceCalculator() {
  console.log('=== 测试价格计算器 ===\n');
  
  try {
    // 1. 获取ETH价格
    console.log('1. 获取ETH/USD价格...');
    const ethPriceData = await client.readContract({
      address: ADDRESSES.CHAINLINK_ETH_USD,
      abi: CHAINLINK_ABI,
      functionName: 'latestRoundData',
    });
    
    const ethPrice = Number(formatUnits(BigInt(ethPriceData[1]), 8));
    console.log(`   ETH价格: $${formatPrice(ethPrice)}\n`);
    
    // 2. 获取KEKE代币信息
    console.log('2. 获取KEKE代币信息...');
    const kekeName = await client.readContract({
      address: ADDRESSES.KEKE,
      abi: ERC20_ABI,
      functionName: 'name',
    });
    
    const kekeSymbol = await client.readContract({
      address: ADDRESSES.KEKE,
      abi: ERC20_ABI,
      functionName: 'symbol',
    });
    
    console.log(`   KEKE代币: ${kekeName} (${kekeSymbol})\n`);
    
    // 3. 获取V2 Pair信息
    console.log('3. 获取V2 Pair信息...');
    const reserves = await client.readContract({
      address: ADDRESSES.WETH9_KEKE_PAIR,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'getReserves',
    });
    
    const token0 = await client.readContract({
      address: ADDRESSES.WETH9_KEKE_PAIR,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'token0',
    });
    
    const token1 = await client.readContract({
      address: ADDRESSES.WETH9_KEKE_PAIR,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'token1',
    });
    
    console.log(`   V2 Pair地址: ${ADDRESSES.WETH9_KEKE_PAIR}`);
    console.log(`   Token0: ${token0}`);
    console.log(`   Token1: ${token1}`);
    console.log(`   Reserve0: ${formatTokenAmount(reserves[0], 18)}`);
    console.log(`   Reserve1: ${formatTokenAmount(reserves[1], 18)}\n`);
    
    // 4. 计算KEKE价格
    console.log('4. 计算KEKE价格...');
    const kekePrice = calculateV2KEKEPrice(reserves, token0, token1, ethPrice);
    console.log(`   KEKE价格: $${formatPrice(kekePrice)}\n`);
    
    // 5. 计算V2 LP代币价值
    console.log('5. 计算V2 LP代币价值...');
    const v2LPValue = calculateV2LPValue(reserves, token0, token1, ethPrice, kekePrice);
    console.log(`   V2 LP代币总价值: $${formatPrice(v2LPValue)}\n`);
    
    // 6. 获取V4 Position Manager信息
    console.log('6. 获取V4 Position Manager信息...');
    const v4Name = await client.readContract({
      address: ADDRESSES.KEKE_WETH_V4,
      abi: UNISWAP_V4_POSITION_MANAGER_ABI,
      functionName: 'name',
    });
    
    const v4Symbol = await client.readContract({
      address: ADDRESSES.KEKE_WETH_V4,
      abi: UNISWAP_V4_POSITION_MANAGER_ABI,
      functionName: 'symbol',
    });
    
    console.log(`   V4 Position Manager: ${v4Name} (${v4Symbol})`);
    console.log(`   地址: ${ADDRESSES.KEKE_WETH_V4}\n`);
    
    // 7. 测试APR计算
    console.log('7. 测试APR计算...');
    const testParams = {
      kekePerBlock: BigInt('1000000000000000000'), // 1 KEKE per block
      allocPoint: BigInt(100),
      totalAllocPoint: BigInt(1000),
      totalStaked: BigInt('1000000000000000000000'), // 1000 LP tokens
    };
    
    const apr = calculateAPR(
      testParams.kekePerBlock,
      testParams.allocPoint,
      testParams.totalAllocPoint,
      testParams.totalStaked,
      kekePrice,
      v2LPValue / 1000 // 假设LP代币价值
    );
    
    console.log(`   测试参数:`);
    console.log(`   - KEKE每区块: ${formatTokenAmount(testParams.kekePerBlock, 18)}`);
    console.log(`   - 分配点数: ${testParams.allocPoint}`);
    console.log(`   - 总分配点数: ${testParams.totalAllocPoint}`);
    console.log(`   - 总质押量: ${formatTokenAmount(testParams.totalStaked, 18)}`);
    console.log(`   - KEKE价格: $${formatPrice(kekePrice)}`);
    console.log(`   - LP代币价格: $${formatPrice(v2LPValue / 1000)}`);
    console.log(`   计算得出APR: ${formatPrice(apr, 2)}%\n`);
    
    // 8. 测试LP代币显示名称
    console.log('8. 测试LP代币显示名称...');
    console.log(`   V2 Pair显示名称: ${getLPTokenDisplayName(ADDRESSES.WETH9_KEKE_PAIR)}`);
    console.log(`   V4 LP显示名称: ${getLPTokenDisplayName(ADDRESSES.KEKE_WETH_V4)}\n`);
    
    // 9. 总结
    console.log('=== 价格计算器测试完成 ===');
    console.log('✅ 成功获取ETH价格');
    console.log('✅ 成功获取KEKE代币信息');
    console.log('✅ 成功获取V2 Pair信息并计算KEKE价格');
    console.log('✅ 成功获取V4 Position Manager信息');
    console.log('✅ 成功计算APR');
    console.log('✅ 成功区分V2和V4版本');
    
    return {
      ethPrice,
      kekePrice,
      lpTokenValue: v2LPValue / 1000,
      lpTokenType: 'V4',
      lpTokenName: 'KEKE-ETH',
      apr
    };
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

// React Hook使用示例
function generateReactHookExample() {
  console.log('\n=== React Hook使用示例 ===');
  console.log('// 在React组件中使用价格计算器');
  console.log('import { useAPRWithRealPrices, usePriceCalculator } from "@/price";');
  console.log('');
  console.log('function PoolComponent({ poolData }) {');
  console.log('  // 获取真实价格数据');
  console.log('  const { data: priceData, isLoading: priceLoading } = usePriceCalculator();');
  console.log('');
  console.log('  // 使用真实价格计算APR');
  console.log('  const { apr, isLoading: aprLoading, priceData: aprPriceData } = useAPRWithRealPrices({');
  console.log('    kekePerBlock: poolData.kekePerBlock,');
  console.log('    allocPoint: poolData.allocPoint,');
  console.log('    totalAllocPoint: poolData.totalAllocPoint,');
  console.log('    totalStaked: poolData.totalStaked,');
  console.log('    lpTokenAddress: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4", // V4');
  console.log('    kekeTokenAddress: "0xEc724C6EAB8f5a1212DEE12c792139fc8f57D858"');
  console.log('  });');
  console.log('');
  console.log('  if (priceLoading || aprLoading) return <div>Loading...</div>;');
  console.log('');
  console.log('  return (');
  console.log('    <div>');
  console.log('      <h3>Pool Information</h3>');
  console.log('      <p>ETH Price: ${priceData?.ethPrice}</p>');
  console.log('      <p>KEKE Price: ${priceData?.kekePrice}</p>');
  console.log('      <p>LP Token: {priceData?.lpTokenName} ({priceData?.lpTokenType})</p>');
  console.log('      <p>APR: {apr.toFixed(2)}%</p>');
  console.log('    </div>');
  console.log('  );');
  console.log('}');
}

// 运行测试
if (require.main === module) {
  testPriceCalculator()
    .then((result) => {
      console.log('\n=== 最终结果 ===');
      console.log('ETH价格:', `$${formatPrice(result.ethPrice)}`);
      console.log('KEKE价格:', `$${formatPrice(result.kekePrice)}`);
      console.log('LP代币价值:', `$${formatPrice(result.lpTokenValue)}`);
      console.log('LP代币类型:', result.lpTokenType);
      console.log('LP代币名称:', result.lpTokenName);
      console.log('计算APR:', `${formatPrice(result.apr, 2)}%`);
      
      generateReactHookExample();
    })
    .catch((error) => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = {
  testPriceCalculator,
  calculateAPR,
  formatPrice,
  getLPTokenDisplayName
};