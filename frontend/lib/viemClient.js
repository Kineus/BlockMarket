import { createWalletClient, createPublicClient, custom, http } from "viem";
import { CELO_TESTNET, RPC_URL, CUSD_ADDRESS } from "../config/constants";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contract";

export const publicClient = createPublicClient({
  chain: CELO_TESTNET,
  transport: http(RPC_URL)
});

export async function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Wallet provider not found.");
  }
  return createWalletClient({
    chain: CELO_TESTNET,
    transport: custom(window.ethereum)
  });
}

/**
 * Sends a MiniPay-compatible legacy transaction that uses cUSD as the fee currency.
 * MiniPay currently rejects EIP-1559 params, so we explicitly tell viem to craft a
 * legacy-style transaction and include the `feeCurrency` field.
 */
export async function sendTx({ fn, args, feeCurrency = CUSD_ADDRESS }) {
  const walletClient = await getWalletClient();
  const accounts = await walletClient.getAddresses();
  if (!accounts.length) {
    throw new Error("Connect a wallet first.");
  }
  const account = accounts[0];

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: fn,
    args,
    account,
    chain: CELO_TESTNET,
    type: "legacy", // MiniPay requires legacy (non-EIP-1559) tx encoding.
    feeCurrency // Set to cUSD so gas is paid in stablecoin.
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

