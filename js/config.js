// =============================================
//  CONFIG LOADER — fetches public keys from API
//  Injected before main.js
// =============================================
(async function () {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      window.__STRIPE_PK__    = cfg.stripePk;
      window.__SUPABASE_URL__ = cfg.supabaseUrl;
      window.__SUPABASE_ANON__= cfg.supabaseAnon;
    }
  } catch (e) {
    console.warn('Config not loaded — using fallback defaults.');
  }
})();
