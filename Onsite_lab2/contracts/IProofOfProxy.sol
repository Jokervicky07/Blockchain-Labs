// contracts/contracts/IFlashloan.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @dev Partial interface for No3ProofOfProxy
interface IProofOfProxy {
    function registerContract(address contractAddress) external;

    /// @notice mocking on the registered contract and mint NFT
    function testMock() external;

    /// @notice return the current tokenId
    function currentId() external view returns (uint256);
}
