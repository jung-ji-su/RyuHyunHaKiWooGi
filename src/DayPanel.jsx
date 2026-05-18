import { useState } from 'react';
import { Box, Typography, Stack, Chip, Drawer, Divider, TextField, Button } from '@mui/material';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { vibrate } from './touchEffects';

const B = {
  pants: '#7B4FA6', skin: '#F5B8A0', cream: '#FFF8F2', peach: '#FFE4D4',
  lavender: '#EDE0F5', accent: '#E8630A', dark: '#3D1F00',
};

const CATEGORY_COLORS = { 기념일: '#ffc628', 데이트: '#ff3434', 개인일정: '#4079f3' };
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getTempMeta(v) {
  v = parseInt(v ?? 0);
  if (v === 0)  return { emoji: '💀', label: '패널티',    color: '#888' };
  if (v < 20)   return { emoji: '😶', label: '무기력',    color: '#B4B2A9' };
  if (v < 40)   return { emoji: '😔', label: '우울해요',  color: '#85B7EB' };
  if (v < 60)   return { emoji: '😊', label: '보통이에요', color: '#EF9F27' };
  if (v < 80)   return { emoji: '😄', label: '좋아요!',   color: '#7B4FA6' };
  return         { emoji: '🥰', label: '최고예요!',        color: '#E8630A' };
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function DayPanel({ open, onClose, date, schedules, temperatures, diaries, capsules = [], currentUser, onAddSchedule }) {
  const [capsuleMsg, setCapsuleMsg] = useState('');
  const [savingCapsule, setSavingCapsule] = useState(false);

  if (!date) return null;

  const d = date instanceof Date ? date : new Date(date);
  const isoStr = toIso(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureDate = d > today;
  const dayCapsules = capsules.filter(c => c.date === isoStr);

  const handleSaveCapsule = async () => {
    if (!capsuleMsg.trim()) return;
    setSavingCapsule(true);
    try {
      await addDoc(collection(db, 'timeCapsules'), {
        date: isoStr, author: currentUser,
        message: capsuleMsg, createdAt: serverTimestamp(),
      });
      setCapsuleMsg('');
    } catch (e) { console.error(e); }
    finally { setSavingCapsule(false); }
  };
  const dateLabel = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;

  const dayTemps = temperatures.filter(t => t.date === isoStr && !t.isPenalty);
  const dayDiaries = diaries.filter(entry => {
    if (!entry.createdAt) return false;
    const dd = entry.createdAt.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt);
    return toIso(dd) === isoStr;
  });

  const SectionLabel = ({ children }) => (
    <Typography sx={{
      fontSize: '0.63rem', fontWeight: 700, color: B.pants + '88',
      letterSpacing: '1.8px', mb: 0.8, fontFamily: "'Noto Sans KR',sans-serif",
    }}>
      {children}
    </Typography>
  );

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '22px 22px 0 0',
          maxHeight: '78vh',
          bgcolor: B.cream,
          backgroundImage: `radial-gradient(circle at 90% 0%, ${B.lavender}88 0%, transparent 35%)`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
      }}>

      {/* 드래그 핸들 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.2, pb: 0.5, flexShrink: 0 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: B.pants + '44' }} />
      </Box>

      {/* 날짜 헤더 */}
      <Box sx={{ px: 2.5, pt: 0.5, pb: 1.5, flexShrink: 0 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.1rem', color: B.pants }}>
          📅 {dateLabel}
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: B.pants + '22', flexShrink: 0 }} />

      {/* 스크롤 콘텐츠 */}
      <Box sx={{ overflowY: 'auto', px: 2, py: 1.8, flex: 1 }}>

        {/* 감정 온도 */}
        {dayTemps.length > 0 && (
          <Box sx={{ mb: 2.2 }}>
            <SectionLabel>감정 온도</SectionLabel>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {dayTemps.map((t, i) => {
                const meta = getTempMeta(t.temp);
                return (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.8,
                    bgcolor: 'white', borderRadius: 2.5, px: 1.4, py: 0.8,
                    border: `1.5px solid ${meta.color}33`,
                    boxShadow: `0 2px 8px ${meta.color}18`,
                  }}>
                    <Typography sx={{ fontSize: '1.15rem', lineHeight: 1 }}>{meta.emoji}</Typography>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', fontFamily: "'Noto Sans KR',sans-serif", color: '#bbb', lineHeight: 1 }}>
                        {t.author}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontFamily: "'Jua',sans-serif", color: meta.color, lineHeight: 1.2 }}>
                        {t.temp}° {meta.label}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* 일정 섹션 */}
        <Box sx={{ mb: 2.2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.8 }}>
            <SectionLabel>일정</SectionLabel>
            <Chip
              label="+ 추가"
              size="small"
              onClick={() => { vibrate(15); onClose(); setTimeout(onAddSchedule, 180); }}
              sx={{
                bgcolor: B.pants, color: 'white', fontFamily: "'Jua',sans-serif",
                fontSize: '0.68rem', height: 24, cursor: 'pointer',
                '&:hover': { bgcolor: '#6A3D96' },
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Stack>

          {schedules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'white', borderRadius: 2.5, border: '1.5px dashed #e0d6ec' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#ccc', fontFamily: "'Noto Sans KR',sans-serif" }}>
                📭 일정이 없어요
              </Typography>
            </Box>
          ) : (
            <Stack gap={0.7}>
              {schedules.map(s => {
                const catColor = CATEGORY_COLORS[s.category] || B.pants;
                return (
                  <Box key={s.id} sx={{
                    display: 'flex', alignItems: 'stretch',
                    bgcolor: 'white', borderRadius: 2.5, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    <Box sx={{ width: 4, bgcolor: catColor, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, px: 1.2, py: 0.9 }}>
                      <Typography sx={{
                        fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                        fontSize: '0.82rem', color: B.dark, lineHeight: 1.3,
                      }}>
                        {s.isImportant && '⭐ '}{s.title}
                      </Typography>
                      {(s.startTime || s.location) && (
                        <Typography sx={{ fontSize: '0.65rem', color: '#bbb', mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
                          {s.startTime && `🕐 ${s.startTime}`}{s.location && `  📍 ${s.location}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* 기록(일기) 섹션 */}
        <Box>
          <SectionLabel>기록</SectionLabel>

          {dayDiaries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'white', borderRadius: 2.5, border: '1.5px dashed #e0d6ec' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#ccc', fontFamily: "'Noto Sans KR',sans-serif" }}>
                ✏️ 기록이 없어요
              </Typography>
            </Box>
          ) : (
            <Stack gap={0.8}>
              {dayDiaries.map(entry => (
                <Box key={entry.id} sx={{
                  bgcolor: 'white', borderRadius: 2.5, p: '10px 14px',
                  border: `1.5px solid ${B.lavender}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.4 }}>
                    <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{entry.emoji || '📝'}</Typography>
                    <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.72rem', color: B.pants }}>
                      {entry.author}
                    </Typography>
                  </Stack>
                  {entry.content && (
                    <Typography sx={{
                      fontSize: '0.8rem', color: B.dark,
                      fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1.55,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.content}
                    </Typography>
                  )}
                  {entry.imageUrl && (
                    <Box component="img" src={entry.imageUrl} sx={{
                      mt: 0.8, width: '100%', borderRadius: 2, maxHeight: 130, objectFit: 'cover',
                    }} />
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* 타임캡슐 섹션 */}
        {(isFutureDate || dayCapsules.length > 0) && (
          <Box sx={{ mt: 2 }}>
            <SectionLabel>🔒 타임캡슐</SectionLabel>

            {/* 미래 날짜: 존재하는 캡슐 목록 (잠김) + 새 캡슐 작성 */}
            {isFutureDate && (
              <>
                {dayCapsules.map(c => (
                  <Box key={c.id} sx={{
                    bgcolor: B.lavender + '55', borderRadius: 2.5, p: '10px 14px',
                    border: `1.5px dashed ${B.pants}44`, mb: 0.8,
                    display: 'flex', alignItems: 'center', gap: 1,
                  }}>
                    <Typography sx={{ fontSize: '1.1rem' }}>🔒</Typography>
                    <Box>
                      <Typography sx={{ fontSize: '0.72rem', fontFamily: "'Noto Sans KR',sans-serif", color: B.pants, fontWeight: 700 }}>
                        {c.author}의 타임캡슐
                      </Typography>
                      <Typography sx={{ fontSize: '0.62rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif" }}>
                        {isoStr}에 공개돼요
                      </Typography>
                    </Box>
                  </Box>
                ))}
                <Box sx={{ bgcolor: 'white', borderRadius: 2.5, p: '12px', border: `1.5px solid ${B.pants}22` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: B.dark+'88', fontFamily: "'Noto Sans KR',sans-serif", mb: 1 }}>
                    이 날에 남길 메시지를 적어요 ✨
                  </Typography>
                  <TextField
                    fullWidth multiline rows={2} size="small"
                    placeholder="미래의 우리에게 보내는 메시지..."
                    value={capsuleMsg}
                    onChange={e => setCapsuleMsg(e.target.value)}
                    sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.82rem' } }}
                  />
                  <Button
                    fullWidth variant="contained" size="small"
                    disabled={!capsuleMsg.trim() || savingCapsule}
                    onClick={handleSaveCapsule}
                    sx={{
                      bgcolor: B.pants, borderRadius: 2, fontFamily: "'Jua',sans-serif",
                      fontSize: '0.82rem', '&:hover': { bgcolor: '#6A3D96' },
                      '&.Mui-disabled': { bgcolor: '#e0e0e0' },
                    }}>
                    🔒 타임캡슐 봉인
                  </Button>
                </Box>
              </>
            )}

            {/* 과거 날짜: 캡슐 공개 */}
            {!isFutureDate && dayCapsules.map(c => (
              <Box key={c.id} sx={{
                bgcolor: B.peach + '77', borderRadius: 2.5, p: '12px 14px',
                border: `1.5px solid ${B.accent}44`,
                boxShadow: `0 2px 10px ${B.accent}18`,
              }}>
                <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.6 }}>
                  <Typography sx={{ fontSize: '1rem' }}>📬</Typography>
                  <Typography sx={{ fontSize: '0.7rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, color: B.accent }}>
                    {c.author}의 타임캡슐 공개!
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.82rem', color: B.dark, fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1.6 }}>
                  {c.message}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ height: 24 }} />
      </Box>
    </Drawer>
  );
}
