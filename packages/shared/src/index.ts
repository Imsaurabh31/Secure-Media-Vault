export interface Asset {
  id: string;
  filename: string;
  mime: string;
  size: number;
  sha256?: string;
  status: 'draft' | 'uploading' | 'ready' | 'corrupt';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadTicket {
  assetId: string;
  storagePath: string;
  uploadUrl: string;
  expiresAt: string;
  nonce: string;
}

export interface DownloadLink {
  url: string;
  expiresAt: string;
}

export interface AssetEdge {
  cursor: string;
  node: Asset;
}

export interface PageInfo {
  endCursor?: string;
  hasNextPage: boolean;
}

export interface AssetConnection {
  edges: AssetEdge[];
  pageInfo: PageInfo;
}

export const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'application/pdf'
] as const;

export const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

export function normalizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 255);
}

export function validatePath(path: string): boolean {
  return !path.includes('..') && !path.includes('//') && path.length > 0;
}