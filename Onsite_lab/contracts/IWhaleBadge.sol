// contracts/IWhaleBadge.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IWhaleBadge {
  function obtainProofOfWhale(uint256 _secret) external;

  function currentId() external view returns (uint256);
}
