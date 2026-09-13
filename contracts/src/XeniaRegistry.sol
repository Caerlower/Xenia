// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title XeniaRegistry — slashable-stake trust/insurance for AI agents
/// @notice Host stakes collateral for a guest agent; guest pays premiums;
///         default → dispute window → slash stake to counterparty.
/// @dev Demo-tuned: dispute window is minutes, not 24h. Not production-hardened.
contract XeniaRegistry {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum BackingStatus {
        None,
        Active,
        Disputed,
        Slashed,
        Revoked
    }

    struct Agent {
        address wallet;
        bytes32 ensNode;
        bool registered;
    }

    struct Backing {
        bytes32 id;
        address agent;
        address host;
        uint256 stakeAmount;
        uint256 premiumRate;
        uint256 premiumsPaid;
        uint256 lastPremiumAt;
        BackingStatus status;
        address counterparty;
        uint256 disputeOpenedAt;
        uint256 createdAt;
    }

    // -------------------------------------------------------------------------
    // Constants / immutables
    // -------------------------------------------------------------------------

    /// @dev Demo dispute window (~3 minutes). Production would be ~24h.
    uint256 public immutable DISPUTE_WINDOW;

    /// @dev Suggested premium period for off-chain schedulers (not enforced on-chain).
    uint256 public constant PREMIUM_PERIOD = 1 hours;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    mapping(address => Agent) public agents;
    mapping(bytes32 => address) public ensNodeToAgent;
    mapping(bytes32 => Backing) public backings;
    mapping(address => bytes32[]) public agentBackingIds;
    mapping(address => bytes32[]) public hostBackingIds;

    uint256 private _backingNonce;

    // -------------------------------------------------------------------------
    // Events — information-dense for subgraph indexing
    // -------------------------------------------------------------------------

    event AgentRegistered(
        address indexed agent,
        bytes32 indexed ensNode,
        uint256 timestamp
    );

    event BackingCreated(
        bytes32 indexed backingId,
        address indexed agent,
        address indexed host,
        uint256 stakeAmount,
        uint256 premiumRate,
        uint256 timestamp
    );

    event PremiumPaid(
        bytes32 indexed backingId,
        address indexed agent,
        address indexed host,
        uint256 amount,
        uint256 premiumsPaidTotal,
        uint256 timestamp
    );

    event DefaultReported(
        bytes32 indexed backingId,
        address indexed agent,
        address indexed host,
        address counterparty,
        uint256 stakeAmount,
        uint256 disputeDeadline,
        uint256 timestamp
    );

    event StakeSlashed(
        bytes32 indexed backingId,
        address indexed agent,
        address indexed host,
        address counterparty,
        uint256 slashAmount,
        uint256 timestamp
    );

    event DisputeResolved(
        bytes32 indexed backingId,
        address indexed agent,
        address indexed host,
        bool defaulted,
        uint256 timestamp
    );

    event BackingRevoked(
        bytes32 indexed backingId,
        address indexed agent,
        address indexed host,
        uint256 stakeReturned,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error AlreadyRegistered();
    error NotRegistered();
    error InvalidStake();
    error InvalidPremium();
    error NotAgent();
    error NotHost();
    error BackingNotActive();
    error BackingNotDisputed();
    error DisputeWindowOpen();
    error DisputeWindowClosed();
    error ActiveDispute();
    error TransferFailed();
    error ZeroAddress();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param disputeWindowSeconds Seconds until a reported default can be resolved.
    constructor(uint256 disputeWindowSeconds) {
        DISPUTE_WINDOW = disputeWindowSeconds;
    }

    // -------------------------------------------------------------------------
    // Agent identity
    // -------------------------------------------------------------------------

    /// @notice Link caller wallet to an ENSv2 subname node (namehash).
    function registerAgent(bytes32 ensNode) external {
        if (agents[msg.sender].registered) revert AlreadyRegistered();
        if (ensNodeToAgent[ensNode] != address(0)) revert AlreadyRegistered();

        agents[msg.sender] = Agent({
            wallet: msg.sender,
            ensNode: ensNode,
            registered: true
        });
        ensNodeToAgent[ensNode] = msg.sender;

        emit AgentRegistered(msg.sender, ensNode, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Backing lifecycle
    // -------------------------------------------------------------------------

    /// @notice Host locks stake for a guest agent and sets the ongoing premium rate.
    function createBacking(
        address agent,
        uint256 stakeAmount,
        uint256 premiumRate
    ) external payable returns (bytes32 backingId) {
        if (agent == address(0)) revert ZeroAddress();
        if (!agents[agent].registered) revert NotRegistered();
        if (msg.value == 0 || msg.value != stakeAmount) revert InvalidStake();
        if (premiumRate == 0) revert InvalidPremium();

        backingId = keccak256(
            abi.encodePacked(agent, msg.sender, stakeAmount, premiumRate, _backingNonce++, block.timestamp)
        );

        backings[backingId] = Backing({
            id: backingId,
            agent: agent,
            host: msg.sender,
            stakeAmount: stakeAmount,
            premiumRate: premiumRate,
            premiumsPaid: 0,
            lastPremiumAt: block.timestamp,
            status: BackingStatus.Active,
            counterparty: address(0),
            disputeOpenedAt: 0,
            createdAt: block.timestamp
        });

        agentBackingIds[agent].push(backingId);
        hostBackingIds[msg.sender].push(backingId);

        emit BackingCreated(
            backingId,
            agent,
            msg.sender,
            stakeAmount,
            premiumRate,
            block.timestamp
        );
    }

    /// @notice Guest pays the agreed premium for the current period.
    function payPremium(bytes32 backingId) external payable {
        Backing storage b = backings[backingId];
        if (b.status != BackingStatus.Active) revert BackingNotActive();
        if (msg.sender != b.agent) revert NotAgent();
        if (msg.value != b.premiumRate) revert InvalidPremium();

        b.premiumsPaid += 1;
        b.lastPremiumAt = block.timestamp;

        (bool ok, ) = b.host.call{value: msg.value}("");
        if (!ok) revert TransferFailed();

        emit PremiumPaid(
            backingId,
            b.agent,
            b.host,
            msg.value,
            b.premiumsPaid,
            block.timestamp
        );
    }

    /// @notice Open a dispute window after an alleged default against a counterparty.
    function reportDefault(bytes32 backingId, address counterparty) external {
        Backing storage b = backings[backingId];
        if (b.status != BackingStatus.Active) revert BackingNotActive();
        if (counterparty == address(0)) revert ZeroAddress();

        // Anyone can report for the demo; host/agent/counterparty are typical callers.
        b.status = BackingStatus.Disputed;
        b.counterparty = counterparty;
        b.disputeOpenedAt = block.timestamp;

        uint256 deadline = block.timestamp + DISPUTE_WINDOW;

        emit DefaultReported(
            backingId,
            b.agent,
            b.host,
            counterparty,
            b.stakeAmount,
            deadline,
            block.timestamp
        );
    }

    /// @notice After the window: slash to counterparty if defaulted, else restore Active.
    function resolveDispute(bytes32 backingId, bool defaulted) external {
        Backing storage b = backings[backingId];
        if (b.status != BackingStatus.Disputed) revert BackingNotDisputed();
        if (block.timestamp < b.disputeOpenedAt + DISPUTE_WINDOW) {
            revert DisputeWindowOpen();
        }

        if (defaulted) {
            uint256 amount = b.stakeAmount;
            address victim = b.counterparty;
            address host = b.host;
            address agent = b.agent;

            b.stakeAmount = 0;
            b.status = BackingStatus.Slashed;

            (bool ok, ) = victim.call{value: amount}("");
            if (!ok) revert TransferFailed();

            emit StakeSlashed(
                backingId,
                agent,
                host,
                victim,
                amount,
                block.timestamp
            );
            emit DisputeResolved(backingId, agent, host, true, block.timestamp);
        } else {
            b.status = BackingStatus.Active;
            b.counterparty = address(0);
            b.disputeOpenedAt = 0;

            emit DisputeResolved(
                backingId,
                b.agent,
                b.host,
                false,
                block.timestamp
            );
        }
    }

    /// @notice Host withdraws stake and ends backing when there is no active dispute.
    function revokeBacking(bytes32 backingId) external {
        Backing storage b = backings[backingId];
        if (msg.sender != b.host) revert NotHost();
        if (b.status == BackingStatus.Disputed) revert ActiveDispute();
        if (b.status != BackingStatus.Active) revert BackingNotActive();

        uint256 amount = b.stakeAmount;
        address agent = b.agent;
        address host = b.host;

        b.stakeAmount = 0;
        b.status = BackingStatus.Revoked;

        (bool ok, ) = host.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit BackingRevoked(backingId, agent, host, amount, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    function getBacking(bytes32 backingId) external view returns (Backing memory) {
        return backings[backingId];
    }

    function getAgentBackingIds(address agent) external view returns (bytes32[] memory) {
        return agentBackingIds[agent];
    }

    function getHostBackingIds(address host) external view returns (bytes32[] memory) {
        return hostBackingIds[host];
    }

    /// @notice Good standing: registered, has at least one Active backing, no open dispute.
    function isInGoodStanding(address agent) external view returns (bool) {
        if (!agents[agent].registered) return false;
        bytes32[] storage ids = agentBackingIds[agent];
        bool hasActive;
        for (uint256 i = 0; i < ids.length; i++) {
            Backing storage b = backings[ids[i]];
            if (b.status == BackingStatus.Disputed) return false;
            if (b.status == BackingStatus.Active) hasActive = true;
        }
        return hasActive;
    }
}
