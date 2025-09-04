/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 18:45:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 18:45:00
 * @FilePath: /keke_web/scripts/integration-test.ts
 * @Description: VM-Swap 模块集成测试脚本
 */

import { checkAndFixConfiguration } from './check-and-fix-config';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: string;
}

class VMSwapIntegrationTest {
  private results: TestResult[] = [];

  private addResult(name: string, status: 'pass' | 'fail' | 'skip', message: string, details?: string) {
    this.results.push({ name, status, message, details });
  }

  // 测试 API 端点
  async testAPIEndpoints(): Promise<void> {
    console.log('🔌 测试 API 端点...');

    const endpoints = [
      { name: 'Health Check', url: 'http://localhost:3000/api/health' },
      { name: 'Tokens API', url: 'http://localhost:3000/api/tokens' },
      { name: 'WebSocket Status', url: 'http://localhost:3000/api/websocket' },
      { name: 'Pools API', url: 'http://localhost:3000/api/pools' },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        if (response.ok) {
          const data = await response.json();
          this.addResult(
            endpoint.name,
            'pass',
            `API 响应正常 (${response.status})`,
            JSON.stringify(data, null, 2).substring(0, 200) + '...'
          );
        } else {
          this.addResult(
            endpoint.name,
            'fail',
            `API 响应错误 (${response.status})`,
            await response.text()
          );
        }
      } catch (error) {
        this.addResult(
          endpoint.name,
          'fail',
          '无法连接到 API',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // 测试 WebSocket 连接
  async testWebSocketConnection(): Promise<void> {
    console.log('🔗 测试 WebSocket 连接...');

    try {
      // 检查 WebSocket 服务器状态
      const response = await fetch('http://localhost:3000/api/websocket');
      if (response.ok) {
        const data = await response.json();
        if (data.data?.isRunning) {
          this.addResult(
            'WebSocket 服务器',
            'pass',
            `WebSocket 服务器运行正常 (端口 ${data.data.port})`,
            `客户端连接数: ${data.data.clientCount}`
          );
        } else {
          this.addResult(
            'WebSocket 服务器',
            'fail',
            'WebSocket 服务器未运行',
            JSON.stringify(data, null, 2)
          );
        }
      } else {
        this.addResult(
          'WebSocket 服务器',
          'fail',
          '无法获取 WebSocket 状态',
          `HTTP ${response.status}`
        );
      }
    } catch (error) {
      this.addResult(
        'WebSocket 服务器',
        'fail',
        'WebSocket 服务测试失败',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // 测试数据库连接和数据
  async testDatabaseAndData(): Promise<void> {
    console.log('💾 测试数据库连接和数据...');

    try {
      // 测试代币数据
      const tokensResponse = await fetch('http://localhost:3000/api/tokens');
      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        if (tokensData.success && tokensData.data) {
          const tokenCount = Object.keys(tokensData.data).length;
          this.addResult(
            '代币数据',
            'pass',
            `成功获取 ${tokenCount} 个代币配置`,
            `包含: ${Object.keys(tokensData.data).join(', ')}`
          );

          // 检查必需的代币
          const requiredTokens = ['KEKE', 'USDT'];
          const missingTokens = requiredTokens.filter(symbol => !tokensData.data[symbol]);
          if (missingTokens.length > 0) {
            this.addResult(
              '必需代币检查',
              'fail',
              `缺少必需代币: ${missingTokens.join(', ')}`,
              '请运行 npm run seed-tokens 来初始化代币数据'
            );
          } else {
            this.addResult(
              '必需代币检查',
              'pass',
              '所有必需代币配置正常',
              requiredTokens.map(symbol => `${symbol}: ${tokensData.data[symbol].address}`).join('\n')
            );
          }
        } else {
          this.addResult(
            '代币数据',
            'fail',
            '无法获取代币数据',
            JSON.stringify(tokensData, null, 2)
          );
        }
      } else {
        this.addResult(
          '代币数据',
          'fail',
          `代币 API 响应错误 (${tokensResponse.status})`,
          await tokensResponse.text()
        );
      }

      // 测试数据库监控
      const dbMonitorResponse = await fetch('http://localhost:3000/api/database-monitor');
      if (dbMonitorResponse.ok) {
        const dbData = await dbMonitorResponse.json();
        if (dbData.success) {
          this.addResult(
            '数据库连接',
            'pass',
            '数据库连接正常',
            `数据表数量: ${dbData.data.table_list?.length || 0}`
          );
        } else {
          this.addResult(
            '数据库连接',
            'fail',
            '数据库监控返回错误',
            JSON.stringify(dbData, null, 2)
          );
        }
      } else {
        this.addResult(
          '数据库连接',
          'fail',
          `数据库监控 API 错误 (${dbMonitorResponse.status})`,
          await dbMonitorResponse.text()
        );
      }
    } catch (error) {
      this.addResult(
        '数据库测试',
        'fail',
        '数据库测试失败',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // 测试配置完整性
  async testConfiguration(): Promise<void> {
    console.log('⚙️  测试配置完整性...');

    try {
      const issues = await checkAndFixConfiguration();
      const errors = issues.filter(issue => issue.type === 'error');
      const warnings = issues.filter(issue => issue.type === 'warning');

      if (errors.length === 0) {
        this.addResult(
          '配置检查',
          'pass',
          '所有配置检查通过',
          warnings.length > 0 ? `${warnings.length} 个警告项` : '无警告'
        );
      } else {
        this.addResult(
          '配置检查',
          'fail',
          `发现 ${errors.length} 个配置错误`,
          errors.map(e => `[${e.category}] ${e.message}`).join('\n')
        );
      }
    } catch (error) {
      this.addResult(
        '配置检查',
        'fail',
        '配置检查失败',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // 运行所有测试
  async runAllTests(): Promise<void> {
    console.log('🧪 开始 VM-Swap 模块集成测试...\n');

    // 清空之前的结果
    this.results = [];

    // 执行所有测试
    await this.testConfiguration();
    await this.testDatabaseAndData();
    await this.testAPIEndpoints();
    await this.testWebSocketConnection();

    // 生成测试报告
    this.generateReport();
  }

  // 生成测试报告
  private generateReport(): void {
    console.log('\n📊 VM-Swap 模块集成测试报告');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    // 按状态分组显示结果
    const passedTests = this.results.filter(r => r.status === 'pass');
    const failedTests = this.results.filter(r => r.status === 'fail');
    const skippedTests = this.results.filter(r => r.status === 'skip');

    if (passedTests.length > 0) {
      console.log('\n✅ 通过的测试:');
      passedTests.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`   详情: ${result.details.split('\n')[0]}`);
        }
      });
    }

    if (failedTests.length > 0) {
      console.log('\n❌ 失败的测试:');
      failedTests.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`   详情: ${result.details}`);
        }
      });
    }

    if (skippedTests.length > 0) {
      console.log('\n⏭️  跳过的测试:');
      skippedTests.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.message}`);
      });
    }

    console.log('\n📈 测试统计:');
    console.log(`总测试数: ${this.results.length}`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${failed} ❌`);
    console.log(`跳过: ${skipped} ⏭️`);
    console.log(`成功率: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 所有测试通过！VM-Swap 模块可以正常使用。');
    } else {
      console.log('\n⚠️  存在测试失败项，请检查上述错误并修复后重新测试。');
    }

    console.log('\n💡 提示:');
    console.log('- 如果 WebSocket 测试失败，请确保已启动: npm run dev');
    console.log('- 如果数据库测试失败，请运行: npm run seed-tokens');
    console.log('- 如果配置测试失败，请运行: npm run check-config');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tester = new VMSwapIntegrationTest();
  tester.runAllTests().catch(console.error);
}

export { VMSwapIntegrationTest };
