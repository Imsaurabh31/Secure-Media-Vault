import React, { useState, useRef } from 'react';
import { graphqlRequest, mutations } from '../graphql';
import { ALLOWED_MIMES } from '../types';
import { UploadManager } from '../utils/uploadManager';
import type { Asset } from '../types';

interface UploadAreaProps {
  onAssetCreated: (asset: Asset) => void;
  onAssetUpdated: (asset: Asset) => void;
}

export function UploadArea({ onAssetCreated, onAssetUpdated }: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadManager = UploadManager.getInstance();

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!ALLOWED_MIMES.includes(file.type as any)) {
        alert(`File type ${file.type} is not allowed`);
        continue;
      }

      try {
        // Create upload ticket
        const data = await graphqlRequest(mutations.CREATE_UPLOAD_URL, {
          filename: file.name,
          mime: file.type,
          size: file.size
        });

        const ticket = data.createUploadUrl;
        
        // Create initial asset for UI
        const initialAsset: Asset = {
          id: ticket.assetId,
          filename: file.name,
          mime: file.type,
          size: file.size,
          status: 'uploading',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        onAssetCreated(initialAsset);

        // Start upload
        uploadManager.startUpload(
          ticket,
          file,
          (progress) => {
            // Update progress in UI
            onAssetUpdated({
              ...initialAsset,
              status: 'uploading'
            });
          },
          (finalAsset) => {
            onAssetUpdated(finalAsset);
          },
          (error) => {
            console.error('Upload failed:', error);
            onAssetUpdated({
              ...initialAsset,
              status: 'corrupt'
            });
          }
        );

      } catch (error: any) {
        alert(`Failed to start upload: ${error.message}`);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div
      className={`upload-area ${isDragOver ? 'dragover' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <div>
        <h3>Drop files here or click to select</h3>
        <p>Supported: JPEG, PNG, WebP, PDF</p>
        <p>Max size: 50MB per file</p>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_MIMES.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}