"use client";

import Image from "next/image";
import { getExplorerUrl } from "@/lib/explorer";

interface SuiBadgeProps {
  variant?: "compact" | "full";
}

export function SuiBadge({ variant = "compact" }: SuiBadgeProps) {
  if (variant === "full") {
    return (
      <div className="sui-badge--full-wrapper">
        <a
          href={getExplorerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="sui-badge sui-badge--full"
        >
          <Image src="/sui-logo.svg" alt="Sui" width={18} height={18} />
          <span>Built on Sui</span>
        </a>
        <span className="powered-sub">
          Proof of Existence on Sui Blockchain
        </span>
      </div>
    );
  }

  return (
    <a
      href={getExplorerUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="sui-badge"
    >
      <Image src="/sui-logo.svg" alt="Sui" width={14} height={14} />
      <span>Sui</span>
    </a>
  );
}
