"use client";

import { BuyWidget } from "thirdweb/react";
import { getThirdwebClient } from "../lib/thirdweb";

interface BuyFundingWidgetProps {
  amount: string;
  purchaseData: Record<string, unknown>;
  onSuccess: () => void;
}

export function BuyFundingWidget({ amount, purchaseData, onSuccess }: BuyFundingWidgetProps) {
  try {
    return (
      <BuyWidget
        client={getThirdwebClient()}
        amount={amount}
        purchaseData={purchaseData}
        title="Fund wallet for auction settlement"
        description="Add funds with Thirdweb Pay, then complete settlement on Solana."
        onSuccess={onSuccess}
      />
    );
  } catch (error) {
    return (
      <p className="rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
        Thirdweb BuyWidget unavailable: {error instanceof Error ? error.message : "Unknown error"}
      </p>
    );
  }
}
