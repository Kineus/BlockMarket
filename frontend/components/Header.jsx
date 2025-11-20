import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { CELO_TESTNET } from "../config/constants";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsMiniPay(Boolean(window.ethereum?.isMiniPay));
    }
  }, []);

  useEffect(() => {
    if (isConnected && chainId !== CELO_TESTNET.id) {
      setWrongNetwork(true);
    } else {
      setWrongNetwork(false);
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    if (error) {
      setWalletError(error.message);
      console.error("Connection error:", error);
    }
  }, [error]);

  const handleConnect = async () => {
    setWalletError(null);
    if (!connectors || connectors.length === 0) {
      setWalletError("No wallet connector found. Please install MetaMask or another compatible wallet.");
      return;
    }

    if (!window.ethereum) {
      setWalletError("No wallet detected. Please install MetaMask or another compatible wallet.");
      return;
    }

    try {
      await connect({ connector: connectors[0] });
    } catch (err) {
      // Handle different error types
      let errorMessage = "Failed to connect wallet";
      
      if (err.code === 4001) {
        errorMessage = "Connection rejected. Please approve the connection in your wallet.";
      } else if (err.code === -32002) {
        errorMessage = "Connection request already pending. Please check your wallet.";
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      
      setWalletError(errorMessage);
      console.error("Connect error:", err);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: CELO_TESTNET.id });
    } catch (err) {
      // If switchChain fails, try manual network addition
      if (err.code === 4902 || err.name === "ChainNotFoundError") {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${CELO_TESTNET.id.toString(16)}`,
                chainName: CELO_TESTNET.name,
                nativeCurrency: {
                  name: CELO_TESTNET.nativeCurrency.name,
                  symbol: CELO_TESTNET.nativeCurrency.symbol,
                  decimals: CELO_TESTNET.nativeCurrency.decimals,
                },
                rpcUrls: [CELO_TESTNET.rpcUrls.default.http[0]],
                blockExplorerUrls: [CELO_TESTNET.blockExplorers?.default?.url],
              },
            ],
          });
          // After adding, switch to it
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CELO_TESTNET.id.toString(16)}` }],
          });
        } catch (addErr) {
          setWalletError(`Failed to add/switch network: ${addErr.message}`);
          console.error("Network switch error:", addErr);
        }
      } else {
        setWalletError(`Failed to switch network: ${err.message}`);
        console.error("Network switch error:", err);
      }
    }
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  // Prevent hydration mismatch - show consistent content on first render
  const showConnectButton = mounted && !isMiniPay;
  const showConnected = mounted && isConnected;

  return (
    <header className="flex items-center justify-between py-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400">Block Market</p>
        <h1 className="text-2xl font-semibold text-white">Predict the Next Block</h1>
      </div>
      {showConnectButton && (
        <div className="flex flex-col items-end gap-2">
          {walletError && (
            <p className="text-xs text-red-400 max-w-xs text-right">{walletError}</p>
          )}
          {wrongNetwork && showConnected && (
            <button
              onClick={handleSwitchNetwork}
              disabled={isSwitching}
              className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-semibold text-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSwitching ? "Switching..." : "Switch to Celo"}
            </button>
          )}
          {showConnected && !wrongNetwork ? (
            <button
              onClick={() => disconnect()}
              className="rounded-full border border-white/30 px-4 py-2 text-sm text-white"
            >
              {shortAddress}
            </button>
          ) : showConnected && wrongNetwork ? null : (
            <button
              disabled={isPending || !connectors || connectors.length === 0}
              onClick={handleConnect}
              className="rounded-full bg-celo-primary px-4 py-2 text-sm font-semibold text-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      )}
    </header>
  );
}

