// Mock Supabase for demo purposes
export const mockSupabase = {
  auth: {
    getUser: async (token: string) => {
      if (token === 'demo-token') {
        return {
          data: { user: { id: 'demo-user-123', email: 'demo@example.com' } },
          error: null
        };
      }
      return { data: { user: null }, error: new Error('Invalid token') };
    },
    admin: {
      listUsers: async () => ({
        data: {
          users: [
            { id: 'demo-user-123', email: 'demo@example.com' },
            { id: 'demo-user-456', email: 'other@example.com' }
          ]
        }
      })
    }
  },
  from: (table: string) => ({
    select: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    upsert: () => mockQuery
  }),
  storage: {
    from: () => ({
      createSignedUploadUrl: async () => ({
        data: { signedUrl: 'https://demo-upload-url.com' },
        error: null
      }),
      createSignedUrl: async () => ({
        data: { signedUrl: 'https://demo-download-url.com' },
        error: null
      }),
      download: async () => ({
        data: new Blob(['demo file content']),
        error: null
      }),
      remove: async () => ({ error: null })
    })
  }
};

const mockAssets = new Map();
let assetCounter = 1;

const mockQuery = {
  eq: () => mockQuery,
  or: () => mockQuery,
  gt: () => mockQuery,
  ilike: () => mockQuery,
  order: () => mockQuery,
  limit: () => mockQuery,
  single: async () => {
    // Return mock asset data
    return {
      data: {
        id: 'demo-asset-123',
        owner_id: 'demo-user-123',
        filename: 'demo-file.jpg',
        mime: 'image/jpeg',
        size: 1024000,
        storage_path: 'demo/path/file.jpg',
        status: 'ready',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        asset_share: []
      },
      error: null
    };
  },
  then: async (callback: any) => {
    const result = {
      data: [
        {
          id: 'demo-asset-123',
          owner_id: 'demo-user-123',
          filename: 'demo-file.jpg',
          mime: 'image/jpeg',
          size: 1024000,
          storage_path: 'demo/path/file.jpg',
          status: 'ready',
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      error: null
    };
    return callback ? callback(result) : result;
  }
};

// Make it work like a promise
Object.assign(mockQuery, {
  then: mockQuery.then,
  catch: () => mockQuery
});