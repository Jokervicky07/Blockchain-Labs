// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract TokenWithdrawer {
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }

    function Withdraw(address token) external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(token).transfer(owner, balance);
    }
}


contract TokenWithdrawerFactory {
    event Deployed(address addr, bytes32 salt);

    function deploy(address _owner, bytes32 salt) public returns (address addr) {
        bytes memory bytecode = abi.encodePacked(type(TokenWithdrawer).creationCode, abi.encode(_owner));
        addr = Create2.deploy(0, salt, bytecode);

        emit Deployed(addr, salt);
    }

    function computeAddress(address _owner, bytes32 salt) public view returns (address addr) {
        bytes memory bytecode = abi.encodePacked(type(TokenWithdrawer).creationCode, abi.encode(_owner));
        addr = Create2.computeAddress(salt, keccak256(bytecode));
    }
}