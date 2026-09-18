import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FavoriteIcon     from '@mui/icons-material/Favorite';
import LockIcon         from '@mui/icons-material/Lock';
import { vibrate } from './touchEffects';
import { calendarColor as C, calendarFont as F, TOUCH_MIN, glassSmallSx } from './lib/calendarTokens';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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

const PRIORITY = ['기념일', '데이트', '개인일정'];

// 일정 카테고리를 색 + 모양 두 가지로 함께 표현 — 색만으로 구분하지 않기 위함(접근성).
// 작은 네온 글로우(box-shadow, blur-filter 아님)로 입체감만 살짝 추가.
function ShapeDot({ category, dim, size = 5 }) {
  const meta = C.category[category] || { hue: C.accent, shape: 'circle' };
  const bg = dim ? `${meta.hue}99` : meta.hue;
  const glow = { boxShadow: `0 0 4px ${meta.hue}99` };
  if (meta.shape === 'diamond') {
    return <Box sx={{ width: size - 1, height: size - 1, bgcolor: bg, borderRadius: '1px', transform: 'rotate(45deg)', flexShrink: 0, ...glow }} />;
  }
  if (meta.shape === 'square') {
    return <Box sx={{ width: size, height: size, bgcolor: bg, borderRadius: '1px', flexShrink: 0, ...glow }} />;
  }
  return <Box sx={{ width: size, height: size, bgcolor: bg, borderRadius: '50%', flexShrink: 0, ...glow }} />;
}

function DayCell({ d, current, selectedDate, selectedDates, multiSelectMode, schedules, temperatures, capsules, today, onDateClick }) {
  const iso = toIso(d);
  const isSelected  = !multiSelectMode && selectedDate && isSameDay(d, selectedDate);
  const isMultiSel  = multiSelectMode && selectedDates.includes(d.toDateString());
  const isToday     = isSameDay(d, today);
  const isHoliday   = d.getDay() === 0 || HOLIDAYS.includes(iso);
  const isFuture    = d > today;

  const daySchedules = current ? schedules.filter(s => s.date === d.toDateString()) : [];

  // 커플 싱크 배지 판정에만 온도 기록 존재 여부를 씀 (온도 값/색 표시는 캘린더에서 제거됨)
  const hasJ       = current && temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
  const hasH       = current && temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
  const isSynced   = hasJ && hasH;
  const hasCapsule = current && capsules.some(c => c.date === iso);

  const sorted = [...daySchedules].sort((a, b) => PRIORITY.indexOf(a.category) - PRIORITY.indexOf(b.category));

  // 날짜 원: 오늘=입체 그라데이션 채움, 선택=살짝 떠 있는 유리 배지(그림자로 표현).
  // 오늘이면서 선택이면 채운 원 + 은은한 외곽 글로우 링으로 함께 표시.
  let circleSx = {};
  let numColor = C.textPrimary;
  if (isToday) {
    circleSx = {
      background: `linear-gradient(150deg, ${C.person.jisu.from}, ${C.person.jisu.to})`,
      boxShadow: [
        `0 6px 16px ${C.accent}55`,
        'inset 0 1px 1px rgba(255,255,255,.5)',
        'inset 0 -3px 4px rgba(0,0,0,.18)',
        isSelected && !multiSelectMode ? `0 0 0 4px ${C.accentSoft}` : null,
      ].filter(Boolean).join(', '),
    };
    numColor = C.onAccent;
  } else if (isMultiSel) {
    circleSx = { bgcolor: C.accentSoft };
    numColor = C.accent;
  } else if (isSelected) {
    circleSx = {
      bgcolor: 'rgba(255,255,255,.85)',
      boxShadow: `0 6px 14px ${C.accent}28, 0 2px 4px ${C.accent}1f, inset 0 1px 0 rgba(255,255,255,.95)`,
      transform: 'translateY(-1px)',
    };
    numColor = C.accent;
  } else if (isHoliday && current) {
    numColor = C.holiday;
  }

  return (
    <Box
      onClick={() => { if (current) { vibrate(10); onDateClick(d); } }}
      sx={{
        position: 'relative',
        height: 54,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: '7px',
        pb: '5px',
        borderRadius: '14px',
        opacity: current ? 1 : 0,
        pointerEvents: current ? 'auto' : 'none',
        cursor: current ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        '&:active': current ? { transform: 'scale(0.92)' } : {},
        transition: 'transform 0.12s ease',
        // 일정이 있는 날만 살짝 뜬 유리 표면 — 선 대신 그림자로 경계를 그린다 (backdrop-filter 없음)
        ...(daySchedules.length > 0 ? {
          background: 'rgba(255,255,255,.4)',
          boxShadow: '0 3px 10px rgba(123,79,166,.10), inset 0 1px 0 rgba(255,255,255,.7)',
        } : {}),
      }}
    >
      {/* 날짜 원 */}
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s ease',
        ...circleSx,
      }}>
        <Typography sx={{
          fontSize: F.date,
          fontWeight: (isSelected || isToday || isMultiSel) ? 700 : 500,
          fontFamily: "'Noto Sans KR',sans-serif",
          lineHeight: 1,
          color: numColor,
        }}>
          {d.getDate()}
        </Typography>
      </Box>

      {/* 일정 dot + 커플싱크/타임캡슐 배지를 한 줄로 통일 — 예전엔 배지가 셀 상단에 절대위치로 떠 있어
          dot 줄과 높이가 어긋나 보였다. 이제 전부 날짜 숫자 아래 같은 행에 나란히 표시한다. */}
      {(daySchedules.length > 0 || isSynced || (hasCapsule && isFuture)) && (
        <Box sx={{ display: 'flex', gap: '3px', mt: '5px', justifyContent: 'center', alignItems: 'center' }}>
          {sorted.slice(0, 3).map((s, i) => (
            <ShapeDot key={i} category={s.category} dim={isToday} />
          ))}
          {daySchedules.length > 3 && (
            <Typography sx={{ fontSize: F.micro, lineHeight: 1, color: isToday ? C.onAccent : C.textFaint }}>
              +{daySchedules.length - 3}
            </Typography>
          )}
          {isSynced && (
            <FavoriteIcon sx={{ fontSize: 7, color: isToday ? C.onAccent : C.accent, flexShrink: 0 }} />
          )}
          {hasCapsule && isFuture && (
            <LockIcon sx={{ fontSize: 7, color: isToday ? C.onAccent : C.textFaint, flexShrink: 0 }} />
          )}
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

  const NAV_BTN_SX = {
    width: TOUCH_MIN, height: TOUCH_MIN, color: C.textSecondary,
    ...glassSmallSx(),
    '&:hover': { color: C.accent },
    '&:active': { color: C.accent, transform: 'scale(0.86)' },
    transition: 'transform .12s ease, color .12s ease',
  };

  return (
    <Box
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* ── 월 헤더: prev/title/next만 있는 하나의 행 — 제목 기준 좌우 대칭 유지, 터치 타겟 44pt */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.4 }}>
        <IconButton onClick={() => navigate(-1)} sx={NAV_BTN_SX}>
          <ChevronLeftIcon sx={{ fontSize: '1.05rem' }} />
        </IconButton>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ y: slideDir * 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -slideDir * 8, opacity: 0 }}
            transition={{ duration: 0.17, ease: 'easeOut' }}
            style={{ textAlign: 'center', minWidth: 108 }}
          >
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: F.monthTitle, lineHeight: 1,
              color: C.textPrimary,
            }}>
              {viewYear}년 {viewMonth + 1}월
            </Typography>
          </motion.div>
        </AnimatePresence>

        <IconButton onClick={() => navigate(1)} sx={NAV_BTN_SX}>
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

      {/* ── 날짜 그리드: 선 없이 여백 + 그림자 깊이로만 구조를 만든다.
           (부모인 CoupleCalendar의 글래스 패널 위에 바로 얹히므로 여기서 별도 backdrop-filter/테두리 박스를 만들지 않음) */}
      <Box sx={{ position: 'relative', height: 324, overflow: 'hidden' }}>
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
              <DayCell
                key={`${toIso(d)}-${current}`}
                d={d} current={current}
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

      {/* ── 범례: 일정 카테고리를 dot과 동일한 색+모양으로 표시. 작은 반복 요소라 backdrop-filter 없이 유리풍만.
          커플싱크(하트)·타임캡슐(자물쇠) 배지도 그리드에 표시되므로 함께 안내한다. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', mt: 1.6 }}>
        {Object.keys(C.category).map(label => (
          <Box key={label} sx={{
            display: 'flex', alignItems: 'center', gap: '5px',
            px: '9px', py: '4px', borderRadius: '20px',
            ...glassSmallSx(),
          }}>
            <ShapeDot category={label} size={6} />
            <Typography sx={{ fontSize: F.label, color: C.textSecondary, fontFamily: "'Noto Sans KR',sans-serif" }}>
              {label}
            </Typography>
          </Box>
        ))}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '5px',
          px: '9px', py: '4px', borderRadius: '20px',
          ...glassSmallSx(),
        }}>
          <FavoriteIcon sx={{ fontSize: 9, color: C.accent }} />
          <Typography sx={{ fontSize: F.label, color: C.textSecondary, fontFamily: "'Noto Sans KR',sans-serif" }}>
            커플싱크
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '5px',
          px: '9px', py: '4px', borderRadius: '20px',
          ...glassSmallSx(),
        }}>
          <LockIcon sx={{ fontSize: 9, color: C.textFaint }} />
          <Typography sx={{ fontSize: F.label, color: C.textSecondary, fontFamily: "'Noto Sans KR',sans-serif" }}>
            타임캡슐
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
