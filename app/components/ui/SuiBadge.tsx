"use client";

import { getExplorerUrl } from "@/lib/explorer";

interface SuiBadgeProps {
  variant?: "compact" | "full";
}

function SuiLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 5.5 10.2 5.5 14.5C5.5 18.1 8.4 21 12 21C15.6 21 18.5 18.1 18.5 14.5C18.5 10.2 12 2 12 2ZM12 19C9.5 19 7.5 17 7.5 14.5C7.5 11.8 10.2 7.5 12 4.8C13.8 7.5 16.5 11.8 16.5 14.5C16.5 17 14.5 19 12 19Z"
        fill="currentColor"
      />
    </svg>
  );
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
          <SuiLogo size={18} />
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
      <SuiLogo size={14} />
      <span>Sui</span>
    </a>
  );
}
