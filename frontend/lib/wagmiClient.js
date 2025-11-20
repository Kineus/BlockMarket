import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { CELO_TESTNET, RPC_URL } from "../config/constants";

export const wagmiConfig = createConfig({
  chains: [CELO_TESTNET],
  transports: {
    [CELO_TESTNET.id]: http(RPC_URL)
  },
  connectors: [
    injected({
      // Don't restrict to just MetaMask - allow any injected wallet
      shimDisconnect: true
    })
  ],
  // Add error handling
  ssr: false
});

