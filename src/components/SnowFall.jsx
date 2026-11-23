import { useEffect, useMemo, useRef } from 'react';

// 은은한 눈 — 시즌 테마(크리스마스)가 켜져 있을 때만 렌더된다.
// 성능/배려 원칙(AmbientGlow와 같은 패턴):
//  - DOM 입자 + CSS 애니메이션(transform/opacity만). 캔버스 rAF 루프 없음.
//  - 입자 수는 화면 폭 기준으로 고정(좁은 폰 16개, 넓은 화면 26개). 늘어나지 않는다.
//  - 탭이 안 보이면 animation-play-state: paused(visibilitychange).
//  - OS "동작 줄이기"면 눈은 그리지 않는다(CSS 전역 규칙은 애니메이션을 0.01ms로 만들어
//    입자가 첫 위치에 정지해 보이기 때문에, 렌더 자체를 건너뛴다).
//  - 입자는 콘텐츠 뒤(z-index 0), 작고(2~5px) 옅게 해서 글자를 가리지 않는다.
//  - 위치/속도/지연은 고정 시드 의사난수(렌더마다 바뀌지 않음).
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function makeFlakes(count) {
  let seed = 20261224;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: `${(rnd() * 100).toFixed(1)}%`,
    s: `${(2 + rnd() * 3).toFixed(1)}px`,
    d: `${(16 + rnd() * 14).toFixed(1)}s`,
    delay: `${(-rnd() * 30).toFixed(1)}s`, // 음수 지연 → 처음부터 화면에 흩어져 있음
    drift: `${(-30 + rnd() * 60).toFixed(0)}px`,
    o: (0.35 + rnd() * 0.4).toFixed(2),
  }));
}

export default function SnowFall({ lifted = false }) {
  const ref = useRef(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);
  const flakes = useMemo(
    () => makeFlakes(typeof window !== 'undefined' && window.innerWidth < 500 ? 16 : 26),
    [],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onVisibility = () => {
      const state = document.hidden ? 'paused' : 'running';
      el.querySelectorAll('.snow-flake').forEach(f => { f.style.animationPlayState = state; });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (reduce) return null;

  return (
    <>
      <div ref={ref} aria-hidden="true"
        style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: lifted ? 1 : 0, pointerEvents: 'none' }}>
        {flakes.map(f => (
          <span key={f.id} className="snow-flake"
            style={{ '--x': f.x, '--s': f.s, '--d': f.d, '--delay': f.delay, '--drift': f.drift, '--o': f.o }} />
        ))}
      </div>
    </>
  );
}
