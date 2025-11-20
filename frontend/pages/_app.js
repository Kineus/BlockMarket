import "../styles/globals.css";
import Head from "next/head";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../lib/wagmiClient";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Suppress extension authorization and connection errors
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const message = event.message || "";
    if (
      message.includes("has not been authorized") ||
      message.includes("Failed to connect to MetaMask") ||
      message.includes("MetaMask") ||
      message.includes("wallet")
    ) {
      event.preventDefault();
      console.warn("Wallet connection issue:", message);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason?.message || reason?.toString() || "";
    if (
      message.includes("has not been authorized") ||
      message.includes("Failed to connect to MetaMask") ||
      message.includes("User rejected") ||
      message.includes("User denied") ||
      message.includes("wallet")
    ) {
      event.preventDefault();
      console.warn("Wallet connection rejection:", message);
    }
  });
}

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Block Market - Predict Block Parity on Celo</title>
        <meta name="description" content="Predict whether future blockchain blocks will be EVEN or ODD. Win 2x your stake with correct predictions on the Celo network." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}

