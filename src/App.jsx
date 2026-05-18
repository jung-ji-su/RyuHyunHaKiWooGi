import React, { useState, useEffect, lazy, Suspense, useContext } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
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
  buriShocked, buriFire, buriTired, buriBeard,
  buriGirl, buriFlower,
} from './lib/buriAssets';
import { createRipple, createBuriPang } from './touchEffects';

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
  return (
    <>
      <Outlet />
      <BottomNav logout={logout} />
    </>
  );
}

// ── 앱 내부 (BrowserRouter 안에서 실행) ──────────────────────────
function AppInner() {
  const navigate = useNavigate();
  const { currentUser, loading, login, logout } = useAuth();
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
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  // localStorage 정리
  useEffect(() => {
    ['shownCalIds', 'shownDiaryIds'].forEach(key => {
      try {
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        if (arr.length > 100) localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
      } catch { localStorage.removeItem(key); }
    });
  }, []);

  const handleUpdateConfirm = async () => {
    try { await signOut(auth); window.location.reload(true); } catch { window.location.reload(true); }
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
        open={schedulePopupOpen} autoHideDuration={null}
        onClose={(_, reason) => { if (reason === 'escapeKeyDown') setSchedulePopupOpen(false); }}
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
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ mt: 1 }}>
        <Alert
          icon={<Box component="img" src={buriGirl} sx={{ width: 24, height: 24, objectFit: 'contain' }} />}
          onClose={() => setToastOpen(false)}
          sx={{
            width: '100%', bgcolor: B.accent, color: 'white', fontWeight: 'bold',
            fontFamily: "'Noto Sans KR',sans-serif", borderRadius: 3,
            boxShadow: `0 4px 20px ${B.accent}66`,
            '& .MuiAlert-icon': { alignItems: 'center' },
            '& .MuiAlert-action': { color: 'white' },
          }}>
          {toastData?.content ?? ''} 💌
        </Alert>
      </Snackbar>

      {/* 배경 플로팅 부리 */}
      <Box component="img" src={buriShocked} alt="" className="buri-float b2" />
      <Box component="img" src={buriFire}    alt="" className="buri-float b3" />
      <Box component="img" src={buriTired}   alt="" className="buri-float b4" />
      <Box component="img" src={buriBeard}   alt="" className="buri-float b5" />

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
