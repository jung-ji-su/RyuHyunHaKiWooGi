import { useEffect, useMemo, useRef } from 'react';
import { SnowEngine } from '../lib/snowEngine';
import { startSensor, stopSensor, onShake } from '../lib/shakeSensor';
import { IS_LITE_DEVICE } from '../lib/xdPerf';

// 크리스마스 눈 — 시즌 테마가 christmas일 때만 App이 렌더한다. canvas 2D 한 장 + 유리볼 오버레이.
// 사용자가 고른 "소용돌이(A) + 가장 센 설정"(public/snow-preview.html 프로토타입 → src/lib/snowEngine.js).
// 폰에서 못 돌면 의미가 없으니 가드레일을 둔다:
//  - 저사양(코어 ≤4 / 메모리 ≤2GB)이면 입자 절반 + DPR 상한 1.5
//  - 느려지면 입자 수를 자동으로 줄인다(최소 0.4배). 기준은 "프레임 간격 > 19.5ms AND JS 작업 > 3.5ms" —
//    작업이 가벼운데 프레임만 느린 건 창 스로틀/vsync라 입자를 줄여도 소용없으니 줄이지 않는다
//  - 흔들림 에너지가 없을 땐(잔잔한 눈) 30fps로 낮춰 배터리를 아낀다
//  - 탭이 안 보이면 루프 정지, OS "동작 줄이기"면 눈도 흔들기도 끈다
//  - 터치 방해 금지: 전부 pointer-events:none
export default function SnowFall({ lifted = false }) {
  const wrapRef = useRef(null), canvasRef = useRef(null), glassRef = useRef(null);
  const reduce = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (reduce) return undefined;
    const wrap = wrapRef.current, canvas = canvasRef.current, glass = glassRef.current;
    if (!wrap || !canvas) return undefined;
    const engine = new SnowEngine(canvas, glass, { lite: IS_LITE_DEVICE });
    const themeOf = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'night' : 'day');
    let quality = 1, raf = 0, running = false, last = 0, acc = 0, frames = 0, emaMs = 16.7, workEma = 1, badFor = 0, goodFor = 0, rzTimer = 0;
    const layout = () => engine.configure({ W: wrap.clientWidth || window.innerWidth, H: wrap.clientHeight || window.innerHeight, dpr: window.devicePixelRatio || 1, theme: themeOf(), quality });
    layout();

    const frame = (tms) => {
      raf = 0; if (!running) return;
      const raw = tms - last; last = tms;
      if (raw > 0 && raw < 250) {
        emaMs = emaMs * 0.92 + raw * 0.08;
        if (emaMs > 19.5 && workEma > 3.5) { badFor += raw; goodFor = 0; } else if (emaMs < 12.5) { goodFor += raw; badFor = 0; } else { badFor = goodFor = 0; }
        if (badFor > 1200 && quality > 0.4) { quality = Math.max(0.4, quality - 0.15); badFor = 0; layout(); }
        else if (goodFor > 5000 && quality < 1) { quality = Math.min(1, quality + 0.1); goodFor = 0; layout(); }
      }
      acc += Math.min(raw / 1000, 1 / 30); frames++;
      const calm = engine.envNow < 0.02;
      if (!(calm && (frames & 1))) { const w0 = performance.now(); engine.step(acc, tms / 1000); engine.render(); acc = 0; workEma = workEma * 0.92 + (performance.now() - w0) * 0.08; }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => { if (document.hidden) stop(); else start(); };
    const onResize = () => { clearTimeout(rzTimer); rzTimer = setTimeout(layout, 150); };
    document.addEventListener('visibilitychange', onVis); window.addEventListener('resize', onResize);
    const mo = new MutationObserver(layout); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });   // 낮/밤 전환 시 눈 스프라이트 다시 그림
    const offShake = onShake(({ dx, dy, s }) => engine.shake(dx, dy, s, performance.now() / 1000));
    startSensor();                       // 권한 프롬프트는 여기서 띄우지 않는다(더보기 › 시즌 테마의 "켜기" 칩에서만)
    if (!document.hidden) start();
    return () => {
      stop(); offShake(); stopSensor(); mo.disconnect(); clearTimeout(rzTimer);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize);
    };
  }, [reduce]);

  if (reduce) return null;
  // lifted: 로그인처럼 자체 배경이 불투명한 화면에선 배경 위·콘텐츠 아래(z-index 1)로 올린다
  return (
    <div ref={wrapRef} aria-hidden="true" className="snow-wrap" style={{ zIndex: lifted ? 1 : 0 }}>
      <canvas ref={canvasRef} className="snow-canvas" />
      <div ref={glassRef} className="snow-glass" />
    </div>
  );
}
