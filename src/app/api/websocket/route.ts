import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServerStatus } from '../../../services/websocket-server';

/**
 * GET /api/websocket
 * 获取WebSocket服务器状态信息
 */
export async function GET(request: NextRequest) {
  try {
    const status = getWebSocketServerStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting WebSocket server status:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get WebSocket server status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/websocket
 * WebSocket服务器管理操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: action'
        },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'status':
        const status = getWebSocketServerStatus();
        return NextResponse.json({
          success: true,
          data: status,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Supported actions: status`
          },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error processing WebSocket management request:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process WebSocket management request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}