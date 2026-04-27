// =============================================
//  DONTWANNAWORK — Main JS
//  Donor wall + likes powered by Supabase
//  Stripe for payments
// =============================================

document.getElementById('year').textContent = new Date().getFullYear();

// ---- CONFIG (injected via Vercel env vars) ----
// These are read from meta tags injected server-side, or use window.__ENV__ pattern.
// For static hosting, use a small Vercel API route to expose public keys safely.
// IMPORTANT: SUPABASE_ANON_KEY is safe to expose (row-level security enforced on DB side).
// STRIPE_PUBLISHABLE_KEY is safe to expose (public key, never secret key).

const STRIPE_PK = window.__STRIPE_PK__ || 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE';
const SUPABASE_URL = window.__SUPABASE_URL__ || '';
const SUPABASE_ANON = window.__SUPABASE_ANON__ || '';

// ---- STRIPE INIT ----
let stripe, cardElement, currentAmount = 0, currentLabel = '';

function initStripe() {
  try {
    stripe = Stripe(STRIPE_PK);
    const elements = stripe.elements({
      fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap' }]
    });
    cardElement = elements.create('card', {
      style: {
        base: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '15px',
          color: '#0f0f10',
          '::placeholder': { color: '#9999a8' },
          iconColor: '#5b3df5',
        },
        invalid: { color: '#e53e3e', iconColor: '#e53e3e' }
      }
    });
    cardElement.mount('#stripe-card-element');
  } catch (e) {
    console.warn('Stripe init — add your publishable key:', e.message);
    document.getElementById('stripe-card-element').innerHTML =
      '<p style="color:var(--ink-4);font-size:0.85rem;">⚠️ Configure STRIPE_PUBLISHABLE_KEY to enable payments.</p>';
  }
}

// ---- MODAL ----
const modal    = document.getElementById('modalOverlay');
const modalAmt = document.getElementById('modalAmount');

document.querySelectorAll('.donate-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentAmount = parseInt(btn.dataset.amount);
    currentLabel  = btn.dataset.label;
    modalAmt.textContent = currentLabel;
    modal.classList.add('open');
    if (!stripe) initStripe();
  });
});

document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('open');
  document.getElementById('stripeErrors').textContent = '';
}

// ---- PAY ----
document.getElementById('payBtn').addEventListener('click', async () => {
  const payBtn  = document.getElementById('payBtn');
  const errEl   = document.getElementById('stripeErrors');
  const name    = document.getElementById('donorName').value.trim() || 'Anonymous';
  const message = document.getElementById('donorMessage').value.trim();
  errEl.textContent = '';

  if (!stripe || !cardElement) {
    errEl.textContent = 'Payments not configured. See README.';
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = 'Processing…';

  try {
    // 1. Create PaymentIntent server-side
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: currentAmount, name, message })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Server error creating payment.');
    }

    const { clientSecret } = await res.json();

    // 2. Confirm payment via Stripe
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { name: name !== 'Anonymous' ? name : undefined }
      }
    });

    if (result.error) {
      errEl.textContent = result.error.message;
      payBtn.disabled = false;
      payBtn.textContent = 'Complete Donation';
    } else {
      // Payment succeeded — Stripe webhook will record in DB
      closeModal();
      showToast(`Thank you! $${currentAmount / 100} donated. You received nothing. Iconic.`);
      // Optimistically refresh donor wall after short delay for webhook processing
      setTimeout(() => loadDonors(), 3000);
      setTimeout(() => loadStats(), 3000);
    }
  } catch (err) {
    errEl.textContent = err.message || 'Something went wrong. Please try again.';
    payBtn.disabled = false;
    payBtn.textContent = 'Complete Donation';
  }
});

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 5000);
}

// ---- SUPABASE HELPERS ----
// Uses the Supabase REST API directly (no SDK needed for simple reads/writes)

async function supabaseGet(table, query = '') {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
    }
  });
  if (!res.ok) return null;
  return res.json();
}

async function supabasePost(table, body) {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) return null;
  return res.json();
}

async function supabasePatch(table, id, body) {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });
  return res.ok;
}

// ---- LOAD STATS ----
async function loadStats() {
  const data = await supabaseGet('donations', '?select=amount&order=created_at.desc');
  if (!data) {
    // Fallback placeholder
    animateNumber('stat-raised', 0, '$');
    animateNumber('stat-donors', 0);
    document.getElementById('stat-pct').textContent = '0.00%';
    document.getElementById('goalPct').textContent = '0.00%';
    document.getElementById('goalRaised').textContent = '0';
    document.getElementById('goalDonors').textContent = '0';
    setTimeout(() => document.getElementById('goalFill').style.width = '0.02%', 400);
    return;
  }

  const total    = data.reduce((s, d) => s + (d.amount || 0), 0) / 100;
  const donors   = data.length;
  const goal     = 10000000;
  const pct      = (total / goal * 100);
  const pctStr   = pct < 0.01 ? pct.toFixed(4) : pct.toFixed(2);

  animateNumber('stat-raised', total, '$');
  animateNumber('stat-donors', donors);
  document.getElementById('stat-pct').textContent   = pctStr + '%';
  document.getElementById('goalPct').textContent    = pctStr + '%';
  document.getElementById('goalRaised').textContent = total.toLocaleString('en-US', { maximumFractionDigits: 0 });
  document.getElementById('goalDonors').textContent = donors;

  setTimeout(() => {
    document.getElementById('goalFill').style.width = Math.max(pct, 0.02) + '%';
  }, 400);
}

function animateNumber(id, target, prefix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, dur = 1200;
  const startTime = performance.now();
  const isFloat = target % 1 !== 0;

  function step(now) {
    const progress = Math.min((now - startTime) / dur, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = start + (target - start) * eased;
    if (prefix === '$') {
      el.textContent = '$' + Math.round(val).toLocaleString();
    } else {
      el.textContent = Math.round(val).toLocaleString();
    }
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---- LOAD DONORS ----
// Liked donor IDs stored in localStorage for UI state only (not auth)
const likedIds = new Set(JSON.parse(localStorage.getItem('dwnw_liked') || '[]'));

async function loadDonors() {
  const grid = document.getElementById('donorGrid');

  const data = await supabaseGet(
    'donations',
    '?select=id,name,message,amount,likes,created_at&order=created_at.desc&limit=50'
  );

  if (!data || data.length === 0) {
    grid.innerHTML = `
      <div class="donor-empty">
        <strong>No donations yet</strong>
        Be the first beautiful stranger.
      </div>`;
    return;
  }

  // Filter to only those with a message
  const withMessages = data.filter(d => d.message && d.message.trim());

  if (withMessages.length === 0) {
    grid.innerHTML = `
      <div class="donor-empty">
        <strong>No messages yet</strong>
        Donate and leave a message to appear here.
      </div>`;
    return;
  }

  grid.innerHTML = withMessages.map(d => {
    const liked   = likedIds.has(d.id);
    const dollars = (d.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const date    = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `
      <div class="donor-card" data-id="${d.id}">
        <div class="donor-card-top">
          <span class="donor-name">${escapeHtml(d.name || 'Anonymous')}</span>
          <span class="donor-amount">${dollars}</span>
        </div>
        <p class="donor-message">${escapeHtml(d.message)}</p>
        <div class="donor-footer">
          <span class="donor-date">${date}</span>
          <button class="like-btn ${liked ? 'liked' : ''}" data-id="${d.id}" data-likes="${d.likes || 0}">
            ${liked ? '♥' : '♡'} <span class="like-count">${d.likes || 0}</span>
          </button>
        </div>
      </div>`;
  }).join('');

  // Like handlers
  grid.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => handleLike(btn));
  });
}

async function handleLike(btn) {
  const id = btn.dataset.id;
  if (likedIds.has(id)) return; // already liked

  const currentLikes = parseInt(btn.dataset.likes) || 0;
  const newLikes     = currentLikes + 1;

  // Optimistic update
  likedIds.add(id);
  localStorage.setItem('dwnw_liked', JSON.stringify([...likedIds]));
  btn.innerHTML = `♥ <span class="like-count">${newLikes}</span>`;
  btn.classList.add('liked');
  btn.dataset.likes = newLikes;

  // Persist to Supabase
  await supabasePatch('donations', id, { likes: newLikes });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- CHART ----
const chartEl = document.getElementById('retirementChart');
if (chartEl) {
  const milestones = [0, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
  const yearsLeft  = [40, 35, 30, 24, 18, 12, 6, 2, 0];
  const labels     = milestones.map(m =>
    m >= 1000000 ? `$${m / 1000000}M` : m >= 1000 ? `$${m / 1000}k` : `$${m}`
  );

  new Chart(chartEl, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Years of Work Remaining',
        data: yearsLeft,
        borderColor: '#5b3df5',
        backgroundColor: 'rgba(91,61,245,0.06)',
        borderWidth: 2.5,
        pointBackgroundColor: '#5b3df5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f0f10',
          titleFont: { family: 'Inter', size: 12, weight: '600' },
          bodyFont:  { family: 'Inter', size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `  ${ctx.raw} years of work remaining`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Total Raised', font: { family: 'Inter', size: 12 }, color: '#9999a8' },
          grid: { color: '#f0f0f2' },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#9999a8' }
        },
        y: {
          title: { display: true, text: 'Years of Work Remaining', font: { family: 'Inter', size: 12 }, color: '#9999a8' },
          min: 0, max: 45,
          grid: { color: '#f0f0f2' },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#9999a8' }
        }
      }
    }
  });
}

// ---- FAQ ACCORDION ----
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ---- INIT ----
loadStats();
loadDonors();
