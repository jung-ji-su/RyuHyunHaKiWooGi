export const B = {
  skin: "#F5B8A0", pants: "#7B4FA6", dark: "#3D1F00",
  cream: "#FFF8F2", peach: "#FFE4D4", lavender: "#EDE0F5",
  accent: "#E8630A", pink: "#FF8FAB", green: "#1D9E75",
};

export const ROUTES = {
  HOME: "/",
  SCHEDULE: "/schedule",
  COUPONS: "/coupons",
  LETTER: "/letter",
  THERMO: "/thermo",
  DIARY: "/diary",
  BUCKET: "/bucket",
  TRAVEL: "/travel",
  STATS: "/stats",
  MENU: "/menu",
  GAMES: "/games",
  ACCOUNT: "/account",
  TAMAGOTCHI: "/tamagotchi",
  WORLDCUP: "/worldcup",
};

export const MENU_ITEMS = [
  { emoji: "📅", name: "일정 보기", sub: "등록된 일정 한눈에", path: ROUTES.SCHEDULE, color: B.pants },
  { emoji: "🎟️", name: "쿠폰북", sub: "사용 가능한 쿠폰", path: ROUTES.COUPONS, color: B.accent },
  { emoji: "💌", name: "몰래 편지함", sub: "깜짝 편지 보내기", path: ROUTES.LETTER, color: "#FF8FAB" },
  { emoji: "🌡️", name: "감정 온도계", sub: "오늘 온도 기록", path: ROUTES.THERMO, color: B.accent },
  { emoji: "📖", name: "전체 기록", sub: "우리의 소중한 기록", path: ROUTES.DIARY, color: B.pants },
  { emoji: "🪣", name: "버킷리스트", sub: "같이 이루고 싶은 것", path: ROUTES.BUCKET, color: B.green },
  { emoji: "🗺️", name: "여행 지도", sub: "함께 간 곳 핀 꽂기", path: ROUTES.TRAVEL, color: "#3A86FF" },
  { emoji: "📊", name: "연애 통계", sub: "우리 연애 리포트", path: ROUTES.STATS, color: "#E91E8C" },
  { emoji: "🍳", name: "오늘의 메뉴", sub: "오늘 저녁 뭐 해먹지?", path: ROUTES.MENU, color: "#FF6B35" },
  { emoji: "🎮", name: "미니게임", sub: "오목, 그림 퀴즈 등", path: ROUTES.GAMES, color: "#9C27B0" },
  { emoji: "💰", name: "가계부", sub: "수입과 지출 관리", path: ROUTES.ACCOUNT, color: "#FFB300" },
  { emoji: "🐾", name: "다마고치", sub: "커플 펫 키우기 대결", path: ROUTES.TAMAGOTCHI, color: "#7B4FA6" },
  { emoji: "⚔️", name: "이상형 월드컵", sub: "최애를 뽑아봐요!", path: ROUTES.WORLDCUP, color: "#7B4FA6" },
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
