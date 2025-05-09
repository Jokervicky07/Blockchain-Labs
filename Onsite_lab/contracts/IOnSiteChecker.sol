// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IOnSiteChecker {
  function updateScores() external;
  function scores(address user) external view returns (uint256);
  function lab(uint256 labId, address user) external view returns (bool);
}
