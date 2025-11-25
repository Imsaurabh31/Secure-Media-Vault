import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

function normalizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 255);
}

function validatePath(path: string): boolean {
  return !path.includes('..') && !path.includes('//') && path.length > 0;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function createError(code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'BAD_REQUEST' | 'VERSION_CONFLICT' | 'NOT_FOUND' | 'INTEGRITY_ERROR', message: string) {
  const error = new Error(message);
  (error as any).extensions = { code };
  return error;
}

async function getUser(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw createError('UNAUTHENTICATED', 'Invalid token');
  return user;
}

async function verifyMimeType(buffer: ArrayBuffer, declaredMime: string): Promise<boolean> {
  if (!ALLOWED_MIMES.includes(declaredMime as any)) return false;
  
  const bytes = new Uint8Array(buffer);
  const magicBytes = MAGIC_BYTES[declaredMime];
  
  if (!magicBytes) return false;
  
  return magicBytes.every((byte, i) => bytes[i] === byte);
}

export const resolvers = {
  Query: {
    async myAssets(_: any, { after, first = 20, q }: any, { token }: any) {
      const user = await getUser(token);
      
      let query = supabase
        .from('asset')
        .select('*')
        .or(`owner_id.eq.${user.id},asset_share!inner(to_user.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(first + 1);

      if (after) {
        query = query.gt('created_at', after);
      }

      if (q) {
        query = query.ilike('filename', `%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw createError('BAD_REQUEST', error.message);

      const hasNextPage = data.length > first;
      const edges = data.slice(0, first).map(asset => ({
        cursor: asset.created_at,
        node: asset
      }));

      return {
        edges,
        pageInfo: {
          endCursor: edges[edges.length - 1]?.cursor,
          hasNextPage
        }
      };
    },

    async getDownloadUrl(_: any, { assetId }: any, { token }: any) {
      const user = await getUser(token);
      
      const { data: asset, error } = await supabase
        .from('asset')
        .select('*, asset_share(*)')
        .eq('id', assetId)
        .single();

      if (error || !asset) throw createError('NOT_FOUND', 'Asset not found');
      
      const canAccess = asset.owner_id === user.id || 
        asset.asset_share.some((share: any) => share.to_user === user.id && share.can_download);
      
      if (!canAccess) throw createError('FORBIDDEN', 'Access denied');
      if (asset.status !== 'ready') throw createError('BAD_REQUEST', 'Asset not ready');

      const expiresAt = new Date(Date.now() + 90 * 1000);
      
      const { data: signedUrl } = await supabase.storage
        .from('private')
        .createSignedUrl(asset.storage_path, 90);

      if (!signedUrl) throw createError('BAD_REQUEST', 'Failed to create download URL');

      // Audit log
      await supabase.from('download_audit').insert({
        asset_id: assetId,
        user_id: user.id
      });

      return {
        url: signedUrl.signedUrl,
        expiresAt: expiresAt.toISOString()
      };
    }
  },

  Mutation: {
    async createUploadUrl(_: any, { filename, mime, size }: any, { token }: any) {
      const user = await getUser(token);
      
      if (!ALLOWED_MIMES.includes(mime)) {
        throw createError('BAD_REQUEST', 'Invalid MIME type');
      }

      const safeFilename = normalizeFilename(filename);
      const assetId = randomBytes(16).toString('hex');
      const nonce = randomBytes(32).toString('hex');
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const storagePath = `${user.id}/${year}/${month}/${assetId}-${safeFilename}`;
      
      if (!validatePath(storagePath)) {
        throw createError('BAD_REQUEST', 'Invalid file path');
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create asset record
      const { error: assetError } = await supabase.from('asset').insert({
        id: assetId,
        owner_id: user.id,
        filename: safeFilename,
        mime,
        size,
        storage_path: storagePath,
        status: 'draft'
      });

      if (assetError) throw createError('BAD_REQUEST', assetError.message);

      // Create upload ticket
      const { error: ticketError } = await supabase.from('upload_ticket').insert({
        asset_id: assetId,
        user_id: user.id,
        nonce,
        mime,
        size,
        storage_path: storagePath,
        expires_at: expiresAt.toISOString()
      });

      if (ticketError) throw createError('BAD_REQUEST', ticketError.message);

      // Generate signed upload URL
      const { data: uploadUrl, error: urlError } = await supabase.storage
        .from('private')
        .createSignedUploadUrl(storagePath);

      if (urlError || !uploadUrl) {
        throw createError('BAD_REQUEST', 'Failed to create upload URL');
      }

      return {
        assetId,
        storagePath,
        uploadUrl: uploadUrl.signedUrl,
        expiresAt: expiresAt.toISOString(),
        nonce
      };
    },

    async finalizeUpload(_: any, { assetId, clientSha256, version }: any, { token }: any) {
      const user = await getUser(token);
      
      // Get ticket and asset
      const { data: ticket, error: ticketError } = await supabase
        .from('upload_ticket')
        .select('*')
        .eq('asset_id', assetId)
        .eq('user_id', user.id)
        .single();

      if (ticketError || !ticket) {
        throw createError('NOT_FOUND', 'Upload ticket not found');
      }

      if (ticket.used) {
        // Idempotent - return existing asset
        const { data: asset } = await supabase
          .from('asset')
          .select('*')
          .eq('id', assetId)
          .single();
        return asset;
      }

      if (new Date(ticket.expires_at) < new Date()) {
        throw createError('BAD_REQUEST', 'Upload ticket expired');
      }

      // Call edge function to compute server hash
      const hashResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/hash-object`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: ticket.storage_path })
      });

      if (!hashResponse.ok) {
        throw createError('INTEGRITY_ERROR', 'Failed to verify file integrity');
      }

      const { sha256: serverSha256, size: actualSize } = await hashResponse.json();

      if (serverSha256 !== clientSha256) {
        // Mark as corrupt
        await supabase.from('asset')
          .update({ status: 'corrupt' })
          .eq('id', assetId);
        throw createError('INTEGRITY_ERROR', 'Hash mismatch');
      }

      if (actualSize !== ticket.size) {
        await supabase.from('asset')
          .update({ status: 'corrupt' })
          .eq('id', assetId);
        throw createError('INTEGRITY_ERROR', 'Size mismatch');
      }

      // Verify MIME type
      const { data: fileData } = await supabase.storage
        .from('private')
        .download(ticket.storage_path);

      if (fileData) {
        const buffer = await fileData.arrayBuffer();
        const isValidMime = await verifyMimeType(buffer, ticket.mime);
        
        if (!isValidMime) {
          await supabase.from('asset')
            .update({ status: 'corrupt' })
            .eq('id', assetId);
          throw createError('INTEGRITY_ERROR', 'MIME type verification failed');
        }
      }

      // Mark ticket as used and update asset
      await supabase.from('upload_ticket')
        .update({ used: true })
        .eq('asset_id', assetId);

      const { data: asset, error: updateError } = await supabase
        .from('asset')
        .update({
          status: 'ready',
          sha256: serverSha256,
          version: version + 1
        })
        .eq('id', assetId)
        .eq('version', version)
        .select()
        .single();

      if (updateError) {
        throw createError('BAD_REQUEST', updateError.message);
      }
      
      if (!asset) {
        throw createError('VERSION_CONFLICT', 'Version conflict');
      }

      return asset;
    },

    async renameAsset(_: any, { assetId, filename, version }: any, { token }: any) {
      const user = await getUser(token);
      const safeFilename = normalizeFilename(filename);

      const { data: asset, error } = await supabase
        .from('asset')
        .update({ 
          filename: safeFilename,
          version: version + 1
        })
        .eq('id', assetId)
        .eq('owner_id', user.id)
        .eq('version', version)
        .select()
        .single();

      if (error) {
        throw createError('BAD_REQUEST', error.message);
      }
      
      if (!asset) {
        throw createError('VERSION_CONFLICT', 'Version conflict');
      }

      return asset;
    },

    async shareAsset(_: any, { assetId, toEmail, canDownload, version }: any, { token }: any) {
      const user = await getUser(token);

      // Find user by email
      const { data: targetUser } = await supabase.auth.admin.listUsers();
      const toUser = targetUser.users.find(u => u.email === toEmail);
      
      if (!toUser) throw createError('NOT_FOUND', 'User not found');

      // Verify ownership and version
      const { data: asset } = await supabase
        .from('asset')
        .select('*')
        .eq('id', assetId)
        .eq('owner_id', user.id)
        .eq('version', version)
        .single();

      if (!asset) throw createError('NOT_FOUND', 'Asset not found or version mismatch');

      // Create share
      await supabase.from('asset_share').upsert({
        asset_id: assetId,
        to_user: toUser.id,
        can_download: canDownload
      });

      // Update asset version
      const { data: updatedAsset, error } = await supabase
        .from('asset')
        .update({ version: version + 1 })
        .eq('id', assetId)
        .select()
        .single();

      if (error) throw createError('BAD_REQUEST', error.message);
      return updatedAsset;
    },

    async revokeShare(_: any, { assetId, toEmail, version }: any, { token }: any) {
      const user = await getUser(token);

      const { data: targetUser } = await supabase.auth.admin.listUsers();
      const toUser = targetUser.users.find(u => u.email === toEmail);
      
      if (!toUser) throw createError('NOT_FOUND', 'User not found');

      await supabase.from('asset_share')
        .delete()
        .eq('asset_id', assetId)
        .eq('to_user', toUser.id);

      const { data: asset, error } = await supabase
        .from('asset')
        .update({ version: version + 1 })
        .eq('id', assetId)
        .eq('owner_id', user.id)
        .eq('version', version)
        .select()
        .single();

      if (error) {
        throw createError('BAD_REQUEST', error.message);
      }
      
      if (!asset) {
        throw createError('VERSION_CONFLICT', 'Version conflict');
      }

      return asset;
    },

    async deleteAsset(_: any, { assetId, version }: any, { token }: any) {
      const user = await getUser(token);

      const { data: asset } = await supabase
        .from('asset')
        .select('storage_path')
        .eq('id', assetId)
        .eq('owner_id', user.id)
        .eq('version', version)
        .single();

      if (!asset) throw createError('NOT_FOUND', 'Asset not found or version mismatch');

      // Delete from storage
      await supabase.storage
        .from('private')
        .remove([asset.storage_path]);

      // Delete from database (cascades to shares, tickets, audit logs)
      const { data: deletedRows, error } = await supabase
        .from('asset')
        .delete()
        .eq('id', assetId)
        .eq('owner_id', user.id)
        .eq('version', version)
        .select();

      if (error) {
        throw createError('BAD_REQUEST', error.message);
      }
      
      if (!deletedRows || deletedRows.length === 0) {
        throw createError('VERSION_CONFLICT', 'Version conflict');
      }

      return true;
    }
  }
};