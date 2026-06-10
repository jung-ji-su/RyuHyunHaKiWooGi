import React, { useState, useEffect, lazy, Suspense, useContext } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box, Typography, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  IconButton, Badge,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import confetti from 'canvas-confetti';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

import GlobalStyle          from './components/GlobalStyle';
import LoginScreen          from './components/LoginScreen';
import LoadingScreen        from './components/LoadingScreen';
import SubPage              from './components/SubPage';
import BottomNav            from './components/BottomNav';
import NotificationDrawer   from './components/NotificationDrawer';
import { UserContext } from './lib/UserContext';
import { useAuth }           from './hooks/useAuth';
import { useNotifications }  from './hooks/useNotifications';
import { B } from './lib/constants';
import {
  buri8, buri9,
  buriShocked, buriTired,
  buriGirl, buriFlower,
} from './lib/buriAssets';
import { createRipple, createBuriPang } from './touchEffects';
import { useFCM }        from './hooks/useFCM';
import InstallPrompt     from './components/InstallPrompt';

// ── 페이지 lazy import (코드 스플리팅) ────────────────────────────
const HomePage          = lazy(() => import('./pages/HomePage'));
const ScheduleList      = lazy(() => import('./ScheduleList'));
const CoupleCoupons     = lazy(() => import('./CoupleCoupons'));
const SecretLetter      = lazy(() => import('./SecretLetter'));
const EmotionThermometer = lazy(() => import('./EmotionThermometer'));
const DiaryList         = lazy(() => import('./DiaryList'));
const BucketList        = lazy(() => import('./Bucketlist'));
const TravelMap         = lazy(() => import('./TravelMap'));
const LoveStats         = lazy(() => import('./LoveStats'));
const TodayMenu         = lazy(() => import('./TodayMenu'));
const MiniGameHub       = lazy(() => import('./MiniGameHub'));
const AccountBook       = lazy(() => import('./AccountBook'));
const CoupleTamagotchi  = lazy(() => import('./CoupleTamagotchi'));
const WorldCup          = lazy(() => import('./WorldCup'));
const AdminPage         = lazy(() => import('./pages/AdminPage'));

// ── 페이지 로딩 fallback ─────────────────────────────────────────
function PageLoader() {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '50vh', flexDirection: 'column', gap: 1,
    }}>
      <Typography sx={{
        fontFamily: "'Jua',sans-serif", color: B.pants,
        fontSize: '0.9rem', animation: 'headBob 1s ease-in-out infinite',
      }}>🐷 로딩 중...</Typography>
    </Box>
  );
}

// ── 레이아웃 (Outlet + BottomNav) ───────────────────────────────
function Layout() {
  const { logout } = useContext(UserContext);
  const location = useLocation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Box>
      <BottomNav logout={logout} />
    </Box>
  );
}

// ── 알림 타입 → 페이지 경로 매핑 (토스트 클릭 / iOS 딥링크) ─────
const TOAST_ROUTES = {
  diary: '/diary', comment: '/diary', like: '/diary',
  schedule: '/schedule',
  bucket: '/bucket', bucket_add: '/bucket',
  letter: '/letter', letter_reply: '/letter',
  thermo: '/thermo', hug: '/thermo', temp_diff: '/thermo',
  coupon: '/coupons', coupon_used: '/coupons',
};

// ── 앱 내부 (BrowserRouter 안에서 실행) ──────────────────────────
function AppInner() {
  const navigate = useNavigate();
  const { currentUser, loading, login, logout } = useAuth();
  const { requestPermission } = useFCM(currentUser);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const {
    allNotifications, unreadCount, markAllRead,
    toastOpen, toastData, setToastOpen,
    schedulePopupOpen, schedulePopupItem,
    setSchedulePopupOpen, handleSchedulePopupClick,
  } = useNotifications(currentUser);

  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // 버전 업데이트 체크
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/version.json?v=${Date.now()}`);
        if (!res.ok) return;
        const { version: sv } = await res.json();
        const lv = localStorage.getItem('app_version');
        if (lv && lv !== sv) {
          const end = Date.now() + 3000;
          const frame = () => {
            confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#F5B8A0', '#7B4FA6', '#fff'], zIndex: 10000 });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#F5B8A0', '#7B4FA6', '#fff'], zIndex: 10000 });
            if (Date.now() < end) requestAnimationFrame(frame);
          };
          frame();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setUpdateDialogOpen(true);
          localStorage.setItem('app_version', sv);
        } else if (!lv) {
          localStorage.setItem('app_version', sv);
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  // SW postMessage → React Router 딥링크
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'NAVIGATE') {
        try {
          const url = new URL(event.data.url);
          navigate(url.pathname);
        } catch {}
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);

  // iOS PWA: 알림 탭으로 앱이 열릴 때 __nav 쿼리 파라미터로 딥링크 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pendingNav = params.get('__nav');
    if (pendingNav) {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => navigate(decodeURIComponent(pendingNav)), 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 포그라운드 FCM 알림 → Firestore onSnapshot이 이미 처리하므로 별도 처리 불필요
  // (이 핸들러 제거: toastData 없이 setToastOpen(true)만 하면 빈 토스트가 표시될 수 있음)

  // localStorage 정리
  useEffect(() => {
    ['shownCalIds', 'shownDiaryIds'].forEach(key => {
      try {
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        if (arr.length > 100) localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
      } catch { localStorage.removeItem(key); }
    });
  }, []);

  // 알림 드로어 열리면 토스트 닫기 (중복 표시 방지)
  useEffect(() => {
    if (notifDrawerOpen) setToastOpen(false);
  }, [notifDrawerOpen]);

  const handleUpdateConfirm = async () => {
    try { await signOut(auth); } catch {}
    // 브라우저 캐시 전체 삭제 후 강제 새로고침
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {}
    window.location.replace(window.location.pathname + '?_cb=' + Date.now());
  };

  if (loading)      return <><GlobalStyle /><LoadingScreen /></>;
  if (!currentUser) return <><GlobalStyle /><LoginScreen onLogin={login} /></>;

  const opponent = currentUser === '지수' ? '현하' : '지수';

  return (
    <UserContext.Provider value={{ currentUser, logout }}>
      <GlobalStyle />

      {/* 업데이트 다이얼로그 */}
      <Dialog open={updateDialogOpen} disableEscapeKeyDown
        PaperProps={{ sx: {
          borderRadius: 5, p: 1, textAlign: 'center', bgcolor: B.cream,
          border: `2px solid ${B.pants}44`, boxShadow: `0 8px 40px ${B.pants}44`, overflow: 'visible',
        }}}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: -4, gap: 1 }}>
          <Box component="img" src={buriFlower} alt="" sx={{ width: 52, filter: `drop-shadow(0 3px 10px ${B.pants}55)` }} />
          <Box component="img" src={buri8} alt=""      sx={{ width: 80, filter: `drop-shadow(0 4px 12px ${B.pants}66)` }} />
        </Box>
        <DialogTitle sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: '1.3rem', pt: 0.5 }}>
          ✨ 새로운 기능 업데이트!
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", color: B.dark }}>
            미니홈피가 더 예뻐지고 강력해졌어요!<br />지금 바로 확인해 보세요. 🐷💖
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
          <Button onClick={handleUpdateConfirm} variant="contained"
            onPointerDown={e => { createRipple(e); createBuriPang(e); }}
            sx={{
              bgcolor: B.pants, borderRadius: 10, px: 4,
              fontFamily: "'Jua',sans-serif", fontWeight: 'bold', fontSize: '1rem',
              position: 'relative', overflow: 'hidden',
              boxShadow: `0 4px 16px ${B.pants}55`, transition: 'transform 0.1s',
              '&:active': { transform: 'scale(0.94)' },
              '&:hover': { bgcolor: '#6A3D96' },
            }}>
            업데이트 확인 🚀
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 알림 벨 (fixed) ──────────────────────────────────── */}
      {!notifDrawerOpen && (
        <Box sx={{
          position: 'fixed', top: 12, right: 12, zIndex: 1350,
          animation: unreadCount > 0 ? 'bellShake 1.2s ease-in-out infinite' : 'none',
        }}>
          <IconButton
            onClick={() => setNotifDrawerOpen(true)}
            sx={{
              bgcolor: 'white', width: 44, height: 44,
              boxShadow: `0 2px 14px ${B.pants}33`,
              border: `1.5px solid ${B.pants}22`,
              '&:hover': { bgcolor: B.lavender },
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.62rem', minWidth: 16, height: 16, p: '0 4px' } }}
            >
              <NotificationsIcon sx={{ color: B.pants, fontSize: '1.25rem' }} />
            </Badge>
          </IconButton>
        </Box>
      )}

      {/* ── 알림 드로어 ──────────────────────────────────────── */}
      <NotificationDrawer
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        notifications={allNotifications}
        onMarkAllRead={markAllRead}
      />

      {/* ── 일정 등록 팝업 ───────────────────────────────────── */}
      <Snackbar
        open={schedulePopupOpen} autoHideDuration={8000}
        onClose={(_, reason) => { if (reason !== 'clickaway') setSchedulePopupOpen(false); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 1, cursor: 'pointer' }} onClick={handleSchedulePopupClick}>
        <Alert
          icon={<Box component="img" src={buri9} sx={{ width: 24, height: 24, objectFit: 'contain' }} />}
          sx={{
            width: '100%', bgcolor: B.pants, color: 'white', fontWeight: 'bold',
            fontFamily: "'Noto Sans KR',sans-serif", borderRadius: 3,
            boxShadow: `0 4px 20px ${B.pants}66`,
            '& .MuiAlert-icon': { alignItems: 'center' },
          }}>
          {schedulePopupItem
            ? `${schedulePopupItem.writer}가 일정을 ${schedulePopupItem.count ?? 1}개 등록했어요! 📅`
            : ''}
        </Alert>
      </Snackbar>

      {/* ── 일반 토스트 알림 ─────────────────────────────────── */}
      <Snackbar
        open={toastOpen} autoHideDuration={5000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 1, cursor: TOAST_ROUTES[toastData?.type] ? 'pointer' : 'default' }}
        onClick={() => {
          const path = TOAST_ROUTES[toastData?.type];
          if (path) { setToastOpen(false); navigate(path); }
        }}>
        <Alert
          icon={<Box component="img" src={buriGirl} sx={{ width: 24, height: 24, objectFit: 'contain' }} />}
          onClose={(e) => { e.stopPropagation(); setToastOpen(false); }}
          sx={{
            width: '100%', bgcolor: B.accent, color: 'white', fontWeight: 'bold',
            fontFamily: "'Noto Sans KR',sans-serif", borderRadius: 3,
            boxShadow: `0 4px 20px ${B.accent}66`,
            '& .MuiAlert-icon': { alignItems: 'center' },
            '& .MuiAlert-action': { color: 'white' },
          }}>
          {toastData?.content ?? ''}
        </Alert>
      </Snackbar>

      {/* 배경 플로팅 부리 */}
      <Box component="img" src={buriShocked} alt="" className="buri-float b2" />
      <Box component="img" src={buriTired}   alt="" className="buri-float b4" />

      {/* PWA 설치 / 알림 허용 프롬프트 */}
      <InstallPrompt onRequestPermission={requestPermission} />

      {/* ── 라우터 ── */}
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}>
              <HomePage currentUser={currentUser} logout={logout} />
            </Suspense>
          } />

          <Route path="schedule" element={
            <SubPage title="일정 한눈에 보기" icon="📅">
              <Suspense fallback={<PageLoader />}>
                <ScheduleList currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="coupons" element={
            <SubPage title="쿠폰북" icon="🎟️">
              <Suspense fallback={<PageLoader />}>
                <CoupleCoupons currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="letter" element={
            <SubPage title="몰래 편지함" icon="💌">
              <Suspense fallback={<PageLoader />}>
                <SecretLetter currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="thermo" element={
            <SubPage title="감정 온도계" icon="🌡️">
              <Suspense fallback={<PageLoader />}>
                <EmotionThermometer currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="diary" element={
            <SubPage title="전체 기록 보기" icon="📖">
              <Suspense fallback={<PageLoader />}>
                <DiaryList currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="bucket" element={
            <SubPage title="버킷리스트" icon="🪣">
              <Suspense fallback={<PageLoader />}>
                <BucketList currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="travel" element={
            <SubPage title="우리의 여행 지도" icon="🗺️">
              <Suspense fallback={<PageLoader />}>
                <TravelMap currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="stats" element={
            <SubPage title="연애 통계" icon="📊">
              <Suspense fallback={<PageLoader />}>
                <LoveStats currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="menu" element={
            <SubPage title="오늘의 메뉴 (오메)" icon="🍳">
              <Suspense fallback={<PageLoader />}>
                <TodayMenu currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="games" element={
            <Suspense fallback={<PageLoader />}>
              <MiniGameHub
                currentUser={currentUser}
                opponentUser={opponent}
                onBack={() => navigate(-1)}
              />
            </Suspense>
          } />

          <Route path="account" element={
            <SubPage title="가계부" icon="💰">
              <Suspense fallback={<PageLoader />}>
                <AccountBook currentUser={currentUser} opponentUser={opponent} />
              </Suspense>
            </SubPage>
          } />

          <Route path="tamagotchi" element={
            <SubPage title="커플 다마고치" icon="🐾">
              <Suspense fallback={<PageLoader />}>
                <CoupleTamagotchi currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          <Route path="worldcup" element={
            <SubPage title="이상형 월드컵" icon="⚔️">
              <Suspense fallback={<PageLoader />}>
                <WorldCup currentUser={currentUser} />
              </Suspense>
            </SubPage>
          } />

          {currentUser === '지수' && (
            <Route path="admin" element={
              <Suspense fallback={<PageLoader />}>
                <AdminPage />
              </Suspense>
            } />
          )}
        </Route>
      </Routes>
    </UserContext.Provider>
  );
}

// ── 루트 (BrowserRouter 감싸기) ───────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
