/**
 * 添加农场池数据到数据库的脚本
 * 这个脚本会创建一些模拟的流动性池数据用于测试
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'data', 'keke_swap.db');

// 模拟的流动性池数据
const farmPools = [
  {
    pair_address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // KEKE/WETH
    token0_address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    token1_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    total_supply: '1000000000000000000000', // 1000 LP tokens
    reserve0: '500000000000000000000', // 500 KEKE
    reserve1: '250000000000000000', // 0.25 WETH
    tvl_usd: 1000.0,
    volume_24h: '50000000000000000000'
  },
  {
    pair_address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // WETH/USDT
    token0_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    token1_address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    total_supply: '2000000000000000000000', // 2000 LP tokens
    reserve0: '1000000000000000000', // 1 WETH
    reserve1: '2000000000', // 2000 USDT
    tvl_usd: 4000.0,
    volume_24h: '100000000000000000000'
  },
  {
    pair_address: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // KEKE/USDC
    token0_address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    token1_address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    total_supply: '1500000000000000000000', // 1500 LP tokens
    reserve0: '750000000000000000000', // 750 KEKE
    reserve1: '1500000000', // 1500 USDC
    tvl_usd: 3000.0,
    volume_24h: '75000000000000000000'
  },
  {
    pair_address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', // WETH/USDC
    token0_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    token1_address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    total_supply: '3000000000000000000000', // 3000 LP tokens
    reserve0: '1500000000000000000', // 1.5 WETH
    reserve1: '3000000000', // 3000 USDC
    tvl_usd: 6000.0,
    volume_24h: '150000000000000000000'
  },
  {
    pair_address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', // KEKE/WBNB
    token0_address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    token1_address: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    total_supply: '800000000000000000000', // 800 LP tokens
    reserve0: '400000000000000000000', // 400 KEKE
    reserve1: '200000000000000000', // 0.2 WBNB
    tvl_usd: 800.0,
    volume_24h: '40000000000000000000'
  },
  {
    pair_address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', // WBTC/USDT
    token0_address: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
    token1_address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    total_supply: '100000000000000000', // 0.1 LP tokens (WBTC has 8 decimals)
    reserve0: '50000000', // 0.5 WBTC
    reserve1: '25000000000', // 25000 USDT
    tvl_usd: 50000.0,
    volume_24h: '500000000000000000000'
  }
];

// 用户位置数据（模拟一些用户已经质押的情况）
const userPositions = [
  {
    user_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Anvil账户0
    pair_address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    lp_balance: '100000000000000000000', // 100 LP tokens
    token0_balance: '50000000000000000000', // 50 KEKE
    token1_balance: '25000000000000000' // 0.025 WETH
  },
  {
    user_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    pair_address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    lp_balance: '50000000000000000000', // 50 LP tokens
    token0_balance: '25000000000000000', // 0.025 WETH
    token1_balance: '50000000' // 50 USDT
  }
];

function addFarmPools() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('连接数据库失败:', err.message);
      return;
    }
    console.log('已连接到SQLite数据库');
  });

  // 更新现有的流动性池数据
  console.log('更新流动性池数据...');
  
  const updatePoolStmt = db.prepare(`
    UPDATE trading_pairs 
    SET total_supply = ?, reserve0 = ?, reserve1 = ?, tvl_usd = ?, volume_24h = ?, updated_at = CURRENT_TIMESTAMP
    WHERE pair_address = ?
  `);

  farmPools.forEach((pool) => {
    updatePoolStmt.run([
      pool.total_supply,
      pool.reserve0,
      pool.reserve1,
      pool.tvl_usd,
      pool.volume_24h,
      pool.pair_address
    ], function(err) {
      if (err) {
        console.error('更新池子失败:', err.message);
      } else if (this.changes === 0) {
        // 如果没有更新任何行，说明池子不存在，需要插入
        console.log(`池子 ${pool.pair_address} 不存在，正在插入...`);
        
        const insertPoolStmt = db.prepare(`
          INSERT OR REPLACE INTO trading_pairs 
          (pair_address, token0_address, token1_address, total_supply, reserve0, reserve1, tvl_usd, volume_24h, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        
        insertPoolStmt.run([
          pool.pair_address,
          pool.token0_address,
          pool.token1_address,
          pool.total_supply,
          pool.reserve0,
          pool.reserve1,
          pool.tvl_usd,
          pool.volume_24h
        ], function(insertErr) {
          if (insertErr) {
            console.error('插入池子失败:', insertErr.message);
          } else {
            console.log(`✓ 插入池子: ${pool.pair_address}`);
          }
        });
        
        insertPoolStmt.finalize();
      } else {
        console.log(`✓ 更新池子: ${pool.pair_address}`);
      }
    });
  });

  updatePoolStmt.finalize();

  // 添加用户位置数据
  console.log('\n添加用户位置数据...');
  
  const insertPositionStmt = db.prepare(`
    INSERT OR REPLACE INTO user_positions 
    (user_address, pair_address, lp_balance, token0_balance, token1_balance, last_updated)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  userPositions.forEach((position) => {
    insertPositionStmt.run([
      position.user_address,
      position.pair_address,
      position.lp_balance,
      position.token0_balance,
      position.token1_balance
    ], function(err) {
      if (err) {
        console.error('插入用户位置失败:', err.message);
      } else {
        console.log(`✓ 添加用户位置: ${position.user_address} -> ${position.pair_address}`);
      }
    });
  });

  insertPositionStmt.finalize();

  // 关闭数据库连接
  db.close((err) => {
    if (err) {
      console.error('关闭数据库失败:', err.message);
    } else {
      console.log('\n✓ 农场池数据添加完成！');
      console.log('\n现在你可以在前端测试农场功能了。');
    }
  });
}

// 运行脚本
addFarmPools();