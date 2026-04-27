// api/create-payment-intent.js
// Vercel Serverless Function
// Env vars required: STRIPE_SECRET_KEY

const Stripe = require('stripe');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { amount, name, message } = req.body;

    // Validate amount — must be one of the allowed values (in cents)
    const ALLOWED_AMOUNTS = [100, 500, 1000, 2000, 10000];
    if (!ALLOWED_AMOUNTS.includes(Number(amount))) {
      return res.status(400).json({ error: 'Invalid donation amount.' });
    }

    // Sanitise metadata
    const safeName    = String(name    || 'Anonymous').slice(0, 40).replace(/[<>]/g, '');
    const safeMessage = String(message || '').slice(0, 120).replace(/[<>]/g, '');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency: 'usd',
      description: 'DontWannaWork.com — voluntary donation, no goods or services provided',
      metadata: {
        donor_name:    safeName,
        donor_message: safeMessage,
      },
      // Stripe will handle receipt emails if configured in your dashboard
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error('PaymentIntent error:', err.message);
    res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
};
