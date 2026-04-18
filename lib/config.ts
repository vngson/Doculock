// DocuLock Contract Configuration
// Update these values after contract deployment

function _getRegistryId(): string {
  if (typeof window !== 'undefined') {
    try {
      const localStorageId = localStorage.getItem('doculock-registry-id');
      if (localStorageId) return localStorageId;
    } catch {
      // localStorage might not be available
    }
  }
  return process.env.NEXT_PUBLIC_DOCULOCK_REGISTRY_ID || '';
}

export const doculockConfig = {
  // Sui Network Configuration
  network: process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',

  // Contract addresses (update after deployment)
  packageId: process.env.NEXT_PUBLIC_DOCULOCK_PACKAGE_ID || '',

  // Sui Fullnode RPC
  rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io',

  // Maximum file size for upload (in bytes) - 100MB
  maxFileSize: 100 * 1024 * 1024,

  // Supported file types
  supportedFileTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

export type SupportedFileType = typeof doculockConfig.supportedFileTypes[number];

export function getRegistryId(): string {
  return _getRegistryId();
}

export function saveRegistryId(registryId: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('doculock-registry-id', registryId);
    } catch {
      // localStorage might not be available
    }
  }
}

export type DocuLockConfig = typeof doculockConfig;
