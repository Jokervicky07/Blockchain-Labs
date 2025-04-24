// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DonationVault is ERC20, Ownable {
    IERC20 public immutable underlyingToken;

    constructor(address _underlyingToken)
        ERC20("DonationVault Share", "DVS") Ownable(msg.sender)
    {
        underlyingToken = IERC20(_underlyingToken);
    }

    function deposit(uint256 _amountUnderlying) external {
        require(_amountUnderlying > 0, "Amount must be > 0");

        uint256 sharesToMint = (_amountUnderlying * 1e18) / getSharePrice();
        _mint(msg.sender, sharesToMint);

        require(
            underlyingToken.transferFrom(msg.sender, address(this), _amountUnderlying),
            "Transfer failed"
        );
    }

    function withdraw(uint256 _amountShares) external {
        require(_amountShares > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= _amountShares, "Insufficient shares");

        uint256 underlyingToReturn = (_amountShares * getSharePrice()) / 1e18;
        _burn(msg.sender, _amountShares);

        require(
            underlyingToken.transfer(msg.sender, underlyingToReturn),
            "Transfer failed"
        );
    }

    function takeFeeAsOwner(uint256 _amountUnderlying) external onlyOwner {
        require(
            underlyingToken.transfer(msg.sender, _amountUnderlying),
            "Fee transfer failed"
        );
    }

    function getSharePrice() public view returns (uint256) {
        uint256 balance = underlyingToken.balanceOf(address(this));
        uint256 totalShares = totalSupply(); // ERC20 total supply
        if (totalShares == 0 || balance == 0) {
            return 1e18;
        }
        return (balance * 1e18) / totalShares;
    }
}
