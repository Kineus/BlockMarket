import { defineChain } from "viem";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || 11142220);
// Default to public Celo testnet RPC if not configured
export const RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC || "https://forno.celo-sepolia.celo-testnet.org";
export const CUSD_ADDRESS = process.env.NEXT_PUBLIC_CUSD_ADDRESS || "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";

export const CELO_TESTNET = defineChain({
  id: CHAIN_ID,
  name: "Celo Testnet",
  network: "celo-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "CELO",
    symbol: "CELO"
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] }
  },
  blockExplorers: {
    default: {
      name: "Celoscan",
      url: "https://celoscan.io"
    }
  }
});

