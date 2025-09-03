// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; 

// 智能挖矿合约（带管理员权限、重入保护，支持质押代币获取奖励）
contract SmartChef is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // 是否为用户设置质押额度限制
    bool public hasUserLimit;

    // 累计每单位质押资产可获得的奖励代币数量（放大后的值，需结合精度因子使用）
    uint256 public accTokenPerShare;

    // 奖励挖矿结束的区块号
    uint256 public bonusEndBlock;

    // 奖励挖矿开始的区块号
    uint256 public startBlock;

    // 上次更新矿池奖励状态的区块号
    uint256 public lastRewardBlock;

    // 单个用户的质押额度限制（0 表示无限制）
    uint256 public poolLimitPerUser;

    // 每个区块产出的奖励代币数量
    uint256 public rewardPerBlock;

    // 精度因子（用于处理奖励计算的小数精度问题）
    uint256 public PRECISION_FACTOR;


    
    // 奖励代币合约实例（用户质押后获得的奖励代币）
    IERC20 public rewardToken;

    // 质押代币合约实例（用户需要质押的代币）
    IERC20 public stakedToken;


    // 存储每个用户的质押信息（key：用户地址，value：用户质押详情）
    mapping(address => UserInfo) public userInfo;

    // 用户质押信息结构体
    struct UserInfo {
        uint256 amount; // 用户已质押的代币数量
        uint256 rewardDebt; // 奖励债务（用于计算待领取奖励，避免重复发放）
    }

    // 管理员回收错误转入代币的事件
    event AdminTokenRecovery(address tokenRecovered, uint256 amount);
    // 用户存入质押代币的事件
    event Deposit(address indexed user, uint256 amount);
    // 更新挖矿开始 / 结束区块号的事件
    event NewStartAndEndBlocks(uint256 startBlock, uint256 endBlock);
    // 更新每个区块奖励数量的事件
    event NewRewardPerBlock(uint256 rewardPerBlock);
    // 更新用户质押额度限制的事件
    event NewPoolLimit(uint256 poolLimitPerUser);
    // 停止奖励发放的事件
    event RewardsStop(uint256 blockNumber);
    // 用户取出质押代币的事件
    event Withdraw(address indexed user, uint256 amount);


    /*

    @notice 构造函数（初始化矿池核心参数）
    @param _stakedToken 质押代币的合约地址
    @param _rewardToken 奖励代币的合约地址
    @param _rewardPerBlock 每个区块产出的奖励代币数量（单位：奖励代币）
    @param _startBlock 挖矿开始的区块号
    @param _bonusEndBlock 挖矿结束的区块号
    @param _poolLimitPerUser 单个用户的质押额度限制（单位：质押代币，0 表示无限制）
    */
    constructor(
        IERC20 _stakedToken,
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        uint256 _poolLimitPerUser
    ) Ownable(msg.sender) {
        // 验证质押代币和奖励代币的有效性（总供应量非负，且两者为不同代币）
        require(address(_stakedToken) != address(0), "Invalid staked token");
        require(address(_rewardToken) != address(0), "Invalid reward token");
        require(_stakedToken != _rewardToken, "Tokens must be different"); 
        stakedToken = _stakedToken;
        rewardToken = _rewardToken;
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
        bonusEndBlock = _bonusEndBlock;
        // 若设置了用户质押限额，更新对应状态
        if (_poolLimitPerUser > 0) {
            hasUserLimit = true;
            poolLimitPerUser = _poolLimitPerUser;
        }
        // 计算精度因子（处理奖励代币的小数位数，确保计算精度）
        uint256 decimalsRewardToken = 18; // Default to 18 decimals for ERC20
        require(decimalsRewardToken < 30, "Must be inferior to 30"); 
        // 精度因子 = 10^(30 - 奖励代币小数位数)，将奖励计算精度统一到 30位小数
        PRECISION_FACTOR = uint256(10 ** (uint256(30) - decimalsRewardToken));
        // 初始化上次奖励更新区块号为挖矿开始区块号
        lastRewardBlock = startBlock;
    }

    /*
    @notice 用户存入质押代币，并领取待结算奖励（如有）
    @param _amount 存入的质押代币数量
    */
    function deposit(uint256 _amount) external nonReentrant {
        // 获取当前用户的质押信息
        UserInfo storage user = userInfo[msg.sender];
        // 若有用户质押限额，验证存入后总数量不超过限额
        if (hasUserLimit) {
            require(_amount + user.amount <= poolLimitPerUser, "User amount above limit");
        }
        // 先更新矿池奖励状态（确保奖励计算到当前区块）
        _updatePool();
        // 若用户已有质押资产，计算并发放待领取奖励
        if (user.amount > 0) {
            // 待领取奖励 = 用户质押量 × 累计每单位奖励 ÷ 精度因子 - 奖励债务
            uint256 pending = (user.amount * accTokenPerShare) / PRECISION_FACTOR - user.rewardDebt;
            if (pending > 0) {
                rewardToken.safeTransfer(msg.sender, pending); 
            }
        }
        // 若存入数量大于 0，执行质押逻辑
        if (_amount > 0) {
            user.amount = user.amount + _amount; // 更新用户质押量
            // 从用户地址转账质押代币到合约（需用户提前授权）
            stakedToken.safeTransferFrom(msg.sender, address(this), _amount);
        }
        // 更新用户的奖励债务（基于当前累计每单位奖励，标记已结算的奖励）
        user.rewardDebt = (user.amount * accTokenPerShare) / PRECISION_FACTOR;
        // 触发存入事件（供前端追踪）
        emit Deposit(msg.sender, _amount);
    }
/*

    @notice 用户取出质押代币，并领取待结算奖励
    @param _amount 取出的质押代币数量
    */
    function withdraw(uint256 _amount) external nonReentrant {
        // 获取当前用户的质押信息
        UserInfo storage user = userInfo[msg.sender];
        // 验证取出数量不超过用户已质押数量
        require(user.amount >= _amount, "Amount to withdraw too high");
        // 先更新矿池奖励状态（确保奖励计算到当前区块）
        _updatePool();
        // 计算用户待领取奖励
        uint256 pending = (user.amount * accTokenPerShare) / PRECISION_FACTOR - user.rewardDebt;
        // 若取出数量大于 0，执行取出逻辑
        if (_amount > 0) {
            user.amount = user.amount - _amount; // 减少用户质押量
            stakedToken.safeTransfer(msg.sender, _amount); // 将质押代币转回用户地址
        }
        // 若有待领取奖励，转账给用户
        if (pending > 0) {
            rewardToken.safeTransfer(msg.sender, pending);
        }
        // 更新用户的奖励债务（基于当前累计每单位奖励）
        user.rewardDebt = (user.amount * accTokenPerShare) / PRECISION_FACTOR;
        // 触发取出事件（供前端追踪）
        emit Withdraw(msg.sender, _amount);
    }



    /**

    @notice 允许管理员回收误转入合约的非核心代币
    @param _tokenAddress 待回收代币的合约地址
    @param _tokenAmount 待回收的代币数量
    @dev 仅管理员可调用，且不能回收质押代币或奖励代币
    */
    function recoverWrongTokens(address _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        // 禁止回收质押代币和奖励代币（避免影响矿池正常运行）
        require(_tokenAddress != address(stakedToken), "Cannot be staked token");
        require(_tokenAddress != address(rewardToken), "Cannot be reward token");
        // 安全转账待回收代币给管理员
        require(IERC20(_tokenAddress).transfer(msg.sender, _tokenAmount), "Transfer failed");
        // 触发管理员回收代币事件（供前端追踪）
        emit AdminTokenRecovery(_tokenAddress, _tokenAmount);
    }


    /**
    @notice 停止奖励发放（仅管理员可调用）
    @dev 将奖励结束区块号设为当前区块，后续不再产生新奖励
    */
    function stopReward() external onlyOwner {
        bonusEndBlock = block.number;
        // 补充触发停止奖励事件（原文遗漏，确保前端能追踪）
        emit RewardsStop(block.number);
    }


    /**
    @notice 更新单个用户的质押额度限制（仅管理员可调用）
    @param _hasUserLimit 是否继续保留额度限制
    @param _poolLimitPerUser 新的用户额度限制（仅当_hasUserLimit 为 true 时生效）
    */
    function updatePoolLimitPerUser(bool _hasUserLimit, uint256 _poolLimitPerUser) external onlyOwner {
        // 仅当当前已设置额度限制时，才可执行更新
        require(hasUserLimit, "Must be set");
        if (_hasUserLimit) {
            // 若继续保留限制，新限制必须大于当前限制（避免降低用户额度）
            require(_poolLimitPerUser > poolLimitPerUser, "New limit must be higher");
            poolLimitPerUser = _poolLimitPerUser;
        } else {
            // 若取消限制，重置对应状态
            hasUserLimit = _hasUserLimit;
            poolLimitPerUser = 0;
        }
        // 触发更新额度限制事件（供前端追踪）
        emit NewPoolLimit(poolLimitPerUser);
    }


    /**
    @notice 更新每个区块的奖励代币数量（仅管理员可调用）
    @dev 仅在挖矿开始前（当前区块 < 开始区块）可更新，避免影响已开始的挖矿
    @param _rewardPerBlock 新的每个区块奖励数量
    */
    function updateRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        require(block.number < startBlock, "Pool has started");
        rewardPerBlock = _rewardPerBlock;
        // 触发更新区块奖励事件
        emit NewRewardPerBlock(_rewardPerBlock);
    }

        /**

    @notice 允许管理员更新挖矿的开始和结束区块号（仅管理员可调用）
    @dev 仅在挖矿开始前可更新，且新开始区块需大于当前区块、新结束区块需大于新开始区块
    @param _startBlock 新的挖矿开始区块号
    @param _bonusEndBlock 新的挖矿结束区块号
    */
    function updateStartAndEndBlocks(uint256 _startBlock, uint256 _bonusEndBlock) external onlyOwner {
        require(block.number < startBlock, "Pool has started");
        require(_startBlock < _bonusEndBlock, "New startBlock must be lower than new endBlock");
        require(block.number < _startBlock, "New startBlock must be higher than current block");
        // 更新开始和结束区块号
        startBlock = _startBlock;
        bonusEndBlock = _bonusEndBlock;
        // 重置上次奖励更新区块号为新的开始区块号
        lastRewardBlock = startBlock;
        // 触发更新开始 / 结束区块事件（供前端追踪）
        emit NewStartAndEndBlocks(_startBlock, _bonusEndBlock);
    }
    

    
    /**
    @notice 前端视图函数：查询用户的待领取奖励
    @param _user 待查询的用户地址
    @return 用户当前的待领取奖励数量
    */
    function pendingReward(address _user) external view returns(uint256) {
        // 获取用户质押信息和当前矿池的质押总量
        UserInfo storage user = userInfo[_user];
        uint256 stakedTokenSupply = stakedToken.balanceOf(address(this));
        // 若当前区块已超过上次奖励更新区块，且矿池有质押资产，计算最新的累计奖励
        if (block.number > lastRewardBlock && stakedTokenSupply != 0) {
            // 计算奖励倍数（当前区块到上次更新区块的有效区块数）
            uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
            // 计算该区间内的总奖励数量
            uint256 KEKEReward = multiplier * rewardPerBlock;
            // 计算更新后的累计每单位奖励
            uint256 adjustedTokenPerShare = accTokenPerShare + 
                (KEKEReward * PRECISION_FACTOR) / stakedTokenSupply;
            // 计算待领取奖励
            return (user.amount * adjustedTokenPerShare) / PRECISION_FACTOR - user.rewardDebt;
        } else {
            // 若无需更新，直接用当前累计奖励计算待领取奖励
            return (user.amount * accTokenPerShare) / PRECISION_FACTOR - user.rewardDebt;
        }
    }


    /**
        @notice 内部函数：更新指定矿池的奖励相关变量，确保数据实时有效
        @dev 仅当当前区块 > 上次奖励结算区块时执行，避免重复计算
    */
    function _updatePool() internal {
    // 若当前区块未超过上次奖励结算区块，无需执行更新
        if (block.number <= lastRewardBlock) {
            return;
        }
        // 获取当前矿池中的质押代币总数量
        uint256 stakedTokenSupply = stakedToken.balanceOf(address(this));
        // 若矿池无质押代币，仅将上次奖励结算区块更新为当前区块，无需计算奖励
        if (stakedTokenSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }
        // 计算奖励倍数：上次结算区块到当前区块的有效奖励区块数
        uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
        // 计算该区间内的总奖励数量：奖励倍数 × 每个区块奖励数量
        uint256 KEKEReward = multiplier * rewardPerBlock;
        // 更新累计每单位奖励：当前累计奖励 +（总奖励 × 精度因子 ÷ 矿池质押总量）
        accTokenPerShare = accTokenPerShare + (KEKEReward * PRECISION_FACTOR) / stakedTokenSupply;
        // 将上次奖励结算区块更新为当前区块，标记本次更新完成
        lastRewardBlock = block.number;
    }

    /**
    @notice 计算有效奖励区块数（内部函数）
    @param _from 起始区块号
    @param _to 结束区块号
    @return 有效奖励区块数
    */
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= bonusEndBlock) {
            return _to - _from;
        } else if (_from >= bonusEndBlock) {
            return 0;
        } else {
            return bonusEndBlock - _from;
        }
    }

}