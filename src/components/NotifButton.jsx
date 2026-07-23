import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { UserContext } from '../lib/UserContext';
import { useFCM } from '../hooks/useFCM';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { B } from '../lib/constants';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export default function NotifButton() {
  const { currentUser }          = useContext(UserContext);
  const { requestPermission }    = useFCM(currentUser);

  const [perm,        setPerm]      = useState('default');
  const [hasToken,    setHasToken]  = useState(false);
  const [loading,     setLoading]   = useState(false);
  const [errMsg,   setErrMsg]   = useState('');

  useEffect(() => {
    if (!('Notification' in window)) { setPerm('unsupported'); return; }
    setPerm(Notification.permission);

    if (Notification.permission === 'granted' && currentUser) {
      getDoc(doc(db, 'fcmTokens', currentUser))
        .then(snap => setHasToken(snap.exists() && !!snap.data()?.token))
        .catch(() => setHasToken(false));
    }
  }, [currentUser]);

  if (!isStandalone()) return null;
  if (perm === 'unsupported') return null;
  if (perm === 'granted' && hasToken) return null;

  const handleClick = async () => {
    if (perm === 'denied') return;
    setLoading(true);
    setErrMsg('');
    try {
      await requestPermission();
      setPerm('granted');
      setHasToken(true);
    } catch (e) {
      setErrMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const label = loading
    ? '등록 중...'
    : perm === 'denied'
      ? '알림 차단됨 — 설정에서 허용'
      : perm === 'granted'
        ? '알림 재등록하기 🔔'
        : '알림 허용하기 🔔';

  const Icon = perm === 'denied'
    ? NotificationsOffIcon
    : perm === 'granted'
      ? NotificationsActiveIcon
      : NotificationsIcon;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Button
        onClick={handleClick}
        disabled={loading || perm === 'denied'}
        startIcon={<Icon />}
        size="small"
        sx={{
          bgcolor: perm === 'denied' ? '#ffeeee' : B.pants + '15',
          color:   perm === 'denied' ? '#cc0000' : B.pants,
          borderRadius: 3, px: 1.5, py: 0.6,
          fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.75rem',
          border: `1px solid ${perm === 'denied' ? '#ffcccc' : B.pants + '33'}`,
          '&:hover': { bgcolor: perm === 'denied' ? '#ffeeee' : B.pants + '25' },
        }}
      >
        {label}
      </Button>

      {errMsg !== '' && (
        <Typography sx={{
          fontSize: '0.7rem', color: '#cc0000',
          fontFamily: "'Noto Sans KR',sans-serif",
          maxWidth: 320, textAlign: 'center', px: 1,
        }}>
          ⚠️ {errMsg}
        </Typography>
      )}
    </Box>
  );
}
