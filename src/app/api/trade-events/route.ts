import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../utils/sqlite-db'

// GET /api/trade-events - 查询交易事件
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chainId = searchParams.get('chainId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const db = await getDatabase()
    
    let query = `
      SELECT 
        network,
        tx_hash,
        user_address,
        token_amount,
        eth_amount,
        token_address,
        timestamp,
        isBuy,
        price
      FROM trade_events
    `
    
    const params: any[] = []
    
    if (chainId) {
      query += ' WHERE network = ?'
      params.push(chainId)
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const trades = await db.all(query, params)
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM trade_events'
    const countParams: any[] = []
    
    if (chainId) {
      countQuery += ' WHERE network = ?'
      countParams.push(chainId)
    }
    
    const countResult = await db.get(countQuery, countParams)
    const total = countResult?.total || 0
    
    return NextResponse.json({
      success: true,
      data: {
        trades,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching trade events:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trade events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/trade-events - 手动添加测试交易事件（仅用于测试）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      chainId = 11155111,
      txHash = '0x' + Math.random().toString(16).substr(2, 64),
      blockNumber = Math.floor(Math.random() * 1000000),
      userAddress = '0x' + Math.random().toString(16).substr(2, 40),
      tokenAmount = '1000000000000000000',
      ethAmount = '100000000000000000',
      tokenAddress = '0x' + Math.random().toString(16).substr(2, 40),
      isBuy = true
    } = body
    
    const db = await getDatabase()
    
    await db.run(`
      INSERT INTO trade_events (
        network, tx_hash, user_address, 
        token_amount, eth_amount, token_address, timestamp, isBuy, price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      chainId.toString(),
      txHash,
      userAddress,
      tokenAmount,
      ethAmount,
      tokenAddress,
      new Date().toISOString(),
      isBuy ? 1 : 0,
      (parseFloat(tokenAmount) / parseFloat(ethAmount)).toString()
    ])
    
    return NextResponse.json({
      success: true,
      message: 'Test trade event created successfully',
      data: {
        chainId,
        txHash,
        blockNumber,
        userAddress,
        tokenAmount,
        ethAmount,
        tokenAddress,
        isBuy
      }
    })
    
  } catch (error) {
    console.error('Error creating test trade event:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create test trade event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}