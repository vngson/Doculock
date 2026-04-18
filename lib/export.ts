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
    timestamp?: number | string;
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
 * Get difference details for export
 * @param result - Verification result
 * @returns Difference details string
 */
function getDifferenceDetails(result: BatchVerificationResult): string {
  if (!result.existingFileWithSameName) return '';

  const existing = result.existingFileWithSameName;
  const diffs: string[] = [];

  // Size difference
  if (result.fileSize !== existing.file_size) {
    diffs.push(`Size: ${formatFileSize(result.fileSize)} → ${formatFileSize(existing.file_size)} (${Math.abs(result.fileSize - existing.file_size)} bytes diff)`);
  }

  // Hash difference (byte-by-byte comparison)
  const currentBytes = result.hash?.match(/.{1,2}/g) || [];
  const existingBytes = existing.document_hash?.match(/.{1,2}/g) || [];
  const diffPositions: number[] = [];
  const totalDiffs = currentBytes.filter((byte, i) => byte !== existingBytes[i]).length;

  if (totalDiffs > 0) {
    const diffBytes = currentBytes.filter((byte, i) => byte !== existingBytes[i]);
    diffs.push(`Hash: ${totalDiffs}/${existingBytes.length} bytes differ (~${totalDiffs * 4} bits)`);
  }

  // Upload timestamp difference
  if (existing.timestamp) {
    const uploadDate = new Date(existing.timestamp);
    diffs.push(`Uploaded: ${uploadDate.toLocaleString('vi-VN')}`);
  }

  return diffs.join('; ');
}

/**
 * Export results to CSV format
 */
export function exportToCSV(
  results: BatchVerificationResult[],
  filename: string = 'verification-results.csv'
): void {
  // CSV header
  const headers = ['File Name', 'File Size', 'Hash', 'Status', 'Difference Details', 'Timestamp', 'Error Message'];

  // Convert results to CSV rows
  const rows = results.map(result => [
    `"${result.fileName.replace(/"/g, '""')}"`,
    formatFileSize(result.fileSize),
    result.hash,
    getStatus(result),
    `"${getDifferenceDetails(result).replace(/"/g, '""')}"`,
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
      differenceDetails: getDifferenceDetails(r),
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
 * Export results to Excel XML format with auto-fit columns
 * @param results - Verification results
 * @param filename - Output filename
 */
export function exportToXLS(
  results: any[],
  filename: string = 'verification-results.xls'
): void {
  console.log('[exportToXLS] Starting Excel XML export...');
  console.log('[exportToXLS] Results count:', results.length);

  const verifiedCount = results.filter(r => r.verified).length;
  const contentDiffersCount = results.filter(r => r.hash && !r.verified && r.existingFileWithSameName).length;

  const escapeXml = (str: string) => {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const getCellData = (r: any, field: string) => {
    switch (field) {
      case 'fileName':
        return `<Cell ss:StyleID="s21"><Data ss:Type="String">${escapeXml(r.fileName)}</Data></Cell>`;
      case 'fileSize':
        return `<Cell ss:StyleID="s22"><Data ss:Type="String">${formatFileSize(r.fileSize)}</Data></Cell>`;
      case 'status':
        let styleId = 's23';
        let statusText = 'N/A';
        if (r.existingFileWithSameName) {
          styleId = 's25';
          statusText = 'Content Differs';
        } else if (r.verified) {
          styleId = 's24';
          statusText = 'Verified';
        } else if (r.hash) {
          styleId = 's26';
          statusText = 'Not Found';
        }
        return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${statusText}</Data></Cell>`;
      case 'hash':
        return `<Cell ss:StyleID="s27"><Data ss:Type="String">${escapeXml(r.hash || 'N/A')}</Data></Cell>`;
      case 'differenceDetails':
        return `<Cell ss:StyleID="s30"><Data ss:Type="String">${escapeXml(getDifferenceDetails(r) || '')}</Data></Cell>`;
      case 'timestamp':
        const ts = r.timestamp ? new Date(r.timestamp).toLocaleString('vi-VN') : 'N/A';
        return `<Cell ss:StyleID="s28"><Data ss:Type="String">${escapeXml(ts)}</Data></Cell>`;
      case 'errorMessage':
        return `<Cell ss:StyleID="s29"><Data ss:Type="String">${escapeXml(r.errorMessage || '')}</Data></Cell>`;
      default:
        return `<Cell><Data ss:Type="String"></Data></Cell>`;
    }
  };

  const xmlContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Created>${new Date().toISOString()}</Created>
  <Company>DocuLock</Company>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>18000</WindowWidth>
  <WindowTopX>0</WindowTopX>
  <WindowTopY>0</WindowTopY>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Arial" ss:Size="11"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="s20">
   <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#4a90a4" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="s21">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="s22">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="s23">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="s24">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#10b981" ss:Bold="1"/>
  </Style>
  <Style ss:ID="s25">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#f59e0b" ss:Bold="1"/>
  </Style>
  <Style ss:ID="s26">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#ef4444" ss:Bold="1"/>
  </Style>
  <Style ss:ID="s27">
   <Font ss:FontName="Courier New" ss:Size="10"/>
  </Style>
  <Style ss:ID="s28">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="s29">
   <Font ss:Color="#ef4444" ss:Size="10"/>
  </Style>
  <Style ss:ID="s30">
   <Font ss:Size="10" ss:Color="#666"/>
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Verification Results">
  <Table ss:ExpandedColumnCount="7" ss:ExpandedRowCount="${results.length + 3}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="60">
   <Column ss:AutoFitWidth="1" ss:Width="120"/>
   <Column ss:AutoFitWidth="1" ss:Width="80"/>
   <Column ss:AutoFitWidth="1" ss:Width="100"/>
   <Column ss:AutoFitWidth="1" ss:Width="200"/>
   <Column ss:AutoFitWidth="1" ss:Width="400"/>
   <Column ss:AutoFitWidth="1" ss:Width="120"/>
   <Column ss:AutoFitWidth="1" ss:Width="300"/>
   <Row>
    <Cell ss:MergeAcross="6" ss:StyleID="s20"><Data ss:Type="String">Document Verification Results</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="6"><Data ss:Type="String">Generated: ${new Date().toLocaleString('vi-VN')} | Total Files: ${results.length} | Verified: ${verifiedCount} | Content Differs: ${contentDiffersCount}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="s20"><Data ss:Type="String">File Name</Data></Cell>
    <Cell ss:StyleID="s20"><Data ss:Type="String">File Size</Data></Cell>
    <Cell ss:StyleID="s20"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="s20"><Data ss:Type="String">Hash</Data></Cell>
    <Cell ss:StyleID="s20"><Data ss:Type="String">Difference Details</Data></Cell>
    <Cell ss:StyleID="s20"><Data ss:Type="String">Timestamp</Data></Cell>
    <Cell ss:StyleID="s20"><Data ss:Type="String">Error Message</Data></Cell>
   </Row>
   ${results.map(r => `   <Row>${getCellData(r, 'fileName')}${getCellData(r, 'fileSize')}${getCellData(r, 'status')}${getCellData(r, 'hash')}${getCellData(r, 'differenceDetails')}${getCellData(r, 'timestamp')}${getCellData(r, 'errorMessage')}</Row>`).join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;

  console.log('[exportToTSV] XML content length:', xmlContent.length);

  // Use Excel XML MIME type
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });

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
    .difference-details {
      font-size: 10px;
      color: #666;
      line-height: 1.4;
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
        <th style="width: 250px;">File Info</th>
        <th style="width: 100px;">Status</th>
        <th style="width: 200px;">Hash</th>
        <th style="width: 400px;">Difference Details</th>
        <th style="width: 150px;">Timestamp</th>
        <th style="width: 500px;">Error Message</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(r => {
        const fileInfo = `<strong>${r.fileName}</strong><br/><span style="font-size: 11px; color: #666;">${formatFileSize(r.fileSize)}</span>`;
        const hash = r.hash ? `<span class="hash-cell">${r.hash}</span>` : 'N/A';
        const differenceDetails = getDifferenceDetails(r) ? `<span class="difference-details">${getDifferenceDetails(r)}</span>` : '';
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
            <td>${differenceDetails}</td>
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
