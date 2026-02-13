# CoverGrab - Complete Setup Instructions

## Quick Start for GitHub Push

### Prerequisites
- Git installed on your machine
- Node.js 18+ installed
- A terminal/command line

### Step 1: Create Project Folder

```bash
mkdir CoverGrab
cd CoverGrab
```

### Step 2: Initialize npm and install dependencies

```bash
npm init -y
npm install react react-dom react-router-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss postcss autoprefixer
npm install pg @netlify/functions
```

### Step 3: Create all project files

You need to create each file from the artifact/project. The file structure is:

```
CoverGrab/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml
├── .env.example
├── .gitignore
├── README.md
├── database/
│   └── schema.sql
├── netlify/
│   └── functions/
│       └── event.ts
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── favicon.svg
│   ├── og-image.svg
│   └── _redirects
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── lib/
    │   └── analytics.ts
    ├── components/
    │   ├── Layout.tsx
    │   ├── CoverTool.tsx
    │   └── AnalyticsProvider.tsx
    └── pages/
        ├── HomePage.tsx
        ├── HowToPage.tsx
        ├── ThumbnailDownloaderPage.tsx
        └── FaqPage.tsx
```

### Step 4: Initialize Git and Push

```bash
git init
git add .
git commit -m "CoverGrab Phase 1 + Phase 2: MVP with Analytics Infrastructure"
git branch -M main
git remote add origin https://github.com/MARKDISPLAYNONE/CoverGrab.git
git push -u origin main
```

If the push fails because the repo isn't empty, use:
```bash
git push -u origin main --force
```

### Step 5: Set Up Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Select your CoverGrab repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### Step 6: Add Environment Variables in Netlify

1. In Netlify, go to Site settings → Environment variables
2. Add these variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@db.fxozvjsmgvrygyjjqfaj.supabase.co:5432/postgres` |
| `IP_HASH_SALT` | `covergrab_analytics_salt_2024_secure_random_string` |

3. Trigger a redeploy: Deploys → Trigger deploy → Deploy site

### Step 7: Test

1. Visit your Netlify URL
2. Open DevTools (F12) → Network tab
3. Use the cover art tool
4. Look for requests to `/.netlify/functions/event`
5. They should return 200 status

### Step 8: Verify in Supabase

Go to SQL Editor and run:
```sql
SELECT event_type, COUNT(*) FROM events GROUP BY event_type;
```

You should see your events!
