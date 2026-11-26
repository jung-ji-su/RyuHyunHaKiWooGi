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

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

// 네 컷 + 프레임 → 한 장 canvas. 세로 4컷 720×~2190, 2×2 ~1064×1504 (WebP로 저장하면 수백 KB 이하)
export async function composeStrip({ cuts, frameId, layoutId, names, dateText }) {
  const L = getLayout(layoutId), F = getFrame(frameId);
  try { await document.fonts.load("700 44px Jua"); } catch { /* 폰트 없으면 기본 폰트 */ }
  const pad = 40, gap = 24, footer = 170;
  const W = pad * 2 + L.cols * L.cw + (L.cols - 1) * gap;
  const H = pad * 2 + L.rows * L.ch + (L.rows - 1) * gap + footer;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // 배경
  const g = ctx.createLinearGradient(0, 0, 0, H);
  F.bg.forEach((col, i) => g.addColorStop(F.bg.length === 1 ? 0 : i / (F.bg.length - 1), col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 사진 4칸 (테두리 + 둥근 모서리)
  cuts.forEach((cut, i) => {
    const col = i % L.cols, row = Math.floor(i / L.cols);
    const x = pad + col * (L.cw + gap), y = pad + row * (L.ch + gap);
    ctx.save();
    ctx.fillStyle = F.edge; rr(ctx, x - 8, y - 8, L.cw + 16, L.ch + 16, 18); ctx.fill();
    rr(ctx, x, y, L.cw, L.ch, 12); ctx.clip();
    ctx.drawImage(cut, x, y);
    ctx.restore();
  });
  // 장식 점(프레임 코드로만)
  if (F.dot) {
    ctx.fillStyle = F.dot; ctx.globalAlpha = 0.85;
    [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  // 하단 문구: 두 사람 이름 + 날짜
  ctx.fillStyle = F.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fy = H - footer / 2 - 6;
  ctx.font = "700 46px Jua, 'Noto Sans KR', sans-serif";
  ctx.fillText(names, W / 2, fy - 18);
  ctx.globalAlpha = 0.75; ctx.font = "400 30px 'Noto Sans KR', sans-serif";
  ctx.fillText(dateText, W / 2, fy + 34); ctx.globalAlpha = 1;
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
