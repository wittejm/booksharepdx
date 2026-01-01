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
