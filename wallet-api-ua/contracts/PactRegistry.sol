// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PactRegistry {
    struct Plan {
        string name;
        address token;
        uint256 price;
        uint256 intervalSeconds;
        address payoutAddress;
        bool active;
    }

    // planId counter
    uint256 public nextPlanId = 1;

    // Access control variables
    address public owner;
    mapping(address => bool) public authorizedCallers;

    // mappings
    mapping(uint256 => Plan) public plans;
    mapping(uint256 => address) public planMerchants;
    mapping(uint256 => mapping(address => bool)) public isActiveSubscriber;

    // Events
    event PlanCreated(uint256 indexed planId, address indexed merchant, string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress);
    event PlanStatusChanged(uint256 indexed planId, bool active);
    event Subscribed(uint256 indexed planId, address indexed subscriber, address indexed executorContract);
    event PullExecuted(uint256 indexed planId, address indexed subscriber, uint256 amount, uint256 timestamp);
    event SubscriptionRevoked(uint256 indexed planId, address indexed subscriber);
    event AuthorizedCallerSet(address indexed caller, bool authorized);

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedCallers[msg.sender], "Not authorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedCallers[msg.sender] = true;
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerSet(caller, authorized);
    }

    function createPlan(
        string calldata name,
        address token,
        uint256 price,
        uint256 intervalSeconds,
        address payoutAddress
    ) external returns (uint256) {
        uint256 planId = nextPlanId++;
        plans[planId] = Plan({
            name: name,
            token: token,
            price: price,
            intervalSeconds: intervalSeconds,
            payoutAddress: payoutAddress,
            active: true
        });
        planMerchants[planId] = msg.sender;
        emit PlanCreated(planId, msg.sender, name, token, price, intervalSeconds, payoutAddress);
        return planId;
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    function setPlanActive(uint256 planId, bool active) external {
        require(planMerchants[planId] == msg.sender, "Only plan merchant can toggle status");
        plans[planId].active = active;
        emit PlanStatusChanged(planId, active);
    }

    function subscribe(uint256 planId, address executorContract) external {
        require(plans[planId].active, "Plan not active");
        isActiveSubscriber[planId][msg.sender] = true;
        emit Subscribed(planId, msg.sender, executorContract);
    }

    function logPull(uint256 planId, address subscriber, uint256 amount) external onlyAuthorized {
        emit PullExecuted(planId, subscriber, amount, block.timestamp);
    }

    function logRevoke(uint256 planId, address subscriber) external onlyAuthorized {
        isActiveSubscriber[planId][subscriber] = false;
        emit SubscriptionRevoked(planId, subscriber);
    }
}
