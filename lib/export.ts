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
  existingFileWithSameName?: {
    file_name: string;
    file_size: number;
    mime_type: string;
    timestamp?: number;
    document_hash: string;
  } | null;
}

/**
 * Get status for export display
 * @param result - Verification result
 * @returns Status string for export
 */
function getStatus(result: BatchVerificationResult): string {
  if (result.existingFileWithSameName) {
    return 'Content Differs';
  }
  return result.verified ? 'Verified' : 'Not Found';
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
    getStatus(result),
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
  results: any[],
  filename: string = 'verification-results.json'
): void {
  const verifiedCount = results.filter(r => r.verified).length;
  const contentDiffersCount = results.filter(r => r.hash && !r.verified && r.existingFileWithSameName).length;

  const jsonContent = JSON.stringify({
    exportDate: new Date().toISOString(),
    totalFiles: results.length,
    verifiedCount,
    contentDiffersCount,
    results: results.map(r => ({
      fileName: r.fileName,
      fileSize: r.fileSize,
      hash: r.hash,
      status: r.existingFileWithSameName ? 'Content Differs' : (r.verified ? 'Verified' : 'Not Found'),
      timestamp: r.timestamp,
      errorMessage: r.errorMessage,
    })),
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
 * Export results to TSV (Tab-Separated Values) format for better Excel compatibility
 * @param results - Verification results
 * @param filename - Output filename
 */
export function exportToTSV(
  results: any[],
  filename: string = 'verification-results.tsv'
): void {
  // CSV header with tabs instead of commas
  const headers = ['File Name\tFile Size\tHash\tStatus\tTimestamp\tError Message'];

  // Convert results to TSV rows with tabs
  const rows = results.map(result => {
    const fileName = result.fileName.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/"/g, '""');
    const fileInfo = `${fileName}\t${formatFileSize(result.fileSize)}`;

    let verification = getStatus(result);
    if (result.errorMessage) {
      verification += `\t${result.errorMessage.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/"/g, '""')}`;
    }

    const hash = result.hash || 'N/A';
    const timestamp = result.timestamp ? new Date(result.timestamp).toISOString() : 'N/A';
    const error = result.errorMessage ? `"${result.errorMessage.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/"/g, '""')}"` : '';

    return [
      fileInfo,
      verification,
      hash,
      timestamp,
      error,
    ];
  });

  // Combine header and rows with newline separators
  const tsvContent = [
    headers.join('\t'),
    ...rows.map(row => row.join('\t')),
  ].join('\n');

  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });

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
 * Export results to HTML format with auto-fit columns
 */
export function exportToHTML(
  results: any[],
  filename: string = 'verification-results.html'
): void {
  const verifiedCount = results.filter(r => r.verified).length;
  const contentDiffersCount = results.filter(r => r.hash && !r.verified && r.existingFileWithSameName).length;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document Verification Results</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background: #f5f5f5;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    th, td {
      border: 1px solid #d0d0d0;
      padding: 8px 12px;
      text-align: left;
      font-size: 12px;
      table-layout: fixed;
    }
    th {
      background: #4a90a4;
      color: white;
      font-weight: bold;
      white-space: nowrap;
    }
    .status-verified {
      color: #10b981;
      font-weight: bold;
    }
    .status-content-differs {
      color: #f59e0b;
      font-weight: bold;
    }
    .status-not-found {
      color: #ef4444;
      font-weight: bold;
    }
    .hash-cell {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      word-break: break-all;
    }
    .error-message {
      color: #ef4444;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <h2 style="color: #333; margin-bottom: 10px;">Document Verification Results</h2>
  <p style="color: #666; margin-bottom: 20px;">
    Generated: ${new Date().toLocaleString('vi-VN')}
    <br/>
    Total Files: ${results.length} |
    Verified: ${verifiedCount} (${results.length > 0 ? ((verifiedCount / results.length) * 100).toFixed(1) : 0}%) |
    Content Differs: ${contentDiffersCount}
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 300px;">File Info</th>
        <th style="width: 100px;">Status</th>
        <th style="width: 250px;">Hash</th>
        <th style="width: 150px;">Timestamp</th>
        <th style="width: 500px;">Error Message</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(r => {
        const fileInfo = `<strong>${r.fileName}</strong><br/><span style="font-size: 11px; color: #666;">${formatFileSize(r.fileSize)}</span>`;
        const hash = r.hash ? `<span class="hash-cell">${r.hash}</span>` : 'N/A';
        const timestamp = r.timestamp ? new Date(r.timestamp).toLocaleString('vi-VN') : 'N/A';
        const error = r.errorMessage ? `<span class="error-message">${r.errorMessage}</span>` : '';
        let statusClass = '';
        let statusText = '';

        if (r.existingFileWithSameName) {
          statusClass = 'status-content-differs';
          statusText = 'Content Differs';
        } else if (r.verified) {
          statusClass = 'status-verified';
          statusText = 'Verified';
        } else if (r.hash) {
          statusClass = 'status-not-found';
          statusText = 'Not Found';
        }

        return `
          <tr>
            <td>${fileInfo}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${hash}</td>
            <td>${timestamp}</td>
            <td>${error}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
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
export function generateSummary(results: any[]) {
  const total = results.length;
  const verified = results.filter(r => r.verified).length;
  const contentDiffers = results.filter(r => r.hash && !r.verified && r.existingFileWithSameName).length;
  const notFound = total - verified - contentDiffers;
  const errors = results.filter(r => r.errorMessage).length;
  const totalSize = results.reduce((sum, r) => sum + r.fileSize, 0);

  return {
    total,
    verified,
    contentDiffers,
    notFound,
    errors,
    totalSize,
    verificationRate: total > 0 ? (verified / total) * 100 : 0,
  };
}
