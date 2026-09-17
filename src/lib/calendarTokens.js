// 캘린더(CustomCalendar / CoupleCalendar) 전용 디자인 토큰.
// 색·간격·모서리·폰트를 한 곳에 모아, 추후 다른 화면으로 확산할 때 같은 구조를 재사용할 수 있게 분리했다.
// 지금은 캘린더 두 파일에만 연결돼 있고 다른 화면에는 영향 없음.

// 메인 보라 하나만 accent로 쓰고, 나머지는 중성 회색 계열.
// 카테고리 색은 day cell의 일정 dot에만 쓰고, 모양(shape)을 함께 제공해 색만으로 구분하지 않게 한다.
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
  category: {
    기념일:   { hue: '#F0A93B', shape: 'circle' },
    데이트:   { hue: '#EF5A5A', shape: 'square' },
    개인일정: { hue: '#3B82F6', shape: 'diamond' },
  },
};

export const calendarSpace = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const calendarRadius = { sm: 8, md: 14, lg: 20 };

export const calendarFont = {
  monthTitle: '1.05rem',
  weekday: '0.68rem',
  date: '0.86rem',
  label: '0.62rem',
  micro: '0.56rem',
};

// WCAG 권장 최소 터치 타겟(pt). 시각적 크기는 더 작아도 히트박스는 이 값을 유지한다.
export const TOUCH_MIN = 44;
