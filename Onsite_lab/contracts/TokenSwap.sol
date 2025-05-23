// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice A:B = 1:3
contract TokenSwap is Ownable {
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    uint256 public constant RATE_A_TO_B = 3;    // 1 A ➡ 3 B

    event SwapAForB(address indexed user, uint256 amountA, uint256 amountB);
    event SwapBForA(address indexed user, uint256 amountB, uint256 amountA);

    constructor(address _tokenA, address _tokenB) Ownable(msg.sender) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    /// @param amountA the amount of A to swap
    function swapAForB(uint256 amountA) external {
        require(amountA > 0, "amountA>0");
        uint256 amountB = amountA * RATE_A_TO_B;

        // transfer in A
        require(
            tokenA.transferFrom(msg.sender, address(this), amountA),
            "A transfer failed"
        );
        // transfer out B
        require(
            tokenB.balanceOf(address(this)) >= amountB,
            "insufficient B reserve"
        );
        require(
            tokenB.transfer(msg.sender, amountB),
            "B transfer failed"
        );

        emit SwapAForB(msg.sender, amountA, amountB);
    }

    /// @param amountB must be multiple of 3
    function swapBForA(uint256 amountB) external {
        require(amountB > 0, "amountB>0");
        require(amountB % RATE_A_TO_B == 0, "amountB must be multiple of 3");
        uint256 amountA = amountB / RATE_A_TO_B;

        // transfer in B
        require(
            tokenB.transferFrom(msg.sender, address(this), amountB),
            "B transfer failed"
        );
        // transfer out A
        require(
            tokenA.balanceOf(address(this)) >= amountA,
            "insufficient A reserve"
        );
        require(
            tokenA.transfer(msg.sender, amountA),
            "A transfer failed"
        );

        emit SwapBForA(msg.sender, amountB, amountA);
    }

    /// @notice Rescue tokens in case of emergency
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
