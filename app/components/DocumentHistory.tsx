'use client';

import { useEffect, useState } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { getDocumentEvents, type DocumentStoredEvent } from '@/lib/doculock';
import { formatFileSize } from '@/lib/file';
import { DocumentCard } from './DocumentCard';
import { EmptyState } from './ui/EmptyState';
import { Inbox } from 'lucide-react';

export function DocumentHistory() {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();

  const [documents, setDocuments] = useState<DocumentStoredEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account?.address) {
      loadDocuments();
    }
  }, [account?.address]);

  const loadDocuments = async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const events = await getDocumentEvents(suiClient, account.address);
      setDocuments(events.reverse()); // Show newest first
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (hash: string) => {
    // Navigate to verify tab with hash pre-filled
    window.location.hash = `verify?hash=${hash}`;
  };

  if (!account?.address) {
    return (
      <div className="tf-card">
        <div className="hp-empty">
          <p>Connect your wallet to view your documents</p>
          <span>Your uploaded documents will appear here</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hp-loading">
        <div className="tf-spinner" />
        Loading documents...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={36} />}
        title="No documents yet"
        description="Upload your first document to get started"
        actionLabel="Upload Document"
        onAction={() => { window.location.hash = 'upload'; }}
      />
    );
  }

  return (
    <div>
      <div className="dh-header">
        <div className="dh-title-group">
          <span className="dh-title">My Documents</span>
          <span className="dh-count">
            ({documents.length})
          </span>
        </div>
        <button className="hp-refresh" onClick={loadDocuments} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
      <div className="hp-list">
        {documents.map((doc, index) => (
          <DocumentCard
            key={`${doc.document_hash}-${index}`}
            document={doc}
            onVerify={handleVerify}
          />
        ))}
      </div>
    </div>
  );
}
