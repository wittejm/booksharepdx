# Infrastructure

## Stack Overview

**Frontend:** Vercel
**Backend:** Google Cloud Run
**Database:** Neon (Serverless Postgres)
**File Storage:** Cloudflare R2 (future)

## Why This Stack

- **Cost:** Free tier covers early usage, scales gradually to ~$5-15/month
- **Serverless:** Backend and database scale to zero when idle
- **Performance:** Global CDN (Vercel) + edge deployment (Cloud Run)
- **Developer Experience:** Push to deploy, minimal ops overhead

## Current Status

- ✅ Frontend built and ready for Vercel deployment
- ⏳ Backend not yet implemented
- ⏳ Database not yet configured

## Estimated Costs

| Traffic Level | Monthly Cost |
|---------------|--------------|
| <50k requests/mo | $0 (free tier) |
| 50k-200k requests/mo | $5-10 |
| 200k-500k requests/mo | $15-25 |

## Deployment Flow

1. Push to `main` branch
2. Vercel auto-deploys frontend
3. Cloud Run auto-deploys backend (when implemented)
4. Neon handles database (always available)

## Infrastructure as Code (Terraform)

All infrastructure can be managed via Terraform for reproducibility and version control.

### Terraform Providers

| Service | Provider | Documentation |
|---------|----------|---------------|
| Vercel | `vercel/vercel` | https://registry.terraform.io/providers/vercel/vercel |
| Neon | `kislerdm/neon` | https://registry.terraform.io/providers/kislerdm/neon |
| Google Cloud | `hashicorp/google` | https://registry.terraform.io/providers/hashicorp/google |

### Recommended Approach

**Phase 1 (Current):** Manual deployment via web UIs
- Faster initial setup
- Vercel GitHub integration is excellent
- Good for experimentation

**Phase 2 (When backend is ready):** Migrate to Terraform
- Add `terraform/` directory with configs
- Manage GCP resources (Cloud Run, IAM, secrets)
- Manage Neon database and branches
- Optional: Manage Vercel project (GitHub integration may be sufficient)

### State Management

When implementing Terraform:
- Store state in GCS bucket or Terraform Cloud
- Never commit `.tfstate` files to git
- Use remote state for team collaboration

---

## Setup Instructions

### Domain Architecture

| Subdomain | Purpose | Points To |
|-----------|---------|-----------|
| `staging.booksharepdx.com` | Staging frontend | Vercel |
| `api-staging.booksharepdx.com` | Staging backend API | Cloud Run |
| `booksharepdx.com` | Production frontend (later) | Vercel |
| `api.booksharepdx.com` | Production backend (later) | Cloud Run |

---

### 1. Neon Database Setup

**URL:** https://neon.tech

#### Steps:
1. Sign up with GitHub or email
2. Click "Create Project"
3. **Project name:** `booksharepdx-staging`
4. **Cloud provider:** AWS
5. **Region:** US West 2 (Oregon)
6. **Postgres version:** 16 (latest)
7. Click "Create Project"

#### After Creation:
1. Go to your project dashboard
2. Click "Connection Details" in the sidebar
3. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-something-123456.us-west-2.aws.neon.tech/neondb?sslmode=require
   ```

#### Enable PostGIS (for geospatial queries):
1. Go to "SQL Editor" in sidebar
2. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Verify with:
   ```sql
   SELECT PostGIS_Version();
   ```

#### What to report back:
- [X] Connection string (keep password secret - share privately or use env vars)
- [X] Confirm PostGIS is enabled

---

### 2. Resend Email Setup

**URL:** https://resend.com

#### Steps:
1. Sign up with GitHub or email
2. From dashboard, go to "API Keys"
3. Click "Create API Key"
   - **Name:** `booksharepdx-staging`
   - **Permission:** Full access
   - **Domain:** All domains (for now)
4. Copy the API key (starts with `re_`)

#### Domain Verification (for sending from @booksharepdx.com):
1. Go to "Domains" → "Add Domain"
2. Enter: `booksharepdx.com`
3. Resend will show you DNS records to add

#### DNS Records to Add at Porkbun:
Resend will provide these exact values, but they'll look like:

| Type | Host | Value |
|------|------|-------|
| TXT | resend._domainkey | `p=MIGfMA0GCSqGSIb3DQEBA...` (from Resend) |
| TXT | @ | `v=spf1 include:amazonses.com ~all` |

#### After Adding DNS:
1. Wait 5-10 minutes
2. Click "Verify" in Resend
3. Status should change to "Verified"

#### What to report back:
- [X] API key (keep secret - share privately or use env vars)
- [X] Domain verification status (verified/pending) PENDING

---

### 3. Google Cloud Setup

**URL:** https://console.cloud.google.com

#### Create Project:
1. Click project dropdown (top left) → "New Project"
2. **Project name:** `booksharepdx`
3. **Project ID:** `booksharepdx` (or auto-generated)
4. Click "Create"

#### Enable Required APIs:
1. Go to "APIs & Services" → "Enable APIs and Services"
2. Search and enable:
   - **Cloud Run Admin API**
   - **Container Registry API** (or Artifact Registry API)
   - **Cloud Build API**
   - **Secret Manager API**

#### Set Up Service Account (for GitHub Actions):
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
   - **Name:** `github-actions`
   - **ID:** `github-actions`
3. Grant roles:
   - `Cloud Run Admin`
   - `Storage Admin`
   - `Service Account User`
   - `Cloud Build Editor`
4. Click "Done"
5. Click on the service account → "Keys" → "Add Key" → "Create new key"
6. Choose JSON → Download

#### Get Project Number:
1. Go to project "Settings" (or Dashboard)
2. Find "Project number" (a long number like `31852991012`)

#### What to report back:
- [X] Project ID
- [X] Project number
- [X] Service account JSON key file (keep very secret!)

---

### 4. DNS Setup (Cloudflare)

**Domain Registrar:** Porkbun (nameservers pointed to Cloudflare)
**DNS Management:** Cloudflare

**URL:** https://dash.cloudflare.com → booksharepdx.com → DNS → Records

#### Configuration:
The domain `booksharepdx.com` is registered at Porkbun, but nameservers are set to Cloudflare. All DNS records are managed in the Cloudflare dashboard.

#### Add These Records in Cloudflare:

**For Vercel (frontend):**
| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | staging | cname.vercel-dns.com | DNS only |

**For Cloud Run (backend):**
| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | api-staging | ghs.googlehosted.com | DNS only |

**For Resend (email) - values from Resend dashboard:**
| Type | Name | Content | Proxy |
|------|------|---------|-------|
| TXT | resend._domainkey | (from Resend) | - |
| TXT | @ | v=spf1 include:amazonses.com ~all | - |

#### What to report back:
- [ ] Confirm DNS records added in Cloudflare
- [ ] Screenshot or list of records (optional)

---

### 5. Vercel Domain Setup

**URL:** https://vercel.com → Your booksharepdx project → Settings → Domains

#### Steps:
1. Click "Add Domain"
2. Enter: `staging.booksharepdx.com`
3. Vercel will check for the CNAME record
4. Once verified, it will auto-provision SSL

#### What to report back:
- [ ] Confirm domain is verified and working

---

### 6. Environment Variables Summary

Once all accounts are set up, you'll have these secrets:

#### For Backend (Cloud Run):
```env
# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# Email
RESEND_API_KEY=re_xxxxxxxxxx

# JWT (generate random strings)
JWT_SECRET=<generate-64-char-random-string>
JWT_REFRESH_SECRET=<generate-64-char-random-string>

# Environment
NODE_ENV=staging
FRONTEND_URL=https://staging.booksharepdx.com
```

#### For Frontend (Vercel):
```env
VITE_API_URL=https://api-staging.booksharepdx.com
```

#### For GitHub Actions (Repository Secrets):
```
GCP_PROJECT_ID=booksharepdx
GCP_SA_KEY=<contents of service account JSON>
NEON_DATABASE_URL=<connection string>
RESEND_API_KEY=<api key>
```

---

### Setup Checklist

Copy this checklist and fill it out:

```
## Neon Database
- [ ] Account created
- [ ] Project created: booksharepdx-staging
- [ ] Region: US West 2 (Oregon)
- [ ] PostGIS enabled
- [ ] Connection string saved

## Resend Email
- [ ] Account created
- [ ] API key generated
- [ ] Domain booksharepdx.com added
- [ ] DNS records added at Porkbun
- [ ] Domain verified

## Google Cloud
- [ ] Project created: booksharepdx
- [ ] Cloud Run API enabled
- [ ] Container Registry API enabled
- [ ] Cloud Build API enabled
- [ ] Secret Manager API enabled
- [ ] Service account created
- [ ] JSON key downloaded

## Cloudflare DNS
- [ ] Nameservers set to Cloudflare in Porkbun
- [ ] CNAME: staging → cname.vercel-dns.com
- [ ] CNAME: api-staging → ghs.googlehosted.com
- [ ] TXT: resend._domainkey → (from Resend)
- [ ] TXT: @ → SPF record

## Vercel
- [ ] staging.booksharepdx.com added
- [ ] Domain verified and SSL active

## Secrets Collected
- [ ] DATABASE_URL (Neon connection string)
- [ ] RESEND_API_KEY
- [ ] GCP_PROJECT_ID
- [ ] GCP_SA_KEY (service account JSON)
```

Notes:
For Vercel I used Github for Oauth
For Neon I used google.
For Resend I used google.

Warm pings: Uptimerobot.com, Google oauth.