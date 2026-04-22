export function validateSearchQuery(search: string | null): string {
  if (!search) return '';
  const sanitized = search.replace(/[^a-zA-Z0-9\s\-_.@]/g, '');
  return sanitized.length > 200 ? sanitized.slice(0, 200) : sanitized;
}

export function validateHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

export function validateLimit(limit: string | null, max = 100): number {
  const n = parseInt(limit || '20', 10);
  if (isNaN(n)) return 20;
  return Math.min(Math.max(1, n), max);
}

export function validateAddress(address: string | null): string {
  if (!address) return '';
  return address.startsWith('0x') && /^0x[a-fA-F0-9]{1,64}$/.test(address) ? address : '';
}
