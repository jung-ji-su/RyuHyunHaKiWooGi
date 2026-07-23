# 🐷 부리부리 미니홈피

> 지수 & 현하를 위한 **커플 전용 PWA 미니홈피**

- 🌐 **URL**: https://ryuhyunhakiwoogi.web.app
- 📄 **포트폴리오**: [jung-ji-su.github.io/RyuHyunHaKiWooGi/portfolio_2026.html](https://jung-ji-su.github.io/RyuHyunHaKiWooGi/portfolio_2026.html)
- 📦 **현재 버전**: 1.0.109
- 📅 **최종 업데이트**: 2026-06-10

<br/>

## ✨ 소개

**부리부리 미니홈피**는 커플 두 사람만을 위한 프라이빗 웹앱이에요.  
일상 기록, 일정 공유, 감정 나누기, 편지 주고받기, 미니게임까지 — 우리만의 작은 공간입니다.

<br/>

## 📱 전체 메뉴

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 🏠 홈 | `/` | D-Day 카운터, 캐릭터 펫, 캘린더, 일기 작성/최근 목록, 콕 찌르기 |
| 📅 일정 보기 | `/schedule` | 커플 공유 캘린더 — 일정 등록/수정/삭제, ⭐ 중요 일정 D-DAY 표시 |
| 🎟️ 쿠폰북 | `/coupons` | 쿠폰 발행·사용·룰렛 뽑기, 유효기간 14일, 카테고리 6종 |
| 💌 몰래 편지함 | `/letter` | 시간 예약 편지, 열리기 전 비공개, 봉투 색상 선택 |
| 🌡️ 감정 온도계 | `/thermo` | 1~100도 기분 기록, 온도차 25도 이상 시 토닥 버튼, 주간 리포트 |
| 📖 전체 기록 | `/diary` | 일기 목록 — 이미지 첨부, 하트 좋아요, 댓글 |
| 🪣 버킷리스트 | `/bucket` | 커플 버킷 목표 등록 & 달성 체크 (둘 다 체크해야 완료) |
| 🗺️ 여행 지도 | `/travel` | 카카오맵 기반 여행지 핀 꽂기 |
| 📊 연애 통계 | `/stats` | 일기/쿠폰/여행/버킷/온도 데이터 Recharts 시각화 리포트 |
| 🍳 오늘의 메뉴 | `/menu` | AI 기반 저녁 메뉴 추천 "오메" |
| 🎮 미니게임 | `/games` | 오목, 그림 퀴즈 맞추기, 게임 위시리스트 |
| 💰 가계부 | `/account` | 공유 수입/지출 관리, 카테고리별 집계 |
| 🐾 다마고치 | `/tamagotchi` | 커플 펫 키우기 대결 |
| ⚔️ 이상형 월드컵 | `/worldcup` | 6개 테마 토너먼트 (음식/여행/놀거리/운동/영화/카페) |

<br/>

## 🛠️ 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | 19 |
| 빌드 도구 | Vite | 7 |
| UI 컴포넌트 | MUI (Material UI) + Emotion | 7 |
| 애니메이션 | Framer Motion | 12 |
| 차트 | Recharts | 3 |
| 라우팅 | React Router | 7 |
| 이펙트 | canvas-confetti, 커스텀 파티클 엔진 |  |
| 백엔드/DB | Firebase Firestore | 12 |
| 스토리지 | Firebase Storage |  |
| 인증 | Firebase Auth (Anonymous) |  |
| 푸시 알림 | Firebase Cloud Messaging (FCM) + Web Push API |  |
| 서버리스 | Firebase Cloud Functions v2 (Node 20) |  |
| 호스팅 | Firebase Hosting |  |
| 외부 API | Open-Meteo (날씨, 무료), 카카오맵 |  |

<br/>

## 🏗️ 아키텍처

```
App.jsx
├── BrowserRouter
│   └── AppInner
│       ├── GlobalStyle.jsx        전역 CSS (폰트, keyframes, 색상 팔레트)
│       ├── LoginScreen.jsx        로그인 (사용자명 선택)
│       ├── LoadingScreen.jsx      초기 로딩 스피너
│       │
│       ├── Layout (AnimatePresence)
│       │   ├── motion.div         페이지 전환 애니메이션 (framer-motion)
│       │   │   └── <Outlet />     각 페이지 컴포넌트 (모두 lazy import)
│       │   └── BottomNav.jsx      하단 탭 5개 + 더보기 드로어
│       │
│       ├── NotificationDrawer.jsx 알림 서랍 (우측 슬라이드)
│       ├── InstallPrompt.jsx      PWA 설치 + 알림 허용 유도
│       └── Snackbar / Dialog      업데이트 다이얼로그, 일정 팝업, 토스트
│
public/
├── sw.js                          Service Worker (FCM 백그라운드 + 딥링크)
├── manifest.json                  PWA 매니페스트
└── version.json                   빌드마다 자동 증가하는 버전 파일
```

### 서브페이지 공통 레이아웃
모든 서브페이지는 `SubPage.jsx`로 감싸서 상단 헤더(뒤로가기 버튼 + 제목)를 통일

```jsx
<SubPage title="페이지 제목" icon="🎯">
  <MyPage currentUser={currentUser} />
</SubPage>
```

<br/>

## 🔔 알림 시스템 (PWA Push)

### 발송 흐름

```
앱에서 Firestore notifications/{id} 문서 생성
  → Cloud Function sendPushOnNotification 트리거
  → FCM으로 상대방 기기에 Web Push 전송
  ┌─ 포그라운드: 앱 내 토스트 + NotificationDrawer
  └─ 백그라운드: 시스템 푸시 알림 → 탭하면 SW가 딥링크 postMessage
```

### 알림 타입 & 이동 경로

| type | 의미 | 이동 |
|------|------|------|
| `schedule` | 일정 등록 | `/schedule` |
| `diary` | 일기 작성 | `/diary` |
| `comment` | 댓글 | `/diary` |
| `bucket` / `bucket_add` | 버킷 | `/bucket` |
| `letter` / `letter_reply` | 편지/답장 | `/letter` |
| `hug` / `temp_diff` | 토닥/온도차 | `/thermo` |
| `jilta` | 질타 | `/` |

### iOS PWA 대응
- iOS 16.4+ Safari에서 Web Push API 지원
- `public/sw.js` — SW에서 백그라운드 푸시 수신 → `postMessage({ type: 'NAVIGATE', url })`
- App.jsx에서 `navigator.serviceWorker.addEventListener('message', handler)`로 딥링크 수신
- `env(safe-area-inset-*)` — 노치/홈 인디케이터 영역 대응

### Cloud Functions

| 함수 | 트리거 | 역할 |
|------|--------|------|
| `sendPushOnNotification` | `onDocumentCreated('notifications/{id}')` | FCM 푸시 발송 |
| `sendDailyWeather` | 매일 오전 7시 KST | Open-Meteo 날씨 조회 → 알림 |
| `sendDailyReminders` | 매일 오후 9시 KST | 기념일 카운트다운, 주간 브리핑 |
| `sendTestPush` | HTTP POST | 테스트 발송 (`?secret=buri2026`) |
| `kakaoProxy` | HTTP GET | 카카오맵 API CORS 프록시 |

<br/>

## 🔥 Firebase 데이터 구조

| 컬렉션 | 주요 필드 |
|--------|-----------|
| `diaries/{id}` | writer, content, imageUrl, emotion, likes[], createdAt |
| `diaryComments/{id}` | diaryId, writer, content, createdAt |
| `schedules/{id}` | title, date, writer, color, isImportant |
| `coupons/{id}` | title, category, writer, to, used, usedAt, expiresAt |
| `letters/{id}` | from, to, content, color, isRead, openAt, createdAt |
| `temperatures/{id}` | writer, value, memo, createdAt |
| `buckets/{id}` | title, category, done, doneAt, checkedBy[] |
| `travelPins/{id}` | lat, lng, name, writer, createdAt |
| `notifications/{id}` | to, type, content, link, isRead, createdAt |
| `fcmTokens/{userName}` | token, updatedAt |
| `pets/{userName}` | 다마고치 펫 상태 전체 |
| `accountBook/{id}` | amount, type, category, memo, writer, date |

<br/>

## ⚡ 성능 최적화

### 번들 분할 (Vite manualChunks)

```js
// vite.config.js
manualChunks: {
  'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
  'vendor-mui':      ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
  'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/messaging'],
  'vendor-charts':   ['recharts'],
  'vendor-motion':   ['framer-motion'],
}
// 결과: main 번들 863kB → 248kB (-71%)
```

### Lazy Loading
모든 서브페이지 `lazy()` + `<Suspense fallback={<PageLoader />}>` 적용  
→ 초기 로드 시 필요한 코드만 다운로드

### Firestore 쿼리 제한

| 컬렉션 | limit |
|--------|-------|
| 일기 목록 | 100 |
| 댓글 | 20 |
| 통계 일기 | 200 |
| 통계 온도 | 100 |
| 쿠폰/버킷/여행 | 100~200 |

### React 최적화
- `DiaryCard` → `memo()` 래핑
- `LoveStats` 계산 로직 전체 `useMemo`
- `handleAddComment` → `useCallback`
- 이미지 → `loading="lazy"`

### 알림 중복 방지
`localStorage` (영구) → `sessionStorage` + 24h TTL 마이그레이션

<br/>

## 🎨 UI/UX 개선 이력

### 페이지 전환 애니메이션
- `AnimatePresence mode="wait"` + `motion.div` (Layout 레벨에서 통합 관리)
- 진입: `x: 16 → 0, opacity: 0 → 1` (0.18s)
- 퇴장: `x: 0 → -8, opacity: 1 → 0` (0.18s)

### Safe Area Insets (iPhone 노치/홈)
- BottomNav 하단: `pb: 'env(safe-area-inset-bottom)'`
- 사이드 드로어 상단: `paddingTop: 'env(safe-area-inset-top)'`
- 알림 드로어 상단: `paddingTop: 'env(safe-area-inset-top)'`

### 모바일 hover 비활성화
```css
@media (hover: none) and (pointer: coarse) {
  *:hover { transform: none !important; }
}
```

### 기타
- `body { overscroll-behavior: contain }` — 풀다운 새로고침 방지
- `html { scrollbar-gutter: stable }` — 스크롤바 레이아웃 시프트 방지
- 뒤로가기 버튼: `onPointerDown` 즉시 진동 + `onClick` 50ms 딜레이 후 navigate
- 탭 아이콘 active scale: `1.18 → 1.08` (덜 과장된 느낌)

<br/>

## 🚨 시행착오 기록

### 1. PWA VAPID 키 오류
- **현상**: `"applicationServerKey must contain a valid p-256 public key"` 에러
- **원인**: `.env.local`의 VAPID 키에 문자 전치 오류
- **해결**: Firebase Console → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서에서 키 재확인 후 수정

### 2. iOS Safari CORS 차단
- **현상**: 테스트 푸시 버튼 클릭 시 iOS에서 `"Load failed"` (Cloud Function HTTP 호출 실패)
- **원인**: iOS Safari가 CORS preflight 없이 fetch를 차단하는 경우
- **해결**: HTTP 직접 호출 → Firestore 문서 쓰기로 변경 (Cloud Function은 Firestore trigger로 실행)

### 3. FCM onMessage 리스너 메모리 누수
- **현상**: 컴포넌트 언마운트 후에도 onMessage 핸들러가 살아있음
- **원인**: `let unsubMessage` 클로저 외부 선언 후 async 함수 안에서 할당 → cleanup 시 unsubMessage가 null
- **해결**:
  ```js
  let unsubMessage = null;
  const run = async () => { unsubMessage = onMessage(...); };
  run();
  return () => { unsubMessage?.(); };
  ```

### 4. AnimatePresence + SubPage 이중 애니메이션
- **현상**: 페이지 전환 시 슬라이드가 두 번 발생하는 것처럼 보임
- **원인**: `SubPage.jsx`에 CSS `animation: 'pageSlideIn'` + `Layout`의 `motion.div`가 동시 동작
- **해결**: SubPage의 CSS animation 제거, Layout에서 AnimatePresence로 일원화

### 5. DiaryCard null 안전성 에러
- **현상**: 일부 오래된 문서에서 `createdAt` 필드가 null → 런타임 크래시
- **원인**: `createdAt?.toDate().toLocaleString()` — `toDate()`가 undefined일 때 체이닝 중단 안 됨
- **해결**: `createdAt?.toDate?.()?.toLocaleString("ko-KR")` 옵셔널 체이닝 이중 적용

### 6. onKeyPress deprecated 경고
- **현상**: React 19에서 `onKeyPress` deprecated 경고 다수 출력
- **해결**: `onKeyDown + !e.shiftKey` 조건으로 전체 교체

### 7. 알림 중복 표시
- **현상**: 앱 재실행 시 이미 본 알림이 다시 토스트로 팝업
- **원인**: `localStorage`에 shownIds를 영구 저장하지만 관리 누락으로 ID가 사라짐
- **해결**: `sessionStorage` + 24h TTL 방식으로 변경, 세션 종료 시 자동 클리어

<br/>

## 🚀 새 메뉴 추가 방법

1. `src/MyNewPage.jsx` 컴포넌트 작성
2. `src/lib/constants.js` → `ROUTES`에 경로 추가, `MENU_ITEMS`에 항목 추가
3. `src/App.jsx` → lazy import 추가 + `<Route>` + `<SubPage>` 추가
4. `node deploy.js` 배포

```js
// constants.js
export const ROUTES = {
  // ...
  MY_PAGE: '/mypage',
};

export const MENU_ITEMS = [
  // ...
  { emoji: '🆕', name: '새 메뉴', sub: '설명', path: ROUTES.MY_PAGE, color: '#FF6B35' },
];
```

```jsx
// App.jsx
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
├── App.jsx                    메인 앱 (라우팅, 알림, FCM, 업데이트 체크)
├── firebase.js                Firebase 초기화
├── touchEffects.js            터치 이펙트 (리플, 부리팡, 하트팡, 진동)
├── worldcupData.js            이상형 월드컵 테마 데이터
│
├── pages/
│   └── HomePage.jsx           홈 화면
│
├── components/
│   ├── GlobalStyle.jsx        전역 CSS + keyframes
│   ├── SubPage.jsx            서브페이지 공통 레이아웃
│   ├── BottomNav.jsx          하단 탭 + 사이드 드로어
│   ├── NotificationDrawer.jsx 알림 서랍
│   ├── InstallPrompt.jsx      PWA 설치/알림 허용 유도
│   ├── SectionCard.jsx        홈 섹션 카드 래퍼
│   ├── QuickNotif.jsx         콕 찌르기 버튼
│   ├── NotifButton.jsx        알림 벨 버튼
│   └── LoadingScreen.jsx
│
├── hooks/
│   ├── useAuth.jsx            인증 상태 관리
│   ├── useFCM.jsx             FCM 토큰 등록 + onMessage 핸들러
│   └── useNotifications.jsx   Firestore 알림 구독 + 토스트
│
├── lib/
│   ├── constants.js           색상, 라우트, 메뉴 상수
│   ├── buriAssets.js          부리부리 이미지 에셋 모음
│   └── UserContext.jsx        currentUser 전역 컨텍스트
│
├── CoupleDDay.jsx             D-DAY 카운트다운 배너
├── CoupleCalendar.jsx         커플 캘린더
├── CoupleCoupons.jsx          쿠폰북
├── DiaryWrite.jsx             일기 작성 폼
├── DiaryList.jsx              일기 목록 + 좋아요 + 댓글
├── EmotionThermometer.jsx     감정 온도계
├── SecretLetter.jsx           몰래 편지함
├── Bucketlist.jsx             버킷리스트
├── ScheduleList.jsx           일정 목록
├── TravelMap.jsx              여행 지도 (카카오맵)
├── LoveStats.jsx              연애 통계 (Recharts)
├── TodayMenu.jsx              오늘의 메뉴 AI 추천
├── MiniGameHub.jsx            미니게임 허브
├── OmokGame.jsx               오목 게임
├── DrawingGame.jsx            그림 퀴즈 게임
├── AccountBook.jsx            가계부
├── CoupleTamagotchi.jsx       커플 다마고치
├── CharacterPet.jsx           홈 캐릭터 펫 위젯
└── WorldCup.jsx               이상형 월드컵

functions/
└── index.js                   Cloud Functions (sendPush, 날씨, 리마인더 등)

public/
├── sw.js                      Service Worker
├── manifest.json              PWA 매니페스트
└── version.json               버전 파일 (배포마다 자동 증가)
```

<br/>

## 💻 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 (Vite HMR)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 + Firebase 배포 (버전 자동 증가)
npm run deploy
# 또는
node deploy.js
```

### 환경 변수 (`.env.local`)

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=ryuhyunhakiwoogi
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=BHEbFiMK-uMvS9hIg...
```

> **Note:** VAPID 키는 Firebase Console → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서에서 확인

<br/>

## 🎨 디자인 컨셉

**부리부리** 캐릭터를 중심으로 한 아기자기하고 따뜻한 감성 디자인이에요.

| 색상 | 코드 | 용도 |
|------|------|------|
| 라벤더 | `#EDE0F5` | 배경 포인트 |
| 퍼플 | `#7B4FA6` | 주 색상 (버튼, 제목) |
| 오렌지 | `#E8630A` | 강조 색상 |
| 피치 | `#FFE4D4` | 배경 포인트 |
| 크림 | `#FFF8F2` | 기본 배경 |

- **폰트**: Jua (제목) + Noto Sans KR (본문)
- **인터랙션**: 터치 리플, 부리팡 이펙트, 하트 파티클, confetti
- **애니메이션**: framer-motion 페이지 전환, CSS keyframes 캐릭터 bobbing

<br/>

## 💜 만든 이유

기존 커플 앱들의 광고, 데이터 수집, 불필요한 소셜 기능이 싫었습니다.  
그래서 우리만을 위한 프라이빗 웹앱을 직접 만들었습니다.

**01 프라이버시가 전부다**  
두 사람만 접근 가능한 완전 폐쇄형 공간. 기록은 우리만 봅니다.

**02 감정을 데이터로 기록한다**  
감정 온도계로 매일의 기분을 기록하고 주간/월간 트렌드를 자동 생성합니다.

**03 재미없으면 안 쓴다**  
쿠폰 룰렛, 이상형 월드컵, 미니게임, confetti 파티클, 하트 팡 효과.  
지금도 매일 실사용하며 지속적으로 개선하고 있습니다.

---

<p align="center">
  🐷 부리부리와 함께하는 우리의 공간 💜
</p>
