# Demo Instructions

This is a working demo of the Secure Media Vault with mock data.

## What's Working

✅ **Authentication**: Sign up/sign in with any email/password  
✅ **Upload Flow**: Drag & drop files to see upload simulation  
✅ **Gallery**: View uploaded assets with status indicators  
✅ **Asset Management**: Rename, delete, and copy download links  
✅ **Dev Tools**: Toggle network failure simulation  
✅ **Error Handling**: Version conflicts and retry logic  

## Demo Features

- **Mock Backend**: No real Supabase needed - everything works locally
- **Simulated Uploads**: Files show progress and complete successfully
- **Download Links**: Generate mock URLs with countdown timers
- **Network Simulation**: Use dev tools to test failure scenarios

## How to Test

1. **Sign Up**: Use any email/password (e.g., demo@test.com / password123)
2. **Upload Files**: Drag images or PDFs to the upload area
3. **Watch Progress**: See upload progress bars and status changes
4. **Copy Links**: Click "Copy Link" to get download URLs with countdown
5. **Test Failures**: Enable dev tools to simulate network issues
6. **Rename Files**: Click on filenames to edit them inline
7. **Version Conflicts**: Try renaming the same file from two tabs

## Security Features Demonstrated

- Single-use upload tickets (simulated)
- Hash integrity verification (mocked)
- Expiring download links (90s countdown)
- Version conflict handling (409 errors)
- MIME type validation
- Path sanitization

## Real Implementation

To use with real Supabase:
1. Create Supabase project
2. Run migrations from `supabase/migrations/`
3. Deploy edge function from `edge/hash-object/`
4. Update `.env` files with real credentials
5. Replace mock implementations with real Supabase clients