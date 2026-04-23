"use client";

import { NetworkStats } from "./NetworkStats";
import { SuiBadge } from "../ui/SuiBadge";

interface HeroSectionProps {
  onUploadClick: () => void;
  onVerifyClick: () => void;
  onDemoClick: () => void;
  walletConnected: boolean;
}

export function HeroSection({
  onUploadClick,
  onVerifyClick,
  onDemoClick,
  walletConnected,
}: HeroSectionProps) {
  return (
    <section className="landing-hero">
      <div className="landing-hero-bg"></div>

      <div className="landing-hero-content">
        <p className="landing-subtitle">
          Timestamp your documents on-chain.
          <br />
          Prove authenticity. Verify instantly.
        </p>

        <div className="cta-group">
          <button
            className={` ${!walletConnected ? "cta--disabled cta-outline" : "cta-primary"}`}
            onClick={walletConnected ? onUploadClick : undefined}
            disabled={!walletConnected}
          >
            Upload Document
          </button>
          <button 
            className={` ${!walletConnected ? "cta-primary" : " cta-outline"}`} onClick={onVerifyClick}>
            Verify Document
          </button>
          <button
            className={`cta-outline ${!walletConnected ? "cta--disabled" : ""}`}
            onClick={walletConnected ? onDemoClick : undefined}
            disabled={!walletConnected}
          >
            ▶ Try Demo
          </button>
        </div>

        <NetworkStats />

        <div className="landing-powered">
          <SuiBadge variant="full" />
        </div>
      </div>
    </section>
  );
}
