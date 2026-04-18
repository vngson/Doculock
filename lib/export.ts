/**
 * Export utilities for batch verification results
 */

export interface BatchVerificationResult {
  fileName: string;
  fileSize: number;
  hash: string;
  verified: boolean;
  timestamp?: number;
  errorMessage?: string;
}

/**
 * Export results to CSV format
 */
export function exportToCSV(
  results: BatchVerificationResult[],
  filename: string = 'verification-results.csv'
): void {
  // CSV header
  const headers = ['File Name', 'File Size', 'Hash', 'Status', 'Timestamp', 'Error Message'];

  // Convert results to CSV rows
  const rows = results.map(result => [
    `"${result.fileName.replace(/"/g, '""')}"`,
    formatFileSize(result.fileSize),
    result.hash,
    result.verified ? 'Verified' : 'Not Found',
    result.timestamp ? new Date(result.timestamp).toISOString() : 'N/A',
    result.errorMessage ? `"${result.errorMessage.replace(/"/g, '""')}"` : '',
  ]);

  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Export results to JSON format
 */
export function exportToJSON(
  results: BatchVerificationResult[],
  filename: string = 'verification-results.json'
): void {
  const jsonContent = JSON.stringify({
    exportDate: new Date().toISOString(),
    totalFiles: results.length,
    verifiedCount: results.filter(r => r.verified).length,
    results,
  }, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate summary statistics
 */
export function generateSummary(results: BatchVerificationResult[]) {
  const total = results.length;
  const verified = results.filter(r => r.verified).length;
  const notFound = total - verified;
  const errors = results.filter(r => r.errorMessage).length;
  const totalSize = results.reduce((sum, r) => sum + r.fileSize, 0);

  return {
    total,
    verified,
    notFound,
    errors,
    totalSize,
    verificationRate: total > 0 ? (verified / total) * 100 : 0,
  };
}
