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
import {
  calendarColor as C, calendarFont as F, TOUCH_MIN,
  glass, glassSmallSx,
} from './lib/calendarTokens';

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

// CustomCalendar.jsx의 day cell과 같은 문법: 선 없이 여백+그림자로 구조를 만들고,
// 일정 있는 날만 살짝 뜬 유리 표면, 오늘은 입체 그라데이션 원으로 표시.
function ScheduleDayCell({ d, current, today, schedule, isMultiSelected, onDateClick }) {
  const iso = toIso(d);
  const isToday   = isSameDay(d, today);
  const isHoliday = d.getDay() === 0 || HOLIDAYS.includes(iso);
  const sched     = schedule ? SCHEDULE_MAP[schedule] : null;
  const hasSched  = !!(sched && current);

  let circleSx = {};
  let numColor = C.textPrimary;
  if (isMultiSelected) {
    circleSx = { bgcolor: C.accent };
    numColor = C.onAccent;
  } else if (isToday) {
    circleSx = {
      background: `linear-gradient(150deg, ${C.person.jisu.from}, ${C.person.jisu.to})`,
      boxShadow: `0 6px 16px ${C.accent}55, inset 0 1px 1px rgba(255,255,255,.5), inset 0 -3px 4px rgba(0,0,0,.18)`,
    };
    numColor = C.onAccent;
  } else if (isHoliday && current) {
    numColor = C.holiday;
  }

  return (
    <Box
      onClick={() => { if (current) { vibrate(10); onDateClick(d); } }}
      sx={{
        position: 'relative',
        height: 62,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pt: '6px', pb: '4px',
        borderRadius: '14px',
        opacity: current ? 1 : 0,
        pointerEvents: current ? 'auto' : 'none',
        cursor: current ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        '&:active': current ? { transform: 'scale(0.92)' } : {},
        transition: 'transform .12s ease',
        ...(hasSched ? {
          background: isMultiSelected ? `${C.accent}1f` : 'rgba(255,255,255,.4)',
          boxShadow: isMultiSelected
            ? `inset 0 0 0 2px ${C.accent}55`
            : '0 3px 10px rgba(123,79,166,.10), inset 0 1px 0 rgba(255,255,255,.7)',
        } : (isMultiSelected ? { background: `${C.accent}14` } : {})),
      }}
    >
      {/* 날짜 원 */}
      <Box sx={{
        width: 30, height: 30, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all .2s ease',
        ...circleSx,
      }}>
        <Typography sx={{
          fontSize: '0.8rem',
          fontWeight: (isMultiSelected || isToday) ? 700 : 500,
          fontFamily: "'Noto Sans KR',sans-serif",
          lineHeight: 1,
          color: numColor,
        }}>
          {d.getDate()}
        </Typography>
      </Box>

      {/* 근무 pill */}
      {sched ? (
        <>
          <Box sx={{
            mt: '4px', px: '6px', py: '1.5px', borderRadius: 10,
            bgcolor: isMultiSelected ? `${sched.color}cc` : sched.color,
            boxShadow: `0 2px 6px ${sched.color}40`,
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

  const ICON_BTN_SX = (active, activeColor) => ({
    width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: '50%',
    ...(active
      ? {
          background: `linear-gradient(150deg, ${activeColor}, ${activeColor})`,
          color: '#fff',
          boxShadow: `0 4px 14px ${activeColor}55, inset 0 1px 1px rgba(255,255,255,.4)`,
        }
      : { ...glassSmallSx(), color: C.textSecondary }
    ),
    '&:active': { transform: 'scale(0.88)' },
    transition: 'transform .15s ease, box-shadow .15s ease',
  });

  return (
    <Box
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* ── 제목 + 다중선택 버튼 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
        <Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '0.92rem', color: C.textPrimary }}>
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
          <IconButton onClick={toggleMultiSelect} sx={ICON_BTN_SX(isMultiSelect, C.accent)}>
            <DateRangeIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          <IconButton onClick={onFlip} sx={ICON_BTN_SX(true, '#16A34A')}>
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
            mb: 1.5, minHeight: TOUCH_MIN, borderRadius: 3,
            fontFamily: "'Jua',sans-serif",
            background: `linear-gradient(150deg, ${C.person.jisu.from}, ${C.accent})`,
            boxShadow: `0 8px 22px ${C.accent}40, inset 0 1px 1px rgba(255,255,255,.4)`,
            '&:active': { transform: 'scale(0.96)' },
            '&.Mui-disabled': { bgcolor: C.accent + '55', color: 'white' },
          }}
        >
          {multiDates.length > 0 ? `${multiDates.length}개 날짜에 스케줄 적용` : '날짜를 선택하세요'}
        </Button>
      )}

      {/* ── 월 헤더: CustomCalendar와 동일한 대칭 구조(prev/title/next만 있는 행), 44pt 터치 타겟 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.4 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ width: TOUCH_MIN, height: TOUCH_MIN, color: C.textSecondary, ...glassSmallSx(), '&:active': { transform: 'scale(0.86)' } }}>
          <ChevronLeftIcon sx={{ fontSize: '1.05rem' }} />
        </IconButton>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ y: slideDir * 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -slideDir * 8, opacity: 0 }}
            transition={{ duration: 0.17 }}
            style={{ textAlign: 'center', minWidth: 108 }}
          >
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: F.monthTitle, color: C.textPrimary, lineHeight: 1 }}>
              {viewYear}년 {viewMonth + 1}월
            </Typography>
          </motion.div>
        </AnimatePresence>
        <IconButton onClick={() => navigate(1)} sx={{ width: TOUCH_MIN, height: TOUCH_MIN, color: C.textSecondary, ...glassSmallSx(), '&:active': { transform: 'scale(0.86)' } }}>
          <ChevronRightIcon sx={{ fontSize: '1.05rem' }} />
        </IconButton>
      </Box>

      {/* ── 요일 헤더 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: '1px' }}>
        {WEEKDAYS.map((w, i) => (
          <Typography key={w} sx={{
            textAlign: 'center', fontSize: F.weekday, fontWeight: 700,
            fontFamily: "'Noto Sans KR',sans-serif",
            color: i === 0 ? C.holiday + 'aa' : C.textFaint,
            py: '4px',
          }}>
            {w}
          </Typography>
        ))}
      </Box>

      {/* ── 날짜 그리드: 선 없이 여백+그림자로만 구조를 만든다(부모 글래스 패널 위에 바로 얹힘) */}
      <Box sx={{ position: 'relative', height: 372, overflow: 'hidden' }}>
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
              gap: '2px',
              willChange: 'transform, opacity',
            }}
          >
            {days.map(({ date: d, current }) => (
              <ScheduleDayCell
                key={`${toIso(d)}-${current}`}
                d={d} current={current}
                today={today}
                schedule={current ? schedules[toIso(d)] : undefined}
                isMultiSelected={isMultiSelect && multiDates.includes(toIso(d))}
                onDateClick={handleDateClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* ── 범례: 작은 반복 요소라 backdrop-filter 없이 유리풍만 */}
      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', justifyContent: 'center', mt: 1.6, overflow: 'hidden' }}>
        {SCHEDULE_TYPES.map(s => (
          <Box key={s.type} sx={{
            display: 'flex', alignItems: 'center', gap: '4px',
            px: '8px', py: '4px', borderRadius: '20px',
            ...glassSmallSx(),
            flexShrink: 0,
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.color, boxShadow: `0 0 4px ${s.color}99`, flexShrink: 0 }} />
            <Typography sx={{ fontSize: F.label, color: C.textSecondary, fontFamily: "'Noto Sans KR',sans-serif" }}>
              {s.emoji} <b>{s.label}</b> {s.time}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── 스케줄 선택 Drawer — 유리 바텀시트 톤 (CoupleCalendar 카드 1장 + 이 시트 1장 = 최대 2장, 예산 내) */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); }}
        PaperProps={{
          sx: {
            borderRadius: '24px 24px 0 0',
            background: glass.sheetBackground,
            backdropFilter: glass.sheetBlur,
            WebkitBackdropFilter: glass.sheetBlur,
            boxShadow: glass.sheetShadow,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.4, pb: 0.5, flexShrink: 0 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: C.accent + '33' }} />
        </Box>

        <Box sx={{ px: 2.5, pt: 0.5, pb: 1.2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: C.textPrimary }}>
            {isMultiSelect
              ? `🏥 ${multiDates.length}개 날짜 스케줄 설정`
              : `🏥 ${selectedDate?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 스케줄 설정`
            }
          </Typography>
          {!isMultiSelect && currentSchedule && (
            <Typography sx={{ fontSize: '0.66rem', color: C.textFaint, mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
              현재: {SCHEDULE_MAP[currentSchedule]?.emoji} {currentSchedule} ({SCHEDULE_MAP[currentSchedule]?.time})
            </Typography>
          )}
          {isMultiSelect && (
            <Typography sx={{ fontSize: '0.66rem', color: C.textFaint, mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
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
                    borderRadius: 3, py: 1.5, px: 0.5, minHeight: TOUCH_MIN,
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
              onClick={() => {
                const msg = isMultiSelect
                  ? `선택한 ${multiDates.length}개 날짜의 스케줄을 삭제하시겠습니까?`
                  : '정말 삭제하시겠습니까?';
                if (window.confirm(msg)) handleScheduleSelect(null);
              }}
              sx={{
                mt: 1.5, py: 1.2, borderRadius: 2.5, textAlign: 'center', minHeight: TOUCH_MIN,
                border: '1.5px solid #EF444440',
                bgcolor: '#FEF2F2cc',
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
