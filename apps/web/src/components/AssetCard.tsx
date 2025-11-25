import { useState } from 'react';
import { graphqlRequest, queries, mutations } from '../graphql';
import { UploadManager } from '../utils/uploadManager';
import { ShareModal } from './ShareModal';
import type { Asset } from '../types';

interface AssetCardProps {
  asset: Asset;
  onUpdate: (asset: Asset) => void;
  onDelete: (assetId: string) => void;
}

export function AssetCard({ asset, onUpdate, onDelete }: AssetCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFilename, setNewFilename] = useState(asset.filename);
  const [, setDownloadUrl] = useState<string | null>(null);
  const [, setUrlExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const uploadManager = UploadManager.getInstance();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusChip = () => {
    const uploadState = uploadManager.getUploadState(asset.id);
    
    if (uploadState) {
      if (uploadState.status === 'uploading') {
        return (
          <div>
            <span className="status-chip status-uploading">
              Uploading {Math.round(uploadState.progress)}%
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        );
      }
      if (uploadState.status === 'verifying') {
        return <span className="status-chip status-verifying">Verifying...</span>;
      }
      if (uploadState.status === 'error') {
        return <span className="status-chip status-error">Error</span>;
      }
    }

    return (
      <span className={`status-chip status-${asset.status}`}>
        {asset.status}
      </span>
    );
  };

  const handleRename = async () => {
    try {
      const data = await graphqlRequest(mutations.RENAME_ASSET, {
        assetId: asset.id,
        filename: newFilename,
        version: asset.version
      });
      onUpdate(data.renameAsset);
      setIsRenaming(false);
    } catch (error: any) {
      if (error.message.includes('VERSION_CONFLICT')) {
        alert('Someone else modified this file. Please refresh and try again.');
      } else {
        alert(`Rename failed: ${error.message}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await graphqlRequest(mutations.DELETE_ASSET, {
        assetId: asset.id,
        version: asset.version
      });
      onDelete(asset.id);
    } catch (error: any) {
      if (error.message.includes('VERSION_CONFLICT')) {
        alert('Someone else modified this file. Please refresh and try again.');
      } else {
        alert(`Delete failed: ${error.message}`);
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      const data = await graphqlRequest(queries.GET_DOWNLOAD_URL, {
        assetId: asset.id
      });
      
      const result = data.getDownloadUrl;
      if (!result) return;
      const { url, expiresAt } = result;
      await navigator.clipboard.writeText(url);
      
      setDownloadUrl(url);
      setUrlExpiry(new Date(expiresAt));
      
      // Start countdown
      const updateCountdown = () => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const remaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
        setCountdown(remaining);
        
        if (remaining > 0) {
          setTimeout(updateCountdown, 1000);
        } else {
          setDownloadUrl(null);
          setUrlExpiry(null);
        }
      };
      
      updateCountdown();
      alert('Download link copied to clipboard!');
    } catch (error: any) {
      alert(`Failed to get download link: ${error.message}`);
    }
  };

  const handleRetry = () => {
    uploadManager.retryUpload(asset.id);
  };

  const handleCancel = () => {
    uploadManager.cancelUpload(asset.id);
  };

  const uploadState = uploadManager.getUploadState(asset.id);
  const canRetry = asset.status === 'corrupt' || (uploadState?.status === 'error');
  const canCancel = uploadState?.status === 'uploading';

  return (
    <div className="asset-card">
      <div className="asset-header">
        {isRenaming ? (
          <input
            type="text"
            value={newFilename}
            onChange={(e) => setNewFilename(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setIsRenaming(false);
                setNewFilename(asset.filename);
              }
            }}
            autoFocus
            className="form-input"
            style={{ fontSize: '1.1rem', fontWeight: 600 }}
          />
        ) : (
          <div 
            className="asset-filename"
            onClick={() => setIsRenaming(true)}
            style={{ cursor: 'pointer' }}
          >
            {asset.filename}
          </div>
        )}
        
        {getStatusChip()}
      </div>

      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        {formatFileSize(asset.size)} • {asset.mime}
      </div>

      <div className="asset-actions">
        {asset.status === 'ready' && (
          <button 
            className="btn btn-primary"
            onClick={handleCopyLink}
          >
            Copy Link
            {countdown > 0 && (
              <span className="countdown">({countdown}s)</span>
            )}
          </button>
        )}
        
        {canRetry && (
          <button 
            className="btn btn-secondary"
            onClick={handleRetry}
          >
            Retry
          </button>
        )}
        
        {canCancel && (
          <button 
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
        
        {asset.status === 'ready' && (
          <button 
            className="btn btn-secondary"
            onClick={() => setShowShareModal(true)}
          >
            Share
          </button>
        )}
        
        <button 
          className="btn btn-danger"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
      
      {showShareModal && (
        <ShareModal
          asset={asset}
          onClose={() => setShowShareModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}