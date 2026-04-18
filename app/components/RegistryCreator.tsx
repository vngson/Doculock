'use client';

import { useState, useEffect } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { createRegistryTx } from '@/lib/doculock';
import { saveRegistryId, getRegistryId } from '@/lib/config';

// Helper function to retry fetching transaction details with backoff
async function retryTransactionFetch(
  suiClient: any,
  digest: string,
  maxRetries = 5,
  delay = 2000,
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[RegistryCreator] Fetching transaction details (attempt ${i + 1}/${maxRetries})...`);
      const txDetails = await suiClient.getTransactionBlock({
        digest,
        options: {
          showObjectChanges: true,
        },
      });
      return txDetails;
    } catch (err: any) {
      console.log(`[RegistryCreator] Fetch attempt ${i + 1} failed:`, err.message);
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

type State = 'checking' | 'no-wallet' | 'creating' | 'ready' | 'error';

export function RegistryCreator() {
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [state, setState] = useState<State>('checking');
  const [error, setError] = useState<string>('');
  const [registryId, setRegistryId] = useState<string>('');

  const handleCreateRegistry = async () => {
    if (!account) return;

    setState('creating');
    setError('');

    try {
      console.log('[RegistryCreator] Starting to create registry...');
      console.log('[RegistryCreator] Connected account:', account.address);

      const txb = await createRegistryTx();
      console.log('[RegistryCreator] Transaction block created:', txb);

      console.log('[RegistryCreator] Signing and executing transaction...');

      const result = await signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (result) => {
            console.log('[RegistryCreator] Transaction successful:', result);
            console.log('[RegistryCreator] Full result:', JSON.stringify(result, null, 2));

            if (result.digest) {
              console.log('[RegistryCreator] Transaction digest:', result.digest);

              try {
                const txDetails = await retryTransactionFetch(suiClient, result.digest);

                console.log('[RegistryCreator] Transaction details:', txDetails);
                console.log('[RegistryCreator] Object changes:', txDetails.objectChanges);

                const created = txDetails.objectChanges?.find(
                  (change: any) => change.type === 'created'
                ) as any;
                console.log('[RegistryCreator] Created object:', created);

                if (created && created.objectId) {
                  console.log('[RegistryCreator] Registry ID:', created.objectId);
                  setRegistryId(created.objectId);
                  saveRegistryId(created.objectId);
                  setState('ready');
                } else {
                  console.error('[RegistryCreator] No object ID found in created object');
                  setError('Registry created but no ID found. Check console for details.');
                  setState('error');
                }
              } catch (err: any) {
                console.error('[RegistryCreator] Error fetching transaction details:', err);
                setError(`Transaction successful but failed to fetch registry ID: ${err.message}`);
                setState('error');
              }
            } else {
              console.error('[RegistryCreator] No transaction digest found');
              setError('Transaction failed: No digest returned.');
              setState('error');
            }
          },
          onError: (error) => {
            console.error('[RegistryCreator] Transaction error:', error);
            setError(`Transaction failed: ${error.message || 'Unknown error'}`);
            setState('error');
          },
        },
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[RegistryCreator] Error creating registry:', err);
      setError(`Failed to create registry: ${errorMessage}`);
      setState('error');
    }
  };

  useEffect(() => {
    const existingRegistryId = getRegistryId();
    if (existingRegistryId) {
      setRegistryId(existingRegistryId);
      setState('ready');
    } else {
      setState('no-wallet');
    }
  }, []);

  useEffect(() => {
    if (account && state === 'no-wallet') {
      handleCreateRegistry();
    }
  }, [account, state]);

  const handleClearRegistry = () => {
    localStorage.removeItem('doculock-registry-id');
    setRegistryId('');
    setState('no-wallet');
  };

  const handleRetry = () => {
    setError('');
    handleCreateRegistry();
  };

  if (state === 'checking') {
    return (
      <div className="tf-card" style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '20px',
        }}>
          <div className="tf-spinner" style={{ width: 32, height: 32 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Checking registry status...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tf-card">
      <div className="tf-header">
        <div className="tf-icon">
          {state === 'ready' ? '✅' :
           state === 'creating' ? '🏗️' :
           state === 'error' ? '❌' :
           '🏗️'}
        </div>
        <div>
          <div className="tf-title">
            {state === 'ready' ? 'Registry Ready' :
             state === 'creating' ? 'Creating Registry...' :
             state === 'error' ? 'Registry Error' :
             'Setup Required'}
          </div>
          <div className="tf-subtitle">
            {state === 'ready' ? 'Document storage is ready' :
             state === 'creating' ? 'Initializing blockchain storage...' :
             state === 'error' ? 'Failed to initialize registry' :
             'One-time setup for document storage'}
          </div>
        </div>
      </div>

      {state === 'no-wallet' && (
        <>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            marginBottom: '20px',
          }}>
            Connect your wallet to automatically set up the document registry on-chain.
            This is a one-time setup step.
          </p>

          <div style={{
            padding: '14px 18px',
            background: 'var(--warning-bg)',
            border: '1.5px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--warning)',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            Please connect your wallet using the Connect button in the header.
          </div>
        </>
      )}

      {state === 'creating' && (
        <div style={{
          padding: '20px',
          background: 'rgba(0, 192, 255, 0.1)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(0, 192, 255, 0.3)',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div className="tf-spinner" style={{ width: 20, height: 20 }} />
            <div style={{
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}>
              Creating registry on blockchain...
            </div>
          </div>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            lineHeight: '1.6',
            margin: 0,
          }}>
            Please confirm the transaction in your wallet. This only needs to be done once.
          </p>
        </div>
      )}

      {state === 'error' && (
        <>
          <div className="tf-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error || 'Failed to create registry. Please try again.'}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={handleRetry}
              className="tf-submit"
              style={{ flex: 1 }}
            >
              Retry
            </button>
            <button
              onClick={handleClearRegistry}
              className="vf-reset"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Reset
            </button>
          </div>
        </>
      )}

      {state === 'ready' && (
        <>
          <div style={{
            padding: '16px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            marginBottom: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              color: '#22c55e',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Registry is active and ready to use
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              margin: 0,
            }}>
              You can now upload as many documents as you want. Each document will be securely timestamped on the blockchain.
            </p>
          </div>

          {registryId && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              wordBreak: 'break-all',
              marginBottom: '20px',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}>
              <div style={{
                fontSize: '0.7rem',
                opacity: 0.6,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#22c55e',
              }}>
                Registry ID
              </div>
              {registryId}
            </div>
          )}

          <button
            onClick={handleClearRegistry}
            className="vf-reset"
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'var(--gradient)',
              color: 'white',
              border: 'none',
              boxShadow: '0 0 20px rgba(0, 192, 255, 0.25)',
            }}
          >
            Reset Registry (Demo Only)
          </button>
        </>
      )}
    </div>
  );
}
