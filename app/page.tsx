'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { FileUploader, type FileUploaderHandle } from './components/FileUploader';
import { FileVerifier, type FileVerifierHandle } from './components/FileVerifier';
import { DocumentHistory } from './components/DocumentHistory';
import { RegistryCreator } from './components/RegistryCreator';
import { Toast, useToast } from './components/Toast';
import { AnimatedBackground } from './components/AnimatedBackground';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { delay } from '@/lib/demo';

type Tab = 'upload' | 'verify' | 'history';

export default function Home() {
  const [tab, setTab] = useState<Tab>('upload');
  const [preloadedHash, setPreloadedHash] = useState('');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState('');

  const uploadRef = useRef<FileUploaderHandle>(null);
  const verifyRef = useRef<FileVerifierHandle>(null);
  const account = useCurrentAccount();

  // Listen to hash changes for navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (!hash) return;

      // Parse format: "verify?hash=xxx" or just "upload", "verify", "history"
      const [tabName, query] = hash.split('?');
      const searchParams = new URLSearchParams(query || '');
      const hashParam = searchParams.get('hash');

      if (['upload', 'verify', 'history'].includes(tabName)) {
        setTab(tabName as Tab);
        setPreloadedHash(hashParam || '');
      }
    };

    // Initial check
    handleHashChange();

    // Listen to hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle tab switching and clear URL hash for non-verify tabs
  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);

    // Clear URL hash when switching to upload or history
    if (newTab !== 'verify') {
      window.history.pushState(null, '', window.location.pathname);
      setPreloadedHash('');
    }
  };

  async function runDemo() {
    setDemoRunning(true);

    // Step 1: Upload tab - mock file upload
    handleTabChange('upload');
    setDemoStep('Creating sample document...');
    await delay(800);

    setDemoStep('Calculating SHA-256 hash...');
    await delay(1000);

    // Step 2: Store on-chain (triggers SUI wallet)
    setDemoStep('Storing hash on blockchain...');
    await delay(1200);

    // Step 3: Verify tab
    handleTabChange('verify');
    setDemoStep('Verifying on blockchain...');
    await delay(800);

    setDemoRunning(false);
    setDemoStep('');
  }

  return (
    <main>
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Header */}
      <header className="site-header">
        <div className="site-header-left">
          {/* <div className="site-logo" style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            🔐
          </div> */}
          <Image
            src="/favicon.png"
            alt="DocuLock Logo"
            width={32}
            height={32}
            className="site-logo"
          />
          <div>
            <div className="site-brand">DocuLock</div>
            <div className="site-tagline">Proof of Existence</div>
          </div>
        </div>
        <div className="site-header-right">
          <div className="site-network">
            <span className="dot"></span>
            Testnet
          </div>
          <ThemeSwitcher />
          <ConnectButton
            connectText="Connect Wallet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 20px',
              border: '1.5px solid rgba(0, 192, 255, 0.3)',
              borderRadius: '12px',
              background: 'var(--gradient)',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 0 20px rgba(0, 192, 255, 0.25)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </header>

      {/* Demo Button */}
      {account && (
        <button
          className="demo-btn"
          disabled={demoRunning}
          onClick={runDemo}
        >
          {demoRunning ? (
            <>
              <span className="tf-spinner" style={{ width: 13, height: 13 }} />
              {demoStep}
            </>
          ) : (
            '▶ Run Demo'
          )}
        </button>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab ${tab === 'upload' ? 'tab--active' : ''}`}
          onClick={() => handleTabChange('upload')}
        >
          <span>📄</span>
          Upload
        </button>
        <button
          className={`tab ${tab === 'verify' ? 'tab--active' : ''}`}
          onClick={() => handleTabChange('verify')}
        >
          <span>🔍</span>
          Verify
        </button>
        <button
          className={`tab ${tab === 'history' ? 'tab--active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          <span>📋</span>
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {tab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <RegistryCreator />
            <FileUploader />
          </div>
        )}
        {tab === 'verify' && <FileVerifier initialHash={preloadedHash} />}
        {tab === 'history' && <DocumentHistory />}
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
