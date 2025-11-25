// Demo data store

// Demo data store
const mockAssets: any[] = [];
let assetCounter = 1;

async function graphqlRequest(query: string, variables?: any) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (query.includes('myAssets')) {
    return {
      myAssets: {
        edges: mockAssets.map(asset => ({ cursor: asset.createdAt, node: asset })),
        pageInfo: { endCursor: null, hasNextPage: false }
      }
    };
  }
  
  if (query.includes('createUploadUrl')) {
    const assetId = `demo-${assetCounter++}`;
    const newAsset = {
      id: assetId,
      filename: variables.filename,
      mime: variables.mime,
      size: variables.size,
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockAssets.unshift(newAsset);
    
    return {
      createUploadUrl: {
        assetId,
        storagePath: `demo/path/${assetId}`,
        uploadUrl: 'https://demo-upload.com',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        nonce: 'demo-nonce'
      }
    };
  }
  
  if (query.includes('finalizeUpload')) {
    const asset = mockAssets.find(a => a.id === variables.assetId);
    if (asset) {
      asset.status = 'ready';
      asset.sha256 = variables.clientSha256;
      asset.version++;
    }
    return { finalizeUpload: asset };
  }
  
  if (query.includes('getDownloadUrl')) {
    return {
      getDownloadUrl: {
        url: 'https://demo-download.com/file',
        expiresAt: new Date(Date.now() + 90000).toISOString()
      }
    };
  }
  
  if (query.includes('renameAsset')) {
    const asset = mockAssets.find(a => a.id === variables.assetId);
    if (asset) {
      asset.filename = variables.filename;
      asset.version++;
    }
    return { renameAsset: asset };
  }
  
  if (query.includes('deleteAsset')) {
    const index = mockAssets.findIndex(a => a.id === variables.assetId);
    if (index > -1) mockAssets.splice(index, 1);
    return { deleteAsset: true };
  }
  
  if (query.includes('shareAsset')) {
    const asset = mockAssets.find(a => a.id === variables.assetId);
    if (asset) {
      asset.version++;
    }
    return { shareAsset: asset };
  }
  
  return {};
}

export const queries = {
  MY_ASSETS: `
    query MyAssets($after: String, $first: Int, $q: String) {
      myAssets(after: $after, first: $first, q: $q) {
        edges {
          cursor
          node {
            id
            filename
            mime
            size
            sha256
            status
            version
            createdAt
            updatedAt
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  `,
  
  GET_DOWNLOAD_URL: `
    query GetDownloadUrl($assetId: ID!) {
      getDownloadUrl(assetId: $assetId) {
        url
        expiresAt
      }
    }
  `
};

export const mutations = {
  CREATE_UPLOAD_URL: `
    mutation CreateUploadUrl($filename: String!, $mime: String!, $size: Int!) {
      createUploadUrl(filename: $filename, mime: $mime, size: $size) {
        assetId
        storagePath
        uploadUrl
        expiresAt
        nonce
      }
    }
  `,
  
  FINALIZE_UPLOAD: `
    mutation FinalizeUpload($assetId: ID!, $clientSha256: String!, $version: Int!) {
      finalizeUpload(assetId: $assetId, clientSha256: $clientSha256, version: $version) {
        id
        filename
        mime
        size
        sha256
        status
        version
        createdAt
        updatedAt
      }
    }
  `,
  
  RENAME_ASSET: `
    mutation RenameAsset($assetId: ID!, $filename: String!, $version: Int!) {
      renameAsset(assetId: $assetId, filename: $filename, version: $version) {
        id
        filename
        version
      }
    }
  `,
  
  DELETE_ASSET: `
    mutation DeleteAsset($assetId: ID!, $version: Int!) {
      deleteAsset(assetId: $assetId, version: $version)
    }
  `,
  
  SHARE_ASSET: `
    mutation ShareAsset($assetId: ID!, $toEmail: String!, $canDownload: Boolean!, $version: Int!) {
      shareAsset(assetId: $assetId, toEmail: $toEmail, canDownload: $canDownload, version: $version) {
        id
        version
      }
    }
  `,
  
  REVOKE_SHARE: `
    mutation RevokeShare($assetId: ID!, $toEmail: String!, $version: Int!) {
      revokeShare(assetId: $assetId, toEmail: $toEmail, version: $version) {
        id
        version
      }
    }
  `
};

export { graphqlRequest };