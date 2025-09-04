<!--
 * @Author: dreamworks.cnn@gmail.com
 * @Date: 2025-09-03 17:25:25
 * @LastEditors: dreamworks.cnn@gmail.com
 * @LastEditTime: 2025-09-03 17:31:31
 * @FilePath: /keke_web/src/app/(web)/vm-swap/vm-swap.md
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
-->
src/app/(web)/vm-swap 虚拟交易模块介绍：

- 该模块为lunchpad 发射池中 memeToken的交易模块；
  - 1.TradingChart 实时交易蜡烛图
    - 依赖src/app/api/websocket/route.ts作为该图表的数据源
    - 依赖确定的交易对信息作为参数输入
  - 2.OrderBook 实时交易订单（不做实现）
    - 先挂起（不做实现）
  - 3.TradingPanel 发起交易模块
    - 依赖与src/abi/MemeToken.json ABI的交互，来实现
      - 1.交易
      - 2.当前用户余额刷新
  - 4.交易对基础信息
    - 依赖与src/abi/下的相关abi交互，来实现
    - 当前交易对的信息展示

服务端相关文档参考地址：docs/api-documentation.md