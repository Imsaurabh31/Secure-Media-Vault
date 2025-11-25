# Secure Media Vault

A private media library where signed-in users can securely upload files to Supabase Storage using one-time server-issued upload tickets, then finalize files with integrity checks, view assets in a gallery, and fetch short-lived download links (expiring in ~90s). Access is row-scoped: only owners and explicitly shared users can see/get links. The UI shows a resilient upload state machine with progress, cancel, retry, and clear error messages.

## Prerequisites

### Required Software
- **Node.js 18+** (recommended: 20.x LTS)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node --version`
- **npm** (comes with Node.js) or **pnpm** (recommended)
  - Install pnpm: `npm install -g pnpm`
  - Verify: `npm --version` or `pnpm --version`
- **Git** for cloning repository
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify: `git --version`

### Supabase Setup
- **Supabase CLI**: `npm install -g @supabase/cli`
  - Verify: `supabase --version`
- **Supabase Account**: Sign up at [supabase.com](https://supabase.com) (free tier works)
- **Docker** (optional, for local Supabase development)
  - Download from [docker.com](https://www.docker.com/)

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space for dependencies

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd secure-media-vault

# Install root dependencies
npm install

# Build shared package first (required by other packages)
cd packages/shared
npm install
npm run build
cd ../..

# Install API dependencies
cd apps/api
npm install
cd ..

# Install web dependencies
cd web
npm install
cd ../..

# Alternative: Use the convenience script
# npm run install-all
```

### 2. Supabase Project Setup

#### Create Supabase Project
1. **Sign up/Login**: Go to [https://supabase.com](https://supabase.com)
2. **Create Organization**: If first time, create an organization
3. **New Project**: Click "New Project" button
4. **Project Details**:
   - Name: `secure-media-vault` (or your choice)
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to your location
5. **Wait**: Project creation takes ~2 minutes
6. **Verify**: Project dashboard should be accessible

#### Initialize Local Supabase
```bash
# Initialize Supabase in project directory
supabase init

# Login to Supabase CLI (opens browser)
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**Where to find PROJECT_REF:**
1. Go to your Supabase project dashboard
2. Click "Settings" in sidebar
3. Go to "General" tab
4. Copy the "Reference ID" (format: `abcdefghijklmnop`)

#### Run Database Migrations
```bash
# Push local migrations to remote database
supabase db push

# Alternative: Reset and migrate (if needed)
# supabase db reset
```

**This creates:**
- `asset` table with RLS policies for file metadata
- `asset_share` table for user-to-user sharing
- `upload_ticket` table for secure upload flow
- `download_audit` table for access logging
- Required indexes for performance
- Triggers for automatic timestamp updates
- Row-Level Security policies for access control

**Verify Migration:**
1. Go to Supabase Dashboard > Table Editor
2. Should see 4 tables: `asset`, `asset_share`, `upload_ticket`, `download_audit`
3. Check "Authentication" > "Policies" for RLS policies

#### Create Private Storage Bucket
1. **Navigate**: Go to Supabase Dashboard > Storage
2. **New Bucket**: Click "New bucket" button
3. **Configuration**:
   - **Name**: `private` (exact name required)
   - **Public**: Toggle OFF (must be private)
   - **File size limit**: 50MB (optional)
   - **Allowed MIME types**: Leave empty (handled by app)
4. **Create**: Click "Create bucket"
5. **Verify**: Bucket appears in list with "Private" label

**Important**: Do NOT make this bucket public. All access is controlled via signed URLs.

#### Deploy Edge Function
```bash
# Navigate to edge function directory
cd edge/hash-object

# Deploy the hash-object function
supabase functions deploy hash-object

# Return to project root
cd ../..
```

**Set Edge Function Environment Variables:**
```bash
# Set Supabase URL (replace with your project URL)
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Set service role key (replace with your key)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Verify Deployment:**
1. Go to Supabase Dashboard > Edge Functions
2. Should see `hash-object` function listed
3. Status should be "Active"
4. Test with: `supabase functions invoke hash-object --data '{"path":"test"}'`

### 3. Environment Variables

#### Create Environment Files

**API Environment** (`apps/api/.env`):
```bash
# Copy from apps/api/.env.example and fill in:
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CLIENT_URL=http://localhost:5173
PORT=4000
```

**Web Environment** (`apps/web/.env`):
```bash
# Copy from apps/web/.env.example and fill in:
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:4000/graphql
```

**Edge Function Environment** (set via CLI, not file):
```bash
# Already set during Edge Function deployment:
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Quick Setup Commands:**
```bash
# Copy example files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit files with your actual keys
# Use your preferred editor (nano, vim, VS Code, etc.)
```

### 4. Where to Get Supabase Keys

#### Step-by-Step Key Retrieval:
1. **Navigate**: Go to your Supabase project dashboard
2. **Settings**: Click "Settings" in the left sidebar
3. **API Section**: Click "API" tab
4. **Copy Keys**: Find and copy the following:

**Project URL** (safe to expose):
- Location: "Config" section > "URL"
- Format: `https://your-project-ref.supabase.co`
- Used in: Both web and API `.env` files

**Anon Key** (safe to expose):
- Location: "Project API keys" section > "anon" > "public"
- Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Used in: Web app `.env` file only
- Purpose: Client-side authentication

**Service Role Key** (⚠️ KEEP SECRET!):
- Location: "Project API keys" section > "service_role" > "secret"
- Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Used in: API server and Edge Function `.env` files
- Purpose: Admin access to database and storage

**Security Warning**: Never commit service role key to version control or expose in frontend code!

## Development

### Start Development Servers

**Option 1: Start Both Servers (Recommended)**
```bash
# From project root - starts both API and web servers
npm run dev

# This runs:
# - API server on http://localhost:4000/graphql
# - Web server on http://localhost:5173
# - Both with hot reload enabled
```

**Option 2: Start Individually**
```bash
# Terminal 1: API server
npm run dev:api

# Terminal 2: Web server (in separate terminal)
npm run dev:web
```

**Verify Setup:**
1. **API**: Visit http://localhost:4000/graphql (GraphQL Playground)
2. **Web**: Visit http://localhost:5173 (React app)
3. **Check Console**: No connection errors

### Build for Production
```bash
# Build all packages
npm run build

# This builds:
# - Shared types package
# - API server (TypeScript compilation)
# - Web app (Vite production build)
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (during development)
npm run test:watch
```

**Test Coverage:**
- ✅ **Version Conflicts**: 409 error handling and client reconciliation
- ✅ **Hash Integrity**: Server-side verification and corruption detection
- ✅ **Upload Security**: Ticket validation and replay prevention
- ✅ **Access Control**: RLS policy enforcement
- ✅ **MIME Validation**: Magic byte verification
- ✅ **Path Safety**: Filename sanitization and traversal prevention

### Development Workflow
1. **Make Changes**: Edit code in `apps/web/src` or `apps/api/src`
2. **Hot Reload**: Changes automatically reflected in browser
3. **Test**: Run `npm test` to verify functionality
4. **Debug**: Use browser dev tools and server logs
5. **Commit**: Use conventional commit messages

## Usage

1. **Sign Up/Sign In**: Create account with email/password
2. **Upload Files**: Drag & drop JPEG, PNG, WebP, or PDF files
3. **Monitor Progress**: Watch upload progress and status changes
4. **Manage Assets**: Rename files, copy download links, delete assets
5. **Share Assets**: Share with other users by email (optional)
6. **Download**: Get temporary download links (90s expiry)

## Security Features

- **Single-use upload tickets** bound to user, file size, MIME type
- **Server-side hash verification** via Edge Function
- **Row-Level Security** on all database tables
- **MIME type validation** using magic bytes
- **Path sanitization** prevents directory traversal
- **Expiring download links** (90 seconds)
- **Version-based concurrency control** prevents conflicts
- **Audit logging** for all download requests

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   React     │───▶│  GraphQL    │───▶│  Supabase   │
│   Frontend  │    │   API       │    │  Backend    │
│  (Port 5173)│    │ (Port 4000) │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ Upload Flow │    │ Edge Function│
                   │ State Mgmt  │    │ Hash Verify │
                   └─────────────┘    └─────────────┘
```

## API Schema

### Key Types
```graphql
type Asset {
  id: ID!
  filename: String!
  mime: String!
  size: Int!
  sha256: String
  status: String!  # "draft" | "uploading" | "ready" | "corrupt"
  version: Int!
  createdAt: String!
  updatedAt: String!
}

type UploadTicket {
  assetId: ID!
  storagePath: String!
  uploadUrl: String!
  expiresAt: String!
  nonce: String!
}
```

### Key Mutations
- `createUploadUrl(filename, mime, size)` - Get upload ticket
- `finalizeUpload(assetId, clientSha256, version)` - Complete upload
- `getDownloadUrl(assetId)` - Get temporary download link

## Troubleshooting

### Common Setup Issues

**1. Port Already in Use**
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:4000 | xargs kill -9

# Or use different port
PORT=4001 npm run dev:api
```

**2. Supabase Connection Errors**
- **Invalid PROJECT_REF**: Verify in `supabase link --project-ref YOUR_REF`
- **Wrong Keys**: Double-check `.env` files match Supabase dashboard
- **RLS Not Applied**: Run `supabase db push` to apply policies
- **Network Issues**: Check firewall/proxy settings

**3. Upload/Download Failures**
- **Edge Function**: Verify deployment with `supabase functions list`
- **Storage Bucket**: Ensure `private` bucket exists and is private
- **MIME Types**: Check allowlist in code matches uploaded files
- **File Size**: Default limit is 50MB

**4. Build/Install Errors**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Build shared package first
cd packages/shared && npm run build

# Check Node.js version
node --version  # Should be 18+
```

**5. Authentication Issues**
- **Sign Up Fails**: Check email confirmation in spam folder
- **Token Errors**: Clear browser localStorage and retry
- **CORS Errors**: Verify `CLIENT_URL` in API `.env`

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev:api

# Check browser console for client errors
# Check terminal for server errors
```

### Getting Help
1. **Check Logs**: Browser console + terminal output
2. **Verify Setup**: Follow README step-by-step
3. **Test Isolation**: Try with fresh Supabase project
4. **Documentation**: Supabase docs for platform issues

## Production Deployment

### Environment Setup
1. Set production environment variables
2. Build all packages: `npm run build`
3. Deploy API server to your hosting platform
4. Deploy web app to static hosting (Vercel, Netlify)
5. Ensure CORS settings allow your domain

### Security Checklist
- [ ] Service role key is secure
- [ ] HTTPS enabled in production
- [ ] CORS configured for production domains
- [ ] RLS policies tested
- [ ] Edge Function deployed and working
- [ ] Storage bucket is private

## FAQ

### Can I use UI libraries?
Yes, feel free to use any UI library (Material-UI, Chakra, etc.). This project uses vanilla CSS for simplicity.

### GraphQL codegen?
Yes, recommended for type safety. This project uses manual types for simplicity but codegen would improve it.

### Do I need Redis?
Optional. Could be used for caching `myAssets` queries or rate limiting. Not implemented in this version.

### Exact TTL value?
Anything ~90-120s is fine. This project uses 90s with visible countdown timers.

### Can I skip sharing?
Prefer to include it. This project has minimal sharing implementation via email.

### Do I have to implement thumbnails?
Not required. Could be added via Edge Functions processing uploaded images.

## Improvements for Production

### With More Time
- **GraphQL Codegen**: Auto-generate TypeScript types from schema
- **Redis Caching**: Cache asset queries and rate limit uploads
- **Image Thumbnails**: Generate via Edge Functions on upload
- **Chunked Uploads**: Support large files with resume capability
- **Advanced Sharing**: Expiration dates, view-only permissions
- **Admin Dashboard**: User management and analytics
- **Mobile App**: React Native with offline sync
- **CDN Integration**: CloudFront for faster downloads
- **Monitoring**: Structured logging and alerting
- **Backup Strategy**: Automated backups and disaster recovery

### Performance Optimizations
- Database connection pooling
- Asset query pagination and filtering
- Background job processing for cleanup
- Horizontal API scaling
- Read replicas for queries

### Security Enhancements
- Rate limiting per user/IP
- Content moderation via AI
- Advanced audit logging
- Penetration testing
- Security headers (CSP, HSTS)

## License

MIT