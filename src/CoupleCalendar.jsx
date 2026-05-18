import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, query, onSnapshot,
  serverTimestamp, deleteDoc, doc, updateDoc, orderBy
} from "firebase/firestore";
import confetti from "canvas-confetti";

import ScheduleDetailDialog from "./ScheduleDetailDialog";
import DayPanel             from "./DayPanel";
import AiReport             from "./AiReport";
import CustomCalendar       from "./CustomCalendar";

import { Box, Typography, Button, Stack, Paper } from "@mui/material";
import AddTaskIcon from "@mui/icons-material/AddTask";

import { createBuriPang } from "./touchEffects";

const B = {
  pants:    '#7B4FA6', skin:    '#F5B8A0',
  cream:    '#FFF8F2', peach:   '#FFE4D4',
  lavender: '#EDE0F5', accent:  '#E8630A',
  dark:     '#3D1F00',
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
  const [date,              setDate]         = useState(new Date());
  const [activeMonth,       setActiveMonth]  = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [schedules,         setSchedules]    = useState([]);
  const [temperatures,      setTemperatures] = useState([]);
  const [diaries,           setDiaries]      = useState([]);
  const [capsules,          setCapsules]     = useState([]);
  const [isMultiSelect,     setIsMultiSelect] = useState(false);
  const [selectedDates,     setSelectedDates] = useState([]);
  const [dayPanelOpen,      setDayPanelOpen] = useState(false);
  const [scheduleOpen,      setScheduleOpen] = useState(false);
  const [reportOpen,        setReportOpen]   = useState(false);

  // ── 폼 상태 ────────────────────────────────────────────────────
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

  // ── Firestore 구독 ─────────────────────────────────────────────
  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'schedules')),   s => setSchedules(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, 'temperatures')), s => setTemperatures(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'timeCapsules')), s => setCapsules(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(collection(db, 'diaries'), orderBy('createdAt', 'desc')), s => setDiaries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── 중요 일정 confetti ────────────────────────────────────────
  useEffect(() => {
    if (scheduleOpen && !isMultiSelect && date instanceof Date) {
      const hasImportant = schedules.some(s => s.date === date.toDateString() && s.isImportant);
      if (hasImportant) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [B.pants, B.skin, '#ffffff'] });
    }
  }, [scheduleOpen, date, schedules, isMultiSelect]);

  // ── 날짜 클릭 ────────────────────────────────────────────────
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

  // ── 일정 CRUD ─────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newPlan.trim()) return;
    const targets = isMultiSelect ? selectedDates : [date.toDateString()];
    try {
      await Promise.all(targets.map(dateStr =>
        addDoc(collection(db, 'schedules'), {
          title: newPlan, category, isImportant,
          startTime, endTime, memo, location, participants,
          date: dateStr, createdAt: serverTimestamp(), writer: currentUser,
        })
      ));
      await addDoc(collection(db, 'notifications'), {
        writer: currentUser, type: 'schedule',
        count: targets.length, firstDate: targets[0],
        content: `${currentUser}가 일정을 ${targets.length}개 등록했어요! 📅`,
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

  // ── 월간 통계 ─────────────────────────────────────────────────
  const ay  = activeMonth.getFullYear();
  const am  = activeMonth.getMonth();
  const amp = `${ay}-${String(am+1).padStart(2,'0')}`;
  const now = new Date();
  const isCurrMonth = ay === now.getFullYear() && am === now.getMonth();
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

  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 3, width: '100%', boxSizing: 'border-box',
      bgcolor: '#ffffff',
      border: `1.5px solid ${B.pants}1a`,
      boxShadow: `0 2px 16px ${B.pants}0a`,
    }}>

      {/* ── 다중선택 토글 ──────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
        <Button
          variant={isMultiSelect ? 'contained' : 'outlined'}
          size="small"
          onClick={() => { setIsMultiSelect(!isMultiSelect); setSelectedDates([]); }}
          sx={{
            borderRadius: 10, fontFamily: "'Noto Sans KR',sans-serif",
            fontWeight: 700, px: 1.4, fontSize: '0.66rem', minHeight: 26,
            ...(isMultiSelect
              ? { bgcolor: B.pants, color: 'white', border: 'none', '&:hover': { bgcolor: '#6A3D96' } }
              : { color: B.pants + 'aa', borderColor: B.pants + '33', '&:hover': { bgcolor: B.lavender, borderColor: B.pants + '66' } }
            ),
          }}>
          {isMultiSelect ? '✕ 취소' : '다중선택'}
        </Button>
      </Box>

      {/* ── 다중선택 확정 버튼 ─────────────────────────────── */}
      {isMultiSelect && (
        <Button fullWidth variant="contained"
          startIcon={<AddTaskIcon />}
          disabled={selectedDates.length === 0}
          onClick={() => setScheduleOpen(true)}
          onPointerDown={e => createBuriPang(e)}
          sx={{
            mb: 1.5, bgcolor: B.pants, borderRadius: 3, fontFamily: "'Jua',sans-serif", py: 0.9,
            boxShadow: `0 3px 10px ${B.pants}44`, transition: 'transform 0.1s',
            '&:active': { transform: 'scale(0.96)' }, '&:hover': { bgcolor: '#6A3D96' },
            '&.Mui-disabled': { bgcolor: B.pants + '55', color: 'white' },
          }}>
          {selectedDates.length > 0 ? `${selectedDates.length}개 날짜에 일정 추가` : '날짜를 선택하세요'}
        </Button>
      )}

      {/* ── 커스텀 캘린더 ─────────────────────────────────── */}
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

      {/* ── 월간 인사이트 카드 ─────────────────────────────── */}
      <Stack direction="row" gap={1} sx={{ mt: 1.8 }}>
        {[
          { emoji: '📅', value: monthSchedules.length, label: '이번달 일정', color: B.pants },
          { emoji: '🌡️', value: avgTemp !== null ? `${avgTemp}°` : '—', label: '평균 온도', color: B.accent },
          { emoji: '💑', value: `${syncRate}%`, label: '커플 싱크', color: '#1D9E75' },
        ].map(({ emoji, value, label, color }) => (
          <Box key={label} sx={{
            flex: 1, bgcolor: 'white', borderRadius: 3, p: '10px 6px',
            textAlign: 'center', border: `1.5px solid ${color}18`,
            boxShadow: `0 2px 10px ${color}08`,
          }}>
            <Typography sx={{ fontSize: '1rem', lineHeight: 1, mb: 0.4 }}>{emoji}</Typography>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.05rem', color, lineHeight: 1 }}>
              {value}
            </Typography>
            <Typography sx={{ fontSize: '0.54rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif", mt: 0.3 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* ── 리포트 라인 ───────────────────────────────────── */}
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.7rem', color: B.pants + 'bb', fontFamily: "'Noto Sans KR',sans-serif", flex: 1 }}>
          {getRecapMessage(syncRate, avgTemp, monthSchedules.length)}
        </Typography>
        <Button size="small" onClick={() => setReportOpen(true)}
          sx={{
            fontSize: '0.6rem', color: B.pants + '88', fontFamily: "'Noto Sans KR',sans-serif",
            px: 0.8, py: 0.2, minHeight: 0, borderRadius: 2, flexShrink: 0,
            '&:hover': { bgcolor: B.lavender, color: B.pants },
          }}>
          📊 리포트
        </Button>
      </Box>

      {/* ── 모달들 ────────────────────────────────────────── */}
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
    </Paper>
  );
};

export default CoupleCalendar;
