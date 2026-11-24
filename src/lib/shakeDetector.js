// 가속도 센서 → "흔들기" 판정 (public/snow-preview.html 프로토타입에서 검증한 감지기를 그대로 옮김).
// 걸을 때/뛸 때/탁 칠 때/기기를 돌릴 때는 무시하고, 손으로 흔들 때만 반응한다.
// 원리: 중력을 저역통과로 뺀 "선형 가속도"가 임계값을 넘는 짧은 펄스를 모아서,
//   ① 펄스 간격 40~320ms(≈1.5~12Hz)  ② 방향이 번갈아 뒤집힘(내적 ≤ -0.25)  ③ 3개 이상 이어질 때만 흔들기.
//   걷기: 선형 가속도 ~4~5 m/s²(임계 10 미만) / 뛰기: ~2.8Hz에 같은 방향만 반복 / 탁·떨어뜨림: 펄스 1~2개 / 기기 돌리기: 펄스 1개 정도.
// 세게 흔들면 가속도가 한 프레임 안에 반대로 뒤집혀 크기가 임계의 60% 아래로 안 내려갈 수 있어서, 방향이 확실히 뒤집히면(내적 < -0.5) 펄스를 끝낸다.
export class ShakeDetector {
  constructor(opts = {}) {
    this.o = Object.assign({ threshold: 10, minGap: 0.04, maxGap: 0.32, minPulses: 3, window: 0.95, minDot: -0.25, emitGap: 0.14, gravityTau: 0.35, warmup: 0.3 }, opts);
    this.reset();
  }
  reset() { this.g = null; this.lastT = null; this.t0 = null; this.pulse = null; this.chain = []; this.lastEmit = -1e9; }
  setSensitivity(sens) { this.o.threshold = 10 / Math.max(0.2, sens); }
  // t: 초, (x,y,z): m/s², includesGravity: accelerationIncludingGravity면 true. 흔들기로 판정되면 {strength(0.2~1), peak, pulses, dx, dy} 반환
  push(t, x, y, z, includesGravity = true) {
    const o = this.o;
    if (this.t0 == null) this.t0 = t;
    let lx = x, ly = y, lz = z;
    if (includesGravity) {
      const dt = this.lastT == null ? 0 : Math.max(0, t - this.lastT);
      if (!this.g) this.g = { x, y, z };
      else { const k = Math.exp(-dt / o.gravityTau); this.g.x = k * this.g.x + (1 - k) * x; this.g.y = k * this.g.y + (1 - k) * y; this.g.z = k * this.g.z + (1 - k) * z; }
      lx = x - this.g.x; ly = y - this.g.y; lz = z - this.g.z;
    }
    this.lastT = t;
    const m = Math.hypot(lx, ly, lz);
    if (t - this.t0 < o.warmup) return null;               // 시작 직후 중력 추정이 안정되기 전에는 무시
    let ev = null;
    if (m >= o.threshold) {
      const dx = lx / m, dy = ly / m, dz = lz / m;
      if (this.pulse && (dx * this.pulse.dx + dy * this.pulse.dy + dz * this.pulse.dz) < -0.5) { ev = this._end(t); this.pulse = null; }
      if (!this.pulse) this.pulse = { tPeak: t, peak: m, dx, dy, dz };
      else if (m > this.pulse.peak) { this.pulse.peak = m; this.pulse.tPeak = t; this.pulse.dx = dx; this.pulse.dy = dy; this.pulse.dz = dz; }
    } else if (this.pulse && m < o.threshold * 0.6) {
      ev = this._end(t);
    }
    return ev;
  }
  _end(t) {
    const o = this.o, p = this.pulse; this.pulse = null;
    const last = this.chain[this.chain.length - 1];
    if (last) {
      const gap = p.tPeak - last.tPeak, dot = p.dx * last.dx + p.dy * last.dy + p.dz * last.dz;
      if (gap < o.minGap || gap > o.maxGap || dot > o.minDot) this.chain = [p]; else this.chain.push(p);
    } else this.chain = [p];
    this.chain = this.chain.filter((c) => t - c.tPeak <= o.window);
    if (this.chain.length >= o.minPulses && t - this.lastEmit >= o.emitGap) {
      this.lastEmit = t;
      const peaks = this.chain.slice(-3).map((c) => c.peak).sort((a, b) => a - b), med = peaks[Math.floor(peaks.length / 2)];
      const strength = Math.max(0.2, Math.min(1, 0.2 + 0.8 * (med - o.threshold) / (o.threshold * 2.5)));
      return { strength, peak: med, pulses: this.chain.length, dx: p.dx, dy: -p.dy };
    }
    return null;
  }
}
