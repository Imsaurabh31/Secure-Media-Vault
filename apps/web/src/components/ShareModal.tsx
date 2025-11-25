import React, { useState } from 'react';
import { graphqlRequest, mutations } from '../graphql';
import type { Asset } from '../types';

interface ShareModalProps {
  asset: Asset;
  onClose: () => void;
  onUpdate: (asset: Asset) => void;
}

export function ShareModal({ asset, onClose, onUpdate }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const data = await graphqlRequest(mutations.SHARE_ASSET, {
        assetId: asset.id,
        toEmail: email,
        canDownload: true,
        version: asset.version
      });
      
      onUpdate(data.shareAsset);
      onClose();
    } catch (err: any) {
      if (err.message.includes('VERSION_CONFLICT')) {
        setError('File was modified. Please refresh and try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        minWidth: '400px'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Share "{asset.filename}"</h3>
        
        <form onSubmit={handleShare}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}