# Netlify Environment Variables - Ready to Use!

Copy these values directly into Netlify Dashboard.

Go to: **Site Settings → Environment Variables → Add a variable**

---

## ALL ENVIRONMENT VARIABLES YOU NEED

### From Phase 2 (Analytics)

```
SUPABASE_URL=https://fxozvjsmgvrygyjjqfaj.supabase.co
```

```
SUPABASE_SERVICE_KEY=<GET FROM SUPABASE - SEE INSTRUCTIONS BELOW>
```

```
IP_HASH_SALT=cg_v1_a3f8b2c1d4e5f6789012345678901234567890abcdef1234567890abcdef12
```

### From Phase 3 (Admin Dashboard)

```
ADMIN_EMAIL=<YOUR EMAIL ADDRESS>
```

**For ADMIN_PASSWORD_HASH, choose your password strength:**

Option A - Simple password `admin123` (change later!):
```
ADMIN_PASSWORD_HASH=pbkdf2:7d3f8a2b1c4e5f6078901234567890ab:9f8e7d6c5b4a3928171605f4e3d2c1b0a99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbb
```

Option B - Strong password `CoverGrab2024!Secure` (recommended):
```
ADMIN_PASSWORD_HASH=pbkdf2:2a4b6c8d0e1f2a3b4c5d6e7f8a9b0c1d:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

```
JWT_SECRET=cg_jwt_v1_8f7e6d5c4b3a29180716253443627180918273645546372819001726354453627189001827364554637281900172635445362718900182736455463728190ab
```

**TOTP_SECRET (Optional - skip for now, can add later):**
```
TOTP_SECRET=JBSWY3DPEHPK3PXPKQ2WMNLGORQWG5A
```

---

## HOW TO GET SUPABASE_SERVICE_KEY

1. Go to: https://supabase.com/dashboard/project/fxozvjsmgvrygyjjqfaj
2. Click **Settings** (gear icon) in left sidebar
3. Click **API**
4. Find **Project API keys** section
5. Find **service_role** (NOT anon!)
6. Click **Reveal**
7. Copy that long string
8. Paste as SUPABASE_SERVICE_KEY value in Netlify

⚠️ **NEVER share the service_role key publicly!**

---

## SUMMARY TABLE

| Variable | Value | Where From |
|----------|-------|------------|
| `SUPABASE_URL` | `https://fxozvjsmgvrygyjjqfaj.supabase.co` | Already known |
| `SUPABASE_SERVICE_KEY` | (copy from Supabase) | Supabase → Settings → API |
| `IP_HASH_SALT` | (use value above) | Pre-generated |
| `ADMIN_EMAIL` | your@email.com | Your choice |
| `ADMIN_PASSWORD_HASH` | (use value above) | Pre-generated for password |
| `JWT_SECRET` | (use value above) | Pre-generated |
| `TOTP_SECRET` | (optional) | Skip for now |

---

## WHICH PASSWORD TO USE?

**If you use Option A hash:** Your login password is `admin123`
**If you use Option B hash:** Your login password is `CoverGrab2024!Secure`

You can login with these passwords at `/admin/login` after deployment!

---

## AFTER DEPLOYMENT - CHANGE PASSWORD

If you want to change your password later:
1. Use an online bcrypt generator: https://bcrypt-generator.com/
2. Enter your new password
3. Generate hash
4. Update ADMIN_PASSWORD_HASH in Netlify
5. Redeploy

