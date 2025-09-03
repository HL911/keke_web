/*
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 19:00:00
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 19:00:00
 * @FilePath: /keke_web/scripts/test-websocket.ts
 * @Description: WebSocket 连接测试工具
 */

import WebSocket from 'ws';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class WebSocketTester {
  private results: TestResult[] = [];

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
    this.results.push({ name, status, message, details });
  }

  // 测试 WebSocket 服务器是否运行
  async testWebSocketServer(url: string): Promise<void> {
    return new Promise((resolve) => {
      console.log(`🔌 测试 WebSocket 连接: ${url}`);

      const timeout = setTimeout(() => {
        this.addResult(
          'WebSocket 连接',
          'fail',
          '连接超时',
          `无法在 10 秒内连接到 ${url}`
        );
        resolve();
      }, 10000);

      try {
        const ws = new WebSocket(url);

        ws.on('open', () => {
          clearTimeout(timeout);
          this.addResult(
            'WebSocket 连接',
            'pass',
            '连接成功',
            `成功连接到 ${url}`
          );
          
          // 测试心跳
          this.testHeartbeat(ws);
          
          setTimeout(() => {
            ws.close(1000, '测试完成');
            resolve();
          }, 2000);
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.addResult(
            'WebSocket 连接',
            'fail',
            '连接失败',
            `错误: ${error.message}`
          );
          resolve();
        });

        ws.on('close', (code, reason) => {
          console.log(`WebSocket 连接已关闭: ${code} - ${reason}`);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('收到消息:', message);
            
            if (message.type === 'pong') {
              this.addResult(
                '心跳响应',
                'pass',
                '服务器响应心跳',
                `收到 pong 响应`
              );
            }
          } catch (error) {
            console.log('收到非 JSON 消息:', data.toString());
          }
        });

      } catch (error) {
        clearTimeout(timeout);
        this.addResult(
          'WebSocket 连接',
          'fail',
          '创建连接失败',
          error instanceof Error ? error.message : String(error)
        );
        resolve();
      }
    });
  }

  // 测试心跳功能
  private testHeartbeat(ws: WebSocket): void {
    try {
      const pingMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(pingMessage));
      console.log('发送心跳消息:', pingMessage);
    } catch (error) {
      this.addResult(
        '心跳测试',
        'fail',
        '发送心跳失败',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // 测试订阅功能
  async testSubscription(url: string): Promise<void> {
    return new Promise((resolve) => {
      console.log(`📊 测试 K线数据订阅: ${url}`);

      const timeout = setTimeout(() => {
        this.addResult(
          'K线订阅',
          'fail',
          '订阅测试超时',
          '未能在 15 秒内完成订阅测试'
        );
        resolve();
      }, 15000);

      try {
        const ws = new WebSocket(url);
        let subscriptionSent = false;

        ws.on('open', () => {
          // 发送订阅消息
          const subscription = {
            type: 'subscribe',
            data: {
              network: 'ethereum',
              pairAddress: '0x742d35Cc6861C4C687b12F1C3e56b12e9E3CCD0C',
              intervals: ['1m']
            },
            timestamp: Date.now()
          };

          ws.send(JSON.stringify(subscription));
          subscriptionSent = true;
          console.log('发送订阅消息:', subscription);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'subscription_confirmed') {
              this.addResult(
                'K线订阅',
                'pass',
                '订阅确认',
                `成功订阅: ${JSON.stringify(message.data)}`
              );
            } else if (message.type === 'kline_update') {
              this.addResult(
                'K线数据',
                'pass',
                '收到K线数据',
                `网络: ${message.data?.network}, 交易对: ${message.data?.pairAddress}`
              );
            } else if (message.type === 'error') {
              this.addResult(
                'K线订阅',
                'fail',
                '服务器返回错误',
                `错误: ${JSON.stringify(message.data)}`
              );
            }
          } catch (error) {
            console.log('收到非 JSON 消息:', data.toString());
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.addResult(
            'K线订阅',
            'fail',
            '订阅测试失败',
            `错误: ${error.message}`
          );
          resolve();
        });

        setTimeout(() => {
          clearTimeout(timeout);
          ws.close(1000, '订阅测试完成');
          
          if (subscriptionSent && !this.results.find(r => r.name === 'K线订阅' && r.status === 'pass')) {
            this.addResult(
              'K线订阅',
              'warning',
              '订阅发送但未收到确认',
              '可能服务器不支持该订阅或网络延迟'
            );
          }
          
          resolve();
        }, 10000);

      } catch (error) {
        clearTimeout(timeout);
        this.addResult(
          'K线订阅',
          'fail',
          '创建订阅连接失败',
          error instanceof Error ? error.message : String(error)
        );
        resolve();
      }
    });
  }

  // 检查端口是否被占用
  async checkPort(port: number): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      this.addResult(
        '端口检查',
        'pass',
        `端口 ${port} 有服务运行`,
        `HTTP 响应状态: ${response.status}`
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        this.addResult(
          '端口检查',
          'fail',
          `端口 ${port} 无服务运行`,
          '请启动 WebSocket 服务器'
        );
      } else {
        this.addResult(
          '端口检查',
          'warning',
          `端口 ${port} 检查异常`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // 运行所有测试
  async runAllTests(): Promise<void> {
    console.log('🧪 开始 WebSocket 服务测试...\n');

    this.results = [];

    // 检查端口
    await this.checkPort(8081);
    
    // 测试基本连接
    await this.testWebSocketServer('ws://localhost:8081/kline-ws');
    
    // 测试订阅功能
    await this.testSubscription('ws://localhost:8081/kline-ws');

    this.generateReport();
  }

  // 生成测试报告
  private generateReport(): void {
    console.log('\n📊 WebSocket 测试报告');
    console.log('='.repeat(40));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    // 显示结果
    this.results.forEach((result) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`   详情: ${result.details}`);
      }
    });

    console.log('\n📈 测试统计:');
    console.log(`通过: ${passed} | 失败: ${failed} | 警告: ${warnings}`);

    if (failed === 0) {
      console.log('\n🎉 WebSocket 服务运行正常！');
    } else {
      console.log('\n💡 修复建议:');
      
      const hasConnectionFailed = this.results.some(r => r.name === 'WebSocket 连接' && r.status === 'fail');
      const hasPortFailed = this.results.some(r => r.name === '端口检查' && r.status === 'fail');
      
      if (hasPortFailed) {
        console.log('1. 启动开发服务器: npm run dev');
        console.log('2. 检查 WebSocket 服务是否在项目中正确配置');
      }
      
      if (hasConnectionFailed) {
        console.log('3. 检查防火墙设置是否阻止了 WebSocket 连接');
        console.log('4. 确认 WebSocket 服务器正在监听正确的端口 (8081)');
      }
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tester = new WebSocketTester();
  tester.runAllTests().catch(console.error);
}

export { WebSocketTester };
