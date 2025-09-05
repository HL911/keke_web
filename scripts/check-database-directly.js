#!/usr/bin/env node

/**
 * 直接检查数据库中的交易和K线数据
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

function queryDatabase(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
      db.close();
    });
  });
}

async function checkDatabase() {
  console.log('🔍 直接检查数据库内容...\n');

  try {
    // 检查交易事件表
    console.log('📊 交易事件 (trade_events):');
    const tradeEvents = await queryDatabase('SELECT * FROM trade_events ORDER BY timestamp DESC LIMIT 5');
    if (tradeEvents.length > 0) {
      console.log(`找到 ${tradeEvents.length} 条交易记录:`);
      tradeEvents.forEach((trade, index) => {
        console.log(`${index + 1}. 时间: ${trade.timestamp}, 代币: ${trade.token_address}, 价格: ${trade.price}, 数量: ${trade.token_amount}`);
      });
    } else {
      console.log('❌ 没有找到交易事件记录');
    }

    console.log('\n📈 K线数据 (klines):');
    const klines = await queryDatabase('SELECT * FROM klines ORDER BY timestamp DESC LIMIT 5');
    if (klines.length > 0) {
      console.log(`找到 ${klines.length} 条K线记录:`);
      klines.forEach((kline, index) => {
        console.log(`${index + 1}. 网络: ${kline.network}, 地址: ${kline.pair_address}, 时间间隔: ${kline.interval_type}, 收盘价: ${kline.close}`);
      });
    } else {
      console.log('❌ 没有找到K线数据记录');
    }

    console.log('\n🏠 交易对 (trading_pairs):');
    const pairs = await queryDatabase('SELECT pair_address, tvl_usd, volume_24h FROM trading_pairs');
    if (pairs.length > 0) {
      console.log(`找到 ${pairs.length} 个交易对:`);
      pairs.forEach((pair, index) => {
        console.log(`${index + 1}. 地址: ${pair.pair_address}, TVL: $${pair.tvl_usd}, 24h成交量: ${pair.volume_24h}`);
      });
    } else {
      console.log('❌ 没有找到交易对');
    }

    console.log('\n🪙 代币 (tokens):');
    const tokens = await queryDatabase('SELECT address, symbol, name, price_usd FROM tokens');
    if (tokens.length > 0) {
      console.log(`找到 ${tokens.length} 个代币:`);
      tokens.forEach((token, index) => {
        console.log(`${index + 1}. ${token.symbol} (${token.name}): ${token.address}, 价格: $${token.price_usd}`);
      });
    }

    // 检查数据库表结构
    console.log('\n🗄️ 数据库表:');
    const tables = await queryDatabase("SELECT name FROM sqlite_master WHERE type='table'");
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });

    // 特别检查Pool合约相关的数据
    console.log('\n🎯 特定Pool合约数据检查:');
    const poolAddress = '0x639721Aae084191F5F9E1C25C161E6F25cDcc9b7';
    console.log(`检查Pool地址: ${poolAddress}`);

    const poolTrades = await queryDatabase('SELECT * FROM trade_events WHERE token_address = ? LIMIT 3', [poolAddress]);
    console.log(`该Pool的交易记录: ${poolTrades.length} 条`);

    const poolKlines = await queryDatabase('SELECT * FROM klines WHERE pair_address = ? LIMIT 3', [poolAddress]);
    console.log(`该Pool的K线记录: ${poolKlines.length} 条`);

  } catch (error) {
    console.error('❌ 数据库查询失败:', error.message);
  }
}

if (require.main === module) {
  checkDatabase();
}
