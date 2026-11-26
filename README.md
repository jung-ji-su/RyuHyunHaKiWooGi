# 🐷 부리부리 미니홈피

> 지수 & 현하, 둘이서만 쓰는 **커플 전용 PWA**. 앱스토어에는 없고, 없어도 괜찮아요.

- 📄 **포트폴리오**: [jung-ji-su.github.io/RyuHyunHaKiWooGi/portfolio_2026.html](https://jung-ji-su.github.io/RyuHyunHaKiWooGi/portfolio_2026.html)
- 📦 **현재 버전**: 1.0.155
- 📅 **최종 업데이트**: 2026-11-26

<br/>

## ✨ 소개

커플 앱의 광고와 데이터 수집이 싫어서 우리끼리 쓸 걸 직접 만들었어요. 일기, 일정, 기분 기록, 편지, 쿠폰, 버킷리스트, 햄스터 키우기, 인생네컷까지.
2026년 4월부터 만들고 있고, 지금도 둘이 매일 써요(그래서 버그가 나면 바로 옆에서 날아와요).

개인 토이 프로젝트라 "서비스"처럼 포장할 생각은 없어요. 대신 실사용 앱에서 생긴 삽질은 꽤 솔직하게 남겨 뒀어요 → [시행착오 기록](#-시행착오-기록).

<br/>

## 📱 전체 메뉴

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 🏠 홈 | `/` | D-Day, 캐릭터 펫, 캘린더, 일기 작성/최근 목록, 콕 찌르기 |
| 📅 일정 보기 | `/schedule` | 커플 공유 캘린더 — 등록/수정/삭제, ⭐ 중요 일정 D-DAY |
| 📖 전체 기록 | `/diary` | 일기 목록 — 사진 첨부, 하트, 댓글 |
| 🐹 햄찌(다마고치) | `/tamagotchi` | 커플 펫 키우기. 밥·간식·체중·진화, 응원으로 사망 유예 |
| 🌡️ 감정 온도계 | `/thermo` | 1~100도 기분 기록, 온도차가 크면 토닥 버튼, 주간 리포트 |
| 🪣 버킷리스트 | `/bucket` | 같이 하고 싶은 것 등록, 둘 다 체크해야 완료 |
| ☰ 더보기 | — | 쿠폰북 · 몰래 편지함 · 네컷 사진 · 화면 모드/시즌 테마 · 로그아웃 |
| 🎟️ 쿠폰북 | `/coupons` | 쿠폰 발행/사용/룰렛, 유효기간 14일 |
| 💌 몰래 편지함 | `/letter` | 시간 예약 편지, 열리기 전 비공개 |
| 📸 네컷 사진 | `/photobooth` | 인생네컷. 혼자 4컷 / 둘이 2컷씩, 프레임 17종, 갤러리 |

> 하단 탭은 7개(홈·일정·기록·햄찌·온도계·버킷·더보기). 예전에 있던 여행지도·연애통계·오늘의메뉴·미니게임·가계부·이상형 월드컵은 안 써서 2026-11-23에 코드째 지웠어요(복원 방법은 [CLAUDE.md](CLAUDE.md)).

<br/>

## 🎄 요즘 재밌게 만든 것들

**크리스마스 시즌 테마** — 더보기에서 켜면 앱 전체가 바뀌어요. 전구, 나무, 하단 탭바 위를 달리는 루돌프, 눈 쌓인 테두리까지 전부 CSS/SVG로(이미지 에셋 없음). 켜져 있을 때만 DOM이 생기고, 글자 대비는 장식을 바꿀 때마다 직접 재요(WCAG AA 4.5 이상 유지).
눈은 canvas 2D 한 장. **폰을 흔들면 눈이 소용돌이치며 쏟아져요**(유리볼 효과). 걷기·뛰기에는 반응하지 않게 흔들기 판정을 따로 만들었고, iOS 모션 권한은 "켜기"를 누른 순간에만 물어요. 느려지면 눈송이를 자동으로 줄이고, "동작 줄이기"를 켜 놓은 폰에서는 꺼요.

**네컷 사진** — 3-2-1 카운트다운 후 4컷을 찍어 프레임에 끼워요. 프레임은 17종(패턴, 그라데이션/이중 테두리, 폴라로이드, 필름, 시즌 한정)인데 **이미지 파일이 하나도 없어요.** 전부 canvas로 그려요. 하단 문구는 직접 쓸 수 있어요.
"둘이 2컷씩" 모드는 내가 2컷을 찍어 보내면 상대에게 푸시가 가고, 상대가 나머지 2컷을 찍으면 한 장으로 합쳐져요. **완성되기 전까지는 서로 컷을 못 봐요**(그게 재미). 저장되는 건 합성본 WebP 한 장이고 원본 컷은 어디에도 남기지 않아요.

**햄찌** — 진화가 너무 안 돼서 레벨업 요구 XP를 0.6배로 낮췄어요. 파트너가 응원하면 3일 이상 안 들어온 상대 펫의 사망을 하루 미뤄 줘요(최대 2일). 3일째부터는 파트너에게 "곧 위험해요" 푸시가 가요.

**앱 아이콘 배지** — 홈 화면 아이콘에 안 읽은 알림 개수가 떠요(iOS 16.4+ 홈 화면에 설치한 웹앱 한정).

<br/>

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | React 19 · Vite 7 · React Router 7 |
| UI | MUI 7 + Emotion, Framer Motion 12, Recharts 3, canvas-confetti |
| 백엔드/DB | Firebase Firestore · Storage |
| 인증 | Firebase Auth **커스텀 토큰**(PIN은 Cloud Function이 서버에서 검증), 익명 로그인 꺼짐 |
| 푸시 | Firebase Cloud Messaging + Web Push + Service Worker |
| 서버리스 | Cloud Functions v2 (Node 24) · Cloud Scheduler |
| 호스팅 | Firebase Hosting (PWA) |
| 외부 API | Open-Meteo (날씨, 무료) |

<br/>

## 🤖 이 프로젝트는 AI와 같이 만들었어요

커밋 102개 중 **78개**에 `Co-Authored-By: Claude`가 붙어 있어요(Sonnet 4.6 / 5 / 5.5). 숨길 이유가 없어서 그대로 두었어요.

- **Claude Code가 한 일**: 기능 구현과 리팩터링 대부분, 안 쓰는 6개 기능 삭제, 성능 점검, 보안 규칙·인증 개편, 테스트 작성(`rules-test.mjs`, `functions/*.test.js`), 그리고 유지보수 로그인 [`CLAUDE.md`](CLAUDE.md)(다음 작업자가 읽는 문서라 에이전트가 직접 관리).
- **제가 한 일**: 뭘 만들고 뭘 버릴지, 햄찌 난이도 같은 "느낌" 판단, 실기기(아이폰 홈 화면 앱)에서 직접 눌러 보기, 그리고 되돌리기 어려운 작업(보안 규칙 배포, 데이터 보정)의 승인.
- 그래서 생긴 규칙들: 규칙 배포는 사람이 확인한 뒤에만, 데이터를 건드리는 변경은 백업 먼저, 검증 강도는 위험도에 비례(시각 작업은 가볍게, 데이터·인증은 꼼꼼하게).

코드 대부분을 AI가 썼다는 것과, 이 앱이 우리 둘의 실제 일상 데이터를 다룬다는 것, 둘 다 사실이라서 확인 절차를 일부러 많이 뒀어요.

<br/>

## 🔐 보안: 닫혀 있다고 믿었던 문

솔직히 쓰면, **한동안 "폐쇄형 앱"이 아니었어요.**

- 처음엔 익명 로그인(누구나 로그인 가능) + 열린 보안 규칙이었어요. Firestore 읽기는 사실상 공개, Storage는 완전 공개. API 키는 웹앱이라 어차피 공개라서 "우리만 아는 주소"가 보안은 아니었어요.
- 2026-10-15: PIN을 Cloud Function이 서버에서 검증하고 커스텀 토큰을 주는 방식으로 바꿨어요. 규칙은 임시본(로그인만 하면 통과)을 올렸고, 이때도 익명 로그인이 켜져 있어서 **여전히 열려 있었어요.**
- 2026-11-23: 두 사람만 허용하는 최종 규칙이 실수로(맨 `firebase deploy`가 같이 올림) 한 번 나갔다가, 데이터가 안 보여서 롤백했어요. 한글 uid를 의심해서 실서비스 토큰으로 검증했는데 **아니었어요.** 유력 후보는 옛 번들(익명 로그인 시절)을 쓰던 기기인데, 끝내 확정은 못 했어요.
- 2026-11-26: uid를 `jisu`/`hyunha`(ASCII)로 바꾸고, 새 번들을 쓰는 기기를 관리자 페이지에서 확인하고, 콘솔에서 익명 로그인을 끈 뒤에 최종 규칙을 올렸어요(별도 테스트 DB에서 실제 토큰으로 먼저 검증). 이번엔 문제없었어요.

**지금**: 규칙은 uid `jisu`/`hyunha`만 읽기·쓰기 허용, 로그인 시도 제한 카운터(`authAttempts`)는 클라이언트 접근 전면 차단, 익명 로그인 비활성화. 데이터는 uid가 아니라 이름("지수"/"현하") 키라 uid를 바꿔도 데이터는 그대로예요.
규칙 파일에는 구조 버그도 있었어요(`buckets`/`authAttempts` 블록이 `documents` 범위 밖이라 아무 효과가 없었음) → 에뮬레이터 테스트 14개를 `rules-test.mjs`에 넣고 고쳤어요.

<br/>

## 🔔 알림 시스템 (PWA Push)

```
앱에서 Firestore notifications/{id} 문서 생성
  → Cloud Function sendPushOnNotification 트리거
  → FCM으로 상대방 기기에 Web Push 전송 (+ 안 읽은 개수를 data.badge로 실어 앱 아이콘 배지 갱신)
  ┌─ 포그라운드: 앱 내 토스트 + 알림 서랍
  └─ 백그라운드: 시스템 푸시 → 탭하면 SW가 딥링크 postMessage
```

| type | 의미 | 이동 |
|------|------|------|
| `schedule` | 일정 등록 | `/schedule` |
| `diary` · `comment` · `like` | 일기·댓글·좋아요 | `/diary` |
| `bucket` · `bucket_add` | 버킷 | `/bucket` |
| `letter` · `letter_reply` | 편지/답장 | `/letter` |
| `hug` · `temp_diff` | 토닥/온도차 | `/thermo` |
| `coupon` · `coupon_used` | 쿠폰 | `/coupons` |
| `photo` · `photo_done` | 네컷 2컷 도착 / 완성 | `/photobooth` |
| `jilta` | 질타 | `/` |

### iOS PWA 대응
- iOS 16.4+ 홈 화면 앱에서 Web Push 지원. SW가 푸시를 받으면 `postMessage({ type: 'NAVIGATE', url })`로 딥링크.
- 앱이 닫혀 있을 땐 `clients.openWindow()`가 하위 경로를 무시해서 `/?__nav=/diary` 쿼리로 우회.
- `env(safe-area-inset-*)`로 노치/홈 인디케이터 대응.

### Cloud Functions

| 함수 | 트리거 | 역할 |
|------|--------|------|
| `verifyPinAndSignIn` | callable | PIN 검증(시도 5회 제한·잠금) 후 커스텀 토큰 발급 |
| `sendPushOnNotification` | `notifications/{id}` 생성 | FCM 푸시 발송 + 배지 개수 |
| `sendDailyWeather` | 매일 06:00 KST | Open-Meteo 날씨 브리핑(동탄/서울) |
| `sendDailyReminders` | 매일 09:00 KST | 일정/기념일 리마인더, 월요일엔 주간 브리핑 |
| `sendPetWarnings` | 매일 20:00 KST | 3일 이상 안 들어온 햄찌의 파트너에게 위험 알림 |
| `sendTestPush` · `sendTestWeather` | HTTP | 테스트용(시크릿은 Secret Manager) |

<br/>

## 🔥 Firebase 데이터 구조

| 컬렉션 | 내용 |
|--------|------|
| `diaries` / `schedules` / `coupons` / `letters` / `temperatures` / `buckets` | 각 메뉴 데이터 (작성자는 `writer` 같은 이름 문자열 필드) |
| `notifications` | `writer`, `type`, `content`, `isRead`, `createdAt` — 받는 사람은 writer의 반대편 |
| `fcmTokens/{이름}` | 기기별 푸시 토큰 목록 |
| `couple_tamagotchi/jisu_hyunha` | 햄찌 상태 전체(유저별 맵) |
| `petAlerts/{이름}` | 위험 알림 중복 방지 키 |
| `photobooth/{id}` | 네컷 갤러리 문서(`url`, `path`, `frame`, `layout`, `w`, `h`) — 이미지는 Storage `photobooth/{id}.webp` |
| `photoboothPending/active` | 둘이 찍기 진행 중인 내 2컷(Storage가 아니라 여기에 임시 저장, 완성/취소/48시간 만료 시 삭제) |
| `appClients/{이름_기기}` | 어떤 기기가 어떤 번들 버전인지(관리자 페이지 "기기 현황") |
| `authAttempts/{이름}` | 로그인 시도 제한 카운터(클라이언트 접근 차단, Admin SDK만) |

삭제하면 Storage 파일도 같이 지워요(`deleteObject`). 한동안 이게 없어서 고아 파일이 쌓였어요 → 시행착오 #9.

<br/>

## ⚡ 성능

- **번들 분할**(Vite `manualChunks`): react / mui / firebase / charts / motion 분리. 1.0.1xx 시점에 main 번들 863kB → 248kB. 모든 서브페이지는 `lazy()`.
- **이미지 에셋 WebP 최적화**(1.0.133): 아바타 사진, 햄찌 5단계, 고양이 6장, 마스코트 일러스트 22장을 **실제 표시 크기의 @3x로 줄여 WebP로 변환 — 약 33MB → 333KB.** (sharp가 EXIF 방향을 무시해서 세로 사진이 누워 버리는 걸 이때 발견, `.rotate()`로 해결.)
- **일기 사진**은 업로드 전에 클라이언트에서 Canvas로 최대 폭 1200px / JPEG 품질 0.82로 줄여요.
- **네컷**은 합성본만 WebP(미지원 브라우저는 JPEG)로 저장, 갤러리 쿼리는 최근 40장 `limit`.
- **Firestore 쿼리에 `limit`**: 일기 100, 댓글 50, 알림 60 등. (한때 limit 없는 쿼리가 있었어서 새로 만드는 쿼리엔 꼭 붙여요.)
- **눈 애니메이션**: 저사양 기기 판정, 프레임 간격과 JS 작업 시간으로 입자 수 자동 조절, 잔잔할 땐 30fps, 탭이 숨겨지면 정지.
- `React.memo` / `useMemo` / `useCallback`을 몇 군데에 쓰고, 알림 중복 표시는 `sessionStorage` + 24h TTL.

<br/>

## 🎨 UI/UX 메모

- 페이지 전환: `AnimatePresence mode="wait"` + `motion.div`(0.18s)를 Layout 한 곳에서만.
- `env(safe-area-inset-*)`, 모바일에서 hover 효과 끄기, `overscroll-behavior: contain`(풀다운 새로고침 방지).
- 뒤로가기 버튼은 `onPointerDown`에 즉시 진동, `onClick`은 50ms 뒤 navigate.
- 시즌/다크 모드는 `[data-theme]` 위에 `[data-season]`을 겹쳐서 CSS 변수만 덮어쓰는 구조.

<br/>

## 🚨 시행착오 기록

### 1. PWA VAPID 키 오류
- **현상**: `applicationServerKey must contain a valid p-256 public key`
- **원인**: `.env.local`의 VAPID 키 문자가 서로 바뀌어 있었음(전치 오타)
- **해결**: 콘솔 → 클라우드 메시징 → 웹 푸시 인증서에서 다시 복사

### 2. iOS Safari CORS 차단
- **현상**: 테스트 푸시 버튼이 iOS에서만 `Load failed`
- **원인**: Cloud Function HTTP 호출이 iOS Safari에서 막힘
- **해결**: HTTP 직접 호출 대신 Firestore 문서 쓰기 → 함수는 Firestore 트리거로 실행

### 3. FCM onMessage 리스너 누수 — ⚠️ 아직 못 고친 알려진 한계
- **현상**: 컴포넌트가 언마운트된 뒤에도 `onMessage` 핸들러가 살아 있을 수 있음
- **원인**: `let unsubMessage = null`을 effect 바깥에 두고 async 함수 **안에서** 나중에 할당하는 구조(`src/hooks/useFCM.jsx`). `await`가 끝나기 전에 cleanup이 먼저 실행되면 `unsubMessage`가 아직 `null`이라 구독이 안 풀림.
- **상태**: 예전에 "해결"로 적었지만 **현재 코드에도 같은 패턴이 그대로 남아 있어요.** 로그인 직후 빠르게 바뀌는 경우에만 날 수 있어서 체감은 못 했는데, 맞게 고치려면 effect 안에서 `cancelled` 플래그를 두고 async 완료 후 이미 정리됐으면 바로 구독 해제해야 해요. (그대로 두면서 기록만 정정)

### 4. AnimatePresence + SubPage 이중 애니메이션
- **현상**: 페이지 전환 때 슬라이드가 두 번 도는 것처럼 보임
- **원인**: `SubPage`의 CSS animation + `Layout`의 `motion.div`가 동시에 동작
- **해결**: SubPage 쪽 애니메이션 제거, Layout 한 곳으로 일원화

### 5. DiaryCard null 안전성
- **현상**: 오래된 문서에서 `createdAt`이 null이라 크래시
- **원인**: `createdAt?.toDate().toLocaleString()` — `toDate`가 없을 땐 체이닝이 안 끊김
- **해결**: `createdAt?.toDate?.()?.toLocaleString("ko-KR")`

### 6. onKeyPress deprecated 경고
- **해결**: `onKeyDown + !e.shiftKey`로 전부 교체

### 7. 알림 중복 표시
- **현상**: 앱을 다시 열면 이미 본 알림이 토스트로 또 뜸
- **원인**: 본 ID를 `localStorage`에 영구 저장했는데 관리가 안 돼서 ID가 사라짐
- **해결**: `sessionStorage` + 24h TTL

### 8. 보안 규칙을 올렸다가 두 사람 데이터가 사라진 날 (2026-11-23)
- **현상**: 최종 규칙이 나가자 둘 다 화면에 데이터가 하나도 안 보임 → 롤백
- **원인**: 맨 `firebase deploy`가 `firebase.json`에 든 규칙까지 같이 올림(그건 확실). 근데 **왜 데이터가 막혔는지는 끝내 확정 못 함.**
- **추적**: 한글 uid가 의심스러워 실서비스에서 실제 토큰으로 별도 테스트 DB에 규칙을 올려 검증 → 한글 uid는 멀쩡했음. 같은 날 21:43에 코드로는 만들 수 없는 익명 계정이 생긴 걸 찾아서 "옛 번들 기기" 가설을 세움.
- **해결(예방)**: 영문 uid 전환 → 새 번들 쓰는 기기를 관리자 페이지에서 확인 → 익명 로그인 끄기 → 규칙 배포 순서로 올림. `deploy.js`는 `--only hosting,functions`로 고정.
- **배운 점**: 원인을 못 찾아도 "다시 같은 일이 안 생기게 하는 순서"는 만들 수 있다. 그리고 규칙 파일의 `match` 블록 일부는 `documents` 밖에 있어서 처음부터 아무 효과가 없었다(에뮬레이터 테스트를 쓰고서야 발견).

### 9. Storage에 `deleteObject`가 한 번도 없었음
- **현상**: 일기를 지워도 업로드한 사진이 Storage에 그대로 남음(고아 파일)
- **원인**: 삭제 로직이 Firestore 문서만 지움
- **해결**: 새로 만드는 네컷은 삭제할 때 Storage 파일도 같이 지우고, 문서 저장이 실패하면 방금 올린 파일도 지움. **기존 일기 쪽은 아직 손대지 않았어요.**

### 10. `limit` 없는 쿼리
- **현상**: 컬렉션이 커질수록 읽기가 같이 커짐
- **해결**: 컬렉션 쿼리엔 `limit`을 습관처럼. 지금은 네컷 40장, 알림 60개 같은 식으로 둠.

<br/>

## 🚀 새 메뉴 추가 방법

1. `src/MyNewPage.jsx` 작성
2. `src/lib/constants.js` → `ROUTES`와 `MENU_ITEMS`에 추가(탭바 7개는 이미 꽉 찼으니 보통 더보기에)
3. `src/App.jsx` → lazy import + `<Route>` + `<SubPage>`
4. 알림이 필요하면 `notifications`에 `type`을 만들고 `NotificationDrawer.jsx`·`App.jsx`·`functions/index.js`의 라우트 표에 같이 추가
5. `node deploy.js "메모"` (버전/changelog 자동 증가, `hosting,functions`만 배포)

```jsx
const MyNewPage = lazy(() => import('./MyNewPage'));

<Route path="mypage" element={
  <SubPage title="새 메뉴" icon="🆕">
    <Suspense fallback={<PageLoader />}>
      <MyNewPage currentUser={currentUser} />
    </Suspense>
  </SubPage>
} />
```

<br/>

## 📁 주요 파일 구조

```
src/
├── App.jsx                    라우팅, 알림, FCM, 업데이트 체크, 기기 현황 기록
├── firebase.js                Firebase 초기화
├── touchEffects.js            터치 이펙트(리플, 부리팡, 진동)
├── pages/                     HomePage, AdminPage(지수 전용: 통계·기기 현황)
├── components/                BottomNav, NotificationDrawer, SnowFall, ChristmasDecor, SubPage …
├── hooks/                     useAuth(uid→이름), useFCM, useNotifications, useColorMode
├── lib/
│   ├── constants.js           색상, 라우트, 메뉴
│   ├── snowEngine.js · shakeSensor.js · shakeDetector.js   canvas 눈 + 흔들기
│   ├── photoFrames.js · photoCompose.js                    네컷 프레임 정의 + canvas 합성
│   ├── clientHeartbeat.js     기기/번들 버전 기록
│   └── appBadge.js            앱 아이콘 배지
├── PhotoBooth.jsx             네컷(촬영·합성·저장·갤러리·둘이 찍기)
├── CoupleTamagotchi.jsx · CoupleCoupons.jsx · SecretLetter.jsx · EmotionThermometer.jsx
├── DiaryWrite.jsx · DiaryList.jsx · Bucketlist.jsx · ScheduleList.jsx · CoupleCalendar.jsx …

functions/
├── index.js                   Cloud Functions (인증·푸시·날씨·리마인더·펫 알림)
└── badge.js · petWarnings.js  순수 함수 + 테스트(node --test)

public/
├── firebase-messaging-sw.js   FCM 서비스워커(배지·딥링크)
├── manifest.json · version.json · changelog.json
firestore.rules · storage.rules · rules-test.mjs   보안 규칙 + 에뮬레이터 테스트
CLAUDE.md                      유지보수 로그(AI 작업자용): 규칙·함정·왜 이렇게 만들었는지
```

<br/>

## 💻 로컬 개발

```bash
npm install
npm run dev          # Vite HMR
npm run build
npm run lint
npm run deploy       # = node deploy.js (버전 증가 + 빌드 + hosting,functions 배포)
```

보안 규칙 테스트(JDK 21 필요, 라이브엔 영향 없음):

```bash
firebase emulators:exec --only firestore --project demo-rules "node rules-test.mjs"
```

### 환경 변수 (`.env.local`)

```env
VITE_VAPID_KEY=...   # 콘솔 → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서
```

> Firebase 웹 설정값(`firebase.js`)은 원래 공개되는 값이라 코드에 있어요. 진짜 보호는 보안 규칙이 해요. PIN은 Secret Manager에만 있어요.
> **규칙은 직접 `firebase deploy`로 올리지 마세요.** 맨 `firebase deploy`는 규칙까지 올려요. 자세한 건 [CLAUDE.md](CLAUDE.md).

<br/>

## 🎨 디자인 컨셉

**부리부리** 캐릭터 중심의 아기자기하고 따뜻한 느낌이에요.

| 색상 | 코드 | 용도 |
|------|------|------|
| 라벤더 | `#EDE0F5` | 배경 포인트 |
| 퍼플 | `#7B4FA6` | 주 색상 |
| 오렌지 | `#E8630A` | 강조 |
| 피치 | `#FFE4D4` | 배경 포인트 |
| 크림 | `#FFF8F2` | 기본 배경 |

폰트는 Jua(제목) + Noto Sans KR(본문). 터치하면 리플과 부리팡, 하트 파티클, confetti.

<br/>

## 💜 만든 이유

광고, 데이터 수집, 쓸데없는 소셜 기능이 싫어서요. 그리고 우리가 쓸 건 우리가 마음대로 고칠 수 있어야 해서요.

**01 우리 기록은 우리만 본다** — 이 목표를 처음부터 지켰다고는 못 하지만(위 [보안](#-보안-닫혀-있다고-믿었던-문) 참고), 지금은 지킨다고 말할 수 있어요.
**02 기분도 기록하면 패턴이 보인다** — 감정 온도계로 매일 기록하고 주간 리포트를 봐요.
**03 재미없으면 안 쓴다** — 쿠폰 룰렛, 햄찌, 네컷, 눈이 쏟아지는 크리스마스. 지금도 매일 쓰면서 고치고 있어요.

---

<p align="center">
  🐷 부리부리와 함께하는 우리의 공간 💜
</p>
