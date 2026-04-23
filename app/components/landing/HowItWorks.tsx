"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Fingerprint,
  Database,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    title: "Upload",
    description: "Select any file from your device",
    icon: <Upload size={32} />,
  },
  {
    title: "Hash",
    description: "SHA-256 hash is generated",
    icon: <Fingerprint size={32} />,
  },
  {
    title: "Store",
    description: "Saved on Sui blockchain",
    icon: <Database size={32} />,
  },
  {
    title: "Verify",
    description: "Confirm authenticity on-chain",
    icon: <ShieldCheck size={32} />,
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="how-it-works" ref={sectionRef}>
      {/* <h2 className="section-title">How it Works</h2>
      <div className="steps-container">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="step"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.6s ${i * 0.15}s, transform 0.6s ${i * 0.15}s`,
            }}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-title">{step.title}</div>
            <div className="step-desc">{step.description}</div>
            {i < steps.length - 1 && (
              <div className="step-arrow" aria-hidden="true">
                <ArrowRight size={20} />
              </div>
            )}
          </div>
        ))}
      </div> */}
      <img src="/HowItWork.png" className="how-it-works-img" alt="How it works" />
    </section>
  );
}
