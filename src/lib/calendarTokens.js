// 캘린더(CustomCalendar / CoupleCalendar / CoupleDDay / WorkScheduleCalendar) 전용 디자인 토큰.
// 색·간격·모서리·폰트·글래스모피즘 값을 한 곳에 모아, 추후 다른 화면으로 확산할 때
// 같은 구조를 재사용할 수 있게 분리했다. 지금은 위 4개 파일에만 연결돼 있다.
//
// v2 — 리퀴드 글래스 프로토타입(design-preview.html) 승인 후 반영.
// 성능 원칙: backdrop-filter는 큰 패널(카드) 단위로만 쓰고, 작은 반복 요소(아이콘 버튼·dot·
// 칩·배지 등)는 절대 backdrop-filter를 쓰지 않는다 — 대신 반투명 solid + box-shadow로 흉내낸다.
// 화면당 동시 활성 backdrop-filter 패널은 3개를 넘기지 않는 것을 원칙으로 한다.

export const calendarColor = {
  accent: '#7B4FA6',
  accentSoft: '#7B4FA61f',
  onAccent: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E7E2ED',
  divider: '#EFEBF3',
  textPrimary: '#2E2A38',
  textSecondary: '#8A8398',
  textFaint: '#B7B0C4',
  holiday: '#E2574F',

  // 일정 카테고리 — 그리드 dot과 범례에 쓰는 색+모양 축(기존 유지 결정).
  category: {
    기념일:   { hue: '#F0A93B', shape: 'circle' },
    데이트:   { hue: '#EF5A5A', shape: 'square' },
    개인일정: { hue: '#3B82F6', shape: 'diamond' },
  },

  // 작성자(지수/현하/둘다) — 일정 "목록"의 작성자 배지 전용. 그리드 dot에는 안 씀.
  person: {
    jisu:   { from: '#9B6FC7', to: '#7B4FA6' },
    hyunha: { from: '#FF8FAB', to: '#FF6B9D' },
    both:   { from: '#9B6FC7', to: '#FF6B9D' },
  },
};

export const calendarSpace = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const calendarRadius = { sm: 8, md: 14, lg: 20, xl: 28 };

export const calendarFont = {
  monthTitle: '1.05rem',
  weekday: '0.68rem',
  date: '0.86rem',
  label: '0.62rem',
  micro: '0.56rem',
};

// WCAG 권장 최소 터치 타겟(pt). 시각적 크기는 더 작아도 히트박스는 이 값을 유지한다.
export const TOUCH_MIN = 44;

// ============================================================
// 글래스모피즘 — design-preview.html 프로토타입에서 검증된 값 그대로 흡수.
// ============================================================
export const glass = {
  // 큰 패널(카드) 전용
  panelBackground: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  panelBlur: 'blur(22px) saturate(170%)',
  panelShadow: '0 10px 34px rgba(123,79,166,0.16), 0 2px 10px rgba(123,79,166,0.08), inset 0 1px 0 rgba(255,255,255,0.85)',
  panelBorderGradient: 'linear-gradient(150deg, rgba(255,255,255,0.95), rgba(255,255,255,0.1) 35%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.55))',

  // 작은 반복 요소 전용 — backdrop-filter 없음, solid + shadow만
  smallBackground: 'rgba(255,255,255,0.55)',
  smallBorder: '1px solid rgba(255,255,255,0.8)',
  smallShadow: '0 2px 8px rgba(123,79,166,0.14), inset 0 1px 0 rgba(255,255,255,0.9)',

  // 모달/시트(바텀시트) 전용
  sheetBackground: 'linear-gradient(165deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))',
  sheetBlur: 'blur(26px) saturate(170%)',
  sheetShadow: '0 -10px 40px rgba(123,79,166,0.26), inset 0 1px 0 rgba(255,255,255,0.9)',
};

// 유리 패널에 바로 스프레드해서 쓰는 sx 프리셋 (position:relative 포함 — ::before 하이라이트 테두리 기준)
export function glassPanelSx(radius = calendarRadius.lg) {
  return {
    position: 'relative',
    background: glass.panelBackground,
    backdropFilter: glass.panelBlur,
    WebkitBackdropFilter: glass.panelBlur,
    borderRadius: `${radius}px`,
    boxShadow: glass.panelShadow,
  };
}

// 실선 대신 위치별 밝기가 다른 그라데이션 링을 오려내는 "리퀴드 글래스" 테두리.
// 부모에 glassPanelSx()(position:relative 포함)가 적용돼 있어야 한다.
export function glassBorderSx() {
  return {
    content: '""',
    position: 'absolute', inset: 0,
    borderRadius: 'inherit',
    padding: '1px',
    background: glass.panelBorderGradient,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  };
}

// 작은 반복 요소(아이콘 버튼 배경 등)용 — backdrop-filter 없이 유리 느낌만
export function glassSmallSx() {
  return {
    background: glass.smallBackground,
    border: glass.smallBorder,
    boxShadow: glass.smallShadow,
  };
}
