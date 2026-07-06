# Environment Variables

Create a `.env` file in this folder with the following variables:

```bash
# Stripe (live secret key — never commit this)
STRIPE_SECRET_KEY=sk_live_...

# Stripe webhook endpoint secret (obtained after registering the webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase project credentials (service role key, not anon key)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Optional: local dev port
PORT=3000
```

Never commit `.env` or any secret key to git.
