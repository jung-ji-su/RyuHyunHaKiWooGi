# CLAUDE.md

## 제거된 기능 (2026-11-23 코드째 삭제)

아래 6개 기능은 2026-10-03에 메뉴에서 빠졌고, 2026-11-23에 소스·라우트까지 삭제했다.

- 여행지도 — `TravelMap.jsx`
- 연애통계 — `LoveStats.jsx`
- 오늘의메뉴 — `TodayMenu.jsx`, `menuData.json`
- 미니게임 (허브 + 하위 전부) — `MiniGameHub.jsx`, `OmokGame.jsx`, `DrawingGame.jsx`, `GameWishList.jsx`
- 가계부 — `AccountBook.jsx`
- 이상형 월드컵 — `WorldCup.jsx`, `worldcupData.js`

복원이 필요하면 삭제 직전 커밋(`40f8053`)에서 꺼낸다: `git checkout 40f8053 -- src/<파일>`.
복원 시 `App.jsx` 라우트, `lib/constants.js`의 `ROUTES`/`MENU_ITEMS`도 다시 추가해야 한다.

### 참고
- 이 기능들이 쓰던 Firestore 컬렉션과 기존 데이터는 삭제하지 않았다.
- `functions/index.js` 푸시 알림 `ROUTE` 매핑에는 원래 이 6개가 없어 영향 없음.
