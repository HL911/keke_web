'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccount, useChainId } from 'wagmi'
import { useMasterAddress, useKekeTokenAddress } from '@/hooks/useContract'
import { usePoolLength, usePoolInfo, useMasterInfo } from '@/hooks/useMaster'
import { usePriceCalculator } from '../../../../../price'

export function DebugInfo() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const masterAddress = useMasterAddress()
  const kekeTokenAddress = useKekeTokenAddress()
  
  const { data: poolLength, error: poolLengthError } = usePoolLength()
  const { data: pool0Info, error: pool0Error } = usePoolInfo(0)
  const { data: pool1Info, error: pool1Error } = usePoolInfo(1)
  const { data: masterInfo, error: masterInfoError } = useMasterInfo()
  const { data: priceData, isLoading: priceLoading, error: priceError } = usePriceCalculator()

  return (
    <Card className="mb-6 bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">调试信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div><strong>钱包状态:</strong> {isConnected ? `已连接 (${address})` : '未连接'}</div>
        <div><strong>网络ID:</strong> {chainId}</div>
        <div><strong>Master合约地址:</strong> {masterAddress || '未配置'}</div>
        <div><strong>KEKE代币地址:</strong> {kekeTokenAddress || '未配置'}</div>
        
        <div className="pt-2 border-t">
          <div><strong>矿池数量:</strong> {poolLength ? poolLength.toString() : '加载中...'}</div>
          {poolLengthError && <div className="text-red-600">错误: {poolLengthError.message}</div>}
        </div>
        
        <div className="pt-2 border-t">
          <div><strong>Pool 0 信息:</strong> {pool0Info ? '已加载' : '加载中...'}</div>
          {pool0Error && <div className="text-red-600">Pool 0 错误: {pool0Error.message}</div>}
          {pool0Info ? (
            <div className="ml-4 text-gray-600">
              LP Token: {String((pool0Info as any)[0] || '')}<br/>
              Alloc Point: {String((pool0Info as any)[1]?.toString() || '')}
            </div>
          ) : null}
        </div>
        
        <div className="pt-2 border-t">
          <div><strong>Pool 1 信息:</strong> {pool1Info ? '已加载' : '加载中...'}</div>
          {pool1Error && <div className="text-red-600">Pool 1 错误: {pool1Error.message}</div>}
          {pool1Info ? (
            <div className="ml-4 text-gray-600">
              LP Token: {String((pool1Info as any)[0] || '')}<br/>
              Alloc Point: {String((pool1Info as any)[1]?.toString() || '')}
            </div>
          ) : null}
        </div>
        
        <div className="pt-2 border-t">
          <div><strong>Master信息:</strong> {masterInfo ? '已加载' : '加载中...'}</div>
          {masterInfoError && <div className="text-red-600">Master错误: {masterInfoError.message}</div>}
        </div>
        
        <div className="pt-2 border-t">
          <div><strong>价格数据:</strong> {priceLoading ? '加载中...' : (priceData ? '已加载' : '未加载')}</div>
          {priceError && <div className="text-red-600">价格错误: {priceError.message}</div>}
          {priceData ? (
            <div className="ml-4 text-gray-600">
              ETH价格: ${priceData.ethPrice}<br/>
              KEKE价格: ${priceData.kekePrice}<br/>
              LP代币价值: ${priceData.lpTokenValue}<br/>
              LP类型: {priceData.lpTokenType}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}