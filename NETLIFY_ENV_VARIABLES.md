# Netlify Environment Variables – Guide (No Secrets Here)

Use this as a reference for which environment variables to set in Netlify.  
**Do not paste your real secret values into this file.**  
Secrets must be set only in the Netlify UI → Site Settings → Environment variables.

---

## Phase 2 – Analytics

Set these in Netlify:

```bash
SUPABASE_URL=<YOUR_SUPABASE_PROJECT_URL>
SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
IP_HASH_SALT=<YOUR_RANDOM_SALT_STRING>
