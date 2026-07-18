// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SessionKeyExecutor {
    // Mapping to track the last execution timestamp per session key
    mapping(address => uint256) public lastPullTimestamp;
    
    // Mapping to track revoked session keys
    mapping(address => bool) public revokedSessionKeys;

    uint256 public constant FEE_BPS = 100;
    address public constant TREASURY = 0x6a7438A16D907f7f43044384335D9E347a04a68C; // Placeholder address

    struct SessionKeyScope {
        address sessionKeyAddress;
        address recipient;
        uint256 maxAmount;    // in wei
        uint256 interval;     // in seconds
        uint256 expiry;       // timestamp in seconds
        uint256 planId;       // plan identifier
        string maxAmountStr;  // e.g., "0.01"
        string expiryISO;     // e.g., "2026-08-16T12:00:00.000Z"
    }

    event PullExecuted(address indexed sessionKey, address indexed recipient, uint256 amount, uint256 feeAmount);
    event SessionKeyRevoked(address indexed sessionKey);

    modifier onlyOwner() {
        require(msg.sender == address(this), "Only owner can call");
        _;
    }

    // Allow receiving ETH and empty calls without reverting
    receive() external payable {}
    fallback() external payable {}

    /**
     * Revokes a session key. Callable only by the owner (the EOA itself).
     */
    function revoke(address sessionKey) external onlyOwner {
        revokedSessionKeys[sessionKey] = true;
        emit SessionKeyRevoked(sessionKey);
    }

    /**
     * Executes a pull transfer.
     * Anyone (relayer) can call this, providing signatures and scope parameters.
     */
    function executePull(
        uint256 amount,
        SessionKeyScope calldata scope,
        bytes calldata ownerSig,
        bytes calldata sessionKeySig
    ) external {
        // 1. Verify session key is not revoked
        require(!revokedSessionKeys[scope.sessionKeyAddress], "Session key revoked");

        // 2. Validate expiry
        require(block.timestamp <= scope.expiry, "Session key expired");

        // 3. Validate recipient and amount limit
        require(amount <= scope.maxAmount, "Amount exceeds limit");
        require(msg.sender == scope.recipient || msg.sender == scope.sessionKeyAddress || msg.sender == address(this), "Unauthorized caller");

        // 4. Validate interval
        require(
            block.timestamp >= lastPullTimestamp[scope.sessionKeyAddress] + scope.interval,
            "Interval not elapsed"
        );

        // 5. Verify Owner Signature over the scope statement
        bytes32 scopeHash = getScopeHash(scope);
        address recoveredOwner = recoverSigner(scopeHash, ownerSig);
        require(recoveredOwner == address(this), "Invalid owner signature");

        // 6. Verify Session Key Signature over the execution parameters
        bytes32 executionHash = getExecutionHash(amount, scope.recipient);
        address recoveredSessionKey = recoverSigner(executionHash, sessionKeySig);
        require(recoveredSessionKey == scope.sessionKeyAddress, "Invalid session key signature");

        // 7. Update state BEFORE external call (Checks-effects-interactions)
        lastPullTimestamp[scope.sessionKeyAddress] = block.timestamp;

        // 8. Execute external call with fee split
        uint256 feeAmount = (amount * FEE_BPS) / 10000;
        uint256 merchantAmount = amount - feeAmount;

        if (feeAmount > 0) {
            (bool feeSuccess, ) = TREASURY.call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }

        (bool success, ) = scope.recipient.call{value: merchantAmount}("");
        require(success, "ETH transfer failed");

        emit PullExecuted(scope.sessionKeyAddress, scope.recipient, amount, feeAmount);
    }

    /**
     * Formats the scope hash matching the message formatted by the frontend.
     */
    function getScopeHash(SessionKeyScope calldata scope) public view returns (bytes32) {
        string memory statement = formatScopeStatement(scope);
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", uint2str(bytes(statement).length), statement));
    }

    /**
     * Formats the execution hash for session key signature.
     */
    function getExecutionHash(uint256 amount, address recipient) public pure returns (bytes32) {
        string memory message = string(abi.encodePacked("Execute Pull: ", uint2str(amount), " to ", addressToAsciiString(recipient)));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", uint2str(bytes(message).length), message));
    }

    /**
     * Reconstructs the exact plain text scope statement formatted in JS.
     */
    function formatScopeStatement(SessionKeyScope calldata scope) public pure returns (string memory) {
        return string(abi.encodePacked(
            "Pact Session Key Delegation:\n",
            "Session Key: ", addressToAsciiString(scope.sessionKeyAddress), "\n",
            "Recipient Merchant: ", addressToAsciiString(scope.recipient), "\n",
            "Max Amount: ", scope.maxAmountStr, " ETH\n",
            "Interval: ", uint2str(scope.interval), " seconds\n",
            "Expires At: ", scope.expiryISO, "\n",
            "Pact Protocol Security Code: 7702-SESS"
        ));
    }

    // --- Cryptographic and Formatting Helpers ---

    function recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        return ecrecover(messageHash, v, r, s);
    }

    function addressToAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2+2*i] = char(hi);
            s[3+2*i] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (uint8)(48 + (_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
