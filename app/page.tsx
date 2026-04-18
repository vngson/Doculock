'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { FileUploader, type FileUploaderHandle } from './components/FileUploader';
import { FileVerifier, type FileVerifierHandle } from './components/FileVerifier';
import { DocumentHistory } from './components/DocumentHistory';
import { RegistryCreator } from './components/RegistryCreator';
import { BatchVerifier } from './components/BatchVerifier';
import { DocumentComparison } from './components/DocumentComparison';
import { Toast, useToast } from './components/Toast';
import { AnimatedBackground } from './components/AnimatedBackground';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { delay } from '@/lib/demo';
import { calculateSHA256, hexToBytes } from '@/lib/crypto';
import { createStoreDocumentTx } from '@/lib/doculock';
import { useSuiClient } from '@mysten/dapp-kit';

type Tab = 'analytics'|'upload' | 'verify'  | 'batch' | 'compare' |  'history';

export default function Home() {
  const [tab, setTab] = useState<Tab>('analytics');
  const [preloadedHash, setPreloadedHash] = useState('');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState('');

  const uploadRef = useRef<FileUploaderHandle>(null);
  const verifyRef = useRef<FileVerifierHandle>(null);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // Listen to hash changes for navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (!hash) return;

      // Parse format: "verify?hash=xxx" or just "upload", "verify", "history"
      const [tabName, query] = hash.split('?');
      const searchParams = new URLSearchParams(query || '');
      const hashParam = searchParams.get('hash');

      if (['upload', 'verify', 'history', 'batch', 'analytics'].includes(tabName)) {
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

    // Clear URL hash when switching to upload, history, or batch
    if (newTab !== 'verify') {
      window.history.pushState(null, '', window.location.pathname);
      setPreloadedHash('');
    }
  };

  async function runDemo() {
    setDemoRunning(true);

    try {
      // Step 1: Upload tab - create mock file
      handleTabChange('upload');
      setDemoStep('Creating sample document...');
      await delay(500);

      // Create mock file
      const mockContent = 'DocuLock Demo Document\nTimestamp: ' + new Date().toISOString() + '\nThis is a sample document for demonstration.';
      const mockFile = new File([mockContent], `demo-document-${Date.now()}.txt`, { type: 'text/plain' });
      setDemoStep('Calculating SHA-256 hash...');
      await delay(300);

      // Calculate real hash
      const hashHex = await calculateSHA256(mockFile);
      setDemoStep('Hash calculated. Storing on blockchain...');
      await delay(500);

      // Step 2: Store on-chain (triggers SUI wallet)
      const hashBytes = hexToBytes(hashHex);
      const txb = await createStoreDocumentTx(
        hashBytes,
        mockFile.name,
        mockFile.size,
        mockFile.type,
      );

      setDemoStep('Waiting for wallet signature...');
      const result = await signAndExecute({ transaction: txb });
      console.log('[runDemo] Transaction submitted:', result);

      // Wait for confirmation
      let retries = 0;
      const maxRetries = 10;

      while (retries < maxRetries) {
        try {
          const txDetails = await suiClient.getTransactionBlock({
            digest: result.digest,
            options: {
              showEffects: true,
            },
          });

          if (txDetails.effects?.status?.status === 'success') {
            console.log('[runDemo] Transaction confirmed!');

            // Step 3: Verify tab
            handleTabChange('verify');
            setPreloadedHash(hashHex);
            setDemoStep('Verifying on blockchain...');
            await delay(500);

            setDemoRunning(false);
            setDemoStep('');
            return;
          }
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            console.error('[runDemo] Max retries reached');
            setDemoStep('Transaction timeout');
            setDemoRunning(false);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error: any) {
      console.error('[runDemo] Error:', error);
      setDemoStep('Demo failed: ' + error.message);
      setDemoRunning(false);
    }
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
          className={`tab ${tab === 'analytics' ? 'tab--active' : ''}`}
          onClick={() => handleTabChange('analytics')}
        >
          <span>📊</span>
          Analytics
        </button>
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
          className={`tab ${tab === 'batch' ? 'tab--active' : ''}`}
          onClick={() => handleTabChange('batch')}
        >
          <span>📁</span>
          Batch
        </button>
        <button
          className={`tab ${tab === 'compare' ? 'tab--active' : ''}`}
          onClick={() => handleTabChange('compare')}
        >
          <span>⚖️</span>
          Compare
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
        {tab === 'batch' && <BatchVerifier />}
        {tab === 'compare' && <DocumentComparison />}
        {tab === 'analytics' && (
          <div className="analytics-iframe-wrapper">
            <iframe src="/analytics" className="analytics-iframe" title="Analytics Dashboard" />
          </div>
        )}
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
