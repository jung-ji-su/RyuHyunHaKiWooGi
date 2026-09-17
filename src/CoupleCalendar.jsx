import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, query, onSnapshot,
  serverTimestamp, deleteDoc, doc, updateDoc, orderBy, limit
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

import ScheduleDetailDialog from "./ScheduleDetailDialog";
import DayPanel             from "./DayPanel";
import AiReport             from "./AiReport";
import CustomCalendar       from "./CustomCalendar";
import WorkScheduleCalendar from "./WorkScheduleCalendar";

import { Box, Typography, Button, Stack, Paper, IconButton } from "@mui/material";
import AddTaskIcon          from "@mui/icons-material/AddTask";
import SwapHorizIcon        from "@mui/icons-material/SwapHoriz";
import DateRangeIcon        from "@mui/icons-material/DateRange";
import EventIcon            from "@mui/icons-material/Event";
import DeviceThermostatIcon from "@mui/icons-material/DeviceThermostat";
import FavoriteIcon         from "@mui/icons-material/Favorite";
import BarChartIcon         from "@mui/icons-material/BarChart";

import { createBuriPang } from "./touchEffects";
import { calendarColor as C, calendarRadius, calendarFont as F, TOUCH_MIN } from "./lib/calendarTokens";

const B = {
  pants:    '#7B4FA6', skin:    '#F5B8A0',
  cream:    '#FFF8F2', peach:   '#FFE4D4',
  lavender: '#EDE0F5', accent:  '#E8630A',
  dark:     '#3D1F00',
};

// 단일 카드 — 바깥 그라데이션 wrap + 글래스 카드의 3중 중첩을 한 겹으로 정리
const CARD_SX = {
  p: '14px 10px 16px', borderRadius: `${calendarRadius.lg}px`, boxSizing: 'border-box',
  bgcolor: C.surface,
  border: `1px solid ${C.border}`,
  boxShadow: '0 2px 14px rgba(46,42,56,0.06)',
};

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getRecapMessage(syncRate, avgTemp, scheduleCount) {
  if (syncRate >= 80) return `💑 싱크율 ${syncRate}%! 완벽한 한 달이에요 🎉`;
  if (avgTemp !== null && avgTemp >= 75) return `🥰 평균 온도 ${avgTemp}°! 행복한 달이에요`;
  if (scheduleCount >= 10) return `📅 ${scheduleCount}개 일정! 알차게 보내고 있어요`;
  if (syncRate >= 50) return `💜 함께 기록한 날이 ${syncRate}%예요`;
  if (avgTemp !== null && avgTemp >= 50) return `😊 평균 온도 ${avgTemp}° — 괜찮은 한 달이에요`;
  return '✨ 오늘도 감정 온도 기록해봐요!';
}

const CoupleCalendar = ({ currentUser }) => {
  const [date,          setDate]         = useState(new Date());
  const [activeMonth,   setActiveMonth]  = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [schedules,     setSchedules]    = useState([]);
  const [temperatures,  setTemperatures] = useState([]);
  const [diaries,       setDiaries]      = useState([]);
  const [capsules,      setCapsules]     = useState([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [dayPanelOpen,  setDayPanelOpen] = useState(false);
  const [scheduleOpen,  setScheduleOpen] = useState(false);
  const [reportOpen,    setReportOpen]   = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const flipDirRef = useRef(1);

  const [newPlan,      setNewPlan]      = useState('');
  const [category,     setCategory]     = useState('데이트');
  const [isImportant,  setIsImportant]  = useState(false);
  const [startTime,    setStartTime]    = useState('');
  const [endTime,      setEndTime]      = useState('');
  const [memo,         setMemo]         = useState('');
  const [location,     setLocation]     = useState('');
  const [participants, setParticipants] = useState('둘다');
  const [editTarget,   setEditTarget]   = useState(null);

  const resetForm = () => {
    setNewPlan(''); setCategory('데이트'); setIsImportant(false);
    setStartTime(''); setEndTime(''); setMemo('');
    setLocation(''); setParticipants('둘다'); setEditTarget(null);
  };

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'schedules'),    orderBy('createdAt', 'desc'),  limit(500)), s => setSchedules(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, 'temperatures'), orderBy('date', 'desc'),       limit(400)), s => setTemperatures(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'timeCapsules'), orderBy('createdAt', 'desc'), limit(100)), s => setCapsules(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(collection(db, 'diaries'),      orderBy('createdAt', 'desc'), limit(200)), s => setDiaries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (scheduleOpen && !isMultiSelect && date instanceof Date) {
      const hasImportant = schedules.some(s => s.date === date.toDateString() && s.isImportant);
      if (hasImportant) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [B.pants, B.skin, '#ffffff'] });
    }
  }, [scheduleOpen, date, schedules, isMultiSelect]);

  const handleDateClick = (clickedDate) => {
    const dateStr = clickedDate.toDateString();
    if (isMultiSelect) {
      setSelectedDates(prev =>
        prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
      );
    } else {
      setDate(clickedDate);
      resetForm();
      setDayPanelOpen(true);
    }
  };

  const handleAdd = async () => {
    if (!newPlan.trim()) return;
    const targets = isMultiSelect ? selectedDates : [date.toDateString()];
    try {
      await Promise.all(targets.map(dateStr =>
        addDoc(collection(db, 'schedules'), {
          title: newPlan, category, isImportant,
          startTime, endTime, memo, location, participants,
          date: dateStr, dateIso: toIso(new Date(dateStr)), // [수정] date는 toDateString이라 정렬 불가 — ISO 정렬용 필드 병행 저장
          createdAt: serverTimestamp(), writer: currentUser,
        })
      ));
      await addDoc(collection(db, 'notifications'), {
        writer: currentUser, type: 'schedule',
        count: targets.length, firstDate: targets[0],
        content: targets.length === 1
          ? `${currentUser}가 ${new Date(targets[0]).getMonth()+1}월 ${new Date(targets[0]).getDate()}일 일정을 등록했어요! 📅`
          : `${currentUser}가 ${new Date(targets[0]).getMonth()+1}월 ${new Date(targets[0]).getDate()}일 외 ${targets.length-1}개 일정을 등록했어요! 📅`,
        createdAt: serverTimestamp(), isRead: false,
      });
      resetForm();
      setIsMultiSelect(false);
      setSelectedDates([]);
      setScheduleOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleEdit = async () => {
    if (!editTarget || !newPlan.trim()) return;
    try {
      await updateDoc(doc(db, 'schedules', editTarget), {
        title: newPlan, category, isImportant,
        startTime, endTime, memo, location, participants,
      });
      resetForm();
    } catch (e) { console.error(e); }
  };

  const handleStartEdit = (s) => {
    setEditTarget(s.id);
    setNewPlan(s.title || ''); setCategory(s.category || '데이트');
    setIsImportant(s.isImportant || false); setStartTime(s.startTime || '');
    setEndTime(s.endTime || ''); setMemo(s.memo || '');
    setLocation(s.location || ''); setParticipants(s.participants || '둘다');
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'schedules', id));
      if (editTarget === id) resetForm();
    }
  };

  const handleFlip = () => {
    flipDirRef.current = showSchedule ? -1 : 1;
    setShowSchedule(v => !v);
    setIsMultiSelect(false);
    setSelectedDates([]);
  };

  const handleMultiToggle = () => {
    setIsMultiSelect(v => !v);
    setSelectedDates([]);
  };

  const ay  = activeMonth.getFullYear();
  const am  = activeMonth.getMonth();
  const amp = `${ay}-${String(am+1).padStart(2,'0')}`;
  const now = new Date();
  const isCurrMonth  = ay === now.getFullYear() && am === now.getMonth();
  const daysInPeriod = isCurrMonth ? now.getDate() : new Date(ay, am+1, 0).getDate();

  const monthSchedules = schedules.filter(s => { const sd = new Date(s.date); return sd.getFullYear() === ay && sd.getMonth() === am; });
  const monthTemps     = temperatures.filter(t => t.date?.startsWith(amp) && !t.isPenalty && parseInt(t.temp ?? 0) > 0);
  const avgTemp        = monthTemps.length ? Math.round(monthTemps.reduce((s, t) => s + parseInt(t.temp), 0) / monthTemps.length) : null;

  let syncDays = 0;
  for (let day = 1; day <= daysInPeriod; day++) {
    const iso = `${ay}-${String(am+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hj = temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
    const hh = temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
    if (hj && hh) syncDays++;
  }
  const syncRate = daysInPeriod > 0 ? Math.round((syncDays / daysInPeriod) * 100) : 0;

  const selectedDateSchedules = schedules
    .filter(s => s.date === (date instanceof Date ? date.toDateString() : date))
    .sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1; if (b.startTime) return 1; return 0;
    });

  const flipVariants = {
    initial: (dir) => ({ rotateY: dir * 90, opacity: 0 }),
    animate: { rotateY: 0, opacity: 1 },
    exit:    (dir) => ({ rotateY: dir * -90, opacity: 0 }),
  };

  const ICON_BTN_SX = (active) => ({
    width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: '50%',
    bgcolor: active ? C.accent : 'transparent',
    color: active ? C.onAccent : C.textSecondary,
    border: active ? 'none' : `1px solid ${C.border}`,
    '&:hover': { bgcolor: active ? C.accent : C.divider },
    '&:active': { transform: 'scale(0.88)' },
    transition: 'all 0.18s ease',
  });

  return (
    <Box sx={{ perspective: '1200px' }}>
      <AnimatePresence mode="wait" initial={false} custom={flipDirRef.current}>
        {!showSchedule ? (
          <motion.div
            key="couple"
            custom={flipDirRef.current}
            variants={flipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.32, ease: 'easeInOut' }}
            style={{ transformOrigin: 'center center', willChange: 'transform, opacity' }}
          >
            <Paper elevation={0} sx={CARD_SX}>

              {/* 아이콘 버튼 영역 */}
              <Stack direction="row" justifyContent="flex-end" gap={0.8} sx={{ mb: 1 }}>
                <IconButton onClick={handleMultiToggle} sx={ICON_BTN_SX(isMultiSelect)}>
                  <DateRangeIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
                <IconButton onClick={handleFlip} sx={ICON_BTN_SX(true)}>
                  <SwapHorizIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </Stack>

              {/* 다중선택 확정 버튼 */}
              {isMultiSelect && (
                <Button fullWidth variant="contained"
                  startIcon={<AddTaskIcon />}
                  disabled={selectedDates.length === 0}
                  onClick={() => setScheduleOpen(true)}
                  onPointerDown={e => createBuriPang(e)}
                  sx={{
                    mb: 1.5, minHeight: TOUCH_MIN, borderRadius: 3, fontFamily: "'Jua',sans-serif",
                    bgcolor: C.accent,
                    boxShadow: `0 4px 16px ${C.accent}44`,
                    '&:hover': { bgcolor: C.accent },
                    '&:active': { transform: 'scale(0.96)' },
                    '&.Mui-disabled': { bgcolor: C.accent + '55', color: 'white' },
                  }}>
                  {selectedDates.length > 0 ? `${selectedDates.length}개 날짜에 일정 추가` : '날짜를 선택하세요'}
                </Button>
              )}

              {/* 커스텀 캘린더 */}
              <CustomCalendar
                selectedDate={date}
                selectedDates={selectedDates}
                schedules={schedules}
                temperatures={temperatures}
                capsules={capsules}
                multiSelectMode={isMultiSelect}
                onDateClick={handleDateClick}
                onMonthChange={setActiveMonth}
              />

              {/* 월간 인사이트 카드 — 색은 카테고리 구분에만 쓰므로 여기는 중성 톤 */}
              <Stack direction="row" gap={1} sx={{ mt: 1.6 }}>
                {[
                  { Icon: EventIcon,            value: monthSchedules.length,               label: '이번달 일정' },
                  { Icon: DeviceThermostatIcon, value: avgTemp !== null ? `${avgTemp}°` : '—', label: '평균 온도' },
                  { Icon: FavoriteIcon,         value: `${syncRate}%`,                        label: '커플 싱크' },
                ].map((item) => (
                  <Box key={item.label} sx={{
                    flex: 1,
                    bgcolor: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: `${calendarRadius.md}px`, p: '10px 6px',
                    textAlign: 'center',
                  }}>
                    <item.Icon sx={{ fontSize: '1.05rem', color: C.textSecondary, mb: 0.3 }} />
                    <Typography sx={{
                      fontFamily: "'Jua',sans-serif", fontSize: '1.02rem', lineHeight: 1,
                      color: C.textPrimary,
                    }}>
                      {item.value}
                    </Typography>
                    <Typography sx={{ fontSize: F.micro, color: C.textFaint, fontFamily: "'Noto Sans KR',sans-serif", mt: 0.3 }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {/* 리포트 라인 */}
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.7rem', color: C.textSecondary, fontFamily: "'Noto Sans KR',sans-serif", flex: 1 }}>
                  {getRecapMessage(syncRate, avgTemp, monthSchedules.length)}
                </Typography>
                <Button size="small" startIcon={<BarChartIcon sx={{ fontSize: '0.85rem' }} />} onClick={() => setReportOpen(true)}
                  sx={{
                    fontSize: '0.66rem', color: C.accent, fontFamily: "'Noto Sans KR',sans-serif",
                    px: 1, minWidth: TOUCH_MIN, minHeight: TOUCH_MIN, borderRadius: 2, flexShrink: 0,
                    '&:hover': { bgcolor: C.accentSoft },
                  }}>
                  리포트
                </Button>
              </Box>
            </Paper>
          </motion.div>
        ) : (
          <motion.div
            key="schedule"
            custom={flipDirRef.current}
            variants={flipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.32, ease: 'easeInOut' }}
            style={{ transformOrigin: 'center center', willChange: 'transform, opacity' }}
          >
            <Paper elevation={0} sx={CARD_SX}>
              <WorkScheduleCalendar onFlip={handleFlip} />
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달들 */}
      <DayPanel
        open={dayPanelOpen}
        onClose={() => setDayPanelOpen(false)}
        date={date}
        schedules={selectedDateSchedules}
        temperatures={temperatures}
        diaries={diaries}
        capsules={capsules}
        currentUser={currentUser}
        onAddSchedule={() => setScheduleOpen(true)}
      />
      <AiReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        temperatures={temperatures}
        diaries={diaries}
        schedules={schedules}
      />
      <ScheduleDetailDialog
        open={scheduleOpen}
        onClose={() => { resetForm(); setScheduleOpen(false); }}
        date={isMultiSelect ? `콕! 집은 ${selectedDates.length}일` : (date instanceof Date ? date.toLocaleDateString('ko-KR') : date)}
        selectedSchedules={isMultiSelect ? [] : selectedDateSchedules}
        newPlan={newPlan}           setNewPlan={setNewPlan}
        category={category}         setCategory={setCategory}
        isImportant={isImportant}   setIsImportant={setIsImportant}
        startTime={startTime}       setStartTime={setStartTime}
        endTime={endTime}           setEndTime={setEndTime}
        memo={memo}                 setMemo={setMemo}
        location={location}         setLocation={setLocation}
        participants={participants}  setParticipants={setParticipants}
        editTarget={editTarget}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onStartEdit={handleStartEdit}
        onCancelEdit={resetForm}
        onDelete={handleDelete}
      />
    </Box>
  );
};

export default CoupleCalendar;
