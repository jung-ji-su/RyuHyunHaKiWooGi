import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Box, Typography, Stack, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import confetti from "canvas-confetti";
import { shakeElement, vibrate } from "./touchEffects";

import buri6 from "./assets/KakaoTalk_20260316_132934584.png";
import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png";
import buri9 from "./assets/KakaoTalk_20260316_133007779.png";
import meImg  from "./assets/JS.jpg";
import gfImg  from "./assets/HY.jpg";

const B = {
  pants:   "#7B4FA6", skin:    "#F5B8A0",
  cream:   "#FFF8F2", peach:   "#FFE4D4",
  lavender:"#EDE0F5", accent:  "#E8630A",
  dark:    "#3D1F00",
};

const CATEGORY_META = {
  기념일:   { color: "#7B4FA6", bg: "#EDE0F5", emoji: "💜" },
  데이트:   { color: "#E8630A", bg: "#FFE4D4", emoji: "🧡" },
  개인일정: { color: "#378ADD", bg: "#E6F1FB", emoji: "📌" },
};

// ── 유틸 ─────────────────────────────────────────────────────────
function parseDate(dateStr) { return new Date(dateStr); }

function getDDay(dateStr) {
  const d = parseDate(dateStr);
  const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  const days = ["일","월","화","수","목","금","토"];
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function classifyDate(dateStr) {
  const d = parseDate(dateStr);
  const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)  return "지난 일정";
  if (diff === 0) return "오늘 🔥";
  if (diff <= 7)  return "이번 주 ✨";
  return "다가오는 일정";
}

// ── CSS ───────────────────────────────────────────────────────────
const STYLES = `
  @keyframes scheduleSlideIn {
    from { opacity:0; transform:translateX(22px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes buriJump {
    0%,100% { transform:translateY(0) rotate(0deg); }
    30%     { transform:translateY(-10px) rotate(-6deg); }
    60%     { transform:translateY(-4px) rotate(4deg); }
  }

  /* 중요 일정 — 테두리 무지개 회전 */
  @keyframes importantBorder {
    0%   { border-color: #7B4FA6; box-shadow: 0 0 0 2px #7B4FA633, 0 6px 24px #7B4FA644; }
    25%  { border-color: #ff4daa; box-shadow: 0 0 0 2px #ff4daa33, 0 6px 24px #ff4daa44; }
    50%  { border-color: #ffe44d; box-shadow: 0 0 0 2px #ffe44d33, 0 6px 24px #ffe44d44; }
    75%  { border-color: #E8630A; box-shadow: 0 0 0 2px #E8630A33, 0 6px 24px #E8630A44; }
    100% { border-color: #7B4FA6; box-shadow: 0 0 0 2px #7B4FA633, 0 6px 24px #7B4FA644; }
  }
  /* 중요 일정 — 배경 빛 흐름 */
  @keyframes importantShine {
    0%   { left: -80%; }
    50%  { left: 130%; }
    100% { left: 130%; }
  }
  /* 중요 일정 — 제목 글로우 */
  @keyframes importantTextGlow {
    0%,100% { text-shadow: 0 0 6px #7B4FA644; }
    50%     { text-shadow: 0 0 14px #7B4FA6aa, 0 0 28px #7B4FA644; }
  }
  /* 중요 뱃지 두근거림 */
  @keyframes importantBadge {
    0%,100% { transform:scale(1); }
    40%     { transform:scale(1.15) rotate(-4deg); }
    60%     { transform:scale(0.95) rotate(2deg); }
  }
  /* D-Day 펄스 */
  @keyframes ddayPulse {
    0%,100% { transform:scale(1); }
    50%     { transform:scale(1.1); }
  }
  /* 작성자 아바타 흔들기 */
  @keyframes avatarWobble {
    0%,100% { transform:rotate(0deg); }
    25%     { transform:rotate(-6deg); }
    75%     { transform:rotate(6deg); }
  }
  /* 파티클 */
  @keyframes particleFly {
    0%   { opacity:1; transform:translate(-50%,-50%) scale(1); }
    100% { opacity:0; transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); }
  }
`;

// ── 파티클 터트리기 ───────────────────────────────────────────────
function spawnParticles(el) {
  if (!el) return;
  const emojis = ["⭐","💜","✨","🎉","🌟"];
  emojis.forEach((e, i) => {
    const p = document.createElement("span");
    const angle = (i / emojis.length) * Math.PI * 2;
    const dist = 40 + Math.random() * 20;
    p.textContent = e;
    p.style.cssText = `
      position:absolute; pointer-events:none; z-index:999;
      font-size:14px; left:50%; top:50%;
      animation:particleFly 0.7s ease-out forwards;
      animation-delay:${i*0.06}s;
      --tx:${Math.cos(angle)*dist}px;
      --ty:${Math.sin(angle)*dist}px;
    `;
    el.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  });
}

// ── 개별 일정 카드 ────────────────────────────────────────────────
const ScheduleItem = ({ schedule, currentUser, isToday, index }) => {
  const cardRef   = useRef(null);
  const deleteRef = useRef(null);
  const meta    = CATEGORY_META[schedule.category] || CATEGORY_META["개인일정"];
  const dday    = getDDay(schedule.date);
  const isPast  = dday.startsWith("D+");
  const isImportant = !!schedule.isImportant;
  const writer  = schedule.writer || "알 수 없음";
  const isMySchedule = writer === currentUser;
  const writerImg = writer === "현하" ? gfImg : meImg;

  const handleDelete = () => {
    shakeElement(deleteRef.current);
    setTimeout(async () => {
      if (window.confirm("이 일정을 삭제할까요?")) {
        await deleteDoc(doc(db, "schedules", schedule.id));
      }
    }, 150);
  };

  const handleTap = () => {
    if (isImportant && !isPast) {
      confetti({
        particleCount: 100, spread: 70, origin: { y: 0.6 },
        colors: [meta.color, B.skin, "#FFE44D", "#ffffff"],
      });
      spawnParticles(cardRef.current);
      vibrate([20, 10, 30, 10, 20]);
    } else {
      vibrate(10);
    }
  };

  return (
    <Box ref={cardRef} onClick={handleTap}
      sx={{
        position: "relative", overflow: "hidden",
        borderRadius: "14px",
        bgcolor: isPast ? "#F5F5F5" : "white",
        opacity: isPast ? 0.65 : 1,
        animation: isImportant && !isPast
          ? `scheduleSlideIn 0.35s ease ${index*0.06}s both, importantBorder 3s linear ${index*0.3}s infinite`
          : `scheduleSlideIn 0.35s ease ${index*0.06}s both`,
        border: `2px solid ${meta.color}33`,
        transition: "transform 0.12s",
        cursor: "pointer",
        "&:active": { transform: "scale(0.96)" },
      }}
    >
      {/* 중요 일정 — 빛 흐름 레이어 */}
      {isImportant && !isPast && (
        <Box sx={{
          position: "absolute", top: 0, left: "-80%",
          width: "45%", height: "100%", pointerEvents: "none", zIndex: 1,
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
          animation: "importantShine 3s ease-in-out infinite",
        }} />
      )}

      <Box sx={{ display: "flex", alignItems: "stretch" }}>
        {/* 왼쪽 컬러 바 */}
        <Box sx={{
          width: isImportant && !isPast ? 6 : 4,
          flexShrink: 0, bgcolor: meta.color,
          opacity: isPast ? 0.3 : 1,
          transition: "width 0.2s",
        }} />

        {/* 본문 */}
        <Box sx={{ flex: 1, px: 1.6, py: 1.4, zIndex: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>

              {/* 제목 행 */}
              <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.3 }} flexWrap="wrap">
                <Typography sx={{ fontSize: "14px", lineHeight: 1, flexShrink: 0 }}>
                  {meta.emoji}
                </Typography>
                <Typography sx={{
                  fontFamily: "'Jua',sans-serif", fontSize: "0.92rem",
                  color: isPast ? B.dark+"55" : B.dark,
                  textDecoration: isPast ? "line-through" : "none",
                  animation: isImportant && !isPast ? "importantTextGlow 2s ease-in-out infinite" : "none",
                }}>
                  {schedule.title}
                </Typography>
                {/* 중요 뱃지 */}
                {isImportant && !isPast && (
                  <Box sx={{
                    px: 0.8, py: "1px", borderRadius: "10px",
                    background: `linear-gradient(120deg, ${meta.color}, #ff4daa)`,
                    color: "white", fontSize: "0.58rem", fontWeight: 700,
                    fontFamily: "'Noto Sans KR',sans-serif",
                    animation: "importantBadge 1.8s ease-in-out infinite",
                    flexShrink: 0,
                  }}>⭐ 중요</Box>
                )}
              </Stack>

              {/* 날짜 */}
              <Typography sx={{
                fontSize: "0.68rem", color: B.dark+"55",
                fontFamily: "'Noto Sans KR',sans-serif", mb: 0.6,
              }}>
                {formatDate(schedule.date)}
              </Typography>

              {/* 작성자 */}
              <Stack direction="row" alignItems="center" gap={0.6}>
                <Box sx={{
                  width: 18, height: 18, borderRadius: "50%",
                  overflow: "hidden", flexShrink: 0,
                  border: `1.5px solid ${isMySchedule ? B.pants : B.skin}`,
                  animation: isImportant && !isPast ? `avatarWobble 2.5s ease-in-out ${index*0.2}s infinite` : "none",
                }}>
                  <Box component="img" src={writerImg} alt={writer}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Typography sx={{
                  fontSize: "0.65rem", fontWeight: 700,
                  fontFamily: "'Noto Sans KR',sans-serif",
                  color: isMySchedule ? B.pants : B.accent,
                }}>
                  {writer}
                  {isMySchedule && " (나)"}
                </Typography>
                {/* 카테고리 칩 */}
                <Box sx={{
                  px: 0.8, py: "1px", borderRadius: "10px",
                  bgcolor: meta.bg, color: meta.color,
                  fontSize: "0.6rem", fontWeight: 700,
                  fontFamily: "'Noto Sans KR',sans-serif",
                }}>
                  {schedule.category}
                </Box>
              </Stack>
            </Box>

            {/* 오른쪽: D-Day + 삭제 */}
            <Stack alignItems="flex-end" gap={0.6} sx={{ flexShrink: 0 }}>
              <Box sx={{
                px: 1, py: "3px", borderRadius: "10px",
                bgcolor: dday === "D-Day"
                  ? meta.color : isPast ? "#E0E0E0" : meta.bg,
                color: dday === "D-Day" ? "white" : isPast ? "#999" : meta.color,
                fontSize: "0.7rem", fontWeight: 700,
                fontFamily: "'Jua',sans-serif",
                animation: dday === "D-Day" && !isPast ? "ddayPulse 1.2s ease-in-out infinite" : "none",
                boxShadow: dday === "D-Day" ? `0 2px 10px ${meta.color}66` : "none",
              }}>
                {dday}
              </Box>
              <IconButton ref={deleteRef} onClick={e => { e.stopPropagation(); handleDelete(); }}
                size="small"
                sx={{ p: 0.3, color: "#ccc", "&:hover": { color: B.accent },
                  "&:active": { transform: "scale(0.85)" }, transition: "all 0.15s" }}>
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
const ScheduleList = ({ currentUser }) => {
  const [schedules, setSchedules] = useState([]);
  const [filter, setFilter]       = useState("전체");

  useEffect(() => {
    const q = query(collection(db, "schedules"));
    const unsub = onSnapshot(q, snap => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = filter === "전체"
    ? schedules
    : schedules.filter(s => s.category === filter);

  const sorted = [...filtered].sort((a, b) =>
    parseDate(a.date) - parseDate(b.date)
  );

  const groups = {};
  sorted.forEach(s => {
    const label = classifyDate(s.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  });

  const GROUP_ORDER = ["오늘 🔥", "이번 주 ✨", "다가오는 일정", "지난 일정"];
  const GROUP_COLORS = {
    "오늘 🔥":      B.accent,
    "이번 주 ✨":   B.pants,
    "다가오는 일정": "#639922",
    "지난 일정":    "#888",
  };

  const importantCount = schedules.filter(s => s.isImportant).length;

  return (
    <Box>
      <style>{STYLES}</style>

      {/* 요약 카드 */}
      <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.2, mb:2.5 }}>
        <Box sx={{ bgcolor:"white", borderRadius:3, p:1.5,
          border:`1.5px solid ${B.pants}22`,
          display:"flex", alignItems:"center", gap:1.2 }}>
          <Box component="img" src={buri6} alt=""
            sx={{ width:36, animation:"buriJump 2.5s ease-in-out infinite",
              filter:`drop-shadow(0 2px 6px ${B.pants}44)` }}/>
          <Box>
            <Typography sx={{ fontFamily:"'Jua',sans-serif", fontSize:"1.4rem",
              color:B.pants, lineHeight:1 }}>{schedules.length}</Typography>
            <Typography sx={{ fontSize:"0.63rem", color:B.dark+"66",
              fontFamily:"'Noto Sans KR',sans-serif" }}>전체 일정</Typography>
          </Box>
        </Box>
        <Box sx={{ bgcolor:"white", borderRadius:3, p:1.5,
          border:`1.5px solid ${B.accent}22`,
          display:"flex", alignItems:"center", gap:1.2 }}>
          <Box component="img" src={buri1} alt=""
            sx={{ width:36, animation:"buriJump 2.2s ease-in-out 0.5s infinite",
              filter:`drop-shadow(0 2px 6px ${B.accent}44)` }}/>
          <Box>
            <Typography sx={{ fontFamily:"'Jua',sans-serif", fontSize:"1.4rem",
              color:B.accent, lineHeight:1 }}>{importantCount}</Typography>
            <Typography sx={{ fontSize:"0.63rem", color:B.dark+"66",
              fontFamily:"'Noto Sans KR',sans-serif" }}>중요 일정</Typography>
          </Box>
        </Box>
      </Box>

      {/* 필터 탭 */}
      <Stack direction="row" gap={0.8} sx={{ mb:2.5, flexWrap:"wrap" }}>
        {[
          { key:"전체",    label:"🐷 전체",   color: B.pants },
          { key:"기념일",  label:"💜 기념일",  color: CATEGORY_META.기념일.color },
          { key:"데이트",  label:"🧡 데이트",  color: CATEGORY_META.데이트.color },
          { key:"개인일정",label:"📌 개인일정", color: CATEGORY_META.개인일정.color },
        ].map(({ key, label, color }) => (
          <Box key={key}
            onClick={() => { setFilter(key); vibrate(12); }}
            sx={{
              px:1.4, py:"5px", borderRadius:"20px", cursor:"pointer",
              fontFamily:"'Noto Sans KR',sans-serif", fontSize:"0.75rem", fontWeight:700,
              bgcolor: filter===key ? color : "white",
              color:   filter===key ? "white" : color,
              border: `1.5px solid ${filter===key ? "transparent" : color+"44"}`,
              transition:"all 0.15s",
              "&:active":{ transform:"scale(0.93)" },
            }}>{label}</Box>
        ))}
      </Stack>

      {/* 빈 상태 */}
      {sorted.length === 0 && (
        <Box sx={{ textAlign:"center", py:6, opacity:0.5 }}>
          <Box component="img" src={buri9} alt=""
            sx={{ width:64, mb:1.5, animation:"headBob 2.5s ease-in-out infinite",
              filter:`drop-shadow(0 2px 8px ${B.pants}44)` }}/>
          <Typography sx={{ fontFamily:"'Jua',sans-serif", color:B.dark+"88", fontSize:"0.88rem" }}>
            일정이 없어요 🐷<br/>캘린더에서 추가해봐요!
          </Typography>
        </Box>
      )}

      {/* 그룹별 */}
      <Stack spacing={3}>
        {GROUP_ORDER.map(groupLabel => {
          const items = groups[groupLabel];
          if (!items?.length) return null;
          const groupColor = GROUP_COLORS[groupLabel];

          return (
            <Box key={groupLabel}>
              {/* 그룹 헤더 */}
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb:1.2 }}>
                <Box sx={{
                  px:1.4, py:"3px", borderRadius:"20px",
                  bgcolor: groupLabel === "다가오는 일정" ? "#E8F5E9" : groupColor,
                  color: groupLabel === "다가오는 일정" ? "#639922" : "white",
                }}>
                  <Typography sx={{ fontFamily:"'Jua',sans-serif", fontSize:"0.75rem" }}>
                    {groupLabel}
                  </Typography>
                </Box>
                <Box sx={{ flex:1, height:"1px", bgcolor:B.lavender }}/>
                <Typography sx={{ fontFamily:"'Noto Sans KR',sans-serif",
                  fontSize:"0.68rem", color:B.dark+"55" }}>
                  {items.length}개
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {items.map((s, i) => (
                  <ScheduleItem
                    key={s.id} schedule={s}
                    currentUser={currentUser}
                    isToday={groupLabel === "오늘 🔥"}
                    index={i}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ScheduleList;