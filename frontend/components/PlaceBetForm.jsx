import { motion } from "framer-motion";
import clsx from "clsx";
import { useState } from "react";
import { toWei } from "../lib/amount";

const parityOptions = [
  { label: "EVEN", value: 0 },
  { label: "ODD", value: 1 }
];

export default function PlaceBetForm({ onSubmit, targetBlock, setTargetBlock, currentBlock, isSubmitting }) {
  const [stake, setStake] = useState("0.1");
  const [selectedParity, setSelectedParity] = useState(parityOptions[0].value);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountWei = toWei(stake || "0");
    onSubmit({
      amountWei,
      choice: selectedParity
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-black/40 p-6 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between text-sm text-white/70">
        <span>Current block</span>
        <span className="font-medium text-white">{currentBlock || "..."}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-white/70">
        <label htmlFor="targetBlock">Target block</label>
        <input
          id="targetBlock"
          type="number"
          value={targetBlock}
          min={currentBlock ? currentBlock + 10 : undefined}
          onChange={(e) => setTargetBlock(Number(e.target.value))}
          className="w-28 rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-right text-white focus:outline-none"
        />
      </div>
      {currentBlock && targetBlock && targetBlock < currentBlock + 10 && (
        <p className="text-xs text-yellow-400">
          ⚠️ Target block should be at least 10 blocks ahead for unpredictability
        </p>
      )}

      <div className="space-y-3">
        <label className="text-sm text-white/70">Pick parity</label>
        <div className="grid grid-cols-2 gap-3">
          {parityOptions.map((option) => (
            <motion.button
              key={option.value}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedParity(option.value)}
              className={clsx(
                "rounded-xl border px-4 py-6 text-center text-lg font-semibold",
                selectedParity === option.value
                  ? "border-celo-primary bg-celo-primary/20 text-celo-primary"
                  : "border-white/20 text-white/70"
              )}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="stake" className="text-sm text-white/70">
          Stake (cUSD)
        </label>
        <input
          id="stake"
          type="number"
          min="0.01"
          step="0.01"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white focus:outline-none"
        />
        <p className="text-xs text-white/60">Converted to 18 decimals (wei) before sending.</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-celo-primary py-4 text-lg font-semibold text-black shadow-lg disabled:opacity-50"
      >
        {isSubmitting ? "Placing bet..." : "Place parity bet"}
      </motion.button>
    </form>
  );
}

