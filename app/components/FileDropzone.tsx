'use client';

import { useRef, useState } from 'react';
import { validateFile } from '@/lib/file';
import { showToast } from './Toast';
import { FileText } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function FileDropzone({
  onFileSelect,
  accept = 'application/pdf,image/*,text/plain',
  maxSize,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      showToast(validation.error ?? 'Invalid file', 'error');
      return;
    }

    onFileSelect(file);
  };

  return (
    <div
      className={`fz-dropzone ${isDragging ? 'fz-dropzone--dragover' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Drop file here or click to select"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="fz-input"
        accept={accept}
        onChange={handleFileChange}
      />
      <div className="fz-icon"><FileText size={32} /></div>
      <div className="fz-title">Drop your file here</div>
      <div className="fz-subtitle">
        or click to browse (max {maxSize ? `${maxSize / 1024 / 1024}MB` : '100MB'})
      </div>
    </div>
  );
}
