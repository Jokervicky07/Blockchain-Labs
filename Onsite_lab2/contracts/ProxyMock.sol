// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IProofOfProxy.sol";

/// @dev No3ProofOfProxy uses IMock(mocking) and currentId to mint NFTs
interface IMock {
    function mocking() external;
}

/// @title ProxyMock for No3ProofOfProxy Lab3
/// @notice first mocking() revert for registration，then allow mocking() to mint NFT, finally transfer to EOA
contract ProxyMock is IMock {
    address public immutable proof = 0x76C44B7Fa2f091d9465032dC5B8F111Dcf6ECf46;  // No3ProofOfProxy contract address
    bool    public registered;       // false: registration，true: mint

    /// @notice ProofOfProxy.registerContract 里会 try { mocking() } catch {}，需要 revert 才能注册
    function mocking() external view override {
        require(registered, "ProxyMock: still in registration phase");
        // 注册阶段 registered==false 会触发 revert，上面 catch 后标记注册成功
        // 铸造阶段 registered==true 就能正常返回
    }

    /// @notice Let ProofOfProxy register this contract
    function register() external {
        IProofOfProxy(proof).registerContract(address(this));
    }

    /// @notice Switch to mint phase
    function enableMint() external {
        registered = true;
    }

    /// @notice  ProofOfProxy.testMock()
    function mintTo(address to) external {
        IProofOfProxy(proof).testMock();

        uint256 tokenId = IProofOfProxy(proof).currentId();

        IERC721(proof).safeTransferFrom(
            address(this),
            to,
            tokenId
        );
    }
}
