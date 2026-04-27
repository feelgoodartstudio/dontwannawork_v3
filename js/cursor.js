// =============================================
//  MAGIC WAND CURSOR — subtle star trail
// =============================================
(function () {
  const canvas = document.getElementById('cursor-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  let mx = -300, my = -300, pmx = -300, pmy = -300;
  const particles = [];

  document.addEventListener('mousemove', e => {
    pmx = mx; pmy = my;
    mx = e.clientX; my = e.clientY;
    const dist = Math.hypot(mx - pmx, my - pmy);
    // Spawn subtle particles based on movement speed
    const count = Math.min(Math.floor(dist / 8), 3);
    for (let i = 0; i < count; i++) {
      spawnParticle(
        mx + (pmx - mx) * (i / count),
        my + (pmy - my) * (i / count)
      );
    }
  });

  const STAR_COLORS = [
    'rgba(91,61,245,',   // accent purple
    'rgba(160,140,255,', // light purple
    'rgba(220,210,255,', // very light
    'rgba(255,215,100,', // gold
    'rgba(255,255,255,', // white
  ];

  function spawnParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      size: 1.5 + Math.random() * 2.5,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      life: 1,
      decay: 0.04 + Math.random() * 0.04,
      type: Math.random() > 0.6 ? 'star' : 'dot',
      rotation: Math.random() * Math.PI * 2,
    });
  }

  function drawWand(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4); // 45deg angle

    // Wand stick
    ctx.strokeStyle = '#3a2a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(18, 18);
    ctx.stroke();

    // Wand handle (slightly thicker, lighter)
    ctx.strokeStyle = '#6b5ad0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(18, 18);
    ctx.stroke();

    // Star tip
    drawStar(ctx, 0, 0, 5, 2.5, 4);

    ctx.restore();
  }

  function drawStar(ctx, x, y, outerR, innerR, points) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#b09af5';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawParticleStar(ctx, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? size : size * 0.4;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    // Update + draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.03; // gentle gravity
      p.life -= p.decay;
      p.rotation += 0.05;

      if (p.life <= 0) { particles.splice(i, 1); continue; }

      ctx.globalAlpha = p.life * 0.7; // subtle — max 70% opacity
      ctx.fillStyle = p.color + p.life * 0.6 + ')';

      if (p.type === 'star') {
        drawParticleStar(ctx, p.x, p.y, p.size, p.rotation);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;

    // Draw wand at cursor
    if (mx > -200) drawWand(mx, my);

    requestAnimationFrame(animate);
  }

  animate();
})();
