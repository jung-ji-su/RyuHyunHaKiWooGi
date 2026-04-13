// touchEffects.js - 부리부리 터치 이펙트 유틸

// ── 진동 ─────────────────────────────────────────────
export const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// ── 1. 리플 ──────────────────────────────────────────
// 사용: onPointerDown={(e) => createRipple(e)}
// 버튼에 position:relative, overflow:hidden 필요
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

// ── 2. 부리부리 팡 ───────────────────────────────────
// 사용: onPointerDown={(e) => createBuriPang(e)}
const PANG_EMOJIS = ['🐷', '💜', '✨', '🎉', '⭐', '💕', '🎊'];

export const createBuriPang = (e) => {
  const btn = e.currentTarget;
  // overflow:visible 강제 설정
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

// ── 3. 하트 팡 ───────────────────────────────────────
// 사용: createHeartPang(containerRef.current)
// container에 position:relative 필요
const HEART_EMOJIS = ['💜', '🩷', '✨', '💕', '🐷'];

export const createHeartPang = (container) => {
  if (!container) return;
  container.style.position = 'relative';

  HEART_EMOJIS.forEach((emoji, i) => {
    const p = document.createElement('span');
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const dist = 38 + Math.random() * 14;
    p.textContent = emoji;
    p.style.cssText = `
      position:absolute; pointer-events:none; z-index:9999;
      font-size:14px; line-height:1;
      left:50%; top:50%;
      transform:translate(-50%,-50%) scale(0);
      animation:buriHeartBurst 0.6s ease-out forwards;
      animation-delay:${i * 0.05}s;
      --tx:${Math.cos(angle) * dist}px;
      --ty:${Math.sin(angle) * dist}px;
    `;
    container.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  });
  vibrate([15, 10, 15]);
};

// ── 4. 흔들기 ────────────────────────────────────────
// 사용: shakeElement(ref.current)
export const shakeElement = (el) => {
  if (!el) return;
  el.classList.remove('buri-shake');
  void el.offsetWidth; // reflow 강제
  el.classList.add('buri-shake');
  vibrate([40, 20, 40]);
  el.addEventListener('animationend', () => {
    el.classList.remove('buri-shake');
  }, { once: true });
};