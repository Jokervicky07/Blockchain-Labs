// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; 

// ERC20 token
contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "NT") {
        _mint(msg.sender, 100_000_000 * 10**decimals()); // decimals() return 18
    }
}

contract TokenLock is Ownable {
    IERC20 public token;
    uint256 public startTime;
    uint256 public endTime;
    address[] private allUsers;

    mapping(address => uint256) public deposits;
    mapping(address => bool) public trade;


    event Lock(address indexed account, uint256 amount);
    event Unlock(address indexed account, uint256 amount, uint256 reward);
    event Withdraw(address indexed account, uint256 amount);
    event TradeExcuted(address indexed users, uint256 amount);
    event StartTimeUpdated(uint256 newStartTime);
    

    constructor(address _owner, address _token) Ownable(_owner) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    function setStartTime(uint256 _newStartTime) public onlyOwner {
        require(_newStartTime >= block.timestamp, "New start time must be in the future");
        startTime = _newStartTime;
        emit StartTimeUpdated(_newStartTime);
    }

    function setEndTime(uint256 _endTime) public onlyOwner {
        require(endTime == 0, "End time already set");
        require(_endTime > startTime, "Invalid end time");
        endTime = _endTime;
    }

    function lock() external payable {
        require(startTime > 0, "Start time not set");
        require(endTime > 0, "End time not set");
        require(block.timestamp < startTime, "Locking period ended");
        require(msg.value > 0, "ETH value must be greater than 0");

        addUsers(msg.sender);
        deposits[msg.sender] += msg.value;
        emit Lock(msg.sender, msg.value);
    }

    function unlock() external {
        require(block.timestamp > endTime, "Locking period not ended");
        require(deposits[msg.sender] > 0, "No deposit found");

        uint256 amount = deposits[msg.sender];
        uint256 reward = 1000 * 1e18; // 1000 tokens
        deposits[msg.sender] = 0;

        if (trade[msg.sender]) {
            // reward = 1000 + (ETH locked * 2500)
            reward += (amount * 2500); 
        } else {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Transfer failed");
        }

        require(token.transfer(msg.sender, reward), "Transfer failed");

        emit Unlock(msg.sender, amount, reward);
    }

    function tradeUserFunds(address _user) external onlyOwner {
        require(deposits[_user] > 0, "No deposit found");
        require(!trade[_user], "Funds already traded");
        trade[_user] = true;
        emit TradeExcuted(_user, deposits[_user]);
    }

    function getETH(uint amount) external onlyOwner {
        uint256 totalTradeETH = 0;
        address[] memory allusers = getAllUsers();
        for (uint256 i = 0; i < allusers.length; i++) {
            if (trade[allusers[i]]) {
                totalTradeETH += deposits[allusers[i]];
            }
        }

        require(totalTradeETH >= amount, "Exceed total trade ETH");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdraw(owner(), amount);
    }

    function addUsers(address _users) internal {
        if (deposits[_users] > 0) {
            allUsers.push(_users);
        }
    }

    function getAllUsers() public view returns (address[] memory) {
        return allUsers;
    }
}

