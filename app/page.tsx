"use client";

import { useState, useRef, useEffect } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { FileUploader } from "./components/FileUploader";
import { FileVerifier } from "./components/FileVerifier";
import { DocumentHistory } from "./components/DocumentHistory";
import { RegistryCreator } from "./components/RegistryCreator";
import { Toast, useToast } from "./components/Toast";
import { HeroSection } from "./components/landing/HeroSection";
import { HowItWorks } from "./components/landing/HowItWorks";
import NeoBrutalistDivider from "./components/ui/NeoBrutalistDivider";
import { delay } from "@/lib/demo";
import { calculateSHA256, hexToBytes } from "@/lib/crypto";
import { createStoreDocumentTx } from "@/lib/doculock";
import { useSuiClient } from "@mysten/dapp-kit";
import { BarChart3, FileText, Search, ClipboardList } from "lucide-react";
import AnalyticsPage from "./analytics/page";

type Tab = "analytics" | "upload" | "verify" | "history";

export default function Home() {
  const [tab, setTab] = useState<Tab>("verify");
  const [preloadedHash, setPreloadedHash] = useState("");
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState("");

  const appSectionRef = useRef<HTMLDivElement>(null);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const scrollToApp = () => {
    appSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Listen to hash changes for navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      const [tabName, query] = hash.split("?");
      const searchParams = new URLSearchParams(query || "");
      const hashParam = searchParams.get("hash");

      if (["upload", "verify", "history", "analytics"].includes(tabName)) {
        if (!account && tabName !== "verify") return;
        setTab(tabName as Tab);
        setPreloadedHash(hashParam || "");
        // Scroll to app section when navigating via hash
        setTimeout(scrollToApp, 100);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [account]);

  const handleTabChange = (newTab: Tab) => {
    if (!account && newTab !== "verify") return;
    setTab(newTab);
    if (newTab !== "verify") {
      window.history.pushState(null, "", window.location.pathname);
      setPreloadedHash("");
    }
  };

  async function runDemo() {
    setDemoRunning(true);
    scrollToApp();

    try {
      handleTabChange("upload");
      setDemoStep("Creating sample document...");
      await delay(500);

      const mockContent =
        "DocuLock Demo Document\nTimestamp: " +
        new Date().toISOString() +
        "\nThis is a sample document for demonstration.";
      const mockFile = new File(
        [mockContent],
        `demo-document-${Date.now()}.txt`,
        { type: "text/plain" },
      );
      setDemoStep("Calculating SHA-256 hash...");
      await delay(300);

      const hashHex = await calculateSHA256(mockFile);
      setDemoStep("Hash calculated. Storing on blockchain...");
      await delay(500);

      const hashBytes = hexToBytes(hashHex);
      const txb = await createStoreDocumentTx(
        hashBytes,
        mockFile.name,
        mockFile.size,
        mockFile.type,
      );

      setDemoStep("Waiting for wallet signature...");
      const result = await signAndExecute({ transaction: txb });

      let retries = 0;
      const maxRetries = 10;

      while (retries < maxRetries) {
        try {
          const txDetails = await suiClient.getTransactionBlock({
            digest: result.digest,
            options: { showEffects: true },
          });

          if (txDetails.effects?.status?.status === "success") {
            handleTabChange("verify");
            setPreloadedHash(hashHex);
            setDemoStep("Verifying on blockchain...");
            await delay(500);

            setDemoRunning(false);
            setDemoStep("");
            return;
          }
        } catch {
          retries++;
          if (retries >= maxRetries) {
            setDemoStep("Transaction timeout");
            setDemoRunning(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (error: any) {
      setDemoStep("Demo failed: " + error.message);
      setDemoRunning(false);
    }
  }

  return (
    <main>
      {/* ===== Sticky Header ===== */}
      <header className="site-header">
        <div className="site-header-left">
          {/* <Image
            src="/Doculock_Transparent_Logo.png"
            alt="DocuLock Logo"
            width={32}
            height={32}
            className="site-logo"
            priority
          /> */}
          {/* <div>
            <div className="site-tagline">Proof of Existence</div>
          </div> */}
          <div className="site-brand">DocuLock</div>
        </div>
        <div className="site-header-right">
          <ConnectButton
            connectText="Connect Wallet"
          />
        </div>
      </header>

      {/* ===== Zone 1: Landing ===== */}
      <HeroSection
        onUploadClick={() => {
          handleTabChange("upload");
          scrollToApp();
        }}
        onVerifyClick={() => {
          handleTabChange("verify");
          scrollToApp();
        }}
        onDemoClick={runDemo}
        walletConnected={!!account}
      />
      <NeoBrutalistDivider />
      <HowItWorks />
      <NeoBrutalistDivider />
      {/* <LiveActivityFeed />
      <NeoBrutalistDivider /> */}

      {/* ===== Zone 2: App ===== */}
      <div id="app-section" ref={appSectionRef}>
        {/* Demo Button */}
        {account && (
          <button className="demo-btn" disabled={demoRunning} onClick={runDemo}>
            {demoRunning ? (
              <>
                <span
                  className="tf-spinner"
                  style={{ width: 13, height: 13 }}
                />
                {demoStep}
              </>
            ) : (
              "▶ Run Demo"
            )}
          </button>
        )}

        {/* Tab Bar */}
        <div
          className="tab-bar app-tab-bar"
          role="tablist"
          aria-label="DocuLock features"
        >
          <button
            role="tab"
            aria-selected={tab === "analytics"}
            aria-controls="panel-analytics"
            id="tab-analytics"
            className={`tab ${tab === "analytics" ? "tab--active" : ""} ${!account ? "tab--disabled" : ""}`}
            onClick={() => handleTabChange("analytics")}
            {...(!account ? { tabIndex: -1, "aria-disabled": true } : {})}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button
            role="tab"
            aria-selected={tab === "upload"}
            aria-controls="panel-upload"
            id="tab-upload"
            className={`tab ${tab === "upload" ? "tab--active" : ""} ${!account ? "tab--disabled" : ""}`}
            onClick={() => handleTabChange("upload")}
            {...(!account ? { tabIndex: -1, "aria-disabled": true } : {})}
          >
            <FileText size={16} />
            Upload
          </button>
          <button
            role="tab"
            aria-selected={tab === "verify"}
            aria-controls="panel-verify"
            id="tab-verify"
            className={`tab ${tab === "verify" ? "tab--active" : ""}`}
            onClick={() => handleTabChange("verify")}
          >
            <Search size={16} />
            Verify
          </button>
          <button
            role="tab"
            aria-selected={tab === "history"}
            aria-controls="panel-history"
            id="tab-history"
            className={`tab ${tab === "history" ? "tab--active" : ""} ${!account ? "tab--disabled" : ""}`}
            onClick={() => handleTabChange("history")}
            {...(!account ? { tabIndex: -1, "aria-disabled": true } : {})}
          >
            <ClipboardList size={16} />
            History
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          <div
            role="tabpanel"
            id="panel-analytics"
            aria-labelledby="tab-analytics"
            hidden={tab !== "analytics"}
          >
            <AnalyticsPage />
          </div>
          <div
            role="tabpanel"
            id="panel-upload"
            aria-labelledby="tab-upload"
            hidden={tab !== "upload"}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <RegistryCreator />
              <FileUploader />
            </div>
          </div>
          <div
            role="tabpanel"
            id="panel-verify"
            aria-labelledby="tab-verify"
            hidden={tab !== "verify"}
          >
            <FileVerifier initialHash={preloadedHash} />
          </div>
          <div
            role="tabpanel"
            id="panel-history"
            aria-labelledby="tab-history"
            hidden={tab !== "history"}
          >
            <DocumentHistory />
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </main>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}
