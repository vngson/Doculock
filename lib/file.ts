/**
 * File handling utilities
 */

import { doculockConfig, SupportedFileType } from './config';

/**
 * Format file size to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 * @param mimeType - MIME type of the file
 * @returns Emoji icon
 */
export function getFileIcon(mimeType: string): string {
  const icons: Record<string, string> = {
    'application/pdf': '📄',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
    'image/gif': '🖼️',
    'image/webp': '🖼️',
    'text/plain': '📝',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  };

  return icons[mimeType] || '📁';
}

/**
 * Validate file for upload
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > doculockConfig.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${formatFileSize(doculockConfig.maxFileSize)}`,
    };
  }

  // Check file type
  if (!doculockConfig.supportedFileTypes.includes(file.type as SupportedFileType)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported`,
    };
  }

  return { valid: true };
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type
 * @returns File extension (e.g., ".pdf")
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  };

  return extensions[mimeType] || '';
}

/**
 * Truncate filename to fit in display
 * @param filename - Original filename
 * @param maxLength - Maximum length
 * @returns Truncated filename
 */
export function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;

  const extIndex = filename.lastIndexOf('.');
  const ext = extIndex > 0 ? filename.slice(extIndex) : '';

  const availableLength = maxLength - ext.length - 3; // -3 for "..."
  const truncated = filename.slice(0, Math.max(0, availableLength));

  return truncated + '...' + ext;
}

/**
 * Read file as text (for text files)
 * @param file - The file to read
 * @returns File content as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

/**
 * Read file as data URL (for preview)
 * @param file - The file to read
 * @returns Data URL string
 */
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
