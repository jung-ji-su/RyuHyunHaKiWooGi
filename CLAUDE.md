# CLAUDE.md

## ⚠️ 보안 규칙(firestore.rules / storage.rules)은 배포하지 말 것

- 레포의 `firestore.rules`·`storage.rules`는 **최종본**(uid `지수`/`현하` 화이트리스트 + `authAttempts` 차단)이다.
  **라이브에 올라가 있는 건 임시본**(로그인만 요구, 커밋 `63f544d`)이다.
- 2026-11-23에 최종본이 실수로 한 번 배포됐고, **사용자 데이터가 화면에 안 보여서 롤백**했다.
  **원인은 아직 밝혀지지 않았다.** 원인을 규명하기 전에는 규칙을 배포하지 않는다.
  (이 지시를 따르는 에이전트는 사용자가 명시적으로 "규칙 배포해"라고 하기 전엔 어떤 경우에도 배포하지 말 것.)
- 조심할 명령:
  - 맨 `firebase deploy` — `firebase.json`에 firestore/storage 규칙이 들어 있어서 규칙까지 같이 나간다(이게 사고 원인이었다).
  - `firebase deploy --only firestore…` / `--only storage…`.
  - 배포는 항상 `npm run deploy`(= `deploy.js`) 또는 `firebase deploy --only hosting`처럼 대상을 명시한다.
- `deploy.js`는 이미 `firebase deploy --only hosting,functions`로 고쳐져 있어 규칙이 딸려 나가지 않는다.
- 규칙 파일 자체에도 같은 경고와 배포 순서·롤백 방법이 주석으로 있다(`firestore.rules` 상단 참고).
- 규칙 동작은 에뮬레이터로만 검증한다: `rules-test.mjs`(`@firebase/rules-unit-testing`, 프로젝트 ID `demo-rules`) — 라이브에는 영향이 없다.

## 햄찌(타마고치) 성장 ()

- 레벨업 요구 XP = . 2026-11-24에 으로 낮춤("진화가 너무 안 된다"). 스테이지 총량 132/462/1,089/2,145/3,234.
- **이나 배율을 바꾸면 성장 그래프() 눈금이 달라진다.** Firestore 의 에 저장된 값은 옛 눈금이라 같이 보정해야 한다.
  2026-11-24에 한 번 ×0.6으로 보정했고 각 유저 맵에  표식을 남겼다(중복 보정 방지). 백업은 (gitignore, 개인 데이터).
- 되살리기: 스테이지 유지, 레벨은 , XP 0. 사망 기준은 5일 미접속 그대로. 미방문 7일+ XP 손실은 18(= 30×XP_SCALE), 14일+는 현재 레벨 요구량의 30%(자동 연동).

## 크리스마스 장식 (`src/components/ChristmasDecor.jsx`, `SnowFall.jsx`, `index.css`의 `.xd-*`)

- 시즌 테마가 `christmas`일 때만 렌더된다. 기본 라이트/다크에는 DOM도 CSS도 없다(`SectionCard`의 `.xd-card` 클래스만 남지만 `[data-season="christmas"]` 아래에서만 스타일이 붙는다).
- 지켜야 할 것: 전부 `pointer-events: none` · 레이아웃 변경 없음 · 움직임은 transform/opacity만 · 탭 숨김 시 정지 · `prefers-reduced-motion`이면 정적 장식만 · 탭바 라벨을 가리지 않음(루돌프는 탭바 윗선 +2px 위에서만 달리고 눈 테두리는 윗선 ±5px 안, 탭 아이콘은 윗선 +8px 아래부터).
- **장식 색을 바꾸면 글자 대비를 다시 재야 한다.** 장식은 글자 "뒤"(z-index -1)에 깔리므로 `--xd-o`(불투명도)와 `--xd-leaf` 등 색을 올리면 배경 위 글자의 대비가 떨어진다.
  현재 값 기준 최악 본문 대비는 낮 6.6 / 밤 5.9(WCAG AA 4.5 이상). 처음 잡았던 0.58/0.55는 3.7/2.8로 미달이라 낮췄다.
- 저사양(코어 ≤4 또는 메모리 ≤2GB, `src/lib/xdPerf.js`)이면 루돌프 2마리·반짝이 6개·눈 16/26개로 줄인다.
- 루돌프 위치는 탭바 요소의 실제 윗선(`[data-bottom-nav]`의 rect)을 읽어 `--xd-nav-top`으로 잡는다. 탭바가 없는 화면(로그인/로딩)에선 루돌프·눈 테두리를 그리지 않는다.

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
