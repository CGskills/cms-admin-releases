'use client';

import { useRef, useState } from 'react';
import { uploadMedia } from '../actions';
import type { MediaFile } from './MediaManager';

interface FileUploaderProps {
  bucket: string;
  onUploaded: (file: MediaFile) => void;
  onError: (message: string) => void;
}

export default function FileUploader({ bucket, onUploaded, onError }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploading) return;

    setIsUploading(true);
    setError('');
    onError('');

    try {
      const result = await uploadMedia(bucket, file);
      onUploaded({
        ...result.file,
        publicUrl: result.url,
      });
    } catch (uploadError: unknown) {
      const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
      setError(message);
      onError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={isUploading}
        className="hidden"
        id={`file-upload-${bucket}`}
      />
      <label
        htmlFor={`file-upload-${bucket}`}
        aria-disabled={isUploading}
        className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#DB9844] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#DB9844]/25 transition-all hover:bg-[#AF5D3E] ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {isUploading ? (
          <>
            <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload File
          </>
        )}
      </label>
      {error && <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>}
    </div>
  );
}
