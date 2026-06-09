import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Drawer, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { db } from '../firebase';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';

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
  schedule: '/schedule', diary: '/diary', comment: '/diary',
  bucket: '/bucket', bucket_add: '/bucket',
  letter: '/letter', letter_reply: '/letter',
  thermo: '/thermo', temp_diff: '/thermo', hug: '/thermo', jilta: '/',
};

export default function NotificationDrawer({ open, onClose, notifications, onMarkAllRead }) {
  const [page, setPage] = useState(0);
  const [, setTick] = useState(0);
  const navigate = useNavigate();

  // 드로어 열릴 때 항상 1페이지로 리셋
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  // 1분마다 timeAgo 갱신
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [open]);

  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const pageItems  = notifications.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const unread     = notifications.filter(n => !n.isRead).length;

  const handleNotifDelete = async (e, n) => {
    e.stopPropagation();
    deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
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
          background: 'linear-gradient(160deg, #FAF5FF 0%, #FFF8F2 55%, #F5F0FF 100%)',
          boxShadow: '-8px 0 48px rgba(123,79,166,0.18)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        },
      }}
    >
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <Box sx={{
        px: 2, pt: 3, pb: 1.5, flexShrink: 0,
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${B.pants}14`,
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.2}>
            <IconButton size="small" onClick={onClose}
              sx={{
                color: B.dark + '88',
                bgcolor: 'rgba(255,255,255,0.7)',
                border: `1px solid ${B.pants}22`,
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: B.lavender, borderColor: B.pants + '44' },
              }}>
              <CloseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>

            <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: '1.08rem' }}>
              🔔 알림
            </Typography>

            {unread > 0 && (
              <Box sx={{
                px: 1.2, py: 0.15, borderRadius: 10,
                background: 'linear-gradient(135deg, #E53935, #FF5252)',
                boxShadow: '0 2px 8px rgba(229,57,53,0.4)',
              }}>
                <Typography sx={{ fontSize: '0.62rem', color: 'white', fontWeight: 700, lineHeight: 1.4 }}>
                  {unread}
                </Typography>
              </Box>
            )}
          </Stack>

          {unread > 0 && (
            <Box
              onClick={onMarkAllRead}
              sx={{
                px: 1.5, py: 0.5, borderRadius: 8,
                bgcolor: 'rgba(255,255,255,0.6)',
                border: `1px solid ${B.pants}22`,
                cursor: 'pointer', userSelect: 'none',
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: B.lavender + '88' },
                '&:active': { transform: 'scale(0.95)' },
                transition: 'all 0.15s',
              }}
            >
              <Typography sx={{
                fontSize: '0.68rem', color: B.pants + 'bb',
                fontFamily: "'Noto Sans KR',sans-serif",
              }}>
                모두 읽음 ✓
              </Typography>
            </Box>
          )}
        </Stack>

        {unread === 0 && notifications.length > 0 && (
          <Typography sx={{
            fontSize: '0.68rem', color: B.dark + '44',
            fontFamily: "'Noto Sans KR',sans-serif",
            mt: 0.8, ml: 0.5,
          }}>
            모든 알림을 읽었어요 ✨
          </Typography>
        )}
      </Box>

      {/* ── 알림 리스트 ─────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1.5 }}>
        {pageItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ fontSize: '3.5rem', mb: 1.5, opacity: 0.4 }}>🔕</Typography>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif",
              color: B.dark + '55', fontSize: '0.95rem',
            }}>
              아직 알림이 없어요
            </Typography>
            <Typography sx={{
              fontFamily: "'Noto Sans KR',sans-serif",
              color: B.dark + '33', fontSize: '0.75rem', mt: 0.5,
            }}>
              일정이나 일기를 작성하면 알림이 와요
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.8}>
            {pageItems.map(n => {
              const meta    = getMeta(n);
              const content = getContent(n);
              return (
                <Box
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  sx={{
                    borderRadius: '14px',
                    background: n.isRead
                      ? 'rgba(255,255,255,0.55)'
                      : 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: n.isRead
                      ? '1px solid rgba(255,255,255,0.7)'
                      : `1px solid ${meta.color}28`,
                    boxShadow: n.isRead
                      ? '0 1px 6px rgba(123,79,166,0.05)'
                      : `0 2px 14px ${meta.color}18, 0 1px 4px rgba(0,0,0,0.04)`,
                    display: 'flex', alignItems: 'flex-start', gap: 1.4,
                    p: 1.5,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.92)',
                      transform: 'translateY(-1px)',
                      boxShadow: `0 4px 20px ${meta.color}22`,
                    },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  {/* 미읽음 왼쪽 컬러 바 */}
                  {!n.isRead && (
                    <Box sx={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 3, borderRadius: '0 3px 3px 0',
                      bgcolor: meta.color,
                    }} />
                  )}

                  {/* 타입 아이콘 */}
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${meta.color}22 0%, ${meta.color}0e 100%)`,
                    border: `1.5px solid ${meta.color}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.05rem',
                    boxShadow: `0 2px 8px ${meta.color}18`,
                  }}>
                    {meta.icon}
                  </Box>

                  {/* 내용 */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontFamily: "'Noto Sans KR',sans-serif",
                      fontSize: '0.82rem', lineHeight: 1.5,
                      color: n.isRead ? B.dark + '66' : B.dark,
                      fontWeight: n.isRead ? 400 : 600,
                    }}>
                      {content}
                    </Typography>
                    <Stack direction="row" alignItems="center" gap={0.8} sx={{ mt: 0.4 }}>
                      <Box sx={{
                        px: 0.8, py: 0.05, borderRadius: 4,
                        bgcolor: `${meta.color}14`,
                      }}>
                        <Typography sx={{ fontSize: '0.6rem', color: meta.color, fontFamily: "'Noto Sans KR',sans-serif" }}>
                          {meta.label}
                        </Typography>
                      </Box>
                      <Typography sx={{
                        fontSize: '0.62rem', color: B.dark + '44',
                        fontFamily: "'Noto Sans KR',sans-serif",
                      }}>
                        {timeAgo(n.createdAt)}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* 미읽음 닷 + 삭제 버튼 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    {!n.isRead && (
                      <Box sx={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
                        boxShadow: `0 0 6px ${meta.color}88`,
                        mt: 0.5,
                      }} />
                    )}
                    <Box
                      onClick={(e) => handleNotifDelete(e, n)}
                      sx={{
                        width: 20, height: 20, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: B.dark + '44', fontSize: '0.75rem', lineHeight: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#ff000018', color: '#E53935' },
                        transition: 'all 0.15s',
                      }}
                    >
                      ✕
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── 페이지네이션 ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <Box sx={{
          px: 2, py: 1.5, flexShrink: 0,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${B.pants}10`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <Box
            onClick={() => page > 0 && setPage(p => p - 1)}
            sx={{
              px: 2, py: 0.6, borderRadius: 8,
              bgcolor: page === 0 ? 'transparent' : 'rgba(255,255,255,0.7)',
              border: `1px solid ${page === 0 ? B.pants + '18' : B.pants + '33'}`,
              color: page === 0 ? B.pants + '33' : B.pants,
              cursor: page === 0 ? 'default' : 'pointer',
              fontFamily: "'Jua',sans-serif", fontSize: '0.85rem',
              transition: 'all 0.15s',
              '&:hover': page > 0 ? { bgcolor: B.lavender + '66' } : {},
            }}
          >
            ‹ 이전
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: B.dark + '66', fontFamily: "'Noto Sans KR',sans-serif" }}>
            {page + 1} / {totalPages}
          </Typography>
          <Box
            onClick={() => page < totalPages - 1 && setPage(p => p + 1)}
            sx={{
              px: 2, py: 0.6, borderRadius: 8,
              bgcolor: page >= totalPages - 1 ? 'transparent' : 'rgba(255,255,255,0.7)',
              border: `1px solid ${page >= totalPages - 1 ? B.pants + '18' : B.pants + '33'}`,
              color: page >= totalPages - 1 ? B.pants + '33' : B.pants,
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              fontFamily: "'Jua',sans-serif", fontSize: '0.85rem',
              transition: 'all 0.15s',
              '&:hover': page < totalPages - 1 ? { bgcolor: B.lavender + '66' } : {},
            }}
          >
            다음 ›
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
