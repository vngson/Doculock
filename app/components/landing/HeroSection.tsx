"use client";

import Image from "next/image";
import { NetworkStats } from "./NetworkStats";
import { SuiBadge } from "../ui/SuiBadge";
import { useEffect, useState } from "react";

interface HeroSectionProps {
  onUploadClick: () => void;
  onVerifyClick: () => void;
  onDemoClick: () => void;
}

interface Stats {
  totalDocuments: number;
  uniqueUsers: number;
}

export function HeroSection({
  onUploadClick,
  onVerifyClick,
  onDemoClick,
}: HeroSectionProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/analytics/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, []);

  return (
    <section className="landing-hero">
      <div className="landing-hero-bg"></div>

      {/* Logo watermark background */}
      {/* <div className="hero-watermark" aria-hidden="true">
        <Image
          src="/Doculock_Transparent_Logo.png"
          alt=""
          width={400}
          height={400}
          priority
        />
      </div> */}

      <div className="landing-hero-content">
        {/* <h1 className="landing-title">DocuLock</h1> */}
        {/* <p className="landing-subtitle">Proof of Existence on Sui Blockchain</p> */}
        <p className="landing-subtitle">
          Timestamp your documents on-chain.
          <br />
          Prove authenticity. Verify instantly.
        </p>

        <div className="cta-group">
          <button className="cta-primary" onClick={onUploadClick}>
            Upload Document
          </button>
          <button className="cta-outline" onClick={onVerifyClick}>
            Verify Document
          </button>
          <button className="cta-ghost" onClick={onDemoClick}>
            Try Demo
          </button>
        </div>

        <NetworkStats
          totalDocuments={stats?.totalDocuments}
          totalCreators={stats?.uniqueUsers}
        />

        <div className="landing-powered">
          <SuiBadge variant="full" />
        </div>
      </div>
    </section>
  );
}
