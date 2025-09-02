#!/usr/bin/env tsx

import { initializeDatabase, getDatabase } from "../src/app/api/utils/db-core";

async function testDatabase() {
  try {
    console.log("🔧 Testing database initialization...");

    // 初始化数据库
    await initializeDatabase();
    console.log("✅ Database initialized successfully");

    // 获取数据库实例
    const db = await getDatabase();
    console.log("✅ Database connection established");

    // 测试查询表结构
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log(`📊 Found ${tables.length} tables:`);
    tables.forEach((table) => {
      console.log(`  - ${table.name}`);
    });

    // 测试查询代币数据
    const tokenCount = await db.get("SELECT COUNT(*) as count FROM tokens");
    console.log(`🪙 Tokens in database: ${tokenCount?.count || 0}`);

    // 测试查询交易对数据
    const pairCount = await db.get(
      "SELECT COUNT(*) as count FROM trading_pairs"
    );
    console.log(`💱 Trading pairs in database: ${pairCount?.count || 0}`);

    console.log("\n✅ Database test completed successfully!");
  } catch (error) {
    console.error("❌ Database test failed:", error);
    process.exit(1);
  }
}

// 运行测试
testDatabase();
