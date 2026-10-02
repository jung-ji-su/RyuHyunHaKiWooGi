import { useEffect, useRef } from 'react';

// 배경에 천천히 흐르는 수채화 글로우 — public/design-preview.html에서 검증된
// "filter:blur()는 자기 레이어만 블러 처리해서 backdrop-filter보다 훨씬 싸다"
// 기법을 실제 앱 배경에 적용한 것. transform/opacity만 애니메이션하고,
// 탭이 안 보일 때는 멈춰서(visibilitychange) 배터리를 아낀다.
// prefers-reduced-motion은 index.css의 전역 media query가 애니메이션 자체를
// 무력화하므로 여기선 따로 처리하지 않는다.
export default function AmbientGlow() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onVisibility = () => {
      el.style.animationPlayState = document.hidden ? 'paused' : 'running';
      el.querySelectorAll('.ambient-blob').forEach(b => {
        b.style.animationPlayState = document.hidden ? 'paused' : 'running';
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <div className="ambient-blob ambient-blob--1" />
      <div className="ambient-blob ambient-blob--2" />
      <div className="ambient-blob ambient-blob--3" />
    </div>
  );
}
