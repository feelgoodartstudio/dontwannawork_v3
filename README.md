# dontwannawork.com — v3

Clean startup aesthetic. Honest premise. Real Stripe + Supabase backend.

## Pages
- `/` — Homepage with donations, chart, FAQ, donor wall
- `/pages/dreams.html` — Live word cloud
- `/pages/impact.html` — Your Impact (Now vs. Retirement)
- `/pages/terms.html` — Terms of Use

---

## Deploy to Vercel

1. Push this folder to a **private** GitHub repo
2. Vercel → New Project → Import → Framework: **Other**
3. Add all environment variables (see below)
4. Deploy

---

## Environment Variables

Add all of these in **Vercel Dashboard > Project > Settings > Environment Variables**:

| Variable | Value | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Same as above |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard > Webhooks (after adding endpoint) |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase > Project Settings > API |
| `SUPABASE_ANON_KEY` | `eyJ...` | Same as above (safe to expose) |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Same — **service_role** key (keep secret) |

---

## Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `SCHEMA.sql`
3. Copy your Project URL and keys into Vercel env vars

---

## Stripe Webhook Setup

1. Deploy to Vercel first (you need a live URL)
2. Stripe Dashboard → Developers → Webhooks → Add endpoint
3. URL: `https://dontwannawork.com/api/webhook`
4. Select event: `payment_intent.succeeded`
5. Copy the signing secret → add as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Testing Locally

```bash
npm install
npx vercel dev
```

Use Stripe test cards: `4242 4242 4242 4242`, any future date, any CVC.

For webhook testing locally:
```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## File Structure

```
/
├── index.html
├── pages/
│   ├── dreams.html
│   ├── impact.html
│   └── terms.html
├── css/
│   └── style.css
├── js/
│   ├── config.js       ← loads public keys from /api/config
│   ├── cursor.js       ← magic wand cursor
│   ├── main.js         ← Stripe, chart, donor wall, likes
│   └── dreams.js       ← word cloud
├── api/
│   ├── config.js       ← exposes public keys to frontend
│   ├── create-payment-intent.js   ← Stripe server-side
│   └── webhook.js      ← records payments in Supabase
├── SCHEMA.sql          ← Supabase table setup
├── vercel.json
└── package.json
```

---

*No refunds. No rewards. No apologies.*
