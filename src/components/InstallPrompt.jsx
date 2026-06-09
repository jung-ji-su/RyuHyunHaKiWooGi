import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { B } from '../lib/constants';

const isIOS = () =>
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
  !window.MSStream;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

// 각 모드별 독립적인 localStorage 키 사용 — 하나를 닫아도 다른 모드에 영향 없음
const KEYS = {
  'ios-guide':      'ios_guide_dismissed',
  'chrome-install': 'chrome_install_dismissed',
};

export default function InstallPrompt({ onRequestPermission }) {
  const [show, setShow]             = useState(false);
  const [mode, setMode]             = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const standalone   = isStandalone();
    const ios          = isIOS();
    const notifGranted = 'Notification' in window && Notification.permission === 'granted';

    // PWA로 설치됐고 권한 미허용 → 알림 허용 프롬프트
    if (standalone && !notifGranted && 'Notification' in window) {
      setTimeout(() => { setMode('notif'); setShow(true); }, 4000);
      return;
    }

    // iOS Safari — 홈 화면 추가 가이드
    if (!standalone && ios && !localStorage.getItem(KEYS['ios-guide'])) {
      setTimeout(() => { setMode('ios-guide'); setShow(true); }, 7000);
    }
  }, []);

  // Chrome / Android 설치 배너
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem(KEYS['chrome-install'])) {
        setTimeout(() => { setMode('chrome-install'); setShow(true); }, 3000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    if (mode && KEYS[mode]) localStorage.setItem(KEYS[mode], '1');
    // 'notif' 모드는 강제 dismiss 없음 — Notification.permission 상태로 재판단
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
    if (outcome === 'accepted') localStorage.setItem(KEYS['chrome-install'], '1');
  };

  const handleEnableNotif = async () => {
    setShow(false);
    if (onRequestPermission) await onRequestPermission();
  };

  if (!show || !mode) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1400, width: '90%', maxWidth: 380,
      bgcolor: B.pants, borderRadius: 4, p: 2,
      boxShadow: `0 8px 32px ${B.pants}77`,
      display: 'flex', flexDirection: 'column', gap: 1.5,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: 'white', fontSize: '1rem' }}>
          {mode === 'ios-guide'      && '📱 앱으로 설치하기'}
          {mode === 'chrome-install' && '📱 앱으로 설치하기'}
          {mode === 'notif'          && '🔔 알림 받기'}
        </Typography>
        <IconButton size="small" onClick={dismiss} sx={{ color: 'rgba(255,255,255,0.7)', p: 0.3 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {mode === 'ios-guide' && (
        <Typography sx={{
          fontFamily: "'Noto Sans KR',sans-serif", color: 'white',
          fontSize: '0.8rem', opacity: 0.92, lineHeight: 1.8,
        }}>
          Safari 하단의 <b>공유 버튼 (⬆)</b> 을 누른 후<br />
          <b>"홈 화면에 추가"</b> 를 선택하면<br />
          앱처럼 설치되고 알림도 받을 수 있어요! 🐷💜
        </Typography>
      )}

      {mode === 'chrome-install' && (
        <>
          <Typography sx={{
            fontFamily: "'Noto Sans KR',sans-serif", color: 'white',
            fontSize: '0.8rem', opacity: 0.92,
          }}>
            부리부리를 앱으로 설치하면 더 빠르고<br />알림도 바로 받을 수 있어요! 🐷
          </Typography>
          <Button onClick={handleInstall} sx={{
            bgcolor: 'white', color: B.pants, borderRadius: 3,
            fontFamily: "'Jua',sans-serif", fontSize: '0.9rem',
            boxShadow: 'none', '&:hover': { bgcolor: '#f0e8f8' },
          }}>
            설치하기
          </Button>
        </>
      )}

      {mode === 'notif' && (
        <>
          <Typography sx={{
            fontFamily: "'Noto Sans KR',sans-serif", color: 'white',
            fontSize: '0.8rem', opacity: 0.92,
          }}>
            상대방이 기록이나 편지를 남기면<br />바로 알림을 받을 수 있어요! 💜
          </Typography>
          <Button onClick={handleEnableNotif} startIcon={<NotificationsIcon />} sx={{
            bgcolor: 'white', color: B.pants, borderRadius: 3,
            fontFamily: "'Jua',sans-serif", fontSize: '0.9rem',
            boxShadow: 'none', '&:hover': { bgcolor: '#f0e8f8' },
          }}>
            알림 허용하기
          </Button>
        </>
      )}
    </Box>
  );
}
