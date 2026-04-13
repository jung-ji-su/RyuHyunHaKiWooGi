import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "./CoupleCalendar.css";
import { db } from "./firebase";
import { collection, addDoc, query, onSnapshot, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import confetti from "canvas-confetti";
import ScheduleDetailDialog from "./ScheduleDetailDialog";
import NewMessageDialog from "./NewMessageDialog";

import { Box, Typography, Paper, Button, Stack } from "@mui/material";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import AddTaskIcon  from "@mui/icons-material/AddTask";

import { createRipple, createBuriPang, vibrate } from "./touchEffects";
import buri6 from "./assets/KakaoTalk_20260316_132934584.png";

const HOLIDAYS = [
  "2026-01-01","2026-02-16","2026-02-17","2026-02-18",
  "2026-03-01","2026-05-05","2026-05-24","2026-06-06",
  "2026-08-15","2026-09-24","2026-09-25","2026-09-26",
  "2026-10-03","2026-10-09","2026-12-25",
];

const CATEGORY_COLORS = {
  기념일:   "#ffc628",
  데이트:   "#ff3434",
  개인일정: "#4079f3",
};

const B = {
  pants:    "#7B4FA6", skin:    "#F5B8A0",
  cream:    "#FFF8F2", peach:   "#FFE4D4",
  lavender: "#EDE0F5", accent:  "#E8630A",
  dark:     "#3D1F00",
};

const CoupleCalendar = ({ currentUser }) => {
  const [date,              setDate]              = useState(new Date());
  const [schedules,         setSchedules]         = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDates,     setSelectedDates]     = useState([]);
  const [newPlan,           setNewPlan]           = useState("");
  const [category,          setCategory]          = useState("데이트");
  const [isImportant,       setIsImportant]       = useState(false);
  const [open,              setOpen]              = useState(false);
  const [msgDialogOpen,     setMsgDialogOpen]     = useState(false);
  const [newMessages,       setNewMessages]       = useState([]);

  useEffect(() => {
    const q = query(collection(db, "schedules"));
    const unsub = onSnapshot(q, snap => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (open && !isMultiSelectMode && date instanceof Date) {
      const hasImportant = schedules.some(
        s => s.date === date.toDateString() && s.isImportant
      );
      if (hasImportant) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 },
          colors: [B.pants, B.skin, "#ffffff"] });
      }
    }
  }, [open, date, schedules, isMultiSelectMode]);

  const handleDateClick = clickedDate => {
    vibrate(15);
    const dateStr = clickedDate.toDateString();
    if (isMultiSelectMode) {
      setSelectedDates(prev =>
        prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
      );
    } else {
      setDate(clickedDate);
      setOpen(true);
    }
  };

  const handleAddSchedule = async () => {
    if (!newPlan.trim()) return;
    const targetDates = isMultiSelectMode ? selectedDates : [date.toDateString()];
    try {
      await Promise.all(
        targetDates.map(dateStr =>
          addDoc(collection(db, "schedules"), {
            title: newPlan, category, isImportant,
            date: dateStr, createdAt: serverTimestamp(), writer: currentUser,
          })
        )
      );
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, count: targetDates.length,
        firstDate: targetDates[0], createdAt: serverTimestamp(), isRead: false,
      });
      setNewPlan(""); setIsImportant(false); setOpen(false);
      setIsMultiSelectMode(false); setSelectedDates([]);
    } catch (e) { console.error("일정 등록 실패:", e); }
  };

  const handleDeleteSchedule = async id => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "schedules", id));
    }
  };

  const getTileClassName = ({ date: d, view }) => {
    if (view !== "month") return null;
    const dateStr = d.toDateString();
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const classes = [];
    if (d.getDay() === 0 || HOLIDAYS.includes(iso)) classes.push("holiday");
    if (schedules.some(s => s.date === dateStr && s.isImportant)) classes.push("important-day");
    if (isMultiSelectMode && selectedDates.includes(dateStr)) classes.push("multi-selected-tile");
    return classes.join(" ") || null;
  };

  const tileContent = ({ date: d, view }) => {
    if (view !== "month") return null;
    const daySchedules = schedules.filter(s => s.date === d.toDateString());
    if (daySchedules.length === 0) return null;
    return (
      <div className="tile-dots">
        {daySchedules.slice(0, 3).map((s, i) => (
          <div key={i} className="tile-dot-bar"
            style={{ backgroundColor: CATEGORY_COLORS[s.category] || B.pants }} />
        ))}
      </div>
    );
  };

  return (
    <Paper elevation={0} sx={{
      p: 1.5, mt: 1, borderRadius: 4, textAlign: "center",
      width: "100%", boxSizing: "border-box",
      border: `1.5px solid ${B.pants}22`,
      bgcolor: B.cream,
      backgroundImage: `radial-gradient(circle at 90% 0%, ${B.lavender}66 0%, transparent 40%)`,
      position: "relative", overflow: "visible",
    }}>

      {/* 헤더 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" gap={0.8}>
          <Box component="img" src={buri6} alt=""
            sx={{ width: 28, height: 28, objectFit: "contain",
              animation: "headBob 2.5s ease-in-out infinite",
              filter: `drop-shadow(0 2px 4px ${B.pants}44)` }} />
          <Typography sx={{ fontFamily: "'Jua', sans-serif", color: B.pants, fontSize: "0.95rem" }}>
            💕 우리들의 일정
          </Typography>
        </Stack>
        <Button
          variant={isMultiSelectMode ? "contained" : "outlined"}
          size="small"
          startIcon={<TouchAppIcon sx={{ fontSize: "0.85rem !important" }} />}
          onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedDates([]); }}
          onPointerDown={e => createRipple(e)}
          sx={{
            borderRadius: 10, fontFamily: "'Noto Sans KR', sans-serif",
            fontWeight: "bold", px: 1.4, fontSize: "0.7rem", minHeight: 32,
            position: "relative", overflow: "hidden", transition: "transform 0.1s",
            "&:active": { transform: "scale(0.93)" },
            ...(isMultiSelectMode
              ? { bgcolor: B.pants, borderColor: B.pants, color: "white", "&:hover": { bgcolor: "#6A3D96" } }
              : { borderColor: B.pants + "66", color: B.pants, "&:hover": { bgcolor: B.lavender, borderColor: B.pants } }
            ),
          }}>
          {isMultiSelectMode ? "선택 취소" : "다중선택"}
        </Button>
      </Stack>

      {/* 다중선택 — 일정 추가 버튼 */}
      {isMultiSelectMode && (
        <Button fullWidth variant="contained"
          startIcon={<AddTaskIcon />}
          onClick={() => setOpen(true)}
          onPointerDown={e => { createRipple(e); createBuriPang(e); }}
          sx={{
            mb: 1.5, bgcolor: B.pants, borderRadius: 3,
            fontFamily: "'Jua', sans-serif", py: 1,
            position: "relative", overflow: "hidden",
            boxShadow: `0 4px 10px ${B.pants}44`, transition: "transform 0.1s",
            "&:active": { transform: "scale(0.96)" }, "&:hover": { bgcolor: "#6A3D96" },
          }}>
          {selectedDates.length}개 날짜 일정 적기
        </Button>
      )}

      {/* 캘린더 */}
      <Box sx={{ width: "100%" }}>
        <Calendar
          onClickDay={handleDateClick}
          value={date}
          tileContent={tileContent}
          calendarType="gregory"
          tileClassName={getTileClassName}
          formatDay={(locale, d) => d.getDate()}
          formatShortWeekday={(locale, d) => ["일","월","화","수","목","금","토"][d.getDay()]}
          formatMonthYear={(locale, d) => `${d.getFullYear()}년 ${d.getMonth()+1}월`}
          prevLabel="‹"
          nextLabel="›"
          prev2Label={null}
          next2Label={null}
        />
      </Box>

      {/* 범례 */}
      <Stack direction="row" justifyContent="center" gap={1.5} sx={{ mt: 1.2, flexWrap: "wrap" }}>
        {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
          <Stack key={label} direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.62rem", color: B.dark+"88", fontFamily: "'Noto Sans KR',sans-serif" }}>
              {label}
            </Typography>
          </Stack>
        ))}
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Typography sx={{ fontSize: "0.62rem" }}>⭐</Typography>
          <Typography sx={{ fontSize: "0.62rem", color: B.dark+"88", fontFamily: "'Noto Sans KR',sans-serif" }}>
            중요
          </Typography>
        </Stack>
      </Stack>

      <ScheduleDetailDialog
        open={open}
        onClose={() => setOpen(false)}
        date={isMultiSelectMode
          ? `콕! 집은 ${selectedDates.length}일`
          : (date instanceof Date ? date.toLocaleDateString("ko-KR") : date)}
        selectedSchedules={isMultiSelectMode
          ? []
          : schedules.filter(s => s.date === (date instanceof Date ? date.toDateString() : date))}
        newPlan={newPlan}         setNewPlan={setNewPlan}
        category={category}      setCategory={setCategory}
        isImportant={isImportant} setIsImportant={setIsImportant}
        onAdd={handleAddSchedule}
        onDelete={handleDeleteSchedule}
      />

      <NewMessageDialog
        open={msgDialogOpen}
        onClose={() => setMsgDialogOpen(false)}
        messages={newMessages}
      />
    </Paper>
  );
};

export default CoupleCalendar;