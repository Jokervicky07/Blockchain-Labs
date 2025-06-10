// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/// @title Generic HTLC supporting native ETH or ERC20
contract HTLC {
    enum TokenType {Native, ERC20}

    struct Swap {
        uint256 amount;
        bytes32 hashLock;      // H = keccak256(S)
        uint256 timelock;      // unix timestamp
        address sender;
        address receiver;
        TokenType tokenType;
        address tokenAddr;     // 0 when native
        bool    withdrawn;
        bool    refunded;
        bytes32 preimage;      // revealed S
    }

    mapping(bytes32 => Swap) public swaps; // id => Swap
    bytes32[] public swapIds; // for iteration

    event Locked (
        bytes32 indexed id,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock,
        TokenType tokenType,
        address tokenAddr
    );
    event Withdrawn(bytes32 indexed id, bytes32 preimage);
    event Refunded(bytes32 indexed id);

    // --- Create ---

    function _create(
        bytes32 _id,
        bytes32 _hashLock,
        uint256 _timelock,
        address _receiver,
        TokenType _type,
        address _tokenAddr,
        uint256 _amount
    ) internal {
        require(swaps[_id].sender == address(0), "id exists");
        require(_timelock > block.timestamp, "bad timelock");

        swaps[_id] = Swap({
            amount: _amount,
            hashLock: _hashLock,
            timelock: _timelock,
            sender: msg.sender,
            receiver: _receiver,
            tokenType: _type,
            tokenAddr: _tokenAddr,
            withdrawn: false,
            refunded: false,
            preimage: 0x0
        });

        swapIds.push(_id);

        emit Locked(_id, msg.sender, _receiver, _amount,
                    _hashLock, _timelock, _type, _tokenAddr);
    }

    /// @notice Lock native ETH
    function lockETH(bytes32 _id, bytes32 _hashLock, uint256 _timelock, address _receiver)
        external payable
    {
        require(msg.value > 0, "no ether");
        _create(_id, _hashLock, _timelock, _receiver, TokenType.Native, address(0), msg.value);
    }

    /// @notice Lock ERC20
    function lockERC20(bytes32 _id, bytes32 _hashLock, uint256 _timelock,
                       address _receiver, address _token, uint256 _amount)
        external
    {
        require(_amount > 0, "no amount");
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "transfer fail");
        _create(_id, _hashLock, _timelock, _receiver, TokenType.ERC20, _token, _amount);
    }

    // --- Withdraw ---

    function withdraw(bytes32 _id, bytes32 _preimage) external {
        Swap storage s = swaps[_id];
        require(s.sender != address(0), "swap not found");
        require(s.receiver == msg.sender, "!receiver");
        require(!s.withdrawn, "already");
        require(keccak256(abi.encodePacked(_preimage)) == s.hashLock, "bad preimage");
        s.withdrawn = true;
        s.preimage = _preimage;

        if (s.tokenType == TokenType.Native) {
            payable(msg.sender).transfer(s.amount);
        } else {
            require(IERC20(s.tokenAddr).transfer(msg.sender, s.amount), "erc20 fail");
        }

        emit Withdrawn(_id, _preimage);
    }

    // --- Refund ---

    function refund(bytes32 _id) external {
        Swap storage s = swaps[_id];
        require(s.sender != address(0), "swap not found");
        require(msg.sender == s.sender, "!sender");
        require(!s.withdrawn, "taken");
        require(!s.refunded, "already");
        require(block.timestamp >= s.timelock, "premature");
        s.refunded = true;

        if (s.tokenType == TokenType.Native) {
            payable(msg.sender).transfer(s.amount);
        } else {
            require(IERC20(s.tokenAddr).transfer(msg.sender, s.amount), "erc20 fail");
        }

        emit Refunded(_id);
    }

    function rescueERC20(address _token, address _to) external {
        require(_to == msg.sender, "self only");
        uint256 total = IERC20(_token).balanceOf(address(this));
        uint256 lock = 0;

        uint256 len = swapIds.length;
        for (uint256 i = 0; i < len; i++) {
            Swap storage s = swaps[swapIds[i]];
            if (s.tokenType == TokenType.ERC20 && s.tokenAddr == _token && !s.withdrawn && !s.refunded) {
                lock += s.amount;
            }
        }

        uint256 excess = total - lock;
        require(excess > 0, "nothing to rescue");
        require(IERC20(_token).transfer(_to, excess), "rescue fail");
    }
}
