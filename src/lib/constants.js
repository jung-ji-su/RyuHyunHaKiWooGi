// 의미 기반 색 토큰(src/index.css의 CSS 변수)을 가리키는 단일 소스.
// 값 자체는 전부 기존에 각 화면에서 실제 쓰이던 리터럴 그대로다 — 여기서 var() 참조로
// 바꾼다고 화면 색이 달라지지 않는다. 다크 모드는 index.css의 [data-theme="dark"]
// 블록이 같은 변수 이름에 다른 값을 덮어써서 전파된다(이 파일은 안 바뀜).
//
// pink/green은 이름이 같은데 실제 쓰던 값이 2종류였다(한 번 더 확인: CoupleDDay.jsx·
// CoupleCoupons.jsx의 "B.pink"는 person(현하) 식별색이 아니라 범용 비비드 포인트색,
// EmotionThermometer.jsx의 "B.green"은 온도 게이지가 아니라 범용 성공/완료 신호색 —
// 둘 다 같은 역할인데 값만 다르다. 현재 화면 색을 유지하려고 병합하지 않고 별도
// 토큰(pinkVivid / successBright)으로 분리했다.
export const B = {
  skin: "var(--c-skin)", pants: "var(--c-pants)", dark: "var(--c-dark)",
  cream: "var(--c-cream)", peach: "var(--c-peach)", lavender: "var(--c-lavender)",
  accent: "var(--c-accent)",
  pink: "var(--c-pink)", pinkVivid: "var(--c-pink-vivid)",
  green: "var(--c-success)", successBright: "var(--c-success-bright)",
  error: "var(--c-error)", danger: "var(--c-error)",
  warning: "var(--c-warning)", orange: "var(--c-orange)",
  surface: "var(--c-surface-card)",
  pantsHover: "var(--c-pants-hover)", pantsBright: "var(--c-pants-bright)",
};

export { alpha } from './color';

export const ROUTES = {
  HOME: "/",
  SCHEDULE: "/schedule",
  COUPONS: "/coupons",
  LETTER: "/letter",
  THERMO: "/thermo",
  DIARY: "/diary",
  BUCKET: "/bucket",
  TAMAGOTCHI: "/tamagotchi",
};

// 여행지도·연애통계·오늘의메뉴·미니게임·가계부·이상형월드컵은 2026-11-23에 코드째 제거됨.
// 필요하면 git 이력(커밋 40f8053 이전)에서 복원 — CLAUDE.md 참고.
export const MENU_ITEMS = [
  { emoji: "📅", name: "일정 보기", sub: "등록된 일정 한눈에", path: ROUTES.SCHEDULE, color: B.pants },
  { emoji: "🎟️", name: "쿠폰북", sub: "사용 가능한 쿠폰", path: ROUTES.COUPONS, color: B.accent },
  { emoji: "💌", name: "몰래 편지함", sub: "깜짝 편지 보내기", path: ROUTES.LETTER, color: "#FF8FAB" },
  { emoji: "🌡️", name: "감정 온도계", sub: "오늘 온도 기록", path: ROUTES.THERMO, color: B.accent },
  { emoji: "📖", name: "전체 기록", sub: "우리의 소중한 기록", path: ROUTES.DIARY, color: B.pants },
  { emoji: "🪣", name: "버킷리스트", sub: "같이 이루고 싶은 것", path: ROUTES.BUCKET, color: B.green },
  { emoji: "🐾", name: "다마고치", sub: "커플 펫 키우기 대결", path: ROUTES.TAMAGOTCHI, color: "#7B4FA6" },
];

// 바텀 네비게이션 6탭 (자주 쓰는 메뉴 5개 + 더보기)
export const BOTTOM_NAV = [
  { emoji: "🏠", name: "홈", path: ROUTES.HOME },
  { emoji: "📅", name: "일정", path: ROUTES.SCHEDULE },
  { emoji: "📖", name: "기록", path: ROUTES.DIARY },
   { emoji: "🐹", name: "햄찌", path: ROUTES.TAMAGOTCHI },
  { emoji: "🌡️", name: "온도계", path: ROUTES.THERMO },
  { emoji: "🪣", name: "버킷", path: ROUTES.BUCKET },
  { emoji: "☰", name: "더보기", path: null },
];
