import React, { useState, useEffect, useCallback } from 'react';
import { graphqlRequest, queries } from '../graphql';
import { UploadArea } from './UploadArea';
import { AssetCard } from './AssetCard';
import type { Asset } from '../types';

export function Gallery() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await graphqlRequest(queries.MY_ASSETS, {
        first: 50,
        q: searchQuery || undefined
      });
      setAssets(data.myAssets.edges.map((edge: any) => edge.node));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleAssetUpdate = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(asset => 
      asset.id === updatedAsset.id ? updatedAsset : asset
    ));
  };

  const handleAssetDelete = (assetId: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
  };

  const handleNewAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
  };

  if (loading && assets.length === 0) {
    return <div>Loading assets...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Search files..."
          className="form-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
      </div>

      <UploadArea onAssetCreated={handleNewAsset} onAssetUpdated={handleAssetUpdate} />

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="gallery">
        {assets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onUpdate={handleAssetUpdate}
            onDelete={handleAssetDelete}
          />
        ))}
      </div>

      {assets.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No assets found. Upload some files to get started!
        </div>
      )}
    </div>
  );
}