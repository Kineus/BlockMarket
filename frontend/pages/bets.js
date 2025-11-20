import { useState, useEffect } from "react";
import { useAccount, useBlockNumber, useChainId } from "wagmi";
import Link from "next/link";
import Header from "../components/Header";
import { publicClient, getWalletClient, sendTx } from "../lib/viemClient";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contract";
import { CELO_TESTNET, CUSD_ADDRESS } from "../config/constants";
import { fromWei } from "../lib/amount";

export default function Bets() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const [currentBlock, setCurrentBlock] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingBetId, setSettlingBetId] = useState(null);
  const wrongNetwork = isConnected && chainId !== CELO_TESTNET.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (blockNumber) {
      setCurrentBlock(Number(blockNumber));
    }
  }, [blockNumber]);

  useEffect(() => {
    if (mounted && isConnected && address && !wrongNetwork) {
      fetchBets();
    } else {
      setLoading(false);
    }
  }, [mounted, isConnected, address, wrongNetwork]);

  const fetchBets = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Get all bet IDs for this player
      const betIds = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getPlayerBets",
        args: [address]
      });

      // Fetch details for each bet
      const betsData = await Promise.all(
        betIds.map(async (betId) => {
          const betData = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "bets",
            args: [betId]
          });

          return {
            id: Number(betId),
            player: betData[0],
            stake: betData[1],
            targetBlock: Number(betData[2]),
            predictEven: betData[3],
            settled: betData[4],
            won: betData[5]
          };
        })
      );

      // Sort by bet ID (newest first)
      betsData.sort((a, b) => b.id - a.id);
      setBets(betsData);
    } catch (error) {
      console.error("Error fetching bets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleBet = async (betId) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setSettlingBetId(betId);
    try {
      const { hash, receipt } = await sendTx({
        fn: "settleBet",
        args: [betId],
        feeCurrency: CUSD_ADDRESS
      });

      console.log("Bet settled! Transaction hash:", hash);
      alert(`Bet settled successfully! Transaction: ${hash}`);
      
      // Refresh bets list
      await fetchBets();
    } catch (error) {
      console.error("Error settling bet:", error);
      alert(`Error: ${error.message || "Failed to settle bet"}`);
    } finally {
      setSettlingBetId(null);
    }
  };

  const canSettle = (bet) => {
    return !bet.settled && currentBlock && currentBlock > bet.targetBlock;
  };

  const getStatus = (bet) => {
    if (bet.settled) {
      return bet.won ? "Won" : "Lost";
    }
    if (currentBlock && currentBlock > bet.targetBlock) {
      return "Ready to Settle";
    }
    return "Pending";
  };

  const getStatusColor = (bet) => {
    if (bet.settled) {
      return bet.won ? "text-green-400" : "text-red-400";
    }
    if (currentBlock && currentBlock > bet.targetBlock) {
      return "text-yellow-400";
    }
    return "text-blue-400";
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <Header />
          <main className="mt-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">My Bets</h1>
              <p className="text-center text-gray-400">Loading...</p>
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
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">My Bets</h1>
              <Link
                href="/"
                className="text-celo-primary hover:text-celo-primary/80 text-sm font-semibold"
              >
                ← Back to Block Market
              </Link>
            </div>

            {wrongNetwork && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-6">
                <p className="text-yellow-200 font-semibold mb-1">⚠️ Wrong Network</p>
                <p className="text-sm text-yellow-300">
                  Please switch to Celo Sepolia (Chain ID: {CELO_TESTNET.id}) to view your bets.
                </p>
              </div>
            )}

            {!isConnected ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <p className="text-gray-400 mb-4">Please connect your wallet to view your bets</p>
                <Link
                  href="/"
                  className="inline-block rounded-full bg-celo-primary px-6 py-2 text-sm font-semibold text-black"
                >
                  Connect Wallet
                </Link>
              </div>
            ) : loading ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <p className="text-gray-400">Loading your bets...</p>
              </div>
            ) : bets.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <p className="text-gray-400 mb-4">You haven't placed any bets yet</p>
                <Link
                  href="/"
                  className="inline-block rounded-full bg-celo-primary px-6 py-2 text-sm font-semibold text-black"
                >
                  Place Your First Bet
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Bet ID</span>
                          <span className="font-semibold">#{bet.id}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Prediction</span>
                          <span className={`font-semibold ${bet.predictEven ? "text-blue-400" : "text-purple-400"}`}>
                            {bet.predictEven ? "EVEN" : "ODD"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Stake</span>
                          <span className="font-semibold">{fromWei(bet.stake)} cUSD</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Target Block</span>
                          <span className="font-semibold">{bet.targetBlock.toLocaleString()}</span>
                        </div>
                        {currentBlock && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Current Block</span>
                            <span className="font-semibold">{currentBlock.toLocaleString()}</span>
                          </div>
                        )}
                        {bet.settled && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Payout</span>
                            <span className={`font-semibold ${bet.won ? "text-green-400" : "text-gray-500"}`}>
                              {bet.won ? `${fromWei(bet.stake * 2n)} cUSD` : "0 cUSD"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Status</span>
                            <span className={`font-semibold ${getStatusColor(bet)}`}>
                              {getStatus(bet)}
                            </span>
                          </div>
                          {bet.settled && (
                            <div className="mt-2 p-3 rounded-lg bg-black/20">
                              <p className="text-xs text-gray-400 mb-1">Result</p>
                              <p className={`text-sm font-semibold ${bet.won ? "text-green-400" : "text-red-400"}`}>
                                {bet.won ? "🎉 You won! 2x payout" : "❌ You lost"}
                              </p>
                            </div>
                          )}
                        </div>
                        {canSettle(bet) && (
                          <button
                            onClick={() => handleSettleBet(bet.id)}
                            disabled={settlingBetId === bet.id}
                            className="w-full rounded-xl bg-celo-primary py-3 text-sm font-semibold text-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-celo-primary/90"
                          >
                            {settlingBetId === bet.id ? "Settling..." : "Settle Bet"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

