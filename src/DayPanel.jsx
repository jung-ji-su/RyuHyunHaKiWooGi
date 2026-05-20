import { useState } from 'react';
import { Box, Typography, Stack, Drawer, TextField, Button } from '@mui/material';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { vibrate } from './touchEffects';

const B = {
  pants: '#7B4FA6', skin: '#F5B8A0', cream: '#FFF8F2', peach: '#FFE4D4',
  lavender: '#EDE0F5', accent: '#E8630A', dark: '#3D1F00',
};

const CATEGORY_COLORS  = { 기념일: '#ffc628', 데이트: '#ff3434', 개인일정: '#4079f3' };
const CATEGORY_EMOJIS  = { 기념일: '💖', 데이트: '🍕', 개인일정: '👤' };
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getTempMeta(v) {
  v = parseInt(v ?? 0);
  if (v === 0) return { emoji: '💀', label: '패널티',    color: '#888' };
  if (v < 20)  return { emoji: '😶', label: '무기력',    color: '#B4B2A9' };
  if (v < 40)  return { emoji: '😔', label: '우울해요',  color: '#85B7EB' };
  if (v < 60)  return { emoji: '😊', label: '보통이에요', color: '#EF9F27' };
  if (v < 80)  return { emoji: '😄', label: '좋아요!',   color: '#7B4FA6' };
  return        { emoji: '🥰', label: '최고예요!',       color: '#E8630A' };
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const GLASS_CARD = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 2px 12px rgba(123,79,166,0.07)',
};

function SectionLabel({ icon, children, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography sx={{
        fontSize: '0.61rem', fontWeight: 700, color: B.pants + '88',
        letterSpacing: '0.09em', fontFamily: "'Noto Sans KR',sans-serif",
      }}>
        {icon} {children}
      </Typography>
      {action}
    </Stack>
  );
}

function EmptyCard({ text }) {
  return (
    <Box sx={{
      ...GLASS_CARD,
      borderRadius: '14px',
      textAlign: 'center', py: 2.4,
    }}>
      <Typography sx={{ fontSize: '0.76rem', color: '#bbb', fontFamily: "'Noto Sans KR',sans-serif" }}>
        {text}
      </Typography>
    </Box>
  );
}

export default function DayPanel({ open, onClose, date, schedules, temperatures, diaries, capsules = [], currentUser, onAddSchedule }) {
  const [capsuleMsg, setCapsuleMsg] = useState('');
  const [savingCapsule, setSavingCapsule] = useState(false);

  if (!date) return null;

  const d = date instanceof Date ? date : new Date(date);
  const isoStr = toIso(d);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const isFutureDate = d > today;
  const dayCapsules  = capsules.filter(c => c.date === isoStr);

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
  const dayTemps  = temperatures.filter(t => t.date === isoStr && !t.isPenalty);
  const dayDiaries = diaries.filter(entry => {
    if (!entry.createdAt) return false;
    const dd = entry.createdAt.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt);
    return toIso(dd) === isoStr;
  });

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '24px 24px 0 0',
          maxHeight: '82vh',
          background: 'linear-gradient(160deg, #FAF5FF 0%, #FFF8F2 55%, #F5F0FF 100%)',
          boxShadow: '0 -8px 40px rgba(123,79,166,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
      }}
    >
      {/* 드래그 핸들 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.4, pb: 0.3, flexShrink: 0 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, background: `linear-gradient(to right, ${B.pants}44, ${B.pants}22)` }} />
      </Box>

      {/* 날짜 헤더 */}
      <Box sx={{ px: 2.5, pt: 0.6, pb: 1.4, flexShrink: 0 }}>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', lineHeight: 1.2,
          background: `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          📅 {dateLabel}
        </Typography>
      </Box>

      {/* 구분선 */}
      <Box sx={{ mx: 2.5, height: 1, background: `linear-gradient(to right, transparent, ${B.pants}22, transparent)`, flexShrink: 0 }} />

      {/* 스크롤 콘텐츠 */}
      <Box sx={{ overflowY: 'auto', px: 2.2, py: 2, flex: 1 }}>

        {/* 감정 온도 */}
        {dayTemps.length > 0 && (
          <Box sx={{ mb: 2.4 }}>
            <SectionLabel icon="🌡️">MOOD</SectionLabel>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {dayTemps.map((t, i) => {
                const meta = getTempMeta(t.temp);
                return (
                  <Box key={i} sx={{
                    ...GLASS_CARD,
                    display: 'flex', alignItems: 'center', gap: 1,
                    borderRadius: '14px', px: 1.6, py: 1,
                    border: `1px solid ${meta.color}28`,
                    boxShadow: `0 3px 14px ${meta.color}18`,
                  }}>
                    <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{meta.emoji}</Typography>
                    <Box>
                      <Typography sx={{ fontSize: '0.58rem', fontFamily: "'Noto Sans KR',sans-serif", color: '#bbb', lineHeight: 1, mb: 0.2 }}>
                        {t.author}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontFamily: "'Jua',sans-serif", color: meta.color, lineHeight: 1 }}>
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
        <Box sx={{ mb: 2.4 }}>
          <SectionLabel
            icon="📌"
            action={
              <Box
                onClick={() => { vibrate(15); onClose(); setTimeout(onAddSchedule, 180); }}
                sx={{
                  px: 1.2, py: 0.35, borderRadius: '20px', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`,
                  boxShadow: `0 3px 10px ${B.pants}44`,
                  WebkitTapHighlightColor: 'transparent',
                  '&:active': { transform: 'scale(0.93)', opacity: 0.9 },
                  transition: 'all 0.15s',
                }}
              >
                <Typography sx={{ fontSize: '0.65rem', color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}>
                  + 추가
                </Typography>
              </Box>
            }
          >
            SCHEDULE
          </SectionLabel>

          {schedules.length === 0 ? (
            <EmptyCard text="📭 등록된 일정이 없어요" />
          ) : (
            <Stack gap={0.9}>
              {schedules.map(s => {
                const catColor = CATEGORY_COLORS[s.category] || B.pants;
                const catEmoji = CATEGORY_EMOJIS[s.category] || '📅';
                return (
                  <Box key={s.id} sx={{
                    ...GLASS_CARD,
                    display: 'flex', alignItems: 'stretch',
                    borderRadius: '14px', overflow: 'hidden',
                    border: `1px solid ${catColor}22`,
                    boxShadow: `0 3px 14px ${catColor}14`,
                  }}>
                    <Box sx={{ width: 4, background: `linear-gradient(to bottom, ${catColor}, ${catColor}66)`, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, px: 1.4, py: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.2 }}>
                        <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{catEmoji}</Typography>
                        <Typography sx={{
                          fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
                          fontSize: '0.85rem', color: B.dark, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                        }}>
                          {s.isImportant && '⭐ '}{s.title}
                        </Typography>
                      </Stack>
                      {s.location && (
                        <Typography sx={{ fontSize: '0.63rem', color: '#aaa', fontFamily: "'Noto Sans KR',sans-serif", mt: 0.3 }}>
                          📍 {s.location}
                        </Typography>
                      )}
                      {s.memo && (
                        <Typography sx={{
                          fontSize: '0.62rem', color: '#bbb', mt: 0.3,
                          fontFamily: "'Noto Sans KR',sans-serif",
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          📝 {s.memo}
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
        <Box sx={{ mb: 2.4 }}>
          <SectionLabel icon="✍️">DIARY</SectionLabel>

          {dayDiaries.length === 0 ? (
            <EmptyCard text="✏️ 기록이 없어요" />
          ) : (
            <Stack gap={0.9}>
              {dayDiaries.map(entry => (
                <Box key={entry.id} sx={{
                  ...GLASS_CARD,
                  borderRadius: '14px', p: '12px 14px',
                  border: `1px solid ${B.lavender}`,
                }}>
                  <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.6 }}>
                    <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{entry.emoji || '📝'}</Typography>
                    <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: '0.74rem', color: B.pants }}>
                      {entry.author}
                    </Typography>
                  </Stack>
                  {entry.content && (
                    <Typography sx={{
                      fontSize: '0.81rem', color: B.dark, fontFamily: "'Noto Sans KR',sans-serif",
                      lineHeight: 1.6,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.content}
                    </Typography>
                  )}
                  {entry.imageUrl && (
                    <Box component="img" src={entry.imageUrl} sx={{
                      mt: 1, width: '100%', borderRadius: '10px', maxHeight: 140, objectFit: 'cover',
                    }} />
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* 타임캡슐 섹션 */}
        {(isFutureDate || dayCapsules.length > 0) && (
          <Box>
            <SectionLabel icon="🔒">TIME CAPSULE</SectionLabel>

            {isFutureDate && (
              <>
                {dayCapsules.map(c => (
                  <Box key={c.id} sx={{
                    ...GLASS_CARD,
                    borderRadius: '14px', px: 1.6, py: 1.2, mb: 0.9,
                    border: `1.5px dashed ${B.pants}44`,
                    display: 'flex', alignItems: 'center', gap: 1.2,
                  }}>
                    <Typography sx={{ fontSize: '1.3rem' }}>🔒</Typography>
                    <Box>
                      <Typography sx={{ fontSize: '0.74rem', fontFamily: "'Noto Sans KR',sans-serif", color: B.pants, fontWeight: 700 }}>
                        {c.author}의 타임캡슐
                      </Typography>
                      <Typography sx={{ fontSize: '0.62rem', color: B.dark + '55', fontFamily: "'Noto Sans KR',sans-serif", mt: 0.2 }}>
                        {isoStr}에 공개돼요
                      </Typography>
                    </Box>
                  </Box>
                ))}

                <Box sx={{
                  ...GLASS_CARD,
                  borderRadius: '16px', p: '14px',
                  border: `1px solid ${B.pants}20`,
                }}>
                  <Typography sx={{ fontSize: '0.72rem', color: B.pants + '88', fontFamily: "'Noto Sans KR',sans-serif", mb: 1.2, fontWeight: 700 }}>
                    이 날에 남길 메시지를 적어요 ✨
                  </Typography>
                  <TextField
                    fullWidth multiline rows={2} size="small"
                    placeholder="미래의 우리에게 보내는 메시지..."
                    value={capsuleMsg}
                    onChange={e => setCapsuleMsg(e.target.value)}
                    sx={{
                      mb: 1.2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px', fontSize: '0.82rem',
                        background: 'rgba(255,255,255,0.8)',
                        '& fieldset': { borderColor: `${B.pants}20` },
                        '&.Mui-focused fieldset': { borderColor: B.pants },
                      },
                    }}
                  />
                  <Box
                    onClick={(!capsuleMsg.trim() || savingCapsule) ? undefined : handleSaveCapsule}
                    sx={{
                      py: 1.1, borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                      background: capsuleMsg.trim()
                        ? `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`
                        : 'rgba(200,200,200,0.35)',
                      boxShadow: capsuleMsg.trim() ? `0 4px 16px ${B.pants}44` : 'none',
                      transition: 'all 0.2s ease',
                      WebkitTapHighlightColor: 'transparent',
                      '&:active': capsuleMsg.trim() ? { transform: 'scale(0.97)', opacity: 0.88 } : {},
                    }}
                  >
                    <Typography sx={{ fontSize: '0.84rem', fontFamily: "'Jua',sans-serif", color: capsuleMsg.trim() ? 'white' : '#bbb' }}>
                      🔒 타임캡슐 봉인
                    </Typography>
                  </Box>
                </Box>
              </>
            )}

            {!isFutureDate && dayCapsules.map(c => (
              <Box key={c.id} sx={{
                borderRadius: '16px', p: '14px',
                background: `linear-gradient(135deg, ${B.peach}88 0%, ${B.lavender}55 100%)`,
                border: `1.5px solid ${B.accent}33`,
                boxShadow: `0 4px 18px ${B.accent}14`,
                backdropFilter: 'blur(8px)',
              }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.8 }}>
                  <Typography sx={{ fontSize: '1.1rem' }}>📬</Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, color: B.accent }}>
                    {c.author}의 타임캡슐 공개!
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.82rem', color: B.dark, fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1.65 }}>
                  {c.message}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ height: 28 }} />
      </Box>
    </Drawer>
  );
}
