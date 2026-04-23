'use client';

import { useState, useEffect } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { createRegistryTx } from '@/lib/doculock';
import { saveRegistryId, getRegistryId } from '@/lib/config';
import { CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

// Helper function to retry fetching transaction details with backoff
async function retryTransactionFetch(
  suiClient: any,
  digest: string,
  maxRetries = 5,
  delay = 2000,
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const txDetails = await suiClient.getTransactionBlock({
        digest,
        options: {
          showObjectChanges: true,
        },
      });
      return txDetails;
    } catch (err: any) {
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
      const txb = await createRegistryTx();

      const result = await signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (result) => {
            if (result.digest) {
              try {
                const txDetails = await retryTransactionFetch(suiClient, result.digest);

                const created = txDetails.objectChanges?.find(
                  (change: any) => change.type === 'created'
                ) as any;

                if (created && created.objectId) {
                  setRegistryId(created.objectId);
                  saveRegistryId(created.objectId);
                  setState('ready');
                } else {
                  setError('Registry created but no ID found.');
                  setState('error');
                }
              } catch (err: any) {
                setError(`Transaction successful but failed to fetch registry ID: ${err.message}`);
                setState('error');
              }
            } else {
              setError('Transaction failed: No digest returned.');
              setState('error');
            }
          },
          onError: (error) => {
            setError(`Transaction failed: ${error.message || 'Unknown error'}`);
            setState('error');
          },
        },
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
        <div className="rc-checking">
          <div className="tf-spinner rc-checking-spinner" />
          <div className="rc-checking-text">
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
          {state === 'ready' ? <CheckCircle size={20} /> :
           state === 'creating' ? <Loader size={20} className="spin" /> :
           state === 'error' ? <XCircle size={20} /> :
           <Loader size={20} className="spin" />}
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
          <p className="rc-description">
            Connect your wallet to automatically set up the document registry on-chain.
            This is a one-time setup step.
          </p>

          <div className="rc-warn-box">
            <AlertTriangle size={18} />
            Please connect your wallet using the Connect button in the header.
          </div>
        </>
      )}

      {state === 'creating' && (
        <div className="rc-creating-box">
          <div className="rc-creating-header">
            <div className="tf-spinner rc-creating-spinner" />
            <div className="rc-creating-label">
              Creating registry on blockchain...
            </div>
          </div>
          <p className="rc-creating-text">
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

          <div className="rc-actions">
            <button
              onClick={handleRetry}
              className="tf-submit"
            >
              Retry
            </button>
            <button
              onClick={handleClearRegistry}
              className="vf-reset"
            >
              Reset
            </button>
          </div>
        </>
      )}

      {state === 'ready' && (
        <>
          <div className="rc-ready-box">
            <div className="rc-ready-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Registry is active and ready to use
            </div>
            <p className="rc-ready-text">
              You can now upload as many documents as you want. Each document will be securely timestamped on the blockchain.
            </p>
          </div>

          {registryId && (
            <div className="rc-registry-id">
              <div className="rc-registry-id-label">
                Registry ID
              </div>
              {registryId}
            </div>
          )}

          <button
            onClick={handleClearRegistry}
            className="vf-reset rc-reset-btn"
          >
            Reset Registry (Demo Only)
          </button>
        </>
      )}
    </div>
  );
}
