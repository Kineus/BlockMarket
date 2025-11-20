# Betting Logic Explanation

## Overview
This is a **Block Parity Prediction** game where players bet on whether a specific blockchain block number will be **EVEN** or **ODD**. Players stake cUSD (Celo Dollar) and win 2x their stake if they predict correctly.

---

## 🎯 How to Place a Bet

### Step 1: User Input (Frontend)
1. **Connect Wallet**: User connects their wallet (MetaMask, MiniPay, etc.)
2. **Select Prediction**: Choose either **EVEN** or **ODD**
3. **Set Target Block**: Choose which block number to predict (defaults to current block + 1)
4. **Enter Stake**: Enter the amount of cUSD to bet (e.g., 0.1 cUSD)

### Step 2: Token Approval (Frontend)
Before placing the bet, the frontend checks if the contract has permission to spend your cUSD:
- If allowance is insufficient, it calls `approve()` on the cUSD token contract
- This allows the betting contract to transfer your stake

### Step 3: Place Bet Transaction (Smart Contract)
When you click "Place Bet", the frontend calls the smart contract's `placeBet()` function:

```solidity
function placeBet(bool predictEven, uint256 stakeAmount) external returns (uint256 betId)
```

**What happens:**
1. **Validates stake**: Ensures `stakeAmount > 0`
2. **Creates bet record**: 
   - Generates a unique `betId` (increments `betCounter`)
   - Sets `targetBlock = block.number + 1` (the NEXT block)
   - Stores your prediction (`predictEven = true` for EVEN, `false` for ODD)
   - Marks bet as `settled = false` and `won = false`
3. **Transfers stake**: Transfers your cUSD from your wallet to the contract
4. **Records bet**: Adds the bet ID to your `playerBets` array
5. **Emits event**: `BetPlaced` event is emitted with all bet details

**Example:**
- Current block: 1000
- You bet: EVEN, 0.1 cUSD
- Target block: 1001 (automatically set to current + 1)
- Your stake (0.1 cUSD) is locked in the contract

---

## 🎲 How Parity is Determined

**Parity** means whether a number is **even** or **odd**:
- **EVEN**: Divisible by 2 (e.g., 2, 4, 6, 8, 1000, 1002)
- **ODD**: Not divisible by 2 (e.g., 1, 3, 5, 7, 1001, 1003)

In Solidity, we check parity using the modulo operator:
```solidity
bool isEven = blockNumber % 2 == 0;  // Returns true if even, false if odd
```

**Examples:**
- Block 1000: `1000 % 2 = 0` → **EVEN** ✅
- Block 1001: `1001 % 2 = 1` → **ODD** ✅
- Block 1002: `1002 % 2 = 0` → **EVEN** ✅

---

## ⏰ How Bets are Settled

### When Can a Bet Be Settled?
A bet can be settled **only after** the target block has been mined:
- If target block is 1001, you must wait until block 1002 or later
- The contract checks: `block.number > bet.targetBlock`

### Settlement Process
Anyone can call `settleBet(betId)` once the target block has passed:

```solidity
function settleBet(uint256 betId) external {
    // 1. Validations
    if (bet.player == address(0)) revert("bet missing");
    if (bet.settled) revert AlreadySettled();
    if (block.number <= bet.targetBlock) revert BlockNotReady();
    
    // 2. Mark as settled
    bet.settled = true;
    
    // 3. Determine result
    bool isEven = bet.targetBlock % 2 == 0;
    bet.won = bet.predictEven == isEven;
    
    // 4. Pay out if won
    if (bet.won) {
        payout = bet.stake * 2;  // 2x your stake
        stableToken.transfer(bet.player, payout);
    }
}
```

**Step-by-step:**
1. **Check target block**: Verifies current block > target block
2. **Calculate actual parity**: `isEven = targetBlock % 2 == 0`
3. **Compare predictions**: 
   - If you predicted EVEN and block is EVEN → **WIN** ✅
   - If you predicted ODD and block is ODD → **WIN** ✅
   - Otherwise → **LOSE** ❌
4. **Payout if won**: Transfer 2x stake back to player
5. **Mark as settled**: Set `settled = true` and `won = true/false`

---

## 🏆 Win/Loss Logic

### Winning Conditions
You **WIN** if:
```
Your Prediction == Actual Block Parity
```

**Examples:**
- You bet **EVEN** on block 1000 → Block 1000 is EVEN → **WIN** ✅
- You bet **ODD** on block 1001 → Block 1001 is ODD → **WIN** ✅

### Losing Conditions
You **LOSE** if:
```
Your Prediction != Actual Block Parity
```

**Examples:**
- You bet **EVEN** on block 1001 → Block 1001 is ODD → **LOSE** ❌
- You bet **ODD** on block 1000 → Block 1000 is EVEN → **LOSE** ❌

### Payout Structure
- **If you WIN**: Receive **2x your stake**
  - Bet 0.1 cUSD → Win 0.2 cUSD (you get back your 0.1 + 0.1 profit)
- **If you LOSE**: Receive **0 cUSD**
  - Your stake stays in the contract (used to pay winners)

---

## 📊 Complete Example Flow

### Example 1: Winning Bet
1. **Current block**: 1000
2. **You place bet**: 
   - Prediction: **EVEN**
   - Stake: **0.1 cUSD**
   - Target block: **1001** (auto-set to current + 1)
3. **Block 1001 is mined**: Parity = ODD
4. **You settle the bet**: 
   - Your prediction: EVEN
   - Actual result: ODD
   - **Result: LOSE** ❌
   - **Payout: 0 cUSD** (you lose your 0.1 cUSD stake)

### Example 2: Losing Bet
1. **Current block**: 1000
2. **You place bet**: 
   - Prediction: **ODD**
   - Stake: **0.1 cUSD**
   - Target block: **1001**
3. **Block 1001 is mined**: Parity = ODD
4. **You settle the bet**: 
   - Your prediction: ODD
   - Actual result: ODD
   - **Result: WIN** ✅
   - **Payout: 0.2 cUSD** (2x your stake)

---

## 🔒 Security & Fairness

### Why This is Fair
1. **Block numbers are public**: Anyone can verify the parity of any block
2. **Deterministic**: Block parity is determined by the blockchain, not by the contract
3. **Transparent**: All bets and results are on-chain and verifiable
4. **No manipulation**: The contract can't change block numbers (they're set by miners/validators)

### Important Notes
- **Target block is set at placement**: The contract uses `block.number + 1` when you place the bet
- **Settlement timing**: You must wait until the target block is mined before settling
- **Anyone can settle**: Once ready, anyone can call `settleBet()` (not just the bettor)
- **Contract balance**: The contract must have enough cUSD to pay winners (2x stakes)

---

## 💡 Key Takeaways

1. **Betting**: Predict if a specific block number will be EVEN or ODD
2. **Stake**: Lock your cUSD in the contract
3. **Settlement**: Wait for target block, then settle to determine result
4. **Winning**: Match your prediction with actual block parity → Get 2x stake
5. **Losing**: Mismatch → Lose your stake

The game is simple, transparent, and provably fair because block numbers are public and deterministic!

