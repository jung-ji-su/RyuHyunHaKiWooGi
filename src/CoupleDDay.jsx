import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

import buri4 from "./assets/KakaoTalk_20260316_132913765.png";
import buri7 from "./assets/KakaoTalk_20260316_132945257.png";

const B = {
  pants:   "#7B4FA6",
  skin:    "#F5B8A0",
  cream:   "#FFF8F2",
  peach:   "#FFE4D4",
  lavender:"#EDE0F5",
  accent:  "#E8630A",
  dark:    "#3D1F00",
  pink:    "#FF6B9D",
};

// ── 떠다니는 파티클 캔버스 (부드러운 하트/별) ────────────────────
const FloatingCanvas = ({ canvasRef, wrapRef }) => null; // 훅에서 처리

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function CoupleDDay() {
  const [targetEvent, setTargetEvent] = useState(null);
  const [days, setDays]   = useState(null);
  const [time, setTime]   = useState({ h:"00", m:"00", s:"00" });
  const [isToday, setIsToday] = useState(false);

  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const animRef   = useRef(null);

  // ── Firebase ──────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "schedules"),
      where("isImportant", "==", true),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, snapshot => {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const events = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e => new Date(e.date) >= now);
      setTargetEvent(events[0] ?? null);
    });
    return () => unsub();
  }, []);

  // ── 카운트다운 ────────────────────────────────────────────────
  useEffect(() => {
    if (!targetEvent) return;
    const tick = () => {
      const diff = new Date(targetEvent.date).getTime() - Date.now();
      if (diff <= 0) {
        setIsToday(true); setDays(0);
        setTime({ h:"00", m:"00", s:"00" });
      } else {
        setIsToday(false);
        setDays(Math.floor(diff / 86400000));
        setTime({
          h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
          m: String(Math.floor((diff % 3600000)  / 60000)).padStart(2, "0"),
          s: String(Math.floor((diff % 60000)    / 1000)).padStart(2, "0"),
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetEvent]);

  // ── 캔버스 - 떠다니는 하트/별 ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width  = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // 떠다니는 파티클 생성
    const SHAPES = ['heart','heart','heart','star','circle'];
    const COLORS = [B.pants, B.pink, B.accent, B.skin, '#FFB3D9', '#C9A7E8', '#FFD6E7'];

    const makeParticle = () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(0.5 + Math.random() * 1.2),
      size: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0,
      fadeIn: true,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
    });

    const particles = Array.from({ length: 18 }, makeParticle).map(p => ({
      ...p, y: Math.random() * canvas.height,
    }));

    const drawHeart = (ctx, x, y, size) => {
      const s = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo( s * 1.0, -s * 0.3,  s * 1.2, -s * 1.1, 0, -s * 0.7);
      ctx.bezierCurveTo(-s * 1.2, -s * 1.1, -s * 1.0, -s * 0.3, 0,  s * 0.4);
      ctx.fill();
    };

    const drawStar = (ctx, size) => {
      const r1 = size * 0.5, r2 = size * 0.22;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = a1 + Math.PI / 5;
        i === 0
          ? ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1)
          : ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      }
      ctx.closePath();
      ctx.fill();
    };

    let frame = 0;
    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // 새 파티클 보충
      if (frame % 55 === 0 && particles.length < 25) {
        particles.push(makeParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.wobble += p.wobbleSpeed;
        p.x  += p.vx + Math.sin(p.wobble) * 0.4;
        p.y  += p.vy;
        p.rotation += p.rotSpeed;

        if (p.fadeIn) {
          p.alpha = Math.min(0.6, p.alpha + 0.015);
          if (p.alpha >= 0.6) p.fadeIn = false;
        }
        if (p.y < -p.size * 2) {
          particles.splice(i, 1); continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'heart')       drawHeart(ctx, 0, 0, p.size);
        else if (p.shape === 'star')   drawStar(ctx, p.size);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
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
        @import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;700&display=swap');

        @keyframes ddayBobLeft {
          0%,100% { transform: translateY(0px) rotate(-8deg); }
          50%      { transform: translateY(-8px) rotate(-12deg); }
        }
        @keyframes ddayBobRight {
          0%,100% { transform: translateY(0px) rotate(8deg) scaleX(-1); }
          50%      { transform: translateY(-10px) rotate(12deg) scaleX(-1); }
        }
        @keyframes ddayPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes ddayShine {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes ddayFlicker {
          0%,100% { opacity:1; }
          92%     { opacity:1; }
          94%     { opacity:0.7; }
          96%     { opacity:1; }
        }
        @keyframes ddayBounceIn {
          0%   { transform:scale(0.5); opacity:0; }
          60%  { transform:scale(1.12); }
          80%  { transform:scale(0.96); }
          100% { transform:scale(1); opacity:1; }
        }
        @keyframes ddaySecondTick {
          0%   { transform:scale(1); }
          10%  { transform:scale(1.15); }
          20%  { transform:scale(1); }
        }
        @keyframes ddayLabelWave {
          0%,100% { letter-spacing:3px; opacity:0.85; }
          50%      { letter-spacing:5px; opacity:1; }
        }

        .dday-wrap {
          position: relative;
          width: 100%;
          border-radius: 28px;
          overflow: hidden;
          background: linear-gradient(145deg, ${B.cream} 0%, #FFF0F8 40%, ${B.lavender} 100%);
          border: 2.5px solid ${B.pants}33;
          box-shadow:
            0 8px 32px ${B.pants}18,
            0 2px 8px ${B.skin}44,
            inset 0 1px 0 rgba(255,255,255,0.8);
          min-height: 195px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .dday-canvas {
          position: absolute; top:0; left:0;
          width:100%; height:100%;
          pointer-events:none;
        }
        .dday-content {
          position: relative; z-index: 10;
          text-align: center;
          padding: 28px 20px 22px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        /* 상단 라벨 */
        .dday-label {
          font-family: 'Jua', sans-serif;
          font-size: 13px;
          color: ${B.pants};
          letter-spacing: 3px;
          animation: ddayLabelWave 2.5s ease-in-out infinite;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dday-label-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: ${B.accent};
          box-shadow: 0 0 8px ${B.accent};
          animation: ddayPulse 1.4s ease-in-out infinite;
          display: inline-block;
        }

        /* 이벤트 이름 */
        .dday-event-name {
          font-family: 'Jua', sans-serif;
          font-size: 19px;
          color: ${B.dark};
          margin: 0;
          animation: ddayFlicker 8s ease-in-out infinite;
        }

        /* D-day 숫자 */
        .dday-number-wrap {
          display: flex;
          align-items: baseline;
          gap: 4px;
          animation: ddayPulse 2s ease-in-out infinite;
        }
        .dday-d {
          font-family: 'Jua', sans-serif;
          font-size: 28px;
          color: ${B.pants};
          line-height: 1;
        }
        .dday-minus {
          font-family: 'Jua', sans-serif;
          font-size: 24px;
          color: ${B.accent};
          line-height: 1;
        }
        .dday-num {
          font-family: 'Jua', sans-serif;
          font-size: 52px;
          line-height: 1;
          background: linear-gradient(135deg, ${B.pants} 0%, ${B.accent} 50%, #FF6B9D 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ddayShine 3s linear infinite;
          filter: drop-shadow(0 2px 8px ${B.pants}44);
        }
        .dday-day-label {
          font-family: 'Jua', sans-serif;
          font-size: 18px;
          color: ${B.dark}88;
          line-height: 1;
        }

        /* 시:분:초 */
        .dday-time {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .dday-time-unit {
          background: ${B.pants}15;
          border: 1.5px solid ${B.pants}33;
          border-radius: 10px;
          padding: 4px 10px;
          font-family: 'Jua', sans-serif;
          font-size: 16px;
          color: ${B.pants};
          min-width: 38px;
          text-align: center;
        }
        .dday-time-unit.seconds {
          animation: ddaySecondTick 1s ease-out infinite;
          color: ${B.accent};
          border-color: ${B.accent}44;
          background: ${B.accent}11;
        }
        .dday-time-sep {
          font-family: 'Jua', sans-serif;
          font-size: 18px;
          color: ${B.pants}66;
          margin: 0 1px;
          animation: ddayPulse 1s ease-in-out infinite;
        }

        /* 오늘! */
        .dday-today {
          font-family: 'Jua', sans-serif;
          font-size: 32px;
          background: linear-gradient(135deg, ${B.pants}, ${B.accent}, #FF6B9D);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ddayBounceIn 0.6s ease-out, ddayShine 2s linear 0.6s infinite;
          background-size: 200% auto;
        }

        /* 부리 장식 */
        .dday-buri-left {
          position: absolute; bottom: 8px; left: 10px;
          width: 44px;
          animation: ddayBobLeft 3s ease-in-out infinite;
          filter: drop-shadow(0 3px 6px ${B.pants}33);
          pointer-events: none;
        }
        .dday-buri-right {
          position: absolute; bottom: 8px; right: 10px;
          width: 44px;
          animation: ddayBobRight 3.4s ease-in-out infinite;
          filter: drop-shadow(0 3px 6px ${B.accent}33);
          pointer-events: none;
        }

        /* 빛 오버레이 */
        .dday-shine-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, ${B.lavender}44 0%, transparent 50%);
          pointer-events: none;
        }

        /* 이벤트 없을 때 */
        .dday-empty {
          font-family: 'Jua', sans-serif;
          font-size: 15px;
          color: ${B.dark}66;
        }
      `}</style>

      <div ref={wrapRef} className="dday-wrap">
        <canvas ref={canvasRef} className="dday-canvas" />
        <div className="dday-shine-overlay" />

        {/* 부리부리 캐릭터 */}
        <img src={buri4} alt="" className="dday-buri-left" />
        <img src={buri7} alt="" className="dday-buri-right" />

        <div className="dday-content">
          {/* 상단 라벨 */}
          <div className="dday-label">
            <span className="dday-label-dot" />
            SPECIAL D-DAY 💜
            <span className="dday-label-dot" />
          </div>

          {targetEvent ? (
            <>
              {/* 이벤트 이름 */}
              <div className="dday-event-name">
                {targetEvent.title} 🎀
              </div>

              {isToday ? (
                <div className="dday-today">🎊 오늘이에요! 🎊</div>
              ) : (
                <>
                  {/* D-day 숫자 */}
                  <div className="dday-number-wrap">
                    <span className="dday-d">D</span>
                    <span className="dday-minus">-</span>
                    <span className="dday-num">{days}</span>
                    <span className="dday-day-label">일</span>
                  </div>

                  {/* 시:분:초 */}
                  <div className="dday-time">
                    <div className="dday-time-unit">{time.h}</div>
                    <span className="dday-time-sep">:</span>
                    <div className="dday-time-unit">{time.m}</div>
                    <span className="dday-time-sep">:</span>
                    <div className="dday-time-unit seconds">{time.s}</div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="dday-empty">
              💜 특별한 날을 등록해 보세요!<br/>
              <span style={{ fontSize:"12px", opacity:0.7 }}>캘린더에서 ⭐ 중요 일정으로 추가하면 여기 떠요</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}