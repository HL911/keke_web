// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../KekeToken.sol";


contract SyrupBar is ERC20, Ownable {

    KekeToken public keke;

    constructor(
        KekeToken _keke
    ) ERC20("SyrupBar Token", "SYRUP") Ownable(msg.sender) {
        keke = _keke;
    }

    // Mint SYRUP tokens. Can only be called by the owner (MasterChef).
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    // Burn SYRUP tokens. Can only be called by the owner (MasterChef).
    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
    }

    // Safe keke transfer function, just in case if rounding error causes pool to not have enough KEKEs.
    function safeKekeTransfer(address _to, uint256 _amount) public onlyOwner {
        uint256 kekeBal = keke.balanceOf(address(this));
        if (_amount > kekeBal) {
            require(keke.transfer(_to, kekeBal), "Transfer failed");
        } else {
            require(keke.transfer(_to, _amount), "Transfer failed");
        }
    }


    function getChainId() internal view returns (uint) {
        uint256 chainId;
        assembly { chainId := chainid() }
        return chainId;
    }

    // TODO DAO 投票  


}