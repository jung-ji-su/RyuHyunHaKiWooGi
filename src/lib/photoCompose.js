import { getFrame, getLayout } from './photoFrames';

// 컷 하나를 해당 레이아웃 칸 크기(cw×ch)로 잘라 canvas에 담는다. 원본은 어디에도 저장하지 않는다.
// mirror: 전면 카메라는 미리보기가 거울상이라 저장본도 같은 방향으로 맞춘다.
export function captureCut(video, cw, ch, mirror) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  const vw = video.videoWidth, vh = video.videoHeight;
  const s = Math.max(cw / vw, ch / vh), sw = cw / s, sh = ch / s;
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
  if (mirror) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  return c;
}

// 프레임 선택 화면 미리보기용 가짜 컷(실제 사진 없이 느낌만 보여준다)
export function placeholderCut(cw, ch, i) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d'), hue = [210, 190, 230, 200][i % 4];
  const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, `hsl(${hue},45%,82%)`); g.addColorStop(1, `hsl(${hue},40%,66%)`);
  x.fillStyle = g; x.fillRect(0, 0, cw, ch);
  x.fillStyle = 'rgba(255,255,255,.75)';
  x.beginPath(); x.arc(cw / 2, ch * 0.42, Math.min(cw, ch) * 0.2, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(cw / 2, ch * 1.02, cw * 0.36, ch * 0.34, 0, 0, Math.PI * 2); x.fill();
  return c;
}

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect && r > 0) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
const seeded = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };
const fillSpec = (ctx, spec, x, y, w, h) => {
  if (!Array.isArray(spec)) return spec;
  if (spec.length === 1) return spec[0];
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  spec.forEach((c, i) => g.addColorStop(i / (spec.length - 1), c));
  return g;
};

function drawPattern(ctx, p, W, H) {
  ctx.save(); ctx.globalAlpha = p.alpha ?? 1; ctx.fillStyle = p.color; const s = p.size;
  if (p.type === 'dots') { for (let y = s / 2; y < H + s; y += s) for (let x = ((Math.round(y / s) % 2) ? s : s / 2); x < W + s; x += s) { ctx.beginPath(); ctx.arc(x, y, s * 0.16, 0, Math.PI * 2); ctx.fill(); } }
  else if (p.type === 'stripes') { for (let y = 0; y < H; y += s * 2) ctx.fillRect(0, y, W, s); }
  else if (p.type === 'check') { for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) if (((x / s) + (y / s)) % 2 === 0) ctx.fillRect(x, y, s, s); }
  ctx.restore();
}
function star(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (Math.PI / 4) * i - Math.PI / 2, rad = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  ctx.closePath(); ctx.fill();
}
function petal(ctx, x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) { ctx.rotate((Math.PI * 2) / 5); ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.34, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function holly(ctx, x, y, s, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  [[-38, 0.5], [38, -0.5], [0, 0]].forEach(([dx, rot]) => {
    ctx.save(); ctx.translate(dx * 0.6, -6); ctx.rotate(rot); ctx.fillStyle = '#2E8B4A';
    ctx.beginPath(); ctx.ellipse(0, -22, 13, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1B5E33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -46); ctx.stroke(); ctx.restore();
  });
  [[-9, 4], [9, 4], [0, -8]].forEach(([bx, by]) => {
    ctx.fillStyle = '#D92B2B'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(bx - 3, by - 3, 2.6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}
function lights(ctx, W, baseY) {
  const cols = ['#FF4D4D', '#FFD84D', '#4DD2FF', '#6DFF7A'], swags = Math.max(2, Math.round(W / 360)), sw = W / swags, sag = 30;
  ctx.strokeStyle = '#173B24'; ctx.lineWidth = 3; ctx.beginPath();
  for (let s = 0; s < swags; s++) for (let t = 0; t <= 1.001; t += 0.04) { const x = s * sw + t * sw, y = baseY + sag * 4 * t * (1 - t); (s === 0 && t === 0) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  let k = 0;
  for (let s = 0; s < swags; s++) for (let t = 0.1; t < 0.99; t += 0.16) {
    const x = s * sw + t * sw, y = baseY + sag * 4 * t * (1 - t), c = cols[k++ % cols.length];
    const g = ctx.createRadialGradient(x, y + 16, 2, x, y + 16, 24); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + 16, 24, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#173B24'; ctx.fillRect(x - 3, y, 6, 7);
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y + 16, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// 네 컷 + 프레임 → 한 장 canvas. scale<1이면 미리보기용 축소본.
export async function composeStrip({ cuts, frameId, layoutId, names, dateText, caption = '', scale = 1 }) {
  const L = getLayout(layoutId), F = getFrame(frameId), kind = F.kind || 'plain';
  try { await document.fonts.load("700 44px Jua"); } catch { /* 폰트 없으면 기본 폰트 */ }
  const pad = F.pad ?? (kind === 'polaroid' ? 56 : 40), gap = F.gap ?? (kind === 'polaroid' ? 22 : 24);
  const footer = F.footerH ?? (kind === 'polaroid' ? 300 : 170), top = F.top ?? 0, side = kind === 'film' ? 46 : 0;
  const W = side * 2 + pad * 2 + L.cols * L.cw + (L.cols - 1) * gap;
  const H = top + pad * 2 + L.rows * L.ch + (L.rows - 1) * gap + footer;
  const c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
  const ctx = c.getContext('2d'); ctx.scale(scale, scale);
  const rnd = seeded(F.id), deco = F.deco || [];

  // 배경 + 패턴
  ctx.fillStyle = fillSpec(ctx, F.bg.length > 1 ? F.bg : [F.bg[0]], 0, 0, 0, H);
  if (F.bg.length > 1) { const g = ctx.createLinearGradient(0, 0, 0, H); F.bg.forEach((col, i) => g.addColorStop(i / (F.bg.length - 1), col)); ctx.fillStyle = g; }
  ctx.fillRect(0, 0, W, H);
  if (F.pattern) drawPattern(ctx, F.pattern, W, H);
  if (deco.includes('stars')) { for (let i = 0; i < 46; i++) star(ctx, rnd() * W, rnd() * H, 3 + rnd() * 9, rnd() > 0.5 ? '#FFE9A8' : '#FFFFFF'); }
  if (deco.includes('snow')) { ctx.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.4 + rnd() * 0.55; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 2 + rnd() * 5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  if (deco.includes('sakura')) { for (let i = 0; i < 34; i++) petal(ctx, rnd() * W, rnd() * H, 12 + rnd() * 16, rnd() * 6, rnd() > 0.4 ? '#FFC1D6' : '#FFFFFF'); }
  if (kind === 'film') {
    ctx.fillStyle = 'rgba(244,239,227,.92)';
    for (let y = 18; y < H - 20; y += 64) { rr(ctx, 12, y, 22, 32, 5); ctx.fill(); rr(ctx, W - 34, y, 22, 32, 5); ctx.fill(); }
  }

  // 사진 칸(테두리·그림자·이중 테두리·둥근 모서리)
  const x0 = side + pad, y0 = top + pad, ew = F.edgeW ?? 8, rad = F.radius ?? 12;
  cuts.forEach((cut, i) => {
    const col = i % L.cols, row = Math.floor(i / L.cols);
    const x = x0 + col * (L.cw + gap), y = y0 + row * (L.ch + gap);
    ctx.save();
    if (F.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; }
    ctx.fillStyle = fillSpec(ctx, F.edge, x - ew, y - ew, L.cw + ew * 2, L.ch + ew * 2) || '#fff';
    rr(ctx, x - ew, y - ew, L.cw + ew * 2, L.ch + ew * 2, rad + ew * 0.6); ctx.fill();
    ctx.restore();
    if (F.double) { ctx.save(); ctx.strokeStyle = F.double.color; ctx.lineWidth = F.double.w; const o = ew + F.double.gap; rr(ctx, x - o, y - o, L.cw + o * 2, L.ch + o * 2, rad + o * 0.5); ctx.stroke(); ctx.restore(); }
    ctx.save(); rr(ctx, x, y, L.cw, L.ch, rad); ctx.clip(); ctx.drawImage(cut, x, y); ctx.restore();
  });

  // 장식(사진 위가 아니라 여백에만)
  if (deco.includes('lights')) lights(ctx, W, Math.max(12, top - 62));
  if (deco.includes('holly')) { holly(ctx, 64, H - 38, 1, false); holly(ctx, W - 64, H - 38, 1, true); }
  if (deco.includes('drift')) {
    ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, H - 16 - 9 * Math.sin(x / 38) - 6 * Math.sin(x / 17 + 1));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  if (F.dot) {
    ctx.fillStyle = F.dot; ctx.globalAlpha = 0.85;
    [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
  }

  // 하단 문구: footer 모드('both'/'date'/'text') × 사용자 한 줄(caption이 있으면 이름 자리에 쓴다)
  const custom = (caption || '').trim().slice(0, 24), mode = F.footer || 'both';
  const line1 = mode === 'date' ? custom : (custom || F.defaultText || names);
  const line2 = mode === 'text' ? '' : dateText;
  const face = F.font === 'serif' ? "italic 700 {s}px Georgia, 'Times New Roman', serif" : F.font === 'mono' ? "700 {s}px 'Courier New', monospace" : "700 {s}px Jua, 'Noto Sans KR', sans-serif";
  const fit = (txt, size) => { let s = size; do { ctx.font = face.replace('{s}', s); s -= 2; } while (ctx.measureText(txt).width > W - 120 && s > 16); };
  ctx.fillStyle = F.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cy = H - footer / 2 - (deco.includes('drift') ? 14 : 4);
  if (line1 && line2) { fit(line1, kind === 'polaroid' ? 58 : 46); ctx.fillText(line1, W / 2, cy - 18); ctx.globalAlpha = 0.78; ctx.font = F.font === 'mono' ? "700 30px 'Courier New', monospace" : "400 30px 'Noto Sans KR', sans-serif"; ctx.fillText(line2, W / 2, cy + 34); ctx.globalAlpha = 1; }
  else if (line1) { fit(line1, 56); ctx.fillText(line1, W / 2, cy); }
  else if (line2) { fit(line2, 44); ctx.fillText(line2, W / 2, cy); }
  return c;
}

// WebP로 압축(미지원 브라우저는 JPEG). 반환: { blob, ext }
export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b && b.type === 'image/webp') return resolve({ blob: b, ext: 'webp' });
      canvas.toBlob((j) => (j ? resolve({ blob: j, ext: 'jpg' }) : reject(new Error('이미지 변환 실패'))), 'image/jpeg', 0.85);
    }, 'image/webp', 0.85);
  });
}
