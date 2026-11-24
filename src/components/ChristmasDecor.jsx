import { useEffect, useRef } from 'react';
import { IS_LITE_DEVICE } from '../lib/xdPerf';

// 크리스마스 장식 레이어 — 시즌 테마가 christmas일 때만 App이 렌더한다(기본 라이트/다크엔 없음).
// 원칙:
//  - 전부 pointer-events:none. 레이아웃에 영향 없는 position:fixed 레이어(+ SectionCard 모서리 ::after)뿐.
//  - 글자를 가리지 않게:
//      · 트리·선물·눈사람은 콘텐츠 "뒤"(z-index -1) — 카드/글자 뒤 빈 곳에서만 보인다.
//      · 상단은 y 0~30px 띠(전구 줄 + 매달린 오너먼트 + 산타)만 쓴다. 헤더 글자는 그 아래.
//      · 하단은 탭바 윗선(눈 쌓인 테두리) 위로 루돌프 3마리가 달린다. 테두리는 탭바 안쪽 5px까지만
//        들어가고, 탭 아이콘/라벨은 탭바 윗선에서 8px 아래부터라 닿지 않는다.
//  - 움직임은 transform/opacity만. 탭이 숨겨지면 animation-play-state: paused.
//  - 동시에 움직이는 것: 루돌프 3(저사양 2) + 산타 1 + 반짝이 12(저사양 6) + 전구 14(opacity) + 트리 오너먼트 그룹.
//  - OS "동작 줄이기"면 움직이는 것(산타·루돌프·반짝임·전구 깜빡임)은 끄고 정적 장식만 남긴다.
const BULB_COLORS = ['#E5535D', '#F2B93B', '#3DAA7D', '#5B9BE0'];
const BULB_COUNT = 14;

// 반짝이 — 가장자리 위주로 흩뿌리고 크기는 ≤13px, 최대 불투명도 0.7이라 글자 위로 지나가도 읽힌다.
const SPARKLES = [
  { x: '12%', y: '18%', s: 11, d: 3.6, dl: 0.2 },
  { x: '86%', y: '12%', s: 9,  d: 4.2, dl: 1.4 },
  { x: '93%', y: '46%', s: 13, d: 3.9, dl: 2.3 },
  { x: '5%',  y: '52%', s: 9,  d: 4.6, dl: 0.9 },
  { x: '78%', y: '74%', s: 10, d: 3.4, dl: 1.9 },
  { x: '22%', y: '84%', s: 9,  d: 4.0, dl: 2.8 },
  { x: '3%',  y: '33%', s: 12, d: 4.4, dl: 3.1 },
  { x: '95%', y: '28%', s: 8,  d: 3.7, dl: 0.6 },
  { x: '47%', y: '9%',  s: 9,  d: 4.8, dl: 1.1 },
  { x: '66%', y: '88%', s: 11, d: 3.5, dl: 2.0 },
  { x: '8%',  y: '70%', s: 8,  d: 4.1, dl: 3.4 },
  { x: '90%', y: '62%', s: 10, d: 4.3, dl: 1.6 },
];

// 상단 줄에 매달린 오너먼트 — 전구와 겹치지 않게 전구 사이(7.14%의 배수)에 건다.
const HANGERS = [
  { x: '14.3%', len: 10, c: '#E5535D' },
  { x: '35.7%', len: 14, c: '#F2B93B' },
  { x: '57.1%', len: 9,  c: '#5B9BE0' },
  { x: '78.6%', len: 13, c: '#E5535D' },
];

// 루돌프 — 크기·속도·출발 시점을 다르게. 음수 지연이라 처음부터 화면 곳곳에 흩어져 있고,
// 쉬는 구간 없이 계속 달려서 항상 2~3마리가 보인다. (작을수록 느리게 = 멀리 있는 느낌)
const DEER = [
  { size: 25, run: 9.5,  hop: 0.42, rise: 5, dl: -2.0 },
  { size: 21, run: 13.5, hop: 0.36, rise: 4, dl: -9.5 },
  { size: 17, run: 18,   hop: 0.33, rise: 3, dl: -14 },
];

// 트리 한 그루 — 3단 + 눈 모자 + 구슬 가랜드 + 별 + 장식 구슬.
// 몸통은 솔리드 색에 svg 전체 opacity(--xd-o)를 줘서 겹친 단이 이중으로 진해지지 않는다.
// 구슬은 두 그룹으로 나눠 서로 엇갈리게 반짝인다(그룹당 애니메이션 1개).
const ORN_A = [[38, 50, 'gold'], [30, 79, 'red'], [72, 82, 'blue'], [48, 108, 'red']];
const ORN_B = [[60, 46, 'red'], [52, 80, 'gold'], [24, 108, 'gold'], [74, 110, 'gold']];
function Tree({ style, orn = true }) {
  return (
    <svg className="xd-tree" style={style} viewBox="0 0 100 140" aria-hidden="true">
      <rect x="43" y="120" width="14" height="16" rx="2" className="xd-trunk" />
      <polygon points="50,12 20,56 80,56" className="xd-leaf" />
      <polygon points="50,36 13,88 87,88" className="xd-leaf2" />
      <polygon points="50,64 7,124 93,124" className="xd-leaf" />
      <g className="xd-snowcap">
        <polygon points="50,12 38,29 44,26 50,31 56,26 62,29" />
        <polygon points="50,36 31.5,62 38,57 44,64 50,57 56,64 62,57 68.5,62" />
        <polygon points="50,64 27,96 34,91 41,98 48,91 55,98 62,91 68,98 73,96" />
      </g>
      <g className="xd-garland">
        <path d="M29,44 Q50,54 71,44" />
        <path d="M23,75 Q50,88 77,75" />
        <path d="M19,108 Q50,122 81,108" />
      </g>
      <polygon className="xd-star" points="50,0 53.5,9 63,9.5 55.5,15.5 58,25 50,19.5 42,25 44.5,15.5 37,9.5 46.5,9" />
      <g className={orn ? 'xd-orn xd-orn--a' : 'xd-orn xd-orn--still'}>
        {ORN_A.map(([cx, cy, fill], i) => <circle key={i} cx={cx} cy={cy} r="3.6" className={`xd-c-${fill}`} />)}
      </g>
      <g className={orn ? 'xd-orn xd-orn--b' : 'xd-orn xd-orn--still'}>
        {ORN_B.map(([cx, cy, fill], i) => <circle key={i} cx={cx} cy={cy} r="3.6" className={`xd-c-${fill}`} />)}
      </g>
    </svg>
  );
}

// 선물 상자 두 개 + 리본
function Gifts({ style }) {
  return (
    <svg className="xd-gifts" style={style} viewBox="0 0 64 56" aria-hidden="true">
      <rect x="2" y="26" width="38" height="28" rx="3" className="xd-c-red" />
      <rect x="19" y="26" width="6" height="28" className="xd-c-gold" />
      <rect x="2" y="36" width="38" height="5" className="xd-c-gold" />
      <path d="M22,26 C12,14 6,22 22,26 C38,22 32,14 22,26Z" className="xd-c-gold" />
      <circle cx="22" cy="26" r="3.2" className="xd-c-gold" />
      <rect x="38" y="36" width="24" height="18" rx="3" className="xd-c-green" />
      <rect x="47" y="36" width="6" height="18" className="xd-c-red" />
      <path d="M50,36 C44,28 40,34 50,36 C60,34 56,28 50,36Z" className="xd-c-red" />
    </svg>
  );
}

// 눈사람 — 모자·목도리·당근 코
function Snowman({ style }) {
  return (
    <svg className="xd-snowman" style={style} viewBox="0 0 60 100" aria-hidden="true">
      <path d="M12,52 L2,44 M48,52 L58,43" stroke="#7A5A3E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="30" cy="78" r="19" className="xd-c-snow xd-sm-body" />
      <circle cx="30" cy="51" r="14" className="xd-c-snow xd-sm-body" />
      <circle cx="30" cy="29" r="10.5" className="xd-c-snow xd-sm-body" />
      <rect x="18" y="19" width="24" height="4" rx="1.5" className="xd-c-hat" />
      <rect x="22" y="6" width="16" height="15" rx="2" className="xd-c-hat" />
      <rect x="22" y="14" width="16" height="3.5" className="xd-c-red" />
      <circle cx="26" cy="27" r="1.4" className="xd-c-eye" />
      <circle cx="34" cy="27" r="1.4" className="xd-c-eye" />
      <path d="M30,30 L40,32.5 L30,34Z" className="xd-c-gold" />
      <path d="M17,38 Q30,46 43,38 L42,44 Q30,50 18,44Z" className="xd-c-red" />
      <path d="M38,43 L41,58 L36,57Z" className="xd-c-red" />
      <circle cx="30" cy="55" r="1.8" className="xd-c-eye" />
      <circle cx="30" cy="63" r="1.8" className="xd-c-eye" />
      <circle cx="30" cy="80" r="2" className="xd-c-eye" />
      <circle cx="30" cy="89" r="2" className="xd-c-eye" />
    </svg>
  );
}

// lifted: 로그인처럼 자체 배경이 불투명한 화면에선 -1 레이어가 가려지므로 배경 위·콘텐츠(z-index 2) 아래로 올린다.
export default function ChristmasDecor({ lifted = false }) {
  const rootRef = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deer = IS_LITE_DEVICE ? DEER.slice(0, 2) : DEER;
  const sparkles = IS_LITE_DEVICE ? SPARKLES.slice(0, 6) : SPARKLES;

  // 탭바 윗선의 위치를 CSS 변수(--xd-nav-top = 뷰포트 아래쪽에서 탭바 윗선까지 거리)로 알려 준다.
  // 루돌프/눈 테두리/트리가 "실제 탭바 윗선" 기준으로 서도록 높이(offsetHeight)가 아니라 rect로 잰다
  // (body 기본 여백 등으로 탭바가 뷰포트 아래에서 어긋나 있어도 맞는다). 레이아웃은 읽기만 한다.
  // 탭바가 없는 화면(로그인/로딩)에선 xd-has-nav가 안 붙어서 테두리·루돌프는 그려지지 않는다.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let ro; let raf; let tries = 0; let syncRaf = 0; let nav = null;
    const sync = () => {
      syncRaf = 0;
      if (!nav) return;
      root.style.setProperty('--xd-nav-top', `${window.innerHeight - nav.getBoundingClientRect().top}px`);
    };
    const schedule = () => { if (!syncRaf) syncRaf = requestAnimationFrame(sync); };
    const attach = () => {
      nav = document.querySelector('[data-bottom-nav]');
      if (!nav) { if (tries++ < 20) raf = requestAnimationFrame(attach); return; }
      sync();
      root.classList.add('xd-has-nav');
      if (window.ResizeObserver) { ro = new ResizeObserver(schedule); ro.observe(nav); }
      window.addEventListener('resize', schedule);
      window.addEventListener('scroll', schedule, { passive: true });
    };
    attach();
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(syncRaf); ro?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
    };
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
      {/* 상단 전구 줄 + 매달린 오너먼트 */}
      <div className="xd-bulbs">
        <div className="xd-wire" />
        {Array.from({ length: BULB_COUNT }).map((_, i) => (
          <span key={i} className="xd-bulb"
            style={{ '--c': BULB_COLORS[i % BULB_COLORS.length], animationDelay: `${(i % 3) * 0.8}s`, marginTop: i % 2 ? 2 : 0 }} />
        ))}
        {HANGERS.map((h, i) => (
          <span key={i} className="xd-hang" style={{ left: h.x, '--len': `${h.len}px`, '--c': h.c }} />
        ))}
      </div>

      {/* 콘텐츠 뒤 — 트리·선물·눈사람 (카드/글자 뒤 빈 곳에서만 보인다) */}
      <div className="xd-back">
        <Tree style={{ left: -22, bottom: 'calc(var(--xd-nav-top, 0px) + 6px)', width: 104 }} />
        <Gifts style={{ left: 70, bottom: 'calc(var(--xd-nav-top, 0px) + 6px)', width: 52 }} />
        <Tree style={{ right: -28, bottom: 'calc(var(--xd-nav-top, 0px) + 6px)', width: 82 }} />
        <Snowman style={{ right: 46, bottom: 'calc(var(--xd-nav-top, 0px) + 5px)', width: 50 }} />
        <Tree style={{ right: -26, top: '40%', width: 84 }} />
        <Tree style={{ left: -16, top: '25%', width: 60 }} orn={false} />
        <Tree style={{ right: -10, top: '15%', width: 44 }} orn={false} />
        <Tree style={{ left: -20, top: '54%', width: 64 }} orn={false} />
      </div>

      {/* 산타 썰매 — 상단 전구 줄 높이(y 3~29px)를 약 40초에 한 번 지나간다(헤더 글자는 y 30px 아래) */}
      {!reduce && (
        <div className="xd-santa">
          <span className="xd-santa-deer">🦌</span>
          <span className="xd-santa-sleigh">🛷</span>
          <span className="xd-santa-man">🎅</span>
        </div>
      )}

      {/* 반짝이 — 동작 줄이기면 깜빡임 없이 은은하게 고정 */}
      <div className="xd-mid">
        {sparkles.map((p, i) => (
          <span key={i} className={reduce ? 'xd-spark xd-spark--still' : 'xd-spark'}
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.dl}s` }} />
        ))}
      </div>

      {/* 탭바 윗선의 눈 쌓인 테두리(정적) + 그 위를 달리는 루돌프 */}
      <div className="xd-rim" />
      {!reduce && deer.map((d, i) => (
        <div key={i} className="xd-deer"
          style={{ '--sz': `${d.size}px`, '--run': `${d.run}s`, '--hop': `${d.hop}s`, '--rise': `${-d.rise}px`, '--dl': `${d.dl}s` }}>
          <span className="xd-deer-body">🦌</span>
        </div>
      ))}
    </div>
  );
}
