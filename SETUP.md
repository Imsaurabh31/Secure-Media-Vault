# Setup Instructions

## Prerequisites
- Node.js 18+
- Supabase CLI
- Supabase project

## 1. Supabase Setup

### Create Project
1. Go to https://supabase.com
2. Create new project
3. Note your project URL and keys

### Database Migration
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Storage Bucket
1. Go to Storage in Supabase Dashboard
2. Create bucket named `private`
3. Set to Private (not public)

### Edge Function
```bash
supabase functions deploy hash-object
supabase secrets set SUPABASE_URL=YOUR_URL
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY
```

## 2. Environment Setup

### API (.env in apps/api/)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_URL=http://localhost:5173
PORT=4000
```

### Web (.env in apps/web/)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:4000/graphql
```

## 3. Install & Run

```bash
npm install
cd packages/shared && npm install && npm run build
cd ../../apps/api && npm install
cd ../web && npm install
cd ../..
npm run dev
```

## 4. Test Features

1. Sign up with email/password
2. Upload files (JPEG, PNG, WebP, PDF)
3. Watch upload progress and status
4. Copy download links (90s expiry)
5. Rename files inline
6. Test version conflicts
7. Use dev tools for network simulation