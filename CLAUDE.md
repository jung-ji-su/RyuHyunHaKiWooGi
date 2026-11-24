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

## 햄찌(타마고치) 성장 (`src/CoupleTamagotchi.jsx`)

- 레벨업 요구 XP = `round(레벨 × STAGE_XP_MULT[스테이지] × XP_SCALE)`. 2026-11-24에 `XP_SCALE = 0.6`으로 낮춤("진화가 너무 안 된다"). 스테이지 총량 132/462/1,089/2,145/3,234.
- **`XP_SCALE`이나 배율을 바꾸면 성장 그래프(`totalProgressXP`) 눈금이 달라진다.** Firestore `couple_tamagotchi/jisu_hyunha`의 `<유저>.xpHistory`에 저장된 값은 옛 눈금이라 같이 보정해야 한다.
  2026-11-24에 한 번 ×0.6으로 보정했고 각 유저 맵에 `xpScaleVer: 2` 표식을 남겼다(중복 보정 방지). 백업은 `backups/`(gitignore, 개인 데이터).
- 되살리기: 스테이지 유지, 레벨은 `ceil(레벨×0.7)`, XP 0. 사망 기준은 5일 미접속 그대로. 미방문 7일+ XP 손실은 18(= 30×XP_SCALE), 14일+는 현재 레벨 요구량의 30%(자동 연동).
- **체중**: 간식 +5, 밥 +2, 하루가 지날 때마다 -8(최대 5일치, 최소 10). 예전엔 내려가는 경로가 없어서 비만 경고가 상시로 떴다. 90 이상이면 "비만 위험" 경고.
  **과식 페널티(건강 -25, 체중 80)는 "하룻밤 감소를 적용하고도 여전히 100 이상"일 때만, 날짜가 바뀌는 로드에서만** 걸린다(같은 날 새로고침으론 안 걸림). 이게 의미 있으려면 100을 넘어 쌓여야 하므로 내부 체중 상한은 125(`WEIGHT_MAX`)이고 화면엔 100까지만 보인다. 108 이상(`OVERFED_AT` = 100 + 하루 감소)이면 "내일 아파요" 경고가 뜬다. 하루 감소량을 바꾸면 `OVERFED_AT`도 같이 달라진다.
- **일기 보너스**(`src/lib/diaryBonus.js`): 오늘(서울 날짜) 내가 쓴 일기 1편당 밥 +1회·간식 +1회, 하루 최대 2편. 저장하지 않고 `diaries`에서 createdAt 기준으로 매번 계산한다(지우면 자동으로 줄고, 쓰고-지우고 반복해도 상한을 못 넘김). 밥 횟수는 `todayFeedCount`/`todayFeedDate`, 예전 데이터(`todayFed`만 있음)와 호환.
- **응원 사망 유예**: 파트너가 응원(하루 1회)을 보내면 상대 펫이 **3일 이상 미접속이고 살아 있을 때만** 사망까지 +1일(`graceDays`, 상한 `GRACE_CAP`=2, 주인이 방문하면 0으로 리셋). 사망 기준 = `DEATH_DAYS(5) + graceDays`(응원만으로 최대 7일). 위험하지 않을 때 미리 쌓아두는 건 불가. 판정은 `applyCheerGrace`(순수 함수). 응원 쓰기는 필드 단위 부분 쓰기라 주인의 방문 기록을 덮어쓰지 않는다. 돌아온 날 `graceThanks`로 "OO의 응원으로 N일 더 버텼어요" 안내.
- **파트너 위험 알림**(`functions/petWarnings.js` + `index.js`의 `sendPetWarnings`, 매일 20:00 KST): 미접속 3일째부터 사망 전날까지 **상대방에게** 푸시. 남은 일수 2일 이상은 "응원으로 도울 수 있을 때"(유예 여유 있고 오늘 응원 전)만, 마지막 날은 항상 보내되 응원이 아직 도움이 되는지에 따라 문구가 다르다. 이미 죽은 펫은 제외. 중복 방지는 `petAlerts/{주인}`의 `lastWarnKey`(`마지막방문일:일수`)를 트랜잭션으로 먼저 기록. 판단 로직은 순수 함수라 `node --test functions/petWarnings.test.js`로 검증한다(실제 발송 불필요). **`DEATH_DAYS`/`GRACE_CAP`/`WARN_START`는 클라이언트(`CoupleTamagotchi.jsx`의 `DEATH_DAYS`/`GRACE_CAP`/`GRACE_MIN_MISSED`)와 항상 같은 값이어야 한다.**

## 앱 아이콘 배지 (`src/lib/appBadge.js`, `public/firebase-messaging-sw.js`, `functions/badge.js`)

- 홈 화면 아이콘에 "안 읽은 알림 개수" 표시(Badging API). **iOS/iPadOS 16.4+ 홈 화면에 설치한 웹앱에서만**, 알림 권한을 허용해야 하고(배지 권한은 자동으로 같이 허용) iOS 설정에서 배지를 끄면 안 보인다. Safari 탭에서는 API가 없다. 미지원/거부 환경에선 조용히 무시.
- **앱을 열었을 때**: `useNotifications`가 `unreadCount`와 배지를 동기화한다(읽음·모두 읽음·삭제·새 알림 모두 반영, 0이면 지움). 첫 스냅샷 전에는 건드리지 않는다.
- **앱이 닫혀 있을 때**: `sendPushOnNotification`이 푸시에 `data.badge`(받는 사람의 안 읽은 알림 총개수)를 실어 보내고, 서비스워커 `push` 핸들러가 그 값으로 배지를 갱신한다. `data.badge`가 없는 푸시(날씨·일정 브리핑·햄찌 위험 알림)는 서랍에 안 쌓이는 알림이라 배지를 건드리지 않는다.
- **서버의 개수 계산(`functions/badge.js`)은 클라이언트 `useNotifications`의 `mine` 필터와 같은 기준**이어야 한다. 한쪽을 바꾸면 다른 쪽도 바꿀 것(테스트가 소스를 대조해 어긋나면 깨진다: `node --test functions/badge.test.js`).
- 서비스워커 파일은 `firebase.json`에서 `Cache-Control: no-cache`로 서빙한다(갱신이 빨리 퍼지도록). iOS 홈 화면 앱은 앱을 완전히 종료했다 다시 열어야 새 서비스워커가 적용될 수 있다.

## 스노우볼 프로토타입 (`public/snow-preview.html`) — 앱에 아직 통합 안 됨

- "폰을 흔들면 화면에 눈이 쏟아지는" 효과의 **독립 프로토타입**(단일 파일, `src/` 무관). 주소: `/snow-preview.html`, `?variant=A|B|C` 등 URL 파라미터로 설정 공유. 반복 수정이 전제라 `firebase.json`에서 이 파일만 `no-cache`로 서빙한다.
- 컨트롤 UI(폰 폭 402에서 겹침 0이 되도록 정리함): 하단 "독" 한 줄(변형 ◀▶ + 흔들기 약/중/강/💥)이 탭바 목업 바로 위, 상단은 작은 아이콘 줄(HUD 뱃지·⚙️·👁). HUD와 설정은 접힌 팝오버(서로 배타적). **👁(또는 U 키, `?ui=0`)로 컨트롤 전부 숨기면 눈만 보이고 화면을 톡 치면 흔들린다.** 창이 가려지면 `requestAnimationFrame`이 느려져 fps가 낮게(≈8) 나오므로 HUD 뱃지는 프레임 정지를 ⏸로, "fps는 낮은데 JS 작업은 가벼움"을 ⚠로 표시한다 — 성능은 HUD의 "JS 작업 ms"로 판단.
- 앱에 통합되면 이 파일과 `firebase.json`의 해당 헤더 항목을 지운다(prototype 스킬 규칙: 확정된 결정만 main에 남기고 프로토타입은 별도 브랜치에 보관).
- 결정 사항(프로토타입에서 검증한 것): **canvas 2D 단일 캔버스**(DOM 눈은 흔들림에 반응하는 물리를 못 함) · 스프라이트 blit + 입자별 typed array · 소용돌이 장은 격자 보간 · 흔들기 감지는 "임계 초과 펄스가 방향을 번갈아 3개 이상, 간격 40~320ms"(걷기/뛰기/탁/돌리기 무시) · iOS 권한은 사용자가 "켜기"를 누른 순간에만 요청 · 자동 품질 조정은 프레임 간격이 아니라 **JS 작업 시간이 길 때만** 입자를 줄인다(창 스로틀을 느린 기기로 오판하지 않게).

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
