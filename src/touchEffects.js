// touchEffects.js - 부리부리 터치 이펙트 유틸

// ── 진동 ─────────────────────────────────────────
export const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// ── 1. 리플 ──────────────────────────────────────
export const createRipple = (e) => {
  const btn = e.currentTarget;
  const existing = btn.querySelector('.buri-ripple');
  if (existing) existing.remove();

  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const rect = btn.getBoundingClientRect();
  const circle = document.createElement('span');

  circle.className = 'buri-ripple';
  circle.style.cssText = `
    position:absolute; border-radius:50%; pointer-events:none; z-index:99;
    background:rgba(255,255,255,0.45);
    width:${diameter}px; height:${diameter}px;
    left:${e.clientX - rect.left - diameter / 2}px;
    top:${e.clientY - rect.top - diameter / 2}px;
    transform:scale(0);
    animation:buriRippleAnim 0.55s linear forwards;
  `;
  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
  vibrate(18);
};

// ── 2. 부리부리 팡 ───────────────────────────────
const PANG_EMOJIS = ['🐷', '💜', '✨', '🎉', '⭐', '💕', '🎊'];

export const createBuriPang = (e) => {
  const btn = e.currentTarget;
  btn.style.overflow = 'visible';
  const rect = btn.getBoundingClientRect();
  const ox = e.clientX - rect.left;
  const oy = e.clientY - rect.top;

  PANG_EMOJIS.forEach((emoji, i) => {
    const p = document.createElement('span');
    const angle = (i / 7) * Math.PI * 2;
    const dist = 50 + Math.random() * 30;
    p.textContent = emoji;
    p.style.cssText = `
      position:absolute; pointer-events:none; z-index:9999;
      font-size:16px; line-height:1;
      left:${ox}px; top:${oy}px;
      transform:translate(-50%,-50%) scale(0);
      animation:buriPangFly 0.7s ease-out forwards;
      animation-delay:${i * 0.04}s;
      --tx:${Math.cos(angle) * dist}px;
      --ty:${Math.sin(angle) * dist}px;
    `;
    btn.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  });
  vibrate([25, 10, 25]);
};

// ── 3. 하트 팡 (전면 업그레이드) ────────────────────────────
// 화면 전체에 하트/별/부리 파티클이 터져나오는 화려한 효과
export const createHeartPang = (container) => {
  if (!container) return;

  // 버튼 위치 기준으로 화면상 좌표 계산
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // ── 전체화면 오버레이 캔버스 ──
  const canvas = document.createElement('canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = `
    position:fixed; inset:0; pointer-events:none; z-index:99999;
  `;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // ── 이모지 파티클 (큰 것들) ──
  const HEART_SET = ['💜','💜','💕','🩷','✨','⭐','🐷','💜','💫','💜'];
  const emojiParticles = [];

  // 폭발형 - 사방으로 퍼짐
  for (let i = 0; i < 14; i++) {
    const angle  = (i / 14) * Math.PI * 2 - Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const speed  = 4 + Math.random() * 6;
    emojiParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      emoji: HEART_SET[i % HEART_SET.length],
      size: 18 + Math.random() * 16,
      life: 1,
      decay: 0.018 + Math.random() * 0.012,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      gravity: 0.12 + Math.random() * 0.08,
    });
  }

  // 위로 솟구치는 것들 (더 느리게, 높이 올라감)
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const speed = 6 + Math.random() * 7;
    emojiParticles.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      emoji: ['💜','💕','✨','🐷','⭐'][i % 5],
      size: 22 + Math.random() * 20,
      life: 1,
      decay: 0.012 + Math.random() * 0.008,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.12,
      gravity: 0.08 + Math.random() * 0.06,
    });
  }

  // ── 원형 도형 파티클 (반짝이) ──
  const COLORS = ['#7B4FA6','#FF6B9D','#F5B8A0','#FFE4D4','#EDE0F5','#E8630A','#fff','#FFB3D9'];
  const dotParticles = [];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    dotParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 3 + Math.random() * 6,
      life: 1,
      decay: 0.022 + Math.random() * 0.018,
      gravity: 0.1 + Math.random() * 0.1,
    });
  }

  // ── 하트 도형 파티클 ──
  const heartParticles = [];
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    heartParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 8 + Math.random() * 10,
      color: ['#7B4FA6','#FF6B9D','#E8630A','#FFB3D9'][Math.floor(Math.random() * 4)],
      life: 1,
      decay: 0.016 + Math.random() * 0.012,
      gravity: 0.06,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
    });
  }

  // 하트 경로 함수
  const drawHeart = (ctx, x, y, size, rotation, color, alpha) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const s = size * 0.5;
    ctx.moveTo(0, s * 0.5);
    ctx.bezierCurveTo( s,  -s * 0.2,  s * 1.2, -s * 1.2, 0, -s * 0.8);
    ctx.bezierCurveTo(-s * 1.2, -s * 1.2, -s,  -s * 0.2, 0,  s * 0.5);
    ctx.fill();
    ctx.restore();
  };

  // ── 애니메이션 루프 ──
  let rafId;
  let frame = 0;

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    let alive = false;

    // 점 파티클
    for (const p of dotParticles) {
      if (p.life <= 0) continue;
      alive = true;
      p.vx *= 0.96; p.vy *= 0.96;
      p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 하트 도형
    for (const p of heartParticles) {
      if (p.life <= 0) continue;
      alive = true;
      p.vx *= 0.97; p.vy *= 0.97;
      p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      p.rotation += p.rotSpeed;
      drawHeart(ctx, p.x, p.y, p.size, p.rotation, p.color, Math.max(0, p.life));
    }

    // 이모지 파티클
    for (const p of emojiParticles) {
      if (p.life <= 0) continue;
      alive = true;
      p.vx *= 0.97; p.vy *= 0.97;
      p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.font = `${p.size * Math.min(1, p.life * 2)}px serif`;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }

    if (alive) {
      rafId = requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  };

  animate();

  // 3초 후 강제 정리
  setTimeout(() => {
    cancelAnimationFrame(rafId);
    canvas.remove();
  }, 3000);

  vibrate([15, 8, 25, 8, 15, 8, 40]);
};

// ── 4. 흔들기 ────────────────────────────────────
export const shakeElement = (el) => {
  if (!el) return;
  el.classList.remove('buri-shake');
  void el.offsetWidth;
  el.classList.add('buri-shake');
  vibrate([40, 20, 40]);
  el.addEventListener('animationend', () => {
    el.classList.remove('buri-shake');
  }, { once: true });
};