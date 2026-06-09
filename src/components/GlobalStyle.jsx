import { B } from '../lib/constants';

export default function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;700;900&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html { scrollbar-gutter: stable; }
      body {
        font-family: 'Noto Sans KR', sans-serif;
        background-color: ${B.cream};
        background-image:
          radial-gradient(circle at 15% 20%, ${B.peach}99 0%, transparent 35%),
          radial-gradient(circle at 85% 70%, ${B.lavender}88 0%, transparent 35%);
        min-height: 100vh;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
      }
      @media (hover: none) and (pointer: coarse) {
        *:hover { transform: none !important; }
      }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: ${B.peach}; }
      ::-webkit-scrollbar-thumb { background: ${B.pants}88; border-radius: 10px; }
      .MuiPaper-root, .MuiTypography-root, .MuiButton-root { font-family: 'Noto Sans KR', sans-serif !important; }
      .buri-float {
        position: fixed; pointer-events: none; z-index: 0; opacity: 0.10;
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transform: translateZ(0);
      }
      .buri-float.b2 { top: 120px; left: -25px; width: 150px; animation: buriFloat2 7s ease-in-out infinite; }
      .buri-float.b3 { bottom: 200px; left: 5px; width: 110px; animation: buriFloat3 5s ease-in-out infinite; }
      .buri-float.b4 { top: 55%; right: -20px; width: 100px; animation: buriFloat1 6s ease-in-out 1s infinite; }
      .buri-float.b5 { bottom: 80px; right: 5px; width: 80px; animation: buriFloat2 8s ease-in-out 2s infinite; }
      @keyframes buriFloat1 { 0%,100%{transform:translateY(0) rotate(-5deg);} 50%{transform:translateY(-18px) rotate(3deg);} }
      @keyframes buriFloat2 { 0%,100%{transform:translateY(0) rotate(6deg);} 50%{transform:translateY(-14px) rotate(-4deg);} }
      @keyframes buriFloat3 { 0%,100%{transform:translateY(0) rotate(-8deg);} 50%{transform:translateY(-22px) rotate(5deg);} }
      @keyframes wobble { 0%,100%{transform:rotate(-1deg);} 50%{transform:rotate(1.5deg);} }
      @keyframes fadeInUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
      @keyframes headBob { 0%,100%{transform:rotate(0deg);} 25%{transform:rotate(-4deg);} 75%{transform:rotate(4deg);} }
      @keyframes pageSlideIn { from{opacity:0;transform:translateX(20px);} to{opacity:1;transform:translateX(0);} }
      @keyframes loginBgShift { 0%{background-position:0% 50%;} 50%{background-position:100% 50%;} 100%{background-position:0% 50%;} }
      @keyframes titleDrop { 0%{opacity:0;transform:translateY(-30px) scale(0.8);} 70%{transform:translateY(5px) scale(1.05);} 100%{opacity:1;transform:translateY(0) scale(1);} }
      @keyframes cardSlideUp { 0%{opacity:0;transform:translateY(40px) scale(0.88);} 70%{transform:translateY(-5px) scale(1.02);} 100%{opacity:1;transform:translateY(0) scale(1);} }
      @keyframes avatarPulseA { 0%,100%{box-shadow:0 4px 18px ${B.pants}44,0 0 0 0 ${B.pants}22;} 50%{box-shadow:0 6px 24px ${B.pants}66,0 0 0 10px transparent;} }
      @keyframes avatarPulseB { 0%,100%{box-shadow:0 4px 18px ${B.skin}66,0 0 0 0 ${B.skin}33;} 50%{box-shadow:0 6px 24px ${B.skin}88,0 0 0 10px transparent;} }
      @keyframes shineSlide { 0%,65%{left:-70%;} 80%{left:130%;} 100%{left:130%;} }
      @keyframes floatEmoji { 0%{transform:translateY(0) rotate(0deg);opacity:0.2;} 50%{opacity:0.45;} 100%{transform:translateY(-100px) rotate(20deg);opacity:0;} }
      @keyframes twinkleDot { 0%,100%{opacity:0.12;transform:scale(0.6);} 50%{opacity:0.7;transform:scale(1.3);} }
      @keyframes buriWiggle { 0%,100%{transform:rotate(-10deg) translateY(0);} 50%{transform:rotate(10deg) translateY(-6px);} }
      @keyframes loginBuriFloat { 0%,100%{transform:translateY(0) rotate(-5deg) scale(1);} 50%{transform:translateY(-12px) rotate(4deg) scale(1.04);} }
      @keyframes hintPulse { 0%,100%{opacity:0.45;letter-spacing:1px;} 50%{opacity:0.9;letter-spacing:3px;} }
      @keyframes buriRippleAnim { to{transform:scale(4);opacity:0;} }
      @keyframes buriPangFly { 0%{opacity:1;transform:translate(-50%,-50%) scale(1);} 100%{opacity:0;transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0.2);} }
      @keyframes buriHeartBurst { 0%{opacity:1;transform:translate(-50%,-50%) scale(1.2);} 100%{opacity:0;transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0);} }
      @keyframes buri-shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-7px) rotate(-2deg);} 40%{transform:translateX(7px) rotate(2deg);} 60%{transform:translateX(-5px) rotate(-1deg);} 80%{transform:translateX(4px) rotate(1deg);} }
      .buri-shake { animation: buri-shake 0.4s ease !important; }
      @keyframes hamPulse {
        0%,100%{ box-shadow: 0 4px 18px ${B.pants}66, 0 0 0 0 ${B.pants}33; transform: scale(1); }
        50%    { box-shadow: 0 6px 24px ${B.pants}88, 0 0 0 6px transparent; transform: scale(1.06); }
      }
      @keyframes hamRing {
        0%  { transform: scale(1);   opacity: 0.7; }
        60% { transform: scale(1.5); opacity: 0; }
        100%{ transform: scale(1.5); opacity: 0; }
      }
      @keyframes gridCardIn {
        from { opacity:0; transform: translateY(12px) scale(0.95); }
        to   { opacity:1; transform: translateY(0) scale(1); }
      }
      @keyframes drawerHeaderIn {
        from { opacity:0; transform: translateY(-10px); }
        to   { opacity:1; transform: translateY(0); }
      }
      @keyframes bottomNavIn {
        from { opacity:0; transform:translateY(100%); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes bellShake {
        0%,60%,100% { transform: rotate(0deg); }
        10%  { transform: rotate(-18deg); }
        20%  { transform: rotate(18deg); }
        30%  { transform: rotate(-12deg); }
        40%  { transform: rotate(12deg); }
        50%  { transform: rotate(-6deg); }
      }
      @keyframes hamsterSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      .hamster-idle   { display:inline-block; }
      .hamster-active { display:inline-block; animation: hamsterSpin 0.55s linear infinite; }
    `}</style>
  );
}
