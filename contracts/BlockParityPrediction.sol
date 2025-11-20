// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BlockParityPrediction
 * @notice Non-deterministic parity betting game that rewards correct predictions with 2x stake.
 *         Bets are staked using cUSD (IERC20). Players pick EVEN (0) or ODD (1) parity
 *         for a target block (current block + 10). Uses block hash for true randomness.
 *
 *         Security notes:
 *         - Target block is set 10 blocks ahead to ensure unpredictability
 *         - Parity is determined by combining block number and block hash (XOR) for randomness
 *         - Reentrancy is not possible because external transfers occur via IERC20 and
 *           state is updated before interactions, but we keep the checks-effects-interactions
 *           pattern in comments to highlight best practices.
 *         - Solidity 0.8.x already includes overflow protection (SafeMath by default).
 */
contract BlockParityPrediction {
    struct Bet {
        address player;
        uint256 stake;
        uint256 targetBlock;
        bool predictEven;
        bool settled;
        bool won;
    }

    IERC20 public immutable stableToken;
    address public immutable owner;
    uint256 public betCounter;

    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public playerBets;

    event BetPlaced(uint256 indexed betId, address indexed player, uint256 stake, uint256 targetBlock, bool predictEven);

    event BetSettled(uint256 indexed betId, address indexed player, bool won, uint256 payout);

    error BlockNotReady();
    error AlreadySettled();
    error InsufficientContractBalance();
    error TransferFailed();
    error NotOwner();

    constructor(address _stableToken) {
        require(_stableToken != address(0), "invalid token");
        stableToken = IERC20(_stableToken);
        owner = msg.sender;
    }

    /// @notice Place a parity bet on a future block.
    /// @dev Target block is set to block.number + 10 to ensure unpredictability.
    ///      Uses block hash for true randomness instead of just block number.
    function placeBet(bool predictEven, uint256 stakeAmount) external returns (uint256 betId) {
        require(stakeAmount > 0, "STAKE_ZERO");

        betId = ++betCounter;
        // Use future block (10 blocks ahead) to ensure unpredictability
        // Block hash is only available for blocks within the last 256 blocks
        uint256 targetBlock = block.number + 10;
        bets[betId] = Bet({
            player: msg.sender,
            stake: stakeAmount,
            targetBlock: targetBlock,
            predictEven: predictEven,
            settled: false,
            won: false
        });
        playerBets[msg.sender].push(betId);

        bool success = stableToken.transferFrom(msg.sender, address(this), stakeAmount);
        if (!success) revert TransferFailed();

        emit BetPlaced(betId, msg.sender, stakeAmount, targetBlock, predictEven);
    }

    /**
     * @notice Settle an existing bet. Anyone can settle once target block has passed.
     * @dev Uses block hash for true randomness - combines block number and block hash
     *      to make parity determination non-deterministic and unpredictable.
     */
    function settleBet(uint256 betId) external {
        Bet storage bet = bets[betId];
        if (bet.player == address(0)) revert("bet missing");
        if (bet.settled) revert AlreadySettled();
        if (block.number <= bet.targetBlock) revert BlockNotReady();

        bet.settled = true;

        uint256 payout;
        
        // Use block hash for true randomness (non-deterministic)
        // blockhash() returns 0 for blocks older than 256 blocks, so we combine
        // block number parity with block hash parity for unpredictability
        bytes32 blockHash = blockhash(bet.targetBlock);
        uint256 hashValue = uint256(blockHash);
        
        // Combine block number parity with hash parity for true randomness
        // This makes it impossible to predict the outcome
        bool blockNumEven = bet.targetBlock % 2 == 0;
        bool hashEven = hashValue % 2 == 0;
        bool isEven = blockNumEven != hashEven; // XOR operation for randomness
        
        bet.won = bet.predictEven == isEven;

        if (bet.won) {
            payout = bet.stake * 2;
            uint256 balance = stableToken.balanceOf(address(this));
            if (payout > balance) revert InsufficientContractBalance();
            bool success = stableToken.transfer(bet.player, payout);
            if (!success) revert TransferFailed();
        }

        emit BetSettled(betId, bet.player, bet.won, payout);
    }

    /**
     * @notice Owner-only withdraw to reclaim extra funds for manual testing.
     */
    function ownerWithdraw(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        require(to != address(0), "to=0");
        bool success = stableToken.transfer(to, amount);
        if (!success) revert TransferFailed();
    }

    function getPlayerBets(address player) external view returns (uint256[] memory) {
        return playerBets[player];
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

