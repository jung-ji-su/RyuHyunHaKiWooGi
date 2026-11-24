// 스노우볼 눈 엔진 — canvas 2D, DOM 의존은 canvas/유리 오버레이 엘리먼트뿐.
// public/snow-preview.html 프로토타입에서 사용자가 고른 "변형 A(소용돌이) + 가장 센 설정"을 앱용으로 옮긴 것.
//  - 깊이 4단계(크기·속도·투명도·흐림·반응도), 흔들면 확 터졌다가 서서히 가라앉음(자연 감쇠 + 속도 의존 항력)
//  - 소용돌이 장은 격자에서 프레임당 1회 계산 → 입자는 쌍선형 보간(최대 입자에서도 JS 작업 ~1~3ms/프레임)
//  - 바닥 근처 감속, 유리볼 가장자리 빛 번짐(CSS 오버레이 opacity만 갱신)
// 최대 설정 값: 입자 풀 COUNT_MAX(2000, 화면 넓이에 비례), 임펄스 TUNE.imp=1, 유리볼 globe. (저사양/품질 조정은 호출하는 쪽에서)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// d: 지름(css px), fall: 기본 낙하 속도(px/s), amp: 좌우 흔들림 폭(px), aMax: 최대 불투명도, hard: 가장자리 경도, tau: 항력 시간상수(s), gain: 흔들림 반응 계수
const LAYER = [
  { d: [1.3, 2.3], fall: [14, 24], amp: [4, 8],   aMax: 0.50, hard: 0.55, tau: 0.80, gain: 0.35 },
  { d: [2.4, 3.8], fall: [24, 38], amp: [8, 14],  aMax: 0.80, hard: 0.38, tau: 1.00, gain: 0.60 },
  { d: [3.8, 6.0], fall: [38, 56], amp: [14, 24], aMax: 0.90, hard: 0.30, tau: 1.25, gain: 0.95 },
  { d: [7.0, 11.], fall: [60, 88], amp: [22, 34], aMax: 0.50, hard: 0.06, tau: 1.50, gain: 1.30 },
];
const SHARE = [0.40, 0.30, 0.20, 0.10];
const MAXN = 2400;
const COUNT_MAX = 2000;             // 프로토타입의 "최대 2000"
const TUNE = { accA: 0.5, imp: 1.0 };
const envShape = (t) => Math.exp(-t / 2.6);   // 자연 감쇠

export class SnowEngine {
  constructor(canvas, glass, { lite = false } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.glass = glass; this.lite = lite;
    this.W = 1; this.H = 1; this.dpr = 1; this.sf = 1; this.V = 900; this.quality = 1; this.theme = 'night';
    const N = MAXN, F = () => new Float32Array(N);
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F(); this.d = F(); this.fall = F(); this.amp = F(); this.fr = F(); this.ph = F();
    this.al = F(); this.alT = F(); this.ord = F(); this.spin = F(); this.rot = F(); this.cry = new Uint8Array(N);
    this.layerStart = [0, 0, 0, 0]; this.layerCount = [0, 0, 0, 0]; this.act = [0, 0, 0, 0];
    const r = mulberry32(20261124); let idx = 0;
    for (let l = 0; l < 4; l++) {
      const c = l === 3 ? N - idx : Math.floor(N * SHARE[l]); this.layerStart[l] = idx; this.layerCount[l] = c; const L = LAYER[l];
      for (let j = 0; j < c; j++, idx++) {
        this.d[idx] = lerp(L.d[0], L.d[1], r()); this.fall[idx] = lerp(L.fall[0], L.fall[1], r()); this.amp[idx] = lerp(L.amp[0], L.amp[1], r());
        this.fr[idx] = lerp(0.3, 0.9, r()); this.ph[idx] = r() * 6.2832; this.ord[idx] = r();
        this.cry[idx] = (l === 2 && r() < 0.28) ? 1 : 0; this.spin[idx] = (r() - 0.5) * 1.4; this.rot[idx] = r() * 6.2832;
      }
    }
    this.rng = mulberry32(777);
    this.env = { peak: 0, t0: 0 }; this.envNow = 0; this.ax = 0; this.ay = 0; this.glassOp = -1; this.active = 0;
    this.GX = 28; this.GY = 20; this.gu = new Float32Array((this.GX + 1) * (this.GY + 1)); this.gv = new Float32Array((this.GX + 1) * (this.GY + 1));
    this.poolEnd = 0; this.calmFrac = 0.2; this.sprites = null; this.spriteKey = ''; this.crystal = null;
  }
  // 화면 크기/DPR/테마/품질이 바뀔 때마다 호출(입자 재배치)
  configure({ W, H, dpr, theme, quality }) {
    this.theme = theme || this.theme; this.quality = quality ?? this.quality;
    const d = Math.min(dpr || 1, this.lite ? 1.5 : 2);
    if (W !== this.W || H !== this.H || d !== this.dpr) { this.W = W; this.H = H; this.dpr = d; this.canvas.width = Math.round(W * d); this.canvas.height = Math.round(H * d); }
    this.sf = clamp(Math.min(W, H) / 430, 0.85, 1.6);
    this.V = clamp(Math.hypot(W, H) / 900, 0.7, 2.0) * 950;
    this.kx = 6.2832 / (W * 0.55); this.ky = 6.2832 / (H * 0.45);
    const area = clamp(W * H / (400 * 820), 0.7, 2.2), lite = this.lite ? 0.5 : 1;
    const pool = Math.min(MAXN, Math.round(COUNT_MAX * area * lite * this.quality));
    for (let l = 0; l < 4; l++) this.act[l] = Math.min(this.layerCount[l], Math.round(pool * SHARE[l]));
    this.poolEnd = this.act[0] + this.act[1] + this.act[2] + this.act[3];
    this.calmFrac = clamp(200 * area * lite * this.quality / Math.max(1, this.poolEnd), 0.1, 0.4);
    this.buildSprites(); this.reseed();
  }
  reseed() {
    const r = mulberry32(99);
    for (let l = 0; l < 4; l++) { const b = this.layerStart[l]; for (let j = 0; j < this.layerCount[l]; j++) { const i = b + j;
      const calm = j < this.act[l] && this.ord[i] < this.calmFrac;
      this.x[i] = r() * this.W; this.y[i] = r() * this.H; this.vx[i] = 0; this.vy[i] = this.fall[i] * this.sf; this.al[i] = calm ? 1 : 0; this.alT[i] = calm ? 1 : 0; } }
  }
  buildSprites() {
    const key = this.theme + '|' + this.dpr + '|' + this.sf.toFixed(2); if (key === this.spriteKey) return; this.spriteKey = key;
    const day = this.theme === 'day'; this.sprites = [];
    for (let l = 0; l < 4; l++) {
      const L = LAYER[l], D = Math.max(6, Math.ceil(L.d[1] * this.sf * this.dpr) + 2), c = D / 2, cv = document.createElement('canvas'); cv.width = cv.height = D; const g = cv.getContext('2d');
      if (day) {   // 밝은 배경: 가장자리가 푸른 구슬 + 흰 하이라이트
        const gr = g.createRadialGradient(c * 0.88, c * 0.84, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(Math.max(0.05, L.hard * 0.7), 'rgba(214,232,248,0.98)'); gr.addColorStop(0.72, 'rgba(128,174,216,0.9)'); gr.addColorStop(1, 'rgba(118,166,212,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 6.2832); g.fill();
      } else {
        const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(Math.max(0.01, L.hard), 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 6.2832); g.fill();
      }
      this.sprites.push(cv);
    }
    const D = Math.max(10, Math.ceil(LAYER[2].d[1] * this.sf * this.dpr * 1.25) + 2), c = D / 2, cv = document.createElement('canvas'); cv.width = cv.height = D; const g = cv.getContext('2d');
    g.translate(c, c); g.lineCap = 'round';
    const arms = (col, w) => { g.strokeStyle = col; g.lineWidth = w; for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -c * 0.92); g.moveTo(0, -c * 0.5); g.lineTo(c * 0.26, -c * 0.72); g.moveTo(0, -c * 0.5); g.lineTo(-c * 0.26, -c * 0.72); g.stroke(); g.restore(); } };
    if (day) arms('rgba(104,156,206,0.95)', Math.max(2, c * 0.32)); arms('rgba(255,255,255,0.98)', Math.max(1, c * (day ? 0.13 : 0.18)));
    this.crystal = cv;
  }
  envValue(now) { const dt = now - this.env.t0; return dt < 0 ? this.env.peak : this.env.peak * envShape(dt); }
  layerOf(i) { return i < this.layerStart[1] ? 0 : i < this.layerStart[2] ? 1 : i < this.layerStart[3] ? 2 : 3; }
  forEachActive(fn) { for (let l = 0; l < 4; l++) { const b = this.layerStart[l]; for (let j = 0; j < this.act[l]; j++) { const i = b + j; if (this.alT[i] > 0 || this.al[i] >= 0.004) fn(i); } } }
  // 흔들기(변형 A): 모든 눈에 소용돌이 방향 임펄스 + 쉬고 있던 여분의 눈을 깨워 "쏟아지게" 한다. s: 0~1
  shake(dx, dy, s, now) {
    this.env.peak = Math.min(1.6, this.envValue(now) + s); this.env.t0 = now;     // 겹쳐 흔들면 에너지 누적(상한 1.6)
    const V = this.V * s * TUNE.imp, rng = this.rng;
    const kick = (i) => { const g = LAYER[this.layerOf(i)].gain, ang = rng() * 6.2832, mag = V * g * (0.25 + 0.75 * rng());
      this.vx[i] += Math.cos(ang) * mag + dx * V * g * 0.35; this.vy[i] += Math.sin(ang) * mag * 0.8 - V * g * 0.28 + dy * V * g * 0.2; };
    this.forEachActive(kick);
    const extras = this.poolEnd - Math.round(this.poolEnd * this.calmFrac), quota = Math.floor(extras * clamp(0.3 + 0.85 * s, 0, 1)); let n = 0;
    for (let l = 0; l < 4 && n < quota; l++) { const b = this.layerStart[l]; for (let j = 0; j < this.act[l] && n < quota; j++) { const i = b + j;
      if (this.ord[i] >= this.calmFrac && this.alT[i] === 0 && this.al[i] < 0.004) { this.x[i] = rng() * this.W; this.y[i] = rng() * this.H * 0.9; this.vx[i] = this.vy[i] = 0; kick(i); this.alT[i] = 1; this.al[i] = 0.25; n++; } } }
  }
  step(dt, now) {
    const W = this.W, H = this.H; if (W < 2) return;
    const env = this.envNow = this.envValue(now), sf = this.sf, x = this.x, y = this.y, vx = this.vx, vy = this.vy, al = this.al, alT = this.alT;
    // 소용돌이 장 ψ의 회전을 GX×GY 격자에서 프레임당 1회 계산(발산 0)
    const gu = this.gu, gv = this.gv, GX = this.GX, GY = this.GY, kx = this.kx, ky = this.ky;
    if (env >= 0.003) { let k = 0;
      for (let gy = 0; gy <= GY; gy++) { const Y = gy / GY * H, b1 = ky * Y - 0.7 * now + 0.4, b2 = 1.9 * ky * Y + 1.1 * now + 0.7, cb1 = Math.cos(b1), sb1 = Math.sin(b1), cb2 = Math.cos(b2), sb2 = Math.sin(b2);
        for (let gx = 0; gx <= GX; gx++, k++) { const X = gx / GX * W, a1 = kx * X + 0.9 * now + 1.3, a2 = 2.1 * kx * X - 1.4 * now + 2.2;
          gu[k] = Math.sin(a1) * cb1 + 0.45 * 1.9 * Math.sin(a2) * cb2; gv[k] = -(Math.cos(a1) * sb1 + 0.45 * 2.1 * Math.cos(a2) * sb2); } } }
    const fIn = 1 - Math.exp(-dt / 0.25), fOut = 1 - Math.exp(-dt / 0.35), vRef = this.V * 0.8, rowN = GX + 1; let n = 0;
    for (let l = 0; l < 4; l++) {
      const L = LAYER[l], base = this.layerStart[l], cnt = this.act[l], baseRate = 1 / L.tau, gain = L.gain;
      for (let j = 0; j < cnt; j++) {
        const i = base + j, t = alT[i]; if (t === 0 && al[i] < 0.004) continue;
        al[i] += (t - al[i]) * (t > al[i] ? fIn : fOut);
        const isExtra = this.ord[i] >= this.calmFrac;
        this.ph[i] += this.fr[i] * 6.2832 * dt; this.rot[i] += this.spin[i] * dt;
        const yy = y[i], floorF = 1 - 0.6 * smooth(0.78, 1.0, yy / H);                      // 바닥 근처에서 느려진다
        const restVx = this.amp[i] * sf * 6.2832 * this.fr[i] * Math.cos(this.ph[i]) * floorF;
        const restVy = this.fall[i] * sf * (isExtra ? 1.45 : 1) * floorF;
        if (env >= 0.003) {                                                                  // 격자 보간으로 소용돌이 장 읽기
          let fx = x[i] / W * GX, fy = yy / H * GY; fx = fx < 0 ? 0 : fx > GX - 0.001 ? GX - 0.001 : fx; fy = fy < 0 ? 0 : fy > GY - 0.001 ? GY - 0.001 : fy;
          const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, k = iy * rowN + ix;
          const u = (gu[k] * (1 - tx) + gu[k + 1] * tx) * (1 - ty) + (gu[k + rowN] * (1 - tx) + gu[k + rowN + 1] * tx) * ty;
          const v = (gv[k] * (1 - tx) + gv[k + 1] * tx) * (1 - ty) + (gv[k + rowN] * (1 - tx) + gv[k + rowN + 1] * tx) * ty;
          const amp = env * gain * this.V * TUNE.accA; vx[i] += u * amp * dt; vy[i] += v * amp * dt;
        }
        // 항력: 빠를수록 세게(2.1배) 제동해 터지는 순간은 짧고 선명, 느려지면 약하게(0.6배) 제동해 가라앉는 꼬리가 길다(암시적 오일러)
        const rvx = vx[i] - restVx, rvy = vy[i] - restVy, u2 = Math.sqrt(rvx * rvx + rvy * rvy);
        const rate = baseRate * (0.6 + 1.5 * smooth(0, 1, u2 / vRef)), kk = rate * dt / (1 + rate * dt);
        vx[i] -= rvx * kk; vy[i] -= rvy * kk;
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        if (x[i] < -24) x[i] += W + 48; else if (x[i] > W + 24) x[i] -= W + 48;
        const dd = this.d[i] * sf;
        if (y[i] > H + dd) {                                                                 // 바닥 도달: 에너지가 남아 있는 동안은 위에서 계속 쏟아진다
          if (!isExtra || env > 0.22) { x[i] = this.rng() * W; y[i] = -dd - this.rng() * H * 0.12; vx[i] = 0; vy[i] = this.fall[i] * sf; al[i] = 0; alT[i] = 1; }
          else { alT[i] = 0; al[i] = 0; y[i] = -9999; }
        } else if (y[i] < -H * 0.6) y[i] = -H * 0.6;
        n++;
      }
    }
    this.active = n;
    if (this.glass) {                                                                        // 유리볼: 흔들 때 살짝 밝아진다(opacity만 갱신 → 합성 비용만)
      const go = 0.8 * (0.72 + 0.28 * clamp(env, 0, 1.2)); if (Math.abs(go - this.glassOp) > 0.01) { this.glassOp = go; this.glass.style.opacity = go.toFixed(2); }
    }
  }
  render() {
    const ctx = this.ctx, dpr = this.dpr, H = this.H, W = this.W; if (W < 2) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sf = this.sf, bright = this.theme === 'day' ? 1.45 : 1, stretch = this.quality > 0.7; let budget = 150;
    for (let l = 0; l < 4; l++) {
      const L = LAYER[l], spr = this.sprites[l], base = this.layerStart[l], cnt = this.act[l];
      for (let j = 0; j < cnt; j++) {
        const i = base + j, a = this.al[i]; if (a < 0.004) continue;
        const px = this.x[i], py = this.y[i]; if (py < -30 || py > H + 12 || px < -30 || px > W + 30) continue;
        const d = this.d[i] * sf;
        let alpha = Math.min(1, a * L.aMax * bright) * (1 - 0.9 * smooth(0.94, 1.0, py / H));   // 바닥에 닿을 때 사라지듯
        if (l === 0) alpha *= 0.82 + 0.18 * Math.sin(this.ph[i] * 3.1);                         // 먼 눈은 살짝 반짝
        ctx.globalAlpha = alpha;
        const sp2 = this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i];
        if (l === 2 && this.cry[i]) { ctx.save(); ctx.translate(px, py); ctx.rotate(this.rot[i]); const s = d * 1.25; ctx.drawImage(this.crystal, -s / 2, -s / 2, s, s); ctx.restore(); }
        else if (stretch && l >= 1 && sp2 > 70000 && budget > 0) {                              // 빠를 때 진행 방향으로 늘어나는 줄무늬
          budget--; const sp = Math.sqrt(sp2), len = d * (1 + Math.min(sp / 520, 2.4));
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(this.vy[i], this.vx[i])); ctx.drawImage(spr, -len / 2, -d / 2, len, d); ctx.restore();
        } else ctx.drawImage(spr, px - d / 2, py - d / 2, d, d);
      }
    }
    ctx.globalAlpha = 1;
  }
}
