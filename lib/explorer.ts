const EXPLORER_BASE = 'https://suivision.xyz';

export function getExplorerTxUrl(txDigest: string): string {
  return `${EXPLORER_BASE}/txblock/${txDigest}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}

export function getExplorerObjectUrl(objectId: string): string {
  return `${EXPLORER_BASE}/object/${objectId}`;
}

export function getExplorerUrl(): string {
  return 'https://sui.io';
}
