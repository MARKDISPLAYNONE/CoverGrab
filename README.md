# CoverGrab

**YouTube & YouTube Music Cover Art Downloader**

A free, fast web tool to download cover art and thumbnails from YouTube and YouTube Music videos. No ads, no login, no clutter.

🌐 **Live Site**: [covergrab.netlify.app](https://covergrab.netlify.app)

## Features

- ✨ **Simple**: Paste a link, get the cover art, download
- ⚡ **Fast**: All processing happens in your browser
- 🎵 **YouTube Music Support**: Works with music.youtube.com links
- 📱 **Mobile Friendly**: Responsive design, long-press to save
- 🔒 **Privacy Focused**: No personal data collected
- 🆓 **100% Free**: No premium tiers or hidden fees

## Supported Links

- `https://youtube.com/watch?v=...`
- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://m.youtube.com/watch?v=...`
- `https://music.youtube.com/watch?v=...`

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Netlify Functions (serverless)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Netlify

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/MARKDISPLAYNONE/CoverGrab.git
   cd CoverGrab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Set up Supabase:
   - Create a free project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `database/schema.sql`
   - Add your Supabase URL and service key to `.env`

5. Start development server:
   ```bash
   npm run dev
   ```

### Project Structure

```
├── database/
│   └── schema.sql          # PostgreSQL schema for analytics
├── netlify/
│   └── functions/
│       └── event.ts        # Analytics ingestion endpoint
├── public/
│   ├── favicon.svg
│   ├── og-image.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── _redirects
├── src/
│   ├── components/
│   │   ├── AnalyticsProvider.tsx
│   │   ├── CoverTool.tsx
│   │   └── Layout.tsx
│   ├── pages/
│   │   ├── FaqPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── HowToPage.tsx
│   │   └── ThumbnailDownloaderPage.tsx
│   ├── utils/
│   │   ├── analytics.ts
│   │   └── cn.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── netlify.toml
├── package.json
└── README.md
```

## Deployment

### Netlify

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `IP_HASH_SALT`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (not anon key) | Yes |
| `IP_HASH_SALT` | Random salt for hashing IP addresses | Yes |
| `ADMIN_EMAIL` | Admin login email address | Yes (Phase 3) |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password | Yes (Phase 3) |
| `JWT_SECRET` | Secret for signing JWT tokens (64+ chars) | Yes (Phase 3) |
| `TOTP_SECRET` | Base32 TOTP secret for 2FA | Optional |

## Analytics Events

CoverGrab tracks anonymous usage events:

| Event | Description |
|-------|-------------|
| `page_view` | Page load with viewport dimensions |
| `cover_success` | Successfully loaded cover art |
| `download` | User clicked download button |
| `bad_url` | Input couldn't be parsed as URL |
| `invalid_domain` | URL domain not supported |
| `invalid_video_id` | No valid video ID found |
| `no_thumbnail` | All thumbnail variants failed |
| `cta_bmc` | User clicked support/BMC button |
| `cta_leave` | User clicked leave with quote button |

## Admin Dashboard

CoverGrab includes a private admin dashboard at `/admin` for viewing analytics.

### Features
- **Authentication**: Secure login with email/password + optional TOTP 2FA
- **Summary Stats**: Page views, cover successes, downloads, conversion rates
- **Performance Metrics**: P50/P95 time-to-cover
- **Breakdowns**: Top countries, link types, thumbnail sizes
- **Time Series**: Daily trends for the last 7/30 days
- **Error Tracking**: Bad URLs, invalid domains, failed thumbnails

### Setting Up Admin Access

1. Generate a bcrypt hash of your password:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
   ```

2. Generate a JWT secret:
   ```bash
   openssl rand -hex 64
   ```

3. Add environment variables to Netlify:
   - `ADMIN_EMAIL` - Your admin email
   - `ADMIN_PASSWORD_HASH` - The bcrypt hash from step 1
   - `JWT_SECRET` - The random string from step 2
   - (Optional) `TOTP_SECRET` - For 2FA, generate with an authenticator app

4. Access the dashboard at `/admin/login`

## Privacy

- No personal information collected
- IP addresses are hashed (SHA-256) with salt
- Only country code derived from GeoIP
- No tracking cookies
- No third-party analytics

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please open an issue or pull request.

---

Built with ❤️ for music lovers who want their cover art.
