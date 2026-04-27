// api/config.js
// Safely exposes PUBLIC keys to the frontend
// Never expose STRIPE_SECRET_KEY or SUPABASE_SERVICE_KEY here

module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  // These are public keys — safe to send to browser
  res.status(200).json({
    stripePk:     process.env.STRIPE_PUBLISHABLE_KEY || '',
    supabaseUrl:  process.env.SUPABASE_URL           || '',
    supabaseAnon: process.env.SUPABASE_ANON_KEY      || '',
  });
};
