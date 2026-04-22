import { getDocumentsCollection } from '@/lib/mongodb';
import { validateHash } from '@/lib/validation';
import { getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/explorer';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  const rl = rateLimit(request, { max: 60, windowMs: 60000 });
  if (rl) return rl;

  const hash = params.hash.toLowerCase().trim();
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;

  if (!validateHash(cleanHash)) {
    return Response.json({ error: 'Invalid hash format' }, { status: 400 });
  }

  try {
    const collection = await getDocumentsCollection();
    const document = await collection.findOne({ document_hash: cleanHash });

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const timestamp = document.tx_timestamp_ms || document.timestamp;
    const date = timestamp ? new Date(
      typeof timestamp === 'number'
        ? (timestamp > 1e12 ? timestamp : timestamp * 1000)
        : timestamp
    ) : null;

    return Response.json({
      document_hash: document.document_hash,
      file_name: document.file_name,
      file_size: document.file_size,
      mime_type: document.mime_type,
      creator: document.creator,
      timestamp,
      timestamp_utc: date && !isNaN(date.getTime()) ? date.toUTCString() : null,
      timestamp_iso: date && !isNaN(date.getTime()) ? date.toISOString() : null,
      tx_digest: document.tx_digest || null,
      indexed_at: document.indexed_at ? new Date(document.indexed_at).toISOString() : null,
      network: process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',
      explorer_url: document.tx_digest ? getExplorerTxUrl(document.tx_digest) : null,
      creator_url: document.creator ? getExplorerAddressUrl(document.creator) : null,
    });
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
