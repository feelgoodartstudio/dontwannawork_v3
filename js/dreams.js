// =============================================
//  DREAMS — Frequency-weighted word cloud
// =============================================
document.getElementById('year').textContent = new Date().getFullYear();

const canvas   = document.getElementById('dreamCloud');
const ctx      = canvas.getContext('2d');
const loading  = document.getElementById('cloudLoading');

const wordFreq  = {};
let placedWords = [];
let needsLayout = false;

const COLORS = ['#5b3df5','#7c5ef7','#3a2a8a','#2c5f8a','#1a9e5c','#6b3fa0','#c0392b','#d4612a','#2d7a4f','#4a6fa5'];

const SEED = [
  'Travel everywhere','Sleep until noon','Write a novel',
  'Learn to surf','Move to Italy','Grow a garden',
  'Take long walks','Read all day','Start a band',
  'Learn to paint','Hike the world','Cook everything',
  'Watch every sunset','See Northern Lights',
  'Learn pottery','Own a dog','Take naps guilt-free',
  'Travel everywhere','Read all day','Sleep until noon',
  'Learn to surf','Grow a garden','Write a novel',
];

function resizeCanvas() {
  const wrap = canvas.parentElement;
  canvas.width  = wrap.offsetWidth;
  canvas.height = wrap.offsetHeight;
  needsLayout = true;
}

window.addEventListener('resize', () => { resizeCanvas(); });

function addWord(text) {
  const key = text.trim().toLowerCase();
  if (!key) return;
  wordFreq[key] = (wordFreq[key] || 0) + 1;
  needsLayout = true;
  if (loading) loading.style.display = 'none';
}

function getDisplayWords() {
  return Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 80);
}

function layoutWords() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const display = getDisplayWords();
  if (!display.length) return;

  const maxFreq = display[0][1];
  const minFreq = display[display.length - 1][1];
  const occupied = [];
  const newPlaced = [];

  let angle = 0, radius = 0;

  for (const [text, freq] of display) {
    const ratio = maxFreq === minFreq ? 0.7 : 0.18 + 0.82 * ((freq - minFreq) / (maxFreq - minFreq));
    const size  = Math.round(13 + ratio * 52);

    ctx.font = `700 ${size}px Inter, sans-serif`;
    const tw = ctx.measureText(text).width + 14;
    const th = size * 1.3;

    let px = cx, py = cy, attempts = 0, ok = false;

    while (attempts < 800 && !ok) {
      px = cx + Math.cos(angle) * radius;
      py = cy + Math.sin(angle) * radius * 0.58;
      const cpx = Math.max(tw / 2 + 6, Math.min(W - tw / 2 - 6, px));
      const cpy = Math.max(th / 2 + 6, Math.min(H - th / 2 - 6, py));

      let overlap = false;
      for (const o of occupied) {
        if (Math.abs(cpx - o.x) < (tw / 2 + o.tw / 2 + 5) &&
            Math.abs(cpy - o.y) < (th / 2 + o.th / 2 + 3)) {
          overlap = true; break;
        }
      }
      if (!overlap) { px = cpx; py = cpy; ok = true; }
      angle  += 0.38;
      radius += 1.5;
      attempts++;
    }

    occupied.push({ x: px, y: py, tw, th });

    const existing = placedWords.find(w => w.text === text);
    newPlaced.push({
      text, freq, size,
      x: existing ? existing.x : cx,
      y: existing ? existing.y : cy,
      targetX: px, targetY: py,
      color: existing ? existing.color : COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: existing ? existing.opacity : 0,
      wobble: existing ? existing.wobble : Math.random() * Math.PI * 2,
      wobbleSpeed: 0.012 + Math.random() * 0.012,
      wobbleAmt:   0.4 + Math.random() * 0.9,
    });
  }
  placedWords = newPlaced;
}

function animate() {
  if (needsLayout) { layoutWords(); needsLayout = false; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const w of placedWords) {
    w.x += (w.targetX - w.x) * 0.07;
    w.y += (w.targetY - w.y) * 0.07;
    w.opacity = Math.min(1, w.opacity + 0.035);
    w.wobble += w.wobbleSpeed;

    ctx.save();
    ctx.globalAlpha = w.opacity;
    ctx.font = `700 ${w.size}px Inter, sans-serif`;
    ctx.fillStyle = w.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w.text, w.x, w.y + Math.sin(w.wobble) * w.wobbleAmt);
    ctx.restore();
  }

  requestAnimationFrame(animate);
}

// Input
const dreamInput  = document.getElementById('dreamInput');
const dreamSubmit = document.getElementById('dreamSubmit');

dreamSubmit.addEventListener('click', () => {
  const val = dreamInput.value.trim();
  if (!val) return;
  addWord(val);
  dreamInput.value = '';
  dreamInput.focus();
});

dreamInput.addEventListener('keydown', e => { if (e.key === 'Enter') dreamSubmit.click(); });

// Periodic color shift for liveliness
setInterval(() => {
  if (!placedWords.length) return;
  const w = placedWords[Math.floor(Math.random() * placedWords.length)];
  w.color = COLORS[Math.floor(Math.random() * COLORS.length)];
}, 2500);

resizeCanvas();
animate();

// Seed
let i = 0;
const seedInt = setInterval(() => {
  if (i >= SEED.length) { clearInterval(seedInt); return; }
  addWord(SEED[i++]);
}, 70);
