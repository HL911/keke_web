#!/usr/bin/env node

/**
 * 交易事件监听器状态检查脚本
 * 诊断为什么交易事件没有被捕获
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data && typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 检查数据库中的交易记录
async function checkDatabaseRecords() {
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve('./database.db');
    log('info', `🗄️ 连接数据库: ${dbPath}`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        log('error', '数据库连接失败:', err.message);
        reject(err);
        return;
      }
      
      log('success', '✅ 数据库连接成功');
      
      // 检查表结构
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          log('error', '查询表失败:', err.message);
          db.close();
          reject(err);
          return;
        }
        
        log('info', '📋 数据库表:', tables.map(t => t.name));
        
        // 检查trade_events表
        if (tables.some(t => t.name === 'trade_events')) {
          db.all("SELECT COUNT(*) as count FROM trade_events", (err, countResult) => {
            if (err) {
              log('error', '查询交易记录数量失败:', err.message);
            } else {
              log('info', `💰 交易记录总数: ${countResult[0].count}`);
            }
            
            // 查询最近5条交易记录
            db.all("SELECT * FROM trade_events ORDER BY timestamp DESC LIMIT 5", (err, trades) => {
              if (err) {
                log('error', '查询最近交易失败:', err.message);
              } else if (trades.length > 0) {
                log('info', '📊 最近交易记录:');
                trades.forEach((trade, index) => {
                  log('info', `  ${index + 1}. ${trade.tx_hash?.slice(0, 10)}... | 价格: ${trade.price} | 数量: ${trade.token_amount} | 时间: ${trade.timestamp}`);
                });
              } else {
                log('warning', '⚠️ 没有找到交易记录');
              }
              
              // 检查klines表
              db.all("SELECT COUNT(*) as count FROM klines", (err, klineCount) => {
                if (err) {
                  log('error', '查询K线数量失败:', err.message);
                } else {
                  log('info', `📈 K线记录总数: ${klineCount[0].count}`);
                }
                
                // 查询最近5条K线记录
                db.all("SELECT * FROM klines ORDER BY timestamp DESC LIMIT 5", (err, klines) => {
                  if (err) {
                    log('error', '查询最近K线失败:', err.message);
                  } else if (klines.length > 0) {
                    log('info', '📊 最近K线记录:');
                    klines.forEach((kline, index) => {
                      log('info', `  ${index + 1}. ${kline.pair_address?.slice(0, 10)}... | 价格: ${kline.close} | 时间间隔: ${kline.interval_type} | 时间: ${new Date(parseInt(kline.timestamp)).toISOString()}`);
                    });
                  } else {
                    log('warning', '⚠️ 没有找到K线记录');
                  }
                  
                  db.close();
                  resolve({
                    tradeCount: countResult[0].count,
                    klineCount: klineCount[0].count,
                    recentTrades: trades,
                    recentKlines: klines
                  });
                });
              });
            });
          });
        } else {
          log('error', '❌ 未找到trade_events表');
          db.close();
          reject(new Error('trade_events表不存在'));
        }
      });
    });
  });
}

// 检查交易事件监听器配置
async function checkTradeListenerConfig() {
  log('info', '🔧 检查交易事件监听器配置...');
  
  try {
    // 读取网络配置
    const sepoliaConfig = require('../src/config/address/sepolia.json');
    log('info', '📝 Sepolia网络配置:', {
      poolAddress: sepoliaConfig.poolAddress,
      tokenFactoryAddress: sepoliaConfig.tokenFactoryAddress,
      kekeTokenAddress: sepoliaConfig.kekeTokenAddress,
      wethAddress: sepoliaConfig.wethAddress
    });
    
    // 检查环境变量
    const rpcUrls = [
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_WEBSOCKETS_1,
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_WEBSOCKETS_2,
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_1,
      process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_2
    ].filter(Boolean);
    
    log('info', '🌐 RPC连接配置:', {
      websocketUrls: rpcUrls.slice(0, 2),
      httpUrls: rpcUrls.slice(2),
      totalUrls: rpcUrls.length
    });
    
    if (rpcUrls.length === 0) {
      log('error', '❌ 没有配置RPC URL！');
      log('info', '💡 请检查.env.local文件中的以下变量：');
      log('info', '  - NEXT_PUBLIC_RPC_URL_SEPOLIA_WEBSOCKETS_1');
      log('info', '  - NEXT_PUBLIC_RPC_URL_SEPOLIA_HTTPS_1');
    }
    
    return {
      poolAddress: sepoliaConfig.poolAddress,
      rpcConfigured: rpcUrls.length > 0,
      rpcUrls: rpcUrls
    };
    
  } catch (error) {
    log('error', '读取配置失败:', error.message);
    return null;
  }
}

// 测试RPC连接
async function testRpcConnection(rpcUrl) {
  log('info', `🔌 测试RPC连接: ${rpcUrl.slice(0, 50)}...`);
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result) {
        const blockNumber = parseInt(data.result, 16);
        log('success', `✅ RPC连接正常，当前区块: ${blockNumber}`);
        return { success: true, blockNumber };
      } else {
        log('error', `❌ RPC响应错误:`, data.error);
        return { success: false, error: data.error };
      }
    } else {
      log('error', `❌ RPC请求失败: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    log('error', `❌ RPC连接失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 检查具体的交易对地址是否正确
async function checkPairAddressInTrades(poolAddress) {
  log('info', '🔍 检查您的交易是否使用了正确的Pool地址...');
  
  // 这里我们需要手动提供您最近的交易hash来验证
  // 或者通过浏览器的开发者工具Network标签查看
  log('info', '💡 请检查以下信息：');
  log('info', `  1. 您的交易是否在Pool合约 ${poolAddress} 上执行？`);
  log('info', '  2. 在浏览器开发者工具的Network标签中查看交易请求');
  log('info', '  3. 确认交易使用的合约地址与配置文件中的poolAddress一致');
  
  return { poolAddress, note: '需要手动验证交易地址' };
}

// 生成诊断报告
function generateDiagnosticReport(dbData, config, rpcTests) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 交易事件监听器诊断报告');
  console.log('='.repeat(80));
  
  const issues = [];
  const solutions = [];
  
  // 1. 数据库检查
  console.log('\n📊 数据库状态:');
  if (dbData.tradeCount > 0) {
    console.log(`  ✅ 交易记录: ${dbData.tradeCount} 条`);
  } else {
    console.log('  ❌ 没有交易记录');
    issues.push('数据库中没有交易记录');
  }
  
  if (dbData.klineCount > 0) {
    console.log(`  ✅ K线记录: ${dbData.klineCount} 条`);
  } else {
    console.log('  ❌ 没有K线记录');
    if (dbData.tradeCount === 0) {
      issues.push('没有交易数据导致无K线生成');
    } else {
      issues.push('有交易但K线聚合服务可能有问题');
    }
  }
  
  // 2. 配置检查
  console.log('\n⚙️ 配置状态:');
  if (config && config.rpcConfigured) {
    console.log(`  ✅ RPC配置: ${config.rpcUrls.length} 个URL`);
  } else {
    console.log('  ❌ RPC配置缺失');
    issues.push('RPC连接未配置');
    solutions.push('配置.env.local文件中的RPC URL');
  }
  
  if (config && config.poolAddress) {
    console.log(`  ✅ Pool地址: ${config.poolAddress}`);
  } else {
    console.log('  ❌ Pool地址配置缺失');
    issues.push('Pool合约地址未配置');
  }
  
  // 3. RPC连接测试
  console.log('\n🌐 RPC连接测试:');
  const workingConnections = rpcTests.filter(test => test.success);
  const failedConnections = rpcTests.filter(test => !test.success);
  
  console.log(`  ✅ 正常连接: ${workingConnections.length}`);
  console.log(`  ❌ 失败连接: ${failedConnections.length}`);
  
  if (workingConnections.length === 0) {
    issues.push('所有RPC连接都失败');
    solutions.push('检查网络连接和RPC服务商状态');
  }
  
  // 4. 问题诊断
  console.log('\n🎯 问题诊断:');
  if (issues.length === 0) {
    console.log('  🎉 没有发现明显的配置问题');
    console.log('  💡 如果仍然没有数据，可能原因：');
    console.log('    - 交易事件监听器服务没有运行');
    console.log('    - 交易发生在不同的合约地址上');
    console.log('    - 区块链同步延迟');
  } else {
    console.log('  发现以下问题:');
    issues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue}`);
    });
  }
  
  // 5. 解决方案
  if (solutions.length > 0) {
    console.log('\n💡 建议解决方案:');
    solutions.forEach((solution, index) => {
      console.log(`  ${index + 1}. ${solution}`);
    });
  }
  
  // 6. 下一步行动
  console.log('\n🚀 下一步行动:');
  console.log('  1. 确认交易事件监听器服务正在运行');
  console.log('  2. 检查您的交易是否使用了正确的Pool合约地址');
  console.log('  3. 查看浏览器控制台是否有错误信息');
  console.log('  4. 如果问题持续，可以手动触发K线数据生成进行测试');
  
  console.log('='.repeat(80));
}

// 主函数
async function main() {
  console.log('🔍 交易事件监听器状态检查');
  console.log('='.repeat(80));
  
  try {
    // 1. 检查数据库
    log('info', '第1步: 检查数据库记录...');
    const dbData = await checkDatabaseRecords();
    
    // 2. 检查配置
    log('info', '第2步: 检查配置文件...');
    const config = await checkTradeListenerConfig();
    
    // 3. 测试RPC连接
    log('info', '第3步: 测试RPC连接...');
    const rpcTests = [];
    if (config && config.rpcUrls.length > 0) {
      for (const url of config.rpcUrls) {
        const result = await testRpcConnection(url);
        rpcTests.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 避免请求过快
      }
    }
    
    // 4. 检查交易地址匹配
    if (config && config.poolAddress) {
      await checkPairAddressInTrades(config.poolAddress);
    }
    
    // 5. 生成报告
    generateDiagnosticReport(dbData, config, rpcTests);
    
  } catch (error) {
    log('error', '诊断执行失败:', error.message);
    console.error(error);
  }
}

// 运行诊断
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
