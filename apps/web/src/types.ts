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

export const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'application/pdf'
] as const;