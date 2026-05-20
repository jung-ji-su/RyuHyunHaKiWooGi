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

const PRIORITY = ['기념일', '데이트', '개인일정'];

function DayCell({ d, current, idx, selectedDate, selectedDates, multiSelectMode, schedules, temperatures, capsules, today, onDateClick }) {
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
  const tempColor = getTempColor(avgTemp);

  const hasJ       = current && temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
  const hasH       = current && temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
  const isSynced   = hasJ && hasH;
  const hasCapsule = current && capsules.some(c => c.date === iso);

  // 카드 컬러: 우선순위 높은 카테고리 기준
  const sorted = [...daySchedules].sort((a, b) => PRIORITY.indexOf(a.category) - PRIORITY.indexOf(b.category));
  const mainColor = sorted[0] ? (CATEGORY_COLORS[sorted[0].category] || B.pants) : null;
  const isCard = daySchedules.length > 0 && current;

  // 날짜 원 스타일
  let circleBg     = 'transparent';
  let circleBorder = 'none';
  let circleShadow = 'none';

  if (isSelected && isCard) {
    circleBg = 'rgba(255,255,255,0.28)';
  } else if (isSelected) {
    circleBg     = `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`;
    circleShadow = `0 4px 18px ${B.pants}55, 0 2px 6px ${B.pants}33`;
  } else if (isMultiSel) {
    circleBg     = B.peach;
    circleBorder = `2px solid ${B.pants}77`;
  } else if (isToday) {
    circleBg     = `${B.pants}12`;
    circleBorder = `2px solid ${B.pants}`;
    circleShadow = `0 0 0 3px ${B.pants}14`;
  }

  let numColor = B.dark;
  if (isSelected)                numColor = 'white';
  else if (isToday)              numColor = B.pants;
  else if (isHoliday && current) numColor = '#E24B4A';

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
        '&:active': current ? { opacity: 0.65 } : {},
        transition: 'all 0.15s',
        ...(isCard ? {
          m: '2px',
          borderRadius: '8px',
          background: isSelected
            ? `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.97) 0%, ${mainColor}0d 100%)`,
          boxShadow: isSelected
            ? `0 4px 16px ${B.pants}44`
            : `0 3px 10px ${mainColor}28, 0 1px 4px ${mainColor}18`,
          border: isSelected ? 'none' : `1px solid ${mainColor}28`,
          zIndex: 1,
        } : {
          borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid rgba(123,79,166,0.06)`,
          borderBottom: `1px solid rgba(123,79,166,0.05)`,
        }),
      }}
    >
      {/* 날짜 원 */}
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%',
        background: circleBg,
        border: circleBorder,
        boxShadow: circleShadow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}>
        <Typography sx={{
          fontSize: '0.82rem',
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
          width: '56%', height: 3, borderRadius: 2,
          background: `linear-gradient(to right, ${tempColor}77, ${tempColor})`,
          opacity: (isSelected && !isCard) ? 0.5 : 0.85,
          mt: '2px', flexShrink: 0,
        }} />
      ) : (
        <Box sx={{ height: 5, flexShrink: 0 }} />
      )}

      {/* 일정 dot 배지 */}
      {daySchedules.length > 0 && (
        <Box sx={{ display: 'flex', gap: '2.5px', mt: '3px', justifyContent: 'center', alignItems: 'center' }}>
          {sorted.slice(0, 3).map((s, i) => (
            <Box key={i} sx={{
              width: 5, height: 5, borderRadius: '50%',
              bgcolor: isSelected ? 'rgba(255,255,255,0.85)' : (CATEGORY_COLORS[s.category] || B.pants),
              flexShrink: 0,
            }} />
          ))}
          {daySchedules.length > 3 && (
            <Typography sx={{
              fontSize: '0.42rem', lineHeight: 1,
              color: isSelected ? 'rgba(255,255,255,0.7)' : B.dark + '55',
            }}>
              +{daySchedules.length - 3}
            </Typography>
          )}
        </Box>
      )}

      {/* 커플 싱크 */}
      {isSynced && (
        <Box sx={{ position: 'absolute', top: 2, right: 1, fontSize: '8px', lineHeight: 1, pointerEvents: 'none' }}>
          💑
        </Box>
      )}
      {hasCapsule && isFuture && (
        <Box sx={{ position: 'absolute', top: 2, left: 1, fontSize: '8px', lineHeight: 1, pointerEvents: 'none' }}>
          🔒
        </Box>
      )}
    </Box>
  );
}

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
            color: B.pants, width: 36, height: 36,
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(123,79,166,0.14)',
            boxShadow: '0 2px 8px rgba(123,79,166,0.08)',
            '&:hover': { background: 'rgba(255,255,255,0.95)' },
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
              fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', lineHeight: 1,
              background: `linear-gradient(135deg, ${B.pants} 20%, #A855F7 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {viewYear}년 {viewMonth + 1}월
            </Typography>
          </motion.div>
        </AnimatePresence>

        <IconButton
          onClick={() => navigate(1)} size="small"
          sx={{
            color: B.pants, width: 36, height: 36,
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(123,79,166,0.14)',
            boxShadow: '0 2px 8px rgba(123,79,166,0.08)',
            '&:hover': { background: 'rgba(255,255,255,0.95)' },
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
            color: i === 0 ? '#E24B4A88' : B.dark + '2a',
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
      </Box>

      {/* ── 범례 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center', mt: 1.8 }}>
        {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
          <Box key={label} sx={{
            display: 'flex', alignItems: 'center', gap: '4px',
            px: '8px', py: '4px', borderRadius: '20px',
            background: `${color}0e`, border: `1px solid ${color}22`,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.57rem', color: B.dark+'77', fontFamily: "'Noto Sans KR',sans-serif" }}>
              {label}
            </Typography>
          </Box>
        ))}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '4px',
          px: '8px', py: '4px', borderRadius: '20px',
          background: '#85B7EB0e', border: '1px solid #85B7EB22',
        }}>
          <Box sx={{ width: 14, height: 4, borderRadius: 2, background: 'linear-gradient(to right,#85B7EB,#EF9F27,#E8630A)', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.57rem', color: B.dark+'77', fontFamily: "'Noto Sans KR',sans-serif" }}>
            감정온도
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
