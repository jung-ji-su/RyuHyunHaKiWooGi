import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Drawer, IconButton, Stack, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';

const B = {
  pants: '#7B4FA6', cream: '#FFF8F2', lavender: '#EDE0F5',
  accent: '#E8630A', dark: '#3D1F00',
};

const PAGE_SIZE = 20;

const TYPE_META = {
  schedule:     { icon: '📅', color: '#7B4FA6', label: '일정' },
  diary:        { icon: '📝', color: '#E8630A', label: '일기' },
  comment:      { icon: '💬', color: '#43A047', label: '댓글' },
  bucket:       { icon: '🎉', color: '#43A047', label: '버킷' },
  bucket_add:   { icon: '🪣', color: '#43A047', label: '버킷' },
  hug:          { icon: '🤗', color: '#E8630A', label: '토닥' },
  temp_diff:    { icon: '🌡️', color: '#7B4FA6', label: '온도' },
  letter:       { icon: '💌', color: '#7B4FA6', label: '편지' },
  letter_reply: { icon: '💌', color: '#7B4FA6', label: '답장' },
  jilta:        { icon: '😤', color: '#E53935', label: '질타' },
};

function timeAgo(ts) {
  if (!ts?.toMillis) return '';
  const sec = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (sec < 60)  return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}분 전`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 8)   return `${day}일 전`;
  const d = ts.toDate();
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function getMeta(n) {
  const m = TYPE_META[n.type];
  if (m) return m;
  // 구형 일정 알림 (type 없음)
  if (!n.type && n.count !== undefined) return TYPE_META.schedule;
  return { icon: '🔔', color: B.pants, label: '알림' };
}

function getContent(n) {
  if (n.content) return n.content;
  if (!n.type && n.count !== undefined)
    return `${n.writer}가 일정을 ${n.count}개 등록했어요! 📅`;
  return `${n.writer}가 알림을 보냈어요`;
}

const TYPE_ROUTES = {
  schedule:     '/schedule',
  diary:        '/diary',
  comment:      '/diary',
  bucket:       '/bucket',
  bucket_add:   '/bucket',
  letter:       '/letter',
  letter_reply: '/letter',
  temp_diff:    '/thermo',
  hug:          '/thermo',
  jilta:        '/',
};

export default function NotificationDrawer({ open, onClose, notifications, onMarkAllRead }) {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const pageItems  = notifications.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const unread     = notifications.filter(n => !n.isRead).length;

  const handleMarkAll = () => {
    onMarkAllRead();
  };

  const handleNotifClick = async (n) => {
    if (!n.isRead) {
      updateDoc(doc(db, 'notifications', n.id), { isRead: true }).catch(() => {});
    }
    const route = TYPE_ROUTES[n.type] ?? ((!n.type && n.count !== undefined) ? '/schedule' : null);
    onClose();
    if (route) setTimeout(() => navigate(route), 150);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '100%', maxWidth: 420,
          bgcolor: B.cream,
          backgroundImage: `radial-gradient(circle at 80% 0%, ${B.lavender}77 0%, transparent 40%)`,
          display: 'flex', flexDirection: 'column',
        },
      }}
    >
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2.5, pb: 1.5, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton size="small" onClick={onClose}
              sx={{ color: B.dark+'88', bgcolor: B.lavender+'44', '&:hover': { bgcolor: B.lavender } }}>
              <CloseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: '1.05rem' }}>
              🔔 알림
            </Typography>
            {unread > 0 && (
              <Box sx={{
                px: 1, py: 0.1, borderRadius: 10,
                bgcolor: '#E53935', display: 'inline-flex',
              }}>
                <Typography sx={{ fontSize: '0.62rem', color: 'white', fontWeight: 700 }}>
                  {unread}
                </Typography>
              </Box>
            )}
          </Stack>
          {unread > 0 && (
            <Button size="small" onClick={handleMarkAll}
              sx={{
                fontSize: '0.65rem', color: B.pants+'88',
                fontFamily: "'Noto Sans KR',sans-serif",
                '&:hover': { bgcolor: B.lavender },
              }}>
              모두 읽음
            </Button>
          )}
        </Stack>
        <Box sx={{ height: 1, bgcolor: B.pants+'14', mt: 1.5 }} />
      </Box>

      {/* ── 리스트 ───────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {pageItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🔕</Typography>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.dark+'66', fontSize: '0.9rem' }}>
              아직 알림이 없어요
            </Typography>
          </Box>
        ) : (
          pageItems.map(n => {
            const meta    = getMeta(n);
            const content = getContent(n);
            return (
              <Box key={n.id} onClick={() => handleNotifClick(n)} sx={{
                px: 2, py: 1.6,
                borderBottom: `1px solid ${B.pants}08`,
                bgcolor: n.isRead ? 'transparent' : `${meta.color}07`,
                display: 'flex', alignItems: 'flex-start', gap: 1.5,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: `${meta.color}12` },
                '&:active': { bgcolor: `${meta.color}22` },
              }}>
                {/* 타입 아이콘 */}
                <Box sx={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  bgcolor: `${meta.color}18`, border: `1.5px solid ${meta.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                }}>
                  {meta.icon}
                </Box>

                {/* 내용 */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontFamily: "'Noto Sans KR',sans-serif",
                    fontSize: '0.82rem', lineHeight: 1.45,
                    color: n.isRead ? B.dark+'66' : B.dark,
                    fontWeight: n.isRead ? 400 : 600,
                  }}>
                    {content}
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.62rem', color: B.dark+'44',
                    mt: 0.3, fontFamily: "'Noto Sans KR',sans-serif",
                  }}>
                    {timeAgo(n.createdAt)}
                  </Typography>
                </Box>

                {/* 미읽음 닷 */}
                {!n.isRead && (
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: meta.color, flexShrink: 0, mt: 1,
                  }} />
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* ── 페이지네이션 ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <Box sx={{
          px: 2, py: 1.5, flexShrink: 0,
          borderTop: `1px solid ${B.pants}10`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}
            sx={{ minWidth: 0, color: B.pants, fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.8rem' }}>
            ‹ 이전
          </Button>
          <Typography sx={{ fontSize: '0.72rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif" }}>
            {page + 1} / {totalPages}
          </Typography>
          <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            sx={{ minWidth: 0, color: B.pants, fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.8rem' }}>
            다음 ›
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
