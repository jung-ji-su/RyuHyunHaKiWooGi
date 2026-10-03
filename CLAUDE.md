# CLAUDE.md

## 더 이상 사용하지 않는 기능 (작업 범위 제외)

아래 6개 기능은 2026-10-03에 사용자 요청으로 메뉴(더보기 드로어)에서 제거됐고 더 이상 사용하지 않음.

- 여행지도 — `src/TravelMap.jsx`
- 연애통계 — `src/LoveStats.jsx`
- 오늘의메뉴 — `src/TodayMenu.jsx`
- 미니게임 (허브 + 하위 전부: 오목, 그림퀴즈, 소원목록) — `src/MiniGameHub.jsx`, `src/OmokGame.jsx`, `src/DrawingGame.jsx`, `src/GameWishList.jsx`
- 가계부 — `src/AccountBook.jsx`
- 이상형 월드컵 — `src/WorldCup.jsx`, `src/worldcupData.js`

**UI 리디자인, 디자인 토큰 적용, 리팩터링, 전수 조사 등의 작업 범위에서 이 6개를 제외할 것. 사용자가 명시적으로 요청할 때만 손댈 것.**

### 현재 상태
- 진입점(더보기 메뉴, `src/lib/constants.js`의 `MENU_ITEMS`)만 제거됨 — 사용자가 메뉴에서 닿을 방법이 없음.
- 소스 파일은 전부 그대로 보존돼 있음(삭제 안 됨).
- 라우트는 `src/App.jsx`에 그대로 남아 있음(의도적 — 아래 참고). `/travel`, `/stats`, `/menu`, `/games`, `/account`, `/worldcup` 경로로 직접 접근하면 여전히 정상 동작함.
- `functions/index.js`의 푸시 알림 `ROUTE` 매핑에는 이 6개 중 어느 것도 포함되지 않음(diary/schedule/bucket/letter/thermo/coupons만 매핑돼 있음) — 라우트를 유지하든 지우든 알림 딥링크에는 영향 없음. 라우트를 지우지 않고 남겨둔 건 혹시 모를 과거 링크/북마크 호환 때문이며, lazy-loading이라 메뉴에서 안 쓰면 빌드 용량에 실질적 비용이 없음.
