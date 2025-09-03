// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../KekeToken.sol";
import "./SyrupBar.sol";

contract Master is Ownable {
     using SafeERC20 for IERC20;
     
     // Bonus muliplier for early keke makers.
     uint256 public BONUS_MULTIPLIER = 1;
     
     // Events
    /**
    @dev 用户信息结构体（记录单个用户在某个矿池的质押状态）
    @param amount 用户质押的 LP 代币数量
    @param rewardDebt 用户的奖励债务（已领取奖励 - 待领取奖励）
    */
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
    /**
    @dev 矿池信息结构体（记录单个矿池的质押状态）
    @param lpToken LP 代币地址
    @param allocPoint 该矿池的奖励分配权重（权重越高，每区块获得的 KEKE 奖励越多）
    @param lastRewardBlock 该矿池上次结算奖励的区块号
    @param accKekePerShare 该矿池累计的 KEKE 奖励 per 份额（单位：1e18，用于放大精度避免小数误差）
    */
    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accKekePerShare;
    }
    // 核心状态变量
    KekeToken public keke;
    //  Syrup 质押池合约实例
    SyrupBar public syrup;
    //  开发者地址（获取部分奖励分成）
    address public devaddr;
    uint256 public kekePerBlock;/// 每个区块产出的 KEKE 奖励数量
    // TODO 早期挖矿奖励倍数（用于激励早期参与者，可调整）
    // TODO IMigratorChef public migrator; // LP 代币迁移合约实例（仅通过治理设置）
    PoolInfo[] public poolInfo;///矿池列表（存储所有矿池的信息）
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;/// 用户信息映射（矿池 ID => 用户地址 => 用户信息）  //
    /// 所有矿池的总奖励分配权重（需等于各矿池 allocPoint 之和）
    uint256 public totalAllocPoint = 0; 
    uint256 public startBlock; /// 挖矿开始的区块号
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount); // 用户存入 LP 代币事件
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount); // 用户取出 LP 代币事件
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount); // 用户紧急取出 LP 代币事件（不结算奖励）


    /**
    @dev 构造函数（初始化核心参数）
    @param _keke KEKE 代币合约地址
    @param _kekePerBlock 每个区块产出的 KEKE 数量
    @param _startBlock 挖矿开始的区块号
    */
    constructor(
        KekeToken _keke,
        SyrupBar _syrup,
        address _devaddr,
        uint256 _kekePerBlock,
        uint256 _startBlock
    ) Ownable(msg.sender) {
        keke = _keke;
        syrup = _syrup;
        devaddr = _devaddr;
        kekePerBlock = _kekePerBlock;
        startBlock = _startBlock;
        poolInfo.push(PoolInfo({
            lpToken: _keke, // 接受 KEKE 作为质押资产
            allocPoint: 1000, // 初始分配权重为 1000
            lastRewardBlock: startBlock, // 首次奖励结算从挖矿开始区块起算
            accKekePerShare: 0 // 初始累计奖励份额为 0
        }));
        totalAllocPoint = 1000; // 总权重初始化为默认矿池的权重
    }

     /**
    @dev 更新挖矿奖励倍数
    @param multiplierNumber 新的奖励倍数
    */
    function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }

    /**
    @dev 查看矿池总数
    @return 矿池列表长度（即矿池数量）
    */
    function poolLength() external view returns(uint256) {
        return poolInfo.length;
    }

    /**
    @dev 添加新矿池（仅所有者可调用，需避免重复添加同一 LP 代币）
    @param _allocPoint 新矿池的奖励分配权重
    @param _lpToken 新矿池接受的 LP 代币合约地址
    @param _withUpdate 是否立即更新所有矿池的奖励状态（true = 先更新再添加）
    */

    function addPool(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate

    ) public onlyOwner{
            if (_withUpdate) {
            massUpdatePools();
        }
        // 确定新矿池的首次奖励结算区块
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;   
        totalAllocPoint = totalAllocPoint + _allocPoint; // 更新总权重
        // 将新矿池添加到矿池列表
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                allocPoint: _allocPoint,
                lastRewardBlock: lastRewardBlock,
                accKekePerShare: 0
            })
        );
        updateStakingPool(); 
    }


    /**
    @dev 调整已有矿池的奖励权重
    @param _pid 矿池 ID
    @param _allocPoint 新的奖励分配权重
    @param _withUpdate 是否立即更新所有矿池的奖励状态
    */

    function setPool(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public  onlyOwner{
            if (_withUpdate) {
            massUpdatePools();
        }
        uint256 prevAllocPoint = poolInfo[_pid].allocPoint; // 记录旧权重
        poolInfo[_pid].allocPoint = _allocPoint; // 设置新权重
        if (prevAllocPoint != _allocPoint) {
            totalAllocPoint = totalAllocPoint - prevAllocPoint + _allocPoint;
            updateStakingPool();
        }

    }

    /**
    @dev 调整 KEKE 单币质押矿池（poolId=0）的权重（内部调用）
    逻辑：将所有其他矿池的总权重除以 3，作为单币质押矿池的新权重
    */
    function updateStakingPool() internal {
        uint256 length = poolInfo.length;
        uint256 points = 0;
        // 计算除单币质押矿池外所有矿池的总权重
        for (uint256 pid = 1; pid < length; ++pid) {
            points = points + poolInfo[pid].allocPoint;
        }
        if (points != 0) {
            points = points / 3; // 取三分之一作为单币质押矿池的权重
            // 更新总权重（先减去旧权重，再加新权重）
            totalAllocPoint = totalAllocPoint - poolInfo[0].allocPoint + points;
            poolInfo[0].allocPoint = points; // 设置单币质押矿池的新权重
        }
    }


    ///  缺点：没有直接解决 “多次修改 BONUS_MULTIPLIER 后如何准确计算奖励倍数” 的问题 （解决办法是添加一个跟新字段记录修改区块高度，然后分开计算）
    /**
    @dev 计算指定区块区间内的奖励倍数
    @param _from 起始区块号
    @param _to 结束区块号
    @return 奖励倍数（区块数量 × 奖励倍数）
    */
    function getMultiplier(uint256 _from, uint256 _to) public view returns(uint256) {
        return (_to - _from) * BONUS_MULTIPLIER;
    }


   /**
    @dev 查看用户在指定矿池的待领取 KEKE 奖励
    @param _pid 矿池 ID
    @param _user 用户地址
    @return 待领取的 KEKE 奖励数量
    */
    function getPoolKEKEReward(uint256 _pid, address _user) external view returns(uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accKekePerShare = pool.accKekePerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this)); // 矿池当前的 LP 代币总质押量
        // 若当前区块已超过上次奖励结算区块，且矿池有质押量，计算累计奖励份额
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            // 计算该矿池在区间内的总 KEKE 奖励：倍数 × 每区块 KEKE 产量 × 矿池权重 / 总权重
            uint256 kekeReward = (multiplier * kekePerBlock * pool.allocPoint) / totalAllocPoint;
            // 更新累计奖励份额（放大 1e18 倍避免小数误差）
            accKekePerShare = accKekePerShare + (kekeReward * 1e18) / lpSupply;
        }
        // 计算用户待领取奖励：用户质押量 × 累计奖励份额 / 1e18 - 奖励债务
        return (user.amount * accKekePerShare) / 1e18 - user.rewardDebt;
    }
    /**
    @dev 批量更新所有矿池的奖励状态（结算待发奖励）
    */
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    
    /// 核心逻辑：无论矿池类型（LP 池或单币池），updatePool 都会将奖励 mint 给 Syrup 池

    /**
    @dev 更新指定矿池的奖励状态
    功能：计算从上次结算到当前区块的总奖励，分配给开发者和 Syrup 池，更新矿池累计奖励份额
    @param _pid 矿池 ID
    */
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        // 若当前区块未超过上次结算区块，无需更新
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        // 若矿池无质押量，仅更新上次结算区块号
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        // 1. 计算奖励倍数与总奖励
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 kekeReward = (multiplier * kekePerBlock * pool.allocPoint) / totalAllocPoint;
        // 2. 分配奖励：10% 给开发者，90% 注入 Syrup 池（后续由 Syrup 池分发给用户）
        keke.mint(devaddr, kekeReward / 10);
        keke.mint(address(syrup), kekeReward);
        // 3. 更新矿池累计奖励份额（放大 1e18 倍）
        pool.accKekePerShare = pool.accKekePerShare + (kekeReward * 1e18) / lpSupply;
        // 4. 更新上次结算区块号为当前区块
        pool.lastRewardBlock = block.number;
    }


    /**
    @dev 用户存入 LP 代币到指定矿池（获取 KEKE 奖励）
    @param _pid 矿池 ID（不可为 0，0 为 KEKE 单币质押池，需用 enterStaking）
    @param _amount 存入的 LP 代币数量
    */
    function deposit(uint256 _pid, uint256 _amount) public {
        require(_pid != 0, "deposit KEKE by staking"); // 禁止用此函数存入 KEKE 到单币池
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        uint256 pending = (user.amount * pool.accKekePerShare) / 1e18 - user.rewardDebt;
        if (pending > 0) {
            safeKekeTransfer(msg.sender, pending);
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount + _amount;
        }
        user.rewardDebt = (user.amount * pool.accKekePerShare) / 1e18;
        emit Deposit(msg.sender, _pid, _amount);
    }

     // 将 KEKE 代币质押到 Master
    function enterStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0]; // 获取 KEKE 单币质押池（poolId=0）
        UserInfo storage user = userInfo[0][msg.sender]; // 获取当前用户在该池的信息
        updatePool(0); // 先更新该矿池的奖励状态（结算待发奖励）

        // 如果用户已有质押量，计算并领取的奖励并发放
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accKekePerShare) / 1e18 - user.rewardDebt;
            if (pending > 0) {
                safeKekeTransfer(msg.sender, pending); // 安全转账奖励给用户
            }
        }

        // 如果存入数量大于 0，执行质押逻辑
        if (_amount > 0) {
            // 从用户地址转账指定数量的 KEKE 到合约（需用户提前授权）
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            // 更新用户质押量
            user.amount = user.amount + _amount; 
        }

            // 更新用户的奖励债务（基于当前累计奖励份额）
            user.rewardDebt = (user.amount * pool.accKekePerShare) / 1e18;
            // 向用户铸造对应数量的 Syrup 代币（Syrup 是 KEKE 质押的凭证）
            syrup.mint(msg.sender, _amount);
            emit Deposit(msg.sender, 0, _amount); // 触发存款事件
    }



     // 从质押中提取 KEKE 代币
    function leaveStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0]; // 获取 KEKE 单币质押池
        UserInfo storage user = userInfo[0][msg.sender]; // 获取当前用户在该池的信息
        require(user.amount >= _amount, "withdraw: not good"); // 验证提取数量不超过质押量

        // 先更新该矿池的奖励状态（结算待发奖励）
        updatePool(0); 

        // 计算并发放用户的待领取奖励
        uint256 pending = (user.amount * pool.accKekePerShare) / 1e18 - user.rewardDebt;
        if (pending > 0) {
            // 安全转账奖励给用户
            safeKekeTransfer(msg.sender, pending);
       }

         // 如果提取数量大于 0，执行提取逻辑
        if (_amount > 0) {
            // 减少用户质押量
            user.amount = user.amount - _amount; 
            // 将 KEKE 转回用户地址
            pool.lpToken.safeTransfer(address(msg.sender), _amount); 
        }

        // 更新用户的奖励债务
        user.rewardDebt = (user.amount * pool.accKekePerShare) / 1e18;

        // 销毁用户对应的 Syrup 代币（回收质押凭证）
        syrup.burn(msg.sender, _amount);
        emit Withdraw(msg.sender, 0, _amount); // 触发提取事件
    }
    // 安全的 KEKE 转账函数
    function safeKekeTransfer(address _to, uint256 _amount) internal {
        syrup.safeKekeTransfer(_to, _amount); 
    }
     
    
    // 添加 withdraw 函数
    function withdraw(uint256 _pid, uint256 _amount) public {
        require(_pid != 0, "withdraw KEKE by unstaking");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending = (user.amount * pool.accKekePerShare) / 1e18 - user.rewardDebt;
        if (pending > 0) {
            safeKekeTransfer(msg.sender, pending);
        }
        if (_amount > 0) {
            user.amount = user.amount - _amount;
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = (user.amount * pool.accKekePerShare) / 1e18;
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // 由前任开发者更新开发者地址
    function dev(address _devaddr) public {
        require(msg.sender == devaddr, "dev: wut?"); 
        devaddr = _devaddr; 
    }


}