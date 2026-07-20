// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SessionKeyExecutor {
    // Mapping to track the last execution timestamp per session key
    mapping(address => uint256) public lastPullTimestamp;
    
    // Mapping to track revoked session keys
    mapping(address => bool) public revokedSessionKeys;

    // Mapping to track owner nonces (for scope signature)
    mapping(address => uint256) public nonces;

    // Mapping to track session key execution nonces (for execution signature)
    mapping(address => uint256) public executionNonces;

    uint256 public constant FEE_BPS = 100;
    address public constant TREASURY = 0x6a7438A16D907f7f43044384335D9E347a04a68C; // Placeholder address

    struct SessionKeyScope {
        address sessionKeyAddress;
        address recipient;
        uint256 maxAmount;
        address token;
        uint256 interval;
        uint256 expiry;
        uint256 planId;
    }

    // EIP-712 Type Hashes
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant SESSION_KEY_SCOPE_TYPEHASH = keccak256(
        "SessionKeyScope(address sessionKeyAddress,address recipient,uint256 maxAmount,address token,uint256 interval,uint256 expiry,uint256 planId,uint256 nonce)"
    );

    bytes32 public constant PULL_EXECUTION_TYPEHASH = keccak256(
        "PullExecution(uint256 amount,address recipient,uint256 nonce)"
    );

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
     * Revokes a session key and increments owner nonce to invalidate pending delegation scope signatures.
     */
    function revoke(address sessionKey) external onlyOwner {
        revokedSessionKeys[sessionKey] = true;
        nonces[address(this)]++;
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

        // 5. Verify Owner Signature over the EIP-712 scope typed data
        bytes32 scopeHash = getScopeHash(scope, nonces[address(this)]);
        address recoveredOwner = recoverSigner(scopeHash, ownerSig);
        require(recoveredOwner == address(this), "Invalid owner signature");

        // 6. Verify Session Key Signature over the EIP-712 execution parameters
        bytes32 executionHash = getExecutionHash(amount, scope.recipient, executionNonces[scope.sessionKeyAddress]);
        address recoveredSessionKey = recoverSigner(executionHash, sessionKeySig);
        require(recoveredSessionKey == scope.sessionKeyAddress, "Invalid session key signature");

        // 7. Update state BEFORE external calls (Checks-effects-interactions)
        lastPullTimestamp[scope.sessionKeyAddress] = block.timestamp;
        executionNonces[scope.sessionKeyAddress]++;

        // 8. Execute external call with fee split
        uint256 feeAmount = (amount * FEE_BPS) / 10000;
        uint256 merchantAmount = amount - feeAmount;

        if (scope.token == address(0)) {
            // Native ETH Transfer
            if (feeAmount > 0) {
                (bool feeSuccess, ) = TREASURY.call{value: feeAmount}("");
                require(feeSuccess, "Fee transfer failed");
            }
            (bool success, ) = scope.recipient.call{value: merchantAmount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC-20 Token Transfer (SafeERC20 low-level pattern)
            if (feeAmount > 0) {
                safeTransfer(scope.token, TREASURY, feeAmount);
            }
            safeTransfer(scope.token, scope.recipient, merchantAmount);
        }

        emit PullExecuted(scope.sessionKeyAddress, scope.recipient, amount, feeAmount);
    }

    /**
     * Custom robust safeTransfer implementation to support non-standard tokens (like USDT)
     */
    function safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "PactSafeERC20: transfer failed");
    }

    /**
     * EIP-712 Domain Separator calculation
     */
    function getDomainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("Pact Protocol")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    /**
     * Formats the EIP-712 scope statement hash.
     */
    function getScopeHash(SessionKeyScope calldata scope, uint256 nonce) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            SESSION_KEY_SCOPE_TYPEHASH,
            scope.sessionKeyAddress,
            scope.recipient,
            scope.maxAmount,
            scope.token,
            scope.interval,
            scope.expiry,
            scope.planId,
            nonce
        ));
        return keccak256(abi.encodePacked("\x19\x01", getDomainSeparator(), structHash));
    }

    /**
     * Formats the EIP-712 execution hash.
     */
    function getExecutionHash(uint256 amount, address recipient, uint256 nonce) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            PULL_EXECUTION_TYPEHASH,
            amount,
            recipient,
            nonce
        ));
        return keccak256(abi.encodePacked("\x19\x01", getDomainSeparator(), structHash));
    }

    /**
     * Signature signer recovery helper
     */
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
}
