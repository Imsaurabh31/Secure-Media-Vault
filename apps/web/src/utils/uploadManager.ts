import CryptoJS from 'crypto-js';
import { graphqlRequest, mutations } from '../graphql';
import type { UploadTicket, Asset } from '../types';

interface UploadState {
  status: 'idle' | 'requestingTicket' | 'uploading' | 'verifying' | 'complete' | 'error';
  progress: number;
  abortController?: AbortController;
  error?: string;
  retriable?: boolean;
}

export class UploadManager {
  private static instance: UploadManager;
  private uploads = new Map<string, UploadState>();
  private retryQueue: string[] = [];

  static getInstance(): UploadManager {
    if (!UploadManager.instance) {
      UploadManager.instance = new UploadManager();
    }
    return UploadManager.instance;
  }

  private constructor() {
    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('Back online - processing retry queue');
      this.processRetryQueue();
    });
    
    window.addEventListener('offline', () => {
      console.log('Gone offline - uploads will be queued');
    });
  }

  async startUpload(
    ticket: UploadTicket,
    _file: File,
    onProgress: (progress: number) => void,
    onComplete: (asset: Asset) => void,
    onError: (error: string) => void
  ) {
    const abortController = new AbortController();
    
    this.uploads.set(ticket.assetId, {
      status: 'uploading',
      progress: 0,
      abortController
    });

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        if (abortController.signal.aborted) return;
        this.updateUploadState(ticket.assetId, { progress: i });
        onProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const failureRate = (window as any).__DEV_FAILURE_RATE__ || 0;
        if (failureRate > 0 && Math.random() * 100 < failureRate) {
          throw new Error('Simulated network failure');
        }
      }
      
      const clientSha256 = 'demo-hash-' + Date.now();

      // Finalize upload
      this.updateUploadState(ticket.assetId, { status: 'verifying' });
      
      const data = await graphqlRequest(mutations.FINALIZE_UPLOAD, {
        assetId: ticket.assetId,
        clientSha256,
        version: 1
      });

      this.updateUploadState(ticket.assetId, { status: 'complete' });
      onComplete(data.finalizeUpload);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.uploads.delete(ticket.assetId);
        return;
      }

      this.updateUploadState(ticket.assetId, { 
        status: 'error', 
        error: error.message,
        retriable: true
      });

      if (!navigator.onLine) {
        this.retryQueue.push(ticket.assetId);
        console.log('Queued for retry when online:', ticket.assetId);
      }

      onError(error.message);
    }
  }



  private updateUploadState(assetId: string, updates: Partial<UploadState>) {
    const current = this.uploads.get(assetId);
    if (current) {
      this.uploads.set(assetId, { ...current, ...updates });
    }
  }

  getUploadState(assetId: string): UploadState | undefined {
    return this.uploads.get(assetId);
  }

  cancelUpload(assetId: string) {
    const state = this.uploads.get(assetId);
    if (state?.abortController) {
      state.abortController.abort();
    }
    this.uploads.delete(assetId);
  }

  retryUpload(assetId: string) {
    // In a real implementation, we'd need to store the original ticket and file
    // For now, just remove from error state
    this.uploads.delete(assetId);
    alert('Retry functionality requires re-uploading the file');
  }

  private processRetryQueue() {
    // Process queued uploads when back online
    const queue = [...this.retryQueue];
    this.retryQueue = [];
    
    queue.forEach(assetId => {
      // In a real implementation, retry the upload
      console.log('Retrying upload for asset:', assetId);
    });
  }
}