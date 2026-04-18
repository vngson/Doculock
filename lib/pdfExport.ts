/**
 * PDF export utilities for batch verification results
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 * Get status for PDF export display
 * @param result - Verification result
 * @returns Status string for export
 */
function getStatus(result: BatchVerificationResult): string {
  if (result.existingFileWithSameName) {
    return 'CONTENT DIFFERS';
  }
  return result.verified ? 'VERIFIED' : 'NOT FOUND';
}

/**
 * Get difference details for PDF export
 * @param result - Verification result
 * @returns Difference details string
 */
function getDifferenceDetails(result: BatchVerificationResult): string {
  if (!result.existingFileWithSameName) return '';

  const existing = result.existingFileWithSameName;
  const diffs: string[] = [];

  // Size difference
  if (result.fileSize !== existing.file_size) {
    diffs.push(`Size: ${formatFileSize(result.fileSize)} to ${formatFileSize(existing.file_size)}`);
  }

  // Hash difference
  const currentBytes = result.hash?.match(/.{1,2}/g) || [];
  const existingBytes = existing.document_hash?.match(/.{1,2}/g) || [];
  const totalDiffs = currentBytes.filter((byte, i) => byte !== existingBytes[i]).length;

  if (totalDiffs > 0) {
    diffs.push(`Hash: ${totalDiffs}/${existingBytes.length} bytes differ`);
  }

  // Upload timestamp difference
  if (existing.timestamp) {
    const uploadDate = new Date(existing.timestamp);
    diffs.push(`Uploaded: ${uploadDate.toLocaleString('vi-VN')}`);
  }

  return diffs.join('\n');
}

/**
 * Export results to PDF format
 */
export function exportToPDF(
  results: BatchVerificationResult[],
  options?: {
    filename?: string;
    title?: string;
    includeSummary?: boolean;
  }
): void {
  const {
    filename = 'verification-results.pdf',
    title = 'Batch Document Verification Report',
    includeSummary = true,
  } = options || {};

  // Create PDF document in landscape mode
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Add date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('vi-VN')}`, pageWidth / 2, 28, { align: 'center' });

  let yPos = 40;

  // Add summary if requested
  if (includeSummary) {
    const summary = calculateSummary(results);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryLines = [
      `Total Files: ${summary.total}`,
      `Verified: ${summary.verified} (${summary.verificationRate.toFixed(1)}%)`,
      `Content Differs: ${summary.contentDiffers}`,
      `Not Found: ${summary.notFound}`,
      `Errors: ${summary.errors}`,
      `Total Size: ${formatFileSize(summary.totalSize)}`,
    ];

    summaryLines.forEach((line, index) => {
      doc.text(line, 14, yPos + (index * 6));
    });

    yPos += summaryLines.length * 6 + 10;
  }

  // Prepare table data - use newline-separated strings for multiline
  const tableData = results.map(result => {
    const fileInfo = `${truncateString(result.fileName, 40)}\n${formatFileSize(result.fileSize)}`;

    let verification = getStatus(result);
    if (result.errorMessage) {
      verification += `\n${truncateString(result.errorMessage, 50)}`;
    }

    return [
      fileInfo,
      verification,
      truncateHash(result.hash),
      getDifferenceDetails(result),
      result.timestamp ? formatDate(result.timestamp) : 'N/A',
    ];
  });

  // Add table
  autoTable(doc, {
    startY: yPos,
    head: [['File Info', 'Verification', 'Hash', 'Difference Details', 'Timestamp']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 192, 255],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      minCellHeight: 20,
    },
    rowPageBreak: 'avoid',
    columnStyles: {
      0: { cellWidth: 40, minCellWidth: 60, valign: 'top' },
      1: { cellWidth: 40, minCellWidth: 60, valign: 'top' },
      2: { cellWidth: 40, font: 'courier', fontSize: 7, valign: 'middle' },
      3: { cellWidth: 100, fontSize: 7, valign: 'top' },
      4: { cellWidth: 50, valign: 'middle' },
    },
    alternateRowStyles: {
      fillColor: [240, 248, 255],
    },
    willDrawCell: (data) => {
      // Clear cell content for custom rendering
      if (data.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
        data.cell.text = ['']; // Clear default text
      }
    },
    didDrawCell: (data) => {
      // Custom rendering for multiline cells with different styles
      if (data.section === 'body') {
        const result = results[data.row.index];
        if (!result) return;

        const x = data.cell.x + 3;
        const y = data.cell.y + 6;

        if (data.column.index === 0) {
          // File Info column
          const lines = `${truncateString(result.fileName, 40)}\n${formatFileSize(result.fileSize)}`.split('\n');

          // File name (bold)
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(lines[0], x, y);

          // File size (gray, small)
          if (lines[1]) {
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.text(lines[1], x, y + 5);
          }
        } else if (data.column.index === 1) {
          // Verification column
          let text = getStatus(result);
          if (result.errorMessage) {
            text += `\n${truncateString(result.errorMessage, 50)}`;
          }
          const lines = text.split('\n');

          // Status (bold, colored)
          if (result.verified) {
            doc.setTextColor(0, 128, 0);
          } else if (result.existingFileWithSameName) {
            doc.setTextColor(245, 158, 11);
          } else {
            doc.setTextColor(200, 0, 0);
          }
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(lines[0], x, y);

          // Error message (red, small)
          if (lines[1]) {
            doc.setTextColor(200, 0, 0);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            const errorLines = doc.splitTextToSize(lines[1], data.cell.width - 6);
            errorLines.forEach((line: string, i: number) => {
              doc.text(line, x, y + 5 + (i * 4));
            });
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Add page number
      const pageNumber = data.pageNumber;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${pageNumber}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Add footer with disclaimer
  const finalY = (doc as any).lastAutoTable.finalY || yPos;
  if (finalY < doc.internal.pageSize.getHeight() - 30) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128);
    doc.text(
      'This report is generated by DocuLock. Verification results are based on blockchain data.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(filename);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(results: BatchVerificationResult[]) {
  const total = results.length;
  const verified = results.filter(r => r.verified).length;
  const contentDiffers = results.filter(r => r.existingFileWithSameName).length;
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
 * Truncate string with ellipsis
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Truncate hash to first 12 and last 4 characters
 */
function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return hash.substring(0, 12) + '...' + hash.substring(hash.length - 4);
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
