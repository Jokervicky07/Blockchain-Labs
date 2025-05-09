// contracts/IFlashloan.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IFlashloan {
  function flashloan(uint256 amount, bytes calldata params) external;
}
