// api/webhook.js
// Vercel Serverless Function — Stripe webhook handler
// Env vars required:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET  (from Stripe dashboard > Webhooks)
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY   (service role key — NOT the anon key, kept server-side only)

const Stripe = require('stripe');

// Must export raw body parsing config for Stripe signature verification
export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig    = req.headers['stripe-signature'];
  const buf    = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Only handle successful payments
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;

    const donorName    = pi.metadata?.donor_name    || 'Anonymous';
    const donorMessage = pi.metadata?.donor_message || null;
    const amount       = pi.amount; // in cents

    try {
      // Insert into Supabase donations table
      const supabaseRes = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/donations`,
        {
          method: 'POST',
          headers: {
            apikey:          process.env.SUPABASE_SERVICE_KEY,
            Authorization:   `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type':  'application/json',
            Prefer:          'return=minimal',
          },
          body: JSON.stringify({
            stripe_payment_intent_id: pi.id,
            name:    donorName,
            message: donorMessage,
            amount,
            likes:   0,
          }),
        }
      );

      if (!supabaseRes.ok) {
        const err = await supabaseRes.text();
        console.error('Supabase insert error:', err);
        // Return 200 to Stripe so it doesn't retry — log the error for investigation
      }
    } catch (err) {
      console.error('Failed to record donation:', err.message);
    }
  }

  res.status(200).json({ received: true });
};
