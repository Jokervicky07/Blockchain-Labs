// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ReceiveETH {
    address public immutable owner;

    event Received(address indexed sender, uint256 amount);
    event Withdrawn(address indexed receiver, uint256 amount);

    constructor() {
        owner = msg.sender; // Set the contract deployer as the owner
    }

    // Function to receive ETH
    receive() external payable {
        require(msg.value > 0, "Must send ETH");
        emit Received(msg.sender, msg.value);
    }

    // Withdraw function, only callable by the owner
    function withdraw() external {
        require(msg.sender == owner, "Not authorized");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");

        emit Withdrawn(owner, balance);
    }
}
