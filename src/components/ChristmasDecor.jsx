import { useEffect, useRef } from 'react';

// 크리스마스 장식 레이어 — 시즌 테마가 christmas일 때만 App이 렌더한다(기본 라이트/다크엔 없음).
// 원칙:
//  - 전부 pointer-events:none. 레이아웃에 영향 없는 position:fixed 레이어뿐.
//  - 글자를 가리지 않게: 트리·산타·반짝이는 콘텐츠 "뒤"(z-index -1/0), 상단 전구줄은 12px 높이,
//    산타(상단 전구 줄 높이)와 루돌프(탭바 윗선)만 가끔 지나가므로 콘텐츠 위에 두되, 둘 다 글자가 없는 띠를 지난다.
//  - 움직임은 transform/opacity만. 탭이 숨겨지면 animation-play-state: paused.
//  - OS "동작 줄이기"면 정적 장식(트리·꺼지지 않은 전구)만 남기고 움직이는 것(산타·루돌프·반짝임)은 그리지 않는다.
const BULB_COLORS = ['#E5535D', '#F2B93B', '#3DAA7D', '#5B9BE0'];
const BULB_COUNT = 14;

const SPARKLES = [
  { x: '12%', y: '18%', s: 11, d: 3.6, dl: 0.2 },
  { x: '86%', y: '12%', s: 9,  d: 4.2, dl: 1.4 },
  { x: '92%', y: '46%', s: 12, d: 3.9, dl: 2.3 },
  { x: '6%',  y: '52%', s: 8,  d: 4.6, dl: 0.9 },
  { x: '78%', y: '74%', s: 10, d: 3.4, dl: 1.9 },
  { x: '22%', y: '84%', s: 9,  d: 4.0, dl: 2.8 },
];

// 트리 한 그루 — 3단 + 별 + 장식 구슬. 몸통은 아주 옅게(콘텐츠 뒤 배경), 구슬만 천천히 반짝인다.
function Tree({ style, orn = true }) {
  return (
    <svg className="xd-tree" style={style} viewBox="0 0 100 140" aria-hidden="true">
      <rect x="43" y="120" width="14" height="16" rx="2" className="xd-trunk" />
      <polygon points="50,12 20,56 80,56" className="xd-leaf" />
      <polygon points="50,36 13,88 87,88" className="xd-leaf" />
      <polygon points="50,64 7,124 93,124" className="xd-leaf" />
      <polygon className="xd-star" points="50,0 53.5,9 63,9.5 55.5,15.5 58,25 50,19.5 42,25 44.5,15.5 37,9.5 46.5,9" />
      {[
        [38, 50, '#F2B93B', 0], [60, 46, '#E5535D', 1.1], [30, 78, '#E5535D', 0.6],
        [52, 80, '#F2B93B', 1.7], [72, 82, '#5B9BE0', 0.3], [24, 108, '#F2B93B', 1.3],
        [48, 108, '#E5535D', 0.8], [74, 110, '#F2B93B', 1.9],
      ].map(([cx, cy, fill, dl], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.2" fill={fill}
          className={orn ? 'xd-orn' : 'xd-orn xd-orn--still'} style={{ animationDelay: `${dl}s` }} />
      ))}
    </svg>
  );
}

// lifted: 로그인처럼 자체 배경이 불투명한 화면에선 -1 레이어가 가려지므로 배경 위·콘텐츠(z-index 2) 아래로 올린다.
export default function ChristmasDecor({ lifted = false }) {
  const rootRef = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 탭바 높이를 CSS 변수로 알려 준다(루돌프/트리가 탭바 윗선 기준으로 서도록). 레이아웃은 읽기만 한다.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let ro; let raf; let tries = 0;
    const attach = () => {
      const nav = document.querySelector('[data-bottom-nav]');
      if (!nav) { if (tries++ < 20) raf = requestAnimationFrame(attach); return; }
      const set = () => root.style.setProperty('--xd-nav-h', `${nav.offsetHeight}px`);
      set();
      if (window.ResizeObserver) { ro = new ResizeObserver(set); ro.observe(nav); }
    };
    attach();
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, []);

  // 탭이 안 보이면 모든 장식 애니메이션 정지
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onVis = () => root.classList.toggle('xd-paused', document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div ref={rootRef} className={`xd${reduce ? ' xd-static' : ''}${lifted ? ' xd-lifted' : ''}`} aria-hidden="true">
      {/* 상단 전구 줄 — 캔디 스트라이프를 대체 */}
      <div className="xd-bulbs">
        <div className="xd-wire" />
        {Array.from({ length: BULB_COUNT }).map((_, i) => (
          <span key={i} className="xd-bulb"
            style={{ '--c': BULB_COLORS[i % BULB_COLORS.length], animationDelay: `${(i % 3) * 0.8}s`, marginTop: i % 2 ? 2 : 0 }} />
        ))}
      </div>

      {/* 콘텐츠 뒤 — 트리, 산타 */}
      <div className="xd-back">
        <Tree style={{ left: -20, bottom: 'calc(var(--xd-nav-h, 0px) + 6px)', width: 96 }} />
        <Tree style={{ right: -26, top: '40%', width: 80 }} />
        <Tree style={{ left: -14, top: '27%', width: 54 }} orn={false} />
      </div>

      {/* 산타 썰매 — 상단 전구 줄을 따라 가끔 지나간다(헤더 글자보다 위쪽 띠라 글자를 가리지 않음) */}
      {!reduce && (
        <div className="xd-santa">
          <span className="xd-santa-sleigh">🛷</span>
          <span className="xd-santa-man">🎅</span>
        </div>
      )}

      {/* 작은 반짝이 */}
      {!reduce && (
        <div className="xd-mid">
          {SPARKLES.map((p, i) => (
            <span key={i} className="xd-spark"
              style={{ left: p.x, top: p.y, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.dl}s` }} />
          ))}
        </div>
      )}

      {/* 루돌프 — 탭바 윗선을 가끔 지나간다 */}
      {!reduce && (
        <div className="xd-deer"><span className="xd-deer-body">🦌</span></div>
      )}
    </div>
  );
}
