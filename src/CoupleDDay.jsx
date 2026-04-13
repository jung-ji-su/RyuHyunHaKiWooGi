import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

// ── 물리 기반 파티클 ─────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life; this.maxLife = life;
    this.size = size;
    this.gravity = 0.09;
  }
  update() {
    this.vx *= 0.97; this.vy *= 0.97;
    this.vy += this.gravity;
    this.x += this.vx; this.y += this.vy;
    this.life--;
  }
  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── 로켓 잔상 ────────────────────────────────────────────────────
class Trail {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.color = color;
    this.life = 18; this.maxLife = 18;
  }
  update() { this.life--; }
  draw(ctx) {
    const a = (this.life / this.maxLife) * 0.6;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── 로켓 ─────────────────────────────────────────────────────────
const FW_COLORS = [
  "#ff4daa", "#ff9d4d", "#ffe44d",
  "#4dfff3", "#b44dff", "#69ff47",
  "#40c4ff", "#ff6b6b", "#ffd93d",
];

class Rocket {
  constructor(canvasW, canvasH, onExplode) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.onExplode = onExplode;
    this.reset();
  }
  reset() {
    this.x = this.canvasW * (0.1 + Math.random() * 0.8);
    this.y = this.canvasH + 8;
    this.tx = this.canvasW * (0.1 + Math.random() * 0.8);
    this.ty = this.canvasH * (0.08 + Math.random() * 0.35);
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 5.5 + Math.random() * 3;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    this.trails = [];
    this.alive = true;
  }
  update() {
    this.trails.push(new Trail(this.x, this.y, this.color));
    this.trails = this.trails.filter(t => { t.update(); return t.life > 0; });
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.04;
    if (this.vy >= 0 || this.y <= this.ty) this.explode();
  }
  explode() {
    this.alive = false;
    const count = 55 + Math.floor(Math.random() * 40);
    const type = Math.random();
    const newParticles = [];

    for (let i = 0; i < count; i++) {
      let vx, vy;
      if (type < 0.33) {
        // 방사형
        const angle = (i / count) * Math.PI * 2;
        const speed = 2.5 + Math.random() * 3;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else if (type < 0.66) {
        // 흩뿌리기
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = 1.5 + Math.random() * 4;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else {
        // 랜덤 폭발
        vx = (Math.random() - 0.5) * 7;
        vy = (Math.random() - 0.5) * 7;
      }
      const c = Math.random() < 0.3 ? "#ffffff" : this.color;
      newParticles.push(new Particle(
        this.x, this.y, vx, vy, c,
        40 + Math.floor(Math.random() * 35),
        2.2 + Math.random() * 2
      ));
    }

    // 보조색 파편
    const c2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.5;
      newParticles.push(new Particle(
        this.x, this.y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        c2, 25 + Math.floor(Math.random() * 20), 1.5
      ));
    }

    this.onExplode(newParticles);
  }
  draw(ctx) {
    this.trails.forEach(t => t.draw(ctx));
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function CoupleDDay() {
  const [targetEvent, setTargetEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState("우리만의 특별한 날을 기다려요 💖");

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({ particles: [], rockets: [], frame: 0 });

  // ── Firebase 연동 ──────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "schedules"),
      where("isImportant", "==", true),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, snapshot => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const events = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e => new Date(e.date) >= now);
      setTargetEvent(events[0] ?? null);
    });
    return () => unsub();
  }, []);

  // ── 카운트다운 타이머 ──────────────────────────────────────────
  useEffect(() => {
    if (!targetEvent) {
      setTimeLeft("우리만의 특별한 날을 기다려요 💖");
      return;
    }
    const tick = () => {
      const diff = new Date(targetEvent.date).getTime() - Date.now();
      if (diff > 0) {
        const d = Math.floor(diff / 86400000);
        const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
        const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setTimeLeft(`${targetEvent.title}  ${d}일  ${h}:${m}:${s}`);
      } else {
        setTimeLeft(`🎊 오늘은 ${targetEvent.title}! 행복한 시간 보내세요 🎊`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetEvent]);

  // ── 캔버스 폭죽 루프 ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;

    const resize = () => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const LAUNCH_INTERVAL = 42;

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      s.frame++;

      if (s.frame % LAUNCH_INTERVAL === 0) {
        const addRocket = () => s.rockets.push(
          new Rocket(canvas.width, canvas.height, newPs => {
            s.particles.push(...newPs);
          })
        );
        addRocket();
        if (Math.random() < 0.45) addRocket();
      }

      s.rockets.forEach(r => { r.update(); r.draw(ctx); });
      s.rockets = s.rockets.filter(r => r.alive);
      s.particles.forEach(p => { p.update(); p.draw(ctx); });
      s.particles = s.particles.filter(p => p.life > 0);
    };
    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        @keyframes rainbow {
          0%   { color:#ff4daa; text-shadow:0 0 10px #ff4daa,0 0 30px #ff4daa99,0 0 60px #ff4daa44; }
          20%  { color:#ff9d4d; text-shadow:0 0 10px #ff9d4d,0 0 30px #ff9d4d99,0 0 60px #ff9d4d44; }
          40%  { color:#ffe44d; text-shadow:0 0 10px #ffe44d,0 0 30px #ffe44d99,0 0 60px #ffe44d44; }
          60%  { color:#4dfff3; text-shadow:0 0 10px #4dfff3,0 0 30px #4dfff399,0 0 60px #4dfff344; }
          80%  { color:#b44dff; text-shadow:0 0 10px #b44dff,0 0 30px #b44dff99,0 0 60px #b44dff44; }
          100% { color:#ff4daa; text-shadow:0 0 10px #ff4daa,0 0 30px #ff4daa99,0 0 60px #ff4daa44; }
        }
        @keyframes labelPulse {
          0%,100% { opacity:0.8; letter-spacing:6px; }
          50%      { opacity:1;   letter-spacing:8px; text-shadow:0 0 20px #ff4daa,0 0 50px #ff4daa66; }
        }
        .dday-wrap {
          position: relative;
          width: 100%;
          border-radius: 28px;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0015, #150030, #0d001a);
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px;
        }
        .dday-canvas {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
        }
        .dday-content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 36px 20px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .dday-label {
          font-family: 'Orbitron', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #ff4daa;
          text-shadow: 0 0 12px #ff4daa, 0 0 30px #ff4daa88;
          animation: labelPulse 2s ease-in-out infinite;
        }
        .dday-timer {
          font-family: 'Orbitron', monospace;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 2px;
          animation: rainbow 3s linear infinite;
          line-height: 1.5;
          word-break: keep-all;
          text-align: center;
          max-width: 360px;
        }
      `}</style>

      <div ref={wrapRef} className="dday-wrap">
        <canvas ref={canvasRef} className="dday-canvas" />
        <div className="dday-content">
          <div className="dday-label">✨ SPECIAL D-DAY😍 ✨</div>
          <div className="dday-timer">{timeLeft}</div>
        </div>
      </div>
    </>
  );
}