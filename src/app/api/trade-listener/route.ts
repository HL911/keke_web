import { NextRequest, NextResponse } from 'next/server'
import { startTradeListener, stopTradeListener } from '@/services/trade-listener'

// 启动事件监听器
export async function POST(request: NextRequest) {
  try {
    console.log('Starting trade event listener...')
    await startTradeListener()
    
    return NextResponse.json({
      success: true,
      message: 'Trade event listener started successfully'
    })
  } catch (error) {
    console.error('Failed to start trade listener:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start trade listener',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 停止事件监听器
export async function DELETE(request: NextRequest) {
  try {
    console.log('Stopping trade event listener...')
    await stopTradeListener()
    
    return NextResponse.json({
      success: true,
      message: 'Trade event listener stopped successfully'
    })
  } catch (error) {
    console.error('Failed to stop trade listener:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop trade listener',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 获取事件监听器状态
export async function GET(request: NextRequest) {
  try {
    // 这里可以添加获取监听器状态的逻辑
    return NextResponse.json({
      success: true,
      status: 'running', // 这里应该从实际状态获取
      message: 'Trade event listener status retrieved'
    })
  } catch (error) {
    console.error('Failed to get trade listener status:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get trade listener status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}