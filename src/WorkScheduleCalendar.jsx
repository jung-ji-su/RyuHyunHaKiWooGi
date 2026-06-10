import { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, IconButton, Drawer, Stack, Button } from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DateRangeIcon    from '@mui/icons-material/DateRange';
import AddTaskIcon      from '@mui/icons-material/AddTask';
import SwapHorizIcon    from '@mui/icons-material/SwapHoriz';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserContext } from './lib/UserContext';
import { vibrate } from './touchEffects';

const B = {
  pants: '#7B4FA6', skin: '#F5B8A0', cream: '#FFF8F2',
  peach: '#FFE4D4', lavender: '#EDE0F5', accent: '#E8630A', dark: '#3D1F00',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const COUPLE_ID = 'jisu_hyunha';

const SCHEDULE_TYPES = [
  { type: 'DAY', label: 'DAY', time: '06~14시', color: '#F59E0B', bg: '#FFFBEB', emoji: '🌅' },
  { type: 'SW',  label: 'SW',  time: '14~22시', color: '#3B82F6', bg: '#EFF6FF', emoji: '🌇' },
  { type: 'GY',  label: 'GY',  time: '22~06시', color: '#6D28D9', bg: '#EDE9FE', emoji: '🌙' },
];

const SCHEDULE_MAP = Object.fromEntries(SCHEDULE_TYPES.map(s => [s.type, s]));

const HOLIDAYS = [
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18',
  '2026-03-01','2026-05-05','2026-05-24','2026-06-06',
  '2026-08-15','2026-09-24','2026-09-25','2026-09-26',
  '2026-10-03','2026-10-09','2026-12-25',
];

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLast = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = firstDay - 1; i >= 0; i--)
    days.push({ date: new Date(year, month - 1, prevLast - i), current: false });
  for (let d = 1; d <= lastDate; d++)
    days.push({ date: new Date(year, month, d), current: true });
  const fill = 42 - days.length;
  for (let d = 1; d <= fill; d++)
    days.push({ date: new Date(year, month + 1, d), current: false });
  return days;
}

function ScheduleDayCell({ d, current, idx, today, schedule, isMultiSelected, onDateClick }) {
  const iso = toIso(d);
  const isToday   = isSameDay(d, today);
  const isHoliday = d.getDay() === 0 || HOLIDAYS.includes(iso);
  const sched     = schedule ? SCHEDULE_MAP[schedule] : null;
  const isCard    = !!(sched && current);

  return (
    <Box
      onClick={() => { if (current) { vibrate(10); onDateClick(d); } }}
      sx={{
        position: 'relative',
        height: 68,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: '6px',
        pb: '4px',
        opacity: current ? 1 : 0,
        pointerEvents: current ? 'auto' : 'none',
        cursor: current ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        '&:active': current ? { opacity: 0.7 } : {},
        transition: 'all 0.15s',
        ...(isCard ? {
          m: '2px',
          borderRadius: '8px',
          background: isMultiSelected
            ? `${B.pants}22`
            : `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${sched.color}0d 100%)`,
          boxShadow: isMultiSelected
            ? `0 3px 10px ${B.pants}33, inset 0 0 0 2px ${B.pants}55`
            : `0 4px 14px ${sched.color}32, 0 1px 4px ${sched.color}20`,
          border: isMultiSelected ? 'none' : `1px solid ${sched.color}28`,
          zIndex: 1,
        } : {
          borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid ${B.pants}0e`,
          borderBottom: `1px solid ${B.pants}09`,
          bgcolor: isMultiSelected ? `${B.pants}18` : 'transparent',
          outline: isMultiSelected ? `2px solid ${B.pants}55` : 'none',
          outlineOffset: -2,
        }),
      }}
    >
      {/* 날짜 원 */}
      <Box sx={{
        width: 30, height: 30, borderRadius: '50%',
        bgcolor: isMultiSelected ? B.pants : (isToday ? `${B.pants}1a` : 'transparent'),
        border: !isMultiSelected && isToday ? `2px solid ${B.pants}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}>
        <Typography sx={{
          fontSize: '0.8rem',
          fontWeight: (isMultiSelected || isToday) ? 700 : 500,
          fontFamily: "'Noto Sans KR',sans-serif",
          lineHeight: 1,
          color: isMultiSelected ? 'white' : (isToday ? B.pants : (isHoliday && current ? '#E24B4A' : B.dark)),
        }}>
          {d.getDate()}
        </Typography>
      </Box>

      {/* 스케줄 pill */}
      {sched ? (
        <>
          <Box sx={{
            mt: '3px', px: '6px', py: '1.5px', borderRadius: 10,
            bgcolor: isMultiSelected ? `${sched.color}cc` : sched.color,
            flexShrink: 0,
          }}>
            <Typography sx={{
              fontSize: '0.58rem', fontWeight: 700,
              color: 'white', lineHeight: 1,
              fontFamily: "'Noto Sans KR',sans-serif",
            }}>
              {sched.label}
            </Typography>
          </Box>
          <Typography sx={{
            fontSize: '0.42rem', color: sched.color,
            fontFamily: "'Noto Sans KR',sans-serif",
            lineHeight: 1, mt: '2px', flexShrink: 0,
          }}>
            {sched.time}
          </Typography>
        </>
      ) : (
        <Box sx={{ height: 22, flexShrink: 0 }} />
      )}
    </Box>
  );
}

export default function WorkScheduleCalendar({ onFlip }) {
  const { currentUser } = useContext(UserContext);
  const today = useRef(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }).current();

  const [viewYear,      setViewYear]      = useState(today.getFullYear());
  const [viewMonth,     setViewMonth]     = useState(today.getMonth());
  const [slideDir,      setSlideDir]      = useState(1);
  const [schedules,     setSchedules]     = useState({});
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [multiDates,    setMultiDates]    = useState([]);
  const touchX = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'workSchedules'), where('coupleId', '==', COUPLE_ID));
    return onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.data().date] = d.data().type; });
      setSchedules(map);
    });
  }, []);

  const navigate = (dir) => {
    setSlideDir(dir);
    let y = viewYear, m = viewMonth + dir;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setViewYear(y); setViewMonth(m);
    vibrate(8);
  };

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 44) navigate(dx > 0 ? -1 : 1);
    touchX.current = null;
  };

  const handleDateClick = (d) => {
    if (isMultiSelect) {
      const iso = toIso(d);
      setMultiDates(prev =>
        prev.includes(iso) ? prev.filter(i => i !== iso) : [...prev, iso]
      );
    } else {
      setSelectedDate(d);
      setDrawerOpen(true);
    }
  };

  const toggleMultiSelect = () => {
    setIsMultiSelect(v => !v);
    setMultiDates([]);
  };

  const handleScheduleSelect = async (type) => {
    const targets = isMultiSelect ? multiDates : (selectedDate ? [toIso(selectedDate)] : []);
    if (targets.length === 0) return;

    await Promise.all(targets.map(iso => {
      const docId = `${COUPLE_ID}_${iso}`;
      if (type === null) return deleteDoc(doc(db, 'workSchedules', docId));
      return setDoc(doc(db, 'workSchedules', docId), { date: iso, type, coupleId: COUPLE_ID });
    }));

    if (type !== null && currentUser) {
      const s = SCHEDULE_MAP[type];
      const dateLabel = targets.length === 1
        ? targets[0]
        : `${targets.length}개 날짜`;
      await addDoc(collection(db, 'notifications'), {
        writer: currentUser,
        type: 'schedule',
        content: `${currentUser}가 근무 스케줄을 등록했어요! ${s.emoji} ${s.label} (${s.time}) · ${dateLabel}`,
        createdAt: serverTimestamp(),
        isRead: false,
      });
    }

    setMultiDates([]);
    setIsMultiSelect(false);
    setDrawerOpen(false);
  };

  const days = getCalendarDays(viewYear, viewMonth);

  // 이번 달 집계
  const amp = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthEntries = Object.entries(schedules).filter(([k]) => k.startsWith(amp));
  const counts = SCHEDULE_TYPES.reduce((acc, s) => {
    acc[s.type] = monthEntries.filter(([, v]) => v === s.type).length;
    return acc;
  }, {});

  const currentSchedule = !isMultiSelect && selectedDate ? schedules[toIso(selectedDate)] : null;

  return (
    <Box
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* ── 제목 + 다중선택 버튼 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
        <Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '0.92rem', color: B.pants }}>
            🏥 근무 스케줄
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.3 }}>
            {SCHEDULE_TYPES.map(s => counts[s.type] > 0 && (
              <Box key={s.type} sx={{ px: '5px', py: '1.5px', borderRadius: 10, bgcolor: s.color + '18' }}>
                <Typography sx={{ fontSize: '0.52rem', color: s.color, fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif" }}>
                  {s.emoji} {counts[s.type]}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        <Stack direction="row" gap={0.8}>
          <IconButton
            size="small"
            onClick={toggleMultiSelect}
            sx={{
              width: 36, height: 36, borderRadius: '50%',
              bgcolor: isMultiSelect ? B.pants : `${B.pants}14`,
              color: isMultiSelect ? 'white' : B.pants,
              boxShadow: isMultiSelect ? `0 2px 10px ${B.pants}44` : 'none',
              '&:hover': { bgcolor: isMultiSelect ? '#6A3D96' : `${B.pants}22` },
              '&:active': { transform: 'scale(0.88)' },
              transition: 'all 0.18s',
            }}
          >
            <DateRangeIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onFlip}
            sx={{
              width: 36, height: 36, borderRadius: '50%',
              bgcolor: '#16A34A', color: 'white',
              boxShadow: '0 3px 10px #16A34A44',
              '&:hover': { bgcolor: '#15803D' },
              '&:active': { transform: 'scale(0.88)' },
              transition: 'all 0.18s',
            }}
          >
            <SwapHorizIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Stack>
      </Stack>

      {/* ── 다중선택 확정 버튼 */}
      {isMultiSelect && (
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddTaskIcon />}
          disabled={multiDates.length === 0}
          onClick={() => setDrawerOpen(true)}
          sx={{
            mb: 1.5, bgcolor: B.pants, borderRadius: 3,
            fontFamily: "'Jua',sans-serif", py: 0.9,
            boxShadow: `0 3px 10px ${B.pants}44`,
            '&:active': { transform: 'scale(0.96)' },
            '&:hover': { bgcolor: '#6A3D96' },
            '&.Mui-disabled': { bgcolor: B.pants + '55', color: 'white' },
          }}
        >
          {multiDates.length > 0 ? `${multiDates.length}개 날짜에 스케줄 적용` : '날짜를 선택하세요'}
        </Button>
      )}

      {/* ── 월 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8, px: 0.5 }}>
        <IconButton onClick={() => navigate(-1)} size="small"
          sx={{ color: B.pants, width: 34, height: 34, bgcolor: B.lavender + '80', '&:hover': { bgcolor: B.lavender }, '&:active': { transform: 'scale(0.82)' } }}>
          <ChevronLeftIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ y: slideDir * 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -slideDir * 10, opacity: 0 }}
            transition={{ duration: 0.17 }}
            style={{ textAlign: 'center' }}
          >
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.1rem', color: B.pants }}>
              {viewYear}년 {viewMonth + 1}월
            </Typography>
          </motion.div>
        </AnimatePresence>
        <IconButton onClick={() => navigate(1)} size="small"
          sx={{ color: B.pants, width: 34, height: 34, bgcolor: B.lavender + '80', '&:hover': { bgcolor: B.lavender }, '&:active': { transform: 'scale(0.82)' } }}>
          <ChevronRightIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>

      {/* ── 요일 헤더 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: '1px' }}>
        {WEEKDAYS.map((w, i) => (
          <Typography key={w} sx={{
            textAlign: 'center', fontSize: '0.67rem', fontWeight: 700,
            fontFamily: "'Noto Sans KR',sans-serif",
            color: i === 0 ? '#E24B4A99' : B.dark + '33',
            py: '4px',
          }}>
            {w}
          </Typography>
        ))}
      </Box>

      {/* ── 날짜 그리드 */}
      <Box sx={{ position: 'relative', height: 408, overflow: 'hidden' }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ x: slideDir * 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -slideDir * 32, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              willChange: 'transform, opacity',
            }}
          >
            {days.map(({ date: d, current }, idx) => (
              <ScheduleDayCell
                key={`${toIso(d)}-${current}`}
                d={d} current={current} idx={idx}
                today={today}
                schedule={current ? schedules[toIso(d)] : undefined}
                isMultiSelected={isMultiSelect && multiDates.includes(toIso(d))}
                onDateClick={handleDateClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* ── 범례 */}
      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '4px', justifyContent: 'center', mt: 1.8, overflow: 'hidden' }}>
        {SCHEDULE_TYPES.map(s => (
          <Box key={s.type} sx={{
            display: 'flex', alignItems: 'center', gap: '4px',
            px: '7px', py: '3px', borderRadius: '20px',
            bgcolor: s.bg, border: `1px solid ${s.color}22`,
            flexShrink: 0,
          }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.58rem', color: B.dark + '99', fontFamily: "'Noto Sans KR',sans-serif" }}>
              {s.emoji} <b>{s.label}</b> {s.time}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── 스케줄 선택 Drawer */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); }}
        PaperProps={{
          sx: {
            borderRadius: '22px 22px 0 0',
            bgcolor: B.cream,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.4, pb: 0.5, flexShrink: 0 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: B.pants + '33' }} />
        </Box>

        <Box sx={{ px: 2.5, pt: 0.5, pb: 1.2, borderBottom: `1px solid ${B.pants}14`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: B.pants }}>
            {isMultiSelect
              ? `🏥 ${multiDates.length}개 날짜 스케줄 설정`
              : `🏥 ${selectedDate?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 스케줄 설정`
            }
          </Typography>
          {!isMultiSelect && currentSchedule && (
            <Typography sx={{ fontSize: '0.66rem', color: '#aaa', mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
              현재: {SCHEDULE_MAP[currentSchedule]?.emoji} {currentSchedule} ({SCHEDULE_MAP[currentSchedule]?.time})
            </Typography>
          )}
          {isMultiSelect && (
            <Typography sx={{ fontSize: '0.66rem', color: '#aaa', mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
              선택한 날짜 전체에 같은 스케줄이 적용돼요
            </Typography>
          )}
        </Box>

        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
            {SCHEDULE_TYPES.map(s => {
              const active = !isMultiSelect && currentSchedule === s.type;
              return (
                <Box
                  key={s.type}
                  onClick={() => handleScheduleSelect(s.type)}
                  sx={{
                    borderRadius: 3, py: 1.5, px: 0.5,
                    bgcolor: active ? s.color : s.bg,
                    border: `2px solid ${active ? s.color : s.color + '44'}`,
                    textAlign: 'center', cursor: 'pointer',
                    boxShadow: active ? `0 4px 14px ${s.color}44` : 'none',
                    transition: 'all 0.15s',
                    '&:active': { transform: 'scale(0.95)', opacity: 0.8 },
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Typography sx={{ fontSize: '1.3rem', lineHeight: 1, mb: 0.4 }}>{s.emoji}</Typography>
                  <Typography sx={{
                    fontFamily: "'Jua',sans-serif", fontSize: '0.92rem', lineHeight: 1,
                    color: active ? 'white' : s.color,
                  }}>
                    {s.label}
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.55rem', mt: 0.3,
                    color: active ? 'rgba(255,255,255,0.8)' : s.color + '99',
                    fontFamily: "'Noto Sans KR',sans-serif",
                  }}>
                    {s.time}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {((!isMultiSelect && currentSchedule) || (isMultiSelect && multiDates.length > 0)) && (
            <Box
              onClick={() => handleScheduleSelect(null)}
              sx={{
                mt: 1.5, py: 1.2, borderRadius: 2.5, textAlign: 'center',
                border: '1.5px solid #EF444440',
                bgcolor: '#FEF2F2',
                cursor: 'pointer',
                transition: 'all 0.15s',
                '&:active': { bgcolor: '#FEE2E2', transform: 'scale(0.97)' },
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: '#EF4444', fontFamily: "'Noto Sans KR',sans-serif" }}>
                🗑️ {isMultiSelect ? `${multiDates.length}개 날짜 스케줄 삭제` : '스케줄 삭제'}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ height: 16 }} />
      </Drawer>
    </Box>
  );
}
