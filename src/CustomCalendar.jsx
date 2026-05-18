import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { vibrate } from './touchEffects';

const B = {
  pants: '#7B4FA6', skin: '#F5B8A0', cream: '#FFF8F2', peach: '#FFE4D4',
  lavender: '#EDE0F5', accent: '#E8630A', dark: '#3D1F00',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CATEGORY_COLORS = {
  기념일: '#ffc628',
  데이트: '#ff3434',
  개인일정: '#4079f3',
};

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

function getTempColor(avg) {
  if (avg === null) return null;
  const v = Math.round(avg);
  if (v === 0)  return '#aaa';
  if (v < 20)   return '#B4B2A9';
  if (v < 40)   return '#85B7EB';
  if (v < 60)   return '#EF9F27';
  if (v < 80)   return '#7B4FA6';
  return         '#E8630A';
}

// ── 셀 ──────────────────────────────────────────────────────────
function DayCell({ d, current, selectedDate, selectedDates, multiSelectMode, schedules, temperatures, capsules, today, onDateClick }) {
  const iso = toIso(d);
  const isSelected  = !multiSelectMode && selectedDate && isSameDay(d, selectedDate);
  const isMultiSel  = multiSelectMode && selectedDates.includes(d.toDateString());
  const isToday     = isSameDay(d, today);
  const isHoliday   = d.getDay() === 0 || HOLIDAYS.includes(iso);
  const isFuture    = d > today;

  const daySchedules = current ? schedules.filter(s => s.date === d.toDateString()) : [];
  const dayTemps     = current ? temperatures.filter(t => t.date === iso && !t.isPenalty) : [];
  const avgTemp      = dayTemps.length
    ? Math.round(dayTemps.reduce((s, t) => s + parseInt(t.temp ?? 0), 0) / dayTemps.length)
    : null;
  const tempColor    = getTempColor(avgTemp);

  const hasJ       = current && temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
  const hasH       = current && temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
  const isSynced   = hasJ && hasH;
  const hasCapsule = current && capsules.some(c => c.date === iso);

  let circleBg = 'transparent';
  if (isSelected)      circleBg = B.pants;
  else if (isMultiSel) circleBg = B.peach;
  else if (isToday)    circleBg = `${B.pants}1a`;

  let circleBorder = 'none';
  if (isToday && !isSelected)  circleBorder = `2px solid ${B.pants}`;
  else if (isMultiSel)         circleBorder = `2px solid ${B.pants}77`;

  let numColor = B.dark;
  if (isSelected)                numColor = 'white';
  else if (isToday)              numColor = B.pants;
  else if (isHoliday && current) numColor = '#E24B4A';

  const visibleBars = daySchedules.slice(0, 2);
  const extraCount  = daySchedules.length - 2;

  return (
    <Box
      onClick={() => { if (current) { vibrate(10); onDateClick(d); } }}
      sx={{
        position: 'relative',
        height: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: '7px',
        pb: '5px',
        opacity: current ? 1 : 0,
        pointerEvents: current ? 'auto' : 'none',
        cursor: current ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        '&:active': current ? { opacity: 0.55 } : {},
      }}
    >
      {/* 날짜 원 */}
      <Box sx={{
        width: 34, height: 34, borderRadius: '50%',
        bgcolor: circleBg, border: circleBorder,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: isSelected ? `0 3px 12px ${B.pants}55` : 'none',
        transition: 'background 0.15s, box-shadow 0.15s',
      }}>
        <Typography sx={{
          fontSize: '0.84rem',
          fontWeight: (isSelected || isToday || isMultiSel) ? 700 : 500,
          fontFamily: "'Noto Sans KR',sans-serif",
          lineHeight: 1,
          color: numColor,
        }}>
          {d.getDate()}
        </Typography>
      </Box>

      {/* 감정 온도 바 */}
      {tempColor && current ? (
        <Box sx={{
          width: '54%', height: 2.5, borderRadius: 2,
          bgcolor: tempColor, opacity: isSelected ? 0.5 : 0.85,
          mt: '2px', flexShrink: 0,
        }} />
      ) : (
        <Box sx={{ height: 4.5, flexShrink: 0 }} />
      )}

      {/* 일정 컬러 바 */}
      {daySchedules.length > 0 && (
        <Box sx={{ width: '82%', mt: '2px', display: 'flex', flexDirection: 'column', gap: '1.5px', flexShrink: 0 }}>
          {visibleBars.map((s, i) => (
            <Box key={i} sx={{
              height: 3, borderRadius: 2,
              bgcolor: isSelected ? 'rgba(255,255,255,0.8)' : (CATEGORY_COLORS[s.category] || B.pants),
            }} />
          ))}
          {extraCount > 0 && (
            <Typography sx={{
              fontSize: '0.44rem', lineHeight: 1, textAlign: 'center',
              color: isSelected ? 'rgba(255,255,255,0.75)' : B.dark + '55',
              mt: '0.5px',
            }}>
              +{extraCount}
            </Typography>
          )}
        </Box>
      )}

      {/* 커플 싱크 */}
      {isSynced && (
        <Box sx={{ position: 'absolute', top: 3, right: 1, fontSize: '7px', lineHeight: 1, pointerEvents: 'none' }}>
          💑
        </Box>
      )}

      {/* 타임캡슐 */}
      {hasCapsule && isFuture && (
        <Box sx={{ position: 'absolute', top: 3, left: 1, fontSize: '7px', lineHeight: 1, pointerEvents: 'none' }}>
          🔒
        </Box>
      )}
    </Box>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function CustomCalendar({
  selectedDate,
  selectedDates = [],
  schedules     = [],
  temperatures  = [],
  capsules      = [],
  multiSelectMode = false,
  onDateClick,
  onMonthChange,
}) {
  const today = useRef(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }).current();

  const initDate = selectedDate ?? today;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [slideDir,  setSlideDir]  = useState(1);
  const touchX = useRef(null);

  const navigate = (dir) => {
    setSlideDir(dir);
    let y = viewYear, m = viewMonth + dir;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setViewYear(y); setViewMonth(m);
    onMonthChange?.(new Date(y, m, 1));
    vibrate(8);
  };

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 44) navigate(dx > 0 ? -1 : 1);
    touchX.current = null;
  };

  const days = getCalendarDays(viewYear, viewMonth);

  return (
    <Box
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* ── 월 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8, px: 0.5 }}>
        <IconButton
          onClick={() => navigate(-1)} size="small"
          sx={{
            color: B.pants, width: 34, height: 34,
            bgcolor: B.lavender + '80',
            '&:hover': { bgcolor: B.lavender },
            '&:active': { transform: 'scale(0.82)' },
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: '1rem' }} />
        </IconButton>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ y: slideDir * 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -slideDir * 10, opacity: 0 }}
            transition={{ duration: 0.17, ease: 'easeOut' }}
            style={{ textAlign: 'center' }}
          >
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: '1.1rem',
              color: B.pants, lineHeight: 1,
            }}>
              {viewYear}년 {viewMonth + 1}월
            </Typography>
          </motion.div>
        </AnimatePresence>

        <IconButton
          onClick={() => navigate(1)} size="small"
          sx={{
            color: B.pants, width: 34, height: 34,
            bgcolor: B.lavender + '80',
            '&:hover': { bgcolor: B.lavender },
            '&:active': { transform: 'scale(0.82)' },
          }}
        >
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${viewYear}-${viewMonth}`}
          initial={{ x: slideDir * 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -slideDir * 40, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}
        >
          {days.map(({ date: d, current }, idx) => (
            <DayCell
              key={`${toIso(d)}-${current}`}
              d={d} current={current} idx={idx}
              selectedDate={selectedDate}
              selectedDates={selectedDates}
              multiSelectMode={multiSelectMode}
              schedules={schedules}
              temperatures={temperatures}
              capsules={capsules}
              today={today}
              onDateClick={onDateClick}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── 범례 (심플 pill) */}
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: '6px',
        justifyContent: 'center', mt: 1.8,
      }}>
        {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
          <Box key={label} sx={{
            display: 'flex', alignItems: 'center', gap: '5px',
            px: '8px', py: '4px', borderRadius: '20px',
            bgcolor: color + '14',
          }}>
            <Box sx={{ width: 14, height: 3, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.58rem', color: B.dark+'77', fontFamily: "'Noto Sans KR',sans-serif" }}>
              {label}
            </Typography>
          </Box>
        ))}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '5px',
          px: '8px', py: '4px', borderRadius: '20px',
          bgcolor: '#85B7EB14',
        }}>
          <Box sx={{ width: 14, height: 3, borderRadius: 2, background: 'linear-gradient(to right,#85B7EB,#EF9F27,#E8630A)', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.58rem', color: B.dark+'77', fontFamily: "'Noto Sans KR',sans-serif" }}>
            감정온도
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '4px',
          px: '8px', py: '4px', borderRadius: '20px',
          bgcolor: '#cc88ff14',
        }}>
          <Typography sx={{ fontSize: '0.62rem', lineHeight: 1 }}>💑</Typography>
          <Typography sx={{ fontSize: '0.58rem', color: B.dark+'77', fontFamily: "'Noto Sans KR',sans-serif" }}>
            함께 기록
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
