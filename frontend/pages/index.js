import { useState, useEffect } from "react";
import { useAccount, useBlockNumber, useChainId } from "wagmi";
import Link from "next/link";
import Header from "../components/Header";
import PlaceBetForm from "../components/PlaceBetForm";
import { sendTx, getWalletClient, publicClient } from "../lib/viemClient";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contract";
import { CUSD_ADDRESS, CELO_TESTNET, RPC_URL } from "../config/constants";

// Standard ERC20 ABI for approve and allowance
const ERC20_ABI = [
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  }
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber, error: blockNumberError } = useBlockNumber({ 
    watch: true,
    query: {
      enabled: true,
      retry: 3
    }
  });
  const [currentBlock, setCurrentBlock] = useState(null);
  const [targetBlock, setTargetBlock] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockError, setBlockError] = useState(null);
  
  const wrongNetwork = isConnected && chainId !== CELO_TESTNET.id;

  // Ensure we only render client-side content after mount to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fallback: fetch block number directly if wagmi hook fails
  useEffect(() => {
    const fetchBlockNumber = async () => {
      // Check if RPC URL is configured
      if (RPC_URL.includes("example") || RPC_URL.includes("placeholder")) {
        setBlockError("RPC URL not configured. Please set NEXT_PUBLIC_CELO_RPC in your .env file");
        return;
      }

      try {
        const block = await publicClient.getBlockNumber();
        const blockNum = Number(block);
        setCurrentBlock(blockNum);
        // Set default target to 10 blocks ahead for unpredictability (matches contract)
        if (!targetBlock || targetBlock <= blockNum) {
          setTargetBlock(blockNum + 10);
        }
        setBlockError(null);
      } catch (error) {
        console.error("Error fetching block number:", error);
        setBlockError(`Failed to fetch block: ${error.message}`);
      }
    };

    // If wagmi hook has data, use it
    if (blockNumber) {
      const block = Number(blockNumber);
      setCurrentBlock(block);
      // Set default target to 10 blocks ahead for unpredictability (matches contract)
      if (!targetBlock || targetBlock <= block) {
        setTargetBlock(block + 10);
      }
      setBlockError(null);
    } else if (blockNumberError || !blockNumber) {
      // Fallback to direct RPC call
      fetchBlockNumber();
      // Set up polling as fallback
      const interval = setInterval(fetchBlockNumber, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [blockNumber, blockNumberError, targetBlock]);

  const handlePlaceBet = async ({ amountWei, choice }) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    // Check if wallet is on the correct network
    if (typeof window !== "undefined" && window.ethereum) {
      const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
      const targetChainId = `0x${CELO_TESTNET.id.toString(16)}`;
      if (currentChainId !== targetChainId) {
        alert(`Please switch to Celo Sepolia network (Chain ID: ${CELO_TESTNET.id})`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // First, approve cUSD spending
      const walletClient = await getWalletClient();
      const accounts = await walletClient.getAddresses();
      const account = accounts[0];

      // Check current allowance
      const allowance = await publicClient.readContract({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACT_ADDRESS]
      });

      if (allowance < amountWei) {
        // Approve cUSD
        const approveHash = await walletClient.writeContract({
          address: CUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, amountWei],
          account,
          chain: CELO_TESTNET,
          type: "legacy",
          feeCurrency: CUSD_ADDRESS
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Validate target block is at least 10 blocks ahead (contract requirement)
      if (targetBlock && currentBlock && targetBlock < currentBlock + 10) {
        alert("Target block must be at least 10 blocks ahead for unpredictability");
        setIsSubmitting(false);
        return;
      }

      // Place the bet
      // Note: Contract sets target to block.number + 10, but we pass the user's choice
      // The contract will override with its own calculation for security
      const { hash, receipt } = await sendTx({
        fn: "placeBet",
        args: [choice === 0, amountWei], // predictEven, stakeAmount
        feeCurrency: CUSD_ADDRESS
      });

      console.log("Bet placed! Transaction hash:", hash);
      alert(`Bet placed successfully! Transaction: ${hash}`);
    } catch (error) {
      console.error("Error placing bet:", error);
      alert(`Error: ${error.message || "Failed to place bet"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent hydration mismatch by showing consistent content on first render
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <Header />
          <main className="mt-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-celo-primary/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
                <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-celo-primary to-purple-400 bg-clip-text text-transparent">
                  Block Market
                </h1>
                <p className="text-gray-300 leading-relaxed mb-2">
                  Predict whether a future blockchain block will be <span className="font-semibold text-blue-400">EVEN</span> or <span className="font-semibold text-purple-400">ODD</span>. 
                  Win 2x your stake with correct predictions on the Celo network.
                </p>
                <p className="text-sm text-gray-400">
                  🎲 Fair & Transparent • 🔒 Non-Deterministic • 💰 2x Payout on Win
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8">
                <h2 className="text-xl font-semibold mb-4">Current Block</h2>
                <p className="text-4xl font-bold text-celo-primary">Loading...</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <p className="text-gray-400">Please connect your wallet to place a bet</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <Header />
        
        <main className="mt-12">
          <div className="max-w-2xl mx-auto">
            {/* Description Section */}
            <div className="bg-gradient-to-r from-celo-primary/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
              <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-celo-primary to-purple-400 bg-clip-text text-transparent">
                Block Market
              </h1>
              <p className="text-gray-300 leading-relaxed mb-2">
                Predict whether a future blockchain block will be <span className="font-semibold text-blue-400">EVEN</span> or <span className="font-semibold text-purple-400">ODD</span>. 
                Win 2x your stake with correct predictions on the Celo network.
              </p>
              <p className="text-sm text-gray-400">
                🎲 Fair & Transparent • 🔒 Non-Deterministic • 💰 2x Payout on Win
              </p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Place a Bet</h2>
              {isConnected && !wrongNetwork && (
                <Link
                  href="/bets"
                  className="text-celo-primary hover:text-celo-primary/80 text-sm font-semibold"
                >
                  View My Bets →
                </Link>
              )}
            </div>

            {wrongNetwork && mounted && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-6">
                <p className="text-yellow-200 font-semibold mb-1">⚠️ Wrong Network</p>
                <p className="text-sm text-yellow-300">
                  Please switch to Celo Sepolia (Chain ID: {CELO_TESTNET.id}) to use this app.
                  Use the "Switch to Celo" button in the header.
                </p>
              </div>
            )}
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8">
              <h2 className="text-xl font-semibold mb-4">Current Block</h2>
              {blockError ? (
                <div>
                  <p className="text-2xl font-bold text-red-400 mb-2">Error</p>
                  <p className="text-sm text-red-300">{blockError}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Please configure NEXT_PUBLIC_CELO_RPC in your .env file (e.g., https://forno.celo-testnet.org)
                  </p>
                </div>
              ) : (
                <p className="text-4xl font-bold text-celo-primary">
                  {currentBlock !== null ? currentBlock.toLocaleString() : "Loading..."}
                </p>
              )}
            </div>

            {isConnected && !wrongNetwork ? (
              <PlaceBetForm
                onSubmit={handlePlaceBet}
                targetBlock={targetBlock}
                setTargetBlock={setTargetBlock}
                currentBlock={currentBlock}
                isSubmitting={isSubmitting}
              />
            ) : isConnected && wrongNetwork ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <p className="text-gray-400">Please switch to Celo Sepolia network to place a bet</p>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <p className="text-gray-400">Please connect your wallet to place a bet</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

