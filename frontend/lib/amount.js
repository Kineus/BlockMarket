import { parseUnits, formatUnits } from "viem";

export function toWei(amount) {
  if (!amount) return 0n;
  return parseUnits(amount.toString(), 18);
}

export function fromWei(value) {
  if (!value) return "0";
  return formatUnits(BigInt(value), 18);
}

