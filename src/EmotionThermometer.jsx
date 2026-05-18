import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, query, onSnapshot, addDoc,
  serverTimestamp, orderBy, doc, updateDoc, arrayUnion,
} from "firebase/firestore";
import {
  Box, Typography, Stack, Button, CircularProgress,
  Collapse, Slider, Chip, TextField,
} from "@mui/material";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import confetti from "canvas-confetti";
import { createBuriPang, vibrate } from "./touchEffects";
import { recordCheckin } from "./CharacterPet";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png";
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png";

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A",
  dark: "#3D1F00", danger: "#E53935", green: "#43A047",
};
const USERS = ["지수", "현하"];

const EMOTION_TAGS = [
  "😴 피곤해", "🥰 설렘", "😤 답답해", "😢 슬퍼",
  "🎉 신나", "💪 에너지넘침", "😌 평온해", "🤔 복잡해",
];

// ── 유틸 ────────────────────────────────────────────────────────
function getTempMeta(v) {
  v = parseInt(v ?? 0);
  if (v === 0)  return { emoji: "💀", label: "패널티",     color: "#888787" };
  if (v < 20)   return { emoji: "😶", label: "무기력",     color: "#B4B2A9" };
  if (v < 40)   return { emoji: "😔", label: "우울해요",   color: "#85B7EB" };
  if (v < 60)   return { emoji: "😊", label: "보통이에요", color: "#EF9F27" };
  if (v < 80)   return { emoji: "😄", label: "좋아요!",    color: "#7B4FA6" };
  return         { emoji: "🥰", label: "최고예요!",         color: "#E8630A" };
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function getDateRange(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); return toDateStr(d);
  });
}
function getMonthRange() {
  const now = new Date();
  const days = Math.floor((now - new Date(now.getFullYear(), now.getMonth(), 1)) / 86400000) + 1;
  return getDateRange(days);
}
function getYearMonths() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
}

async function backfillMissedDays(currentUser, existingRecords) {
  const today = toDateStr(new Date());
  const recorded = new Set(existingRecords.filter(r => r.author === currentUser).map(r => r.date));
  const missed = getDateRange(30).filter(d => d < today && !recorded.has(d));
  await Promise.all(missed.map(date =>
    addDoc(collection(db, "temperatures"), {
      author: currentUser, temp: 0, date, isPenalty: true, createdAt: serverTimestamp(),
    })
  ));
}

// ── SVG 원형 게이지 ─────────────────────────────────────────────
function CircleGauge({ value, color, size = 88, label }) {
  const sw = 9, r = (size - sw * 2) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (Math.max(value, 0) / 100);
  const hasValue = value > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={B.lavender} strokeWidth={sw} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.7s ease, stroke 0.3s" }}
          />
        </svg>
        <Box sx={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none",
        }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif",
            fontSize: size >= 100 ? "1.6rem" : "1.1rem",
            color, lineHeight: 1, transition: "color 0.3s",
          }}>
            {hasValue ? `${value}°` : "—"}
          </Typography>
          {hasValue && (
            <Typography sx={{ fontSize: size >= 100 ? "1.1rem" : "0.85rem", lineHeight: 1.2 }}>
              {getTempMeta(value).emoji}
            </Typography>
          )}
        </Box>
      </Box>
      {label && (
        <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.78rem", color: B.dark + "88" }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}

// ── 이달의 하이라이트 ────────────────────────────────────────────
function MonthHighlights({ records, currentUser, otherUser }) {
  const thisMonth = toDateStr(new Date()).slice(0, 7);
  const monthRecs = records.filter(r => r.date.startsWith(thisMonth) && !r.isPenalty && r.temp > 0);
  const myBest = [...monthRecs.filter(r => r.author === currentUser)].sort((a, b) => b.temp - a.temp)[0];
  const syncedDates = [...new Set(monthRecs.map(r => r.date))].filter(date => {
    const my = monthRecs.find(r => r.author === currentUser && r.date === date);
    const ot = monthRecs.find(r => r.author === otherUser   && r.date === date);
    return my && ot && my.temp >= 70 && ot.temp >= 70;
  });

  if (!myBest && syncedDates.length === 0) return null;
  const fmt = iso => { const d = new Date(iso); return `${d.getMonth()+1}/${d.getDate()}`; };

  return (
    <Box sx={{ bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`, p: 2.2 }}>
      <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem", mb: 1.5 }}>
        ✨ 이달의 하이라이트
      </Typography>
      <Stack gap={1}>
        {myBest && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.2, p: 1.2, borderRadius: 2.5,
            bgcolor: getTempMeta(myBest.temp).color + "10",
            border: `1px solid ${getTempMeta(myBest.temp).color}22`,
          }}>
            <Typography sx={{ fontSize: "1.3rem" }}>🏆</Typography>
            <Box>
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.7rem", color: B.dark + "88" }}>
                내 이달 최고 온도
              </Typography>
              <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: getTempMeta(myBest.temp).color }}>
                {fmt(myBest.date)} — {myBest.temp}° {getTempMeta(myBest.temp).emoji}
              </Typography>
            </Box>
          </Box>
        )}
        {syncedDates.length > 0 && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.2, p: 1.2, borderRadius: 2.5,
            bgcolor: B.pants + "10", border: `1px solid ${B.pants}22`,
          }}>
            <Typography sx={{ fontSize: "1.3rem" }}>💑</Typography>
            <Box>
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.7rem", color: B.dark + "88" }}>
                함께 행복했던 날
              </Typography>
              <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: B.pants }}>
                {syncedDates.slice(0, 3).map(fmt).join(", ")}
                {syncedDates.length > 3 ? ` 외 ${syncedDates.length - 3}일` : ""}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

// ── 주간 리포트 ─────────────────────────────────────────────────
function WeeklyReport({ records, currentUser, otherUser }) {
  const [open, setOpen] = useState(false);
  const getWeekAvg = user => {
    const vals = getDateRange(7)
      .map(d => records.find(r => r.author === user && r.date === d))
      .filter(r => r && !r.isPenalty).map(r => r.temp);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const getMsg = (user, avg) => {
    if (avg === null) return `${user}는 이번 주 기록이 부족해요 😢`;
    if (avg >= 80) return `${user}는 이번 주 평균 ${avg}도! 최고의 한 주였어요 🥰🔥`;
    if (avg >= 60) return `${user}는 이번 주 평균 ${avg}도! 기분 좋은 한 주였네요 😄`;
    if (avg >= 40) return `${user}는 이번 주 평균 ${avg}도. 무난한 한 주였어요 😊`;
    return `${user}는 이번 주 평균 ${avg}도... 힘든 한 주였군요 🤗`;
  };
  const getTrend = user => {
    const vals = getDateRange(7)
      .map(d => records.find(r => r.author === user && r.date === d)?.temp ?? null)
      .filter(v => v !== null && v > 0);
    if (vals.length < 2) return null;
    const diff = vals[vals.length - 1] - vals[0];
    if (diff > 10)  return { icon: "📈", text: "점점 좋아지는 중!", color: B.green };
    if (diff < -10) return { icon: "📉", text: "조금 힘들어지고 있어요", color: "#85B7EB" };
    return { icon: "➡️", text: "안정적인 한 주", color: B.dark + "88" };
  };
  const myAvg = getWeekAvg(currentUser), otherAvg = getWeekAvg(otherUser);
  const myTrend = getTrend(currentUser), otherTrend = getTrend(otherUser);

  return (
    <Box sx={{ bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`, overflow: "hidden" }}>
      <Box onClick={() => setOpen(o => !o)} sx={{
        p: 2, cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "space-between",
        bgcolor: open ? B.lavender + "55" : "white", transition: "background 0.2s",
        "&:active": { opacity: 0.8 },
      }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography sx={{ fontSize: "1.2rem" }}>📊</Typography>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem" }}>이번 주 리포트</Typography>
          {myAvg !== null && (
            <Box sx={{
              px: 1.2, py: "2px", borderRadius: "20px",
              bgcolor: getTempMeta(myAvg).color + "22", color: getTempMeta(myAvg).color,
              fontSize: "0.68rem", fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
            }}>내 평균 {myAvg}°</Box>
          )}
        </Stack>
        <Typography sx={{ color: B.pants, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▼</Typography>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {[
            { user: currentUser, avg: myAvg,    tr: myTrend,    color: B.pants },
            { user: otherUser,   avg: otherAvg,  tr: otherTrend, color: B.accent },
          ].map(({ user, avg, tr, color }) => (
            <Box key={user} sx={{ p: 1.8, borderRadius: 3, bgcolor: color + "0D", border: `1px solid ${color}22` }}>
              <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.8 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.85rem", color }}>{user}</Typography>
                {avg !== null && <Typography sx={{ fontSize: "1.1rem" }}>{getTempMeta(avg).emoji}</Typography>}
              </Stack>
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.82rem", color: B.dark + "CC", lineHeight: 1.5 }}>
                {getMsg(user, avg)}
              </Typography>
              {tr && (
                <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.8 }}>
                  <Typography sx={{ fontSize: "0.85rem" }}>{tr.icon}</Typography>
                  <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", color: tr.color, fontWeight: 700 }}>{tr.text}</Typography>
                </Stack>
              )}
              {avg !== null && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ height: 6, bgcolor: B.lavender, borderRadius: "6px", overflow: "hidden" }}>
                    <Box sx={{ height: "100%", borderRadius: "6px", bgcolor: getTempMeta(avg).color, width: `${avg}%`, transition: "width 0.8s ease" }} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.4 }}>
                    <Typography sx={{ fontSize: "0.6rem", color: B.dark + "44" }}>0</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: getTempMeta(avg).color, fontWeight: 700 }}>주간 평균 {avg}°</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: B.dark + "44" }}>100</Typography>
                  </Stack>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── 공감 반응 카드 ──────────────────────────────────────────────
function EmpathyCard({ records, currentUser, otherUser, today }) {
  const myRec    = records.find(r => r.author === currentUser && r.date === today);
  const otherRec = records.find(r => r.author === otherUser   && r.date === today);
  const [hugging, setHugging] = useState(false);
  if (!myRec || !otherRec) return null;
  const diff = Math.abs(myRec.temp - otherRec.temp);
  if (diff < 25) return null;
  const isLowMe   = myRec.temp < otherRec.temp;
  const lowUser   = isLowMe ? currentUser : otherUser;
  const highUser  = isLowMe ? otherUser : currentUser;
  const lowTemp   = Math.min(myRec.temp, otherRec.temp);
  const targetRec = isLowMe ? myRec : otherRec;
  const alreadyHugged = (targetRec?.hugs ?? []).includes(currentUser);

  const handleHug = async () => {
    if (hugging || alreadyHugged || isLowMe) return;
    setHugging(true);
    vibrate([15, 10, 15, 10, 30]);
    try {
      if (targetRec?.id) await updateDoc(doc(db, "temperatures", targetRec.id), { hugs: arrayUnion(currentUser) });
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, type: "hug",
        content: `${currentUser}가 토닥토닥 해줬어요! 🤗💜`,
        createdAt: serverTimestamp(), isRead: false,
      });
      confetti({ particleCount: 50, spread: 55, origin: { y: 0.6 }, colors: [B.pants, B.skin, "#ffffff"] });
    } catch (e) { console.error(e); }
    setHugging(false);
  };

  return (
    <Box sx={{
      bgcolor: "white", borderRadius: 4, border: `2px solid ${B.accent}44`, p: 2.2,
      background: `linear-gradient(135deg, ${B.peach}44 0%, white 60%)`,
      position: "relative", overflow: "hidden",
    }}>
      <Box sx={{ position: "absolute", top: -10, right: -10, width: 80, height: 80, borderRadius: "50%", bgcolor: B.accent + "08" }} />
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        <Typography sx={{ fontSize: "2rem", lineHeight: 1, mt: 0.3 }}>🌡️</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.9rem", color: B.accent, mb: 0.5 }}>온도 차이가 {diff}도나 나요!</Typography>
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.8rem", color: B.dark + "BB", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {isLowMe
              ? `오늘 ${highUser}보다 기분이 처져있네요 😔\n${highUser}가 토닥여줄 거예요!`
              : `오늘 ${lowUser}가 ${lowTemp}도로 많이 힘들어 보여요.\n따뜻하게 안아주세요 🤗`}
          </Typography>
          {!isLowMe && (
            <Button variant="contained" disabled={hugging || alreadyHugged} onClick={handleHug} sx={{
              mt: 1.2, bgcolor: alreadyHugged ? B.green : B.accent,
              borderRadius: "20px", px: 2.5, py: 0.8,
              fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
              boxShadow: alreadyHugged ? "none" : `0 4px 12px ${B.accent}44`,
              "&:hover": { bgcolor: alreadyHugged ? B.green : "#C8550A" },
              "&.Mui-disabled": { bgcolor: B.green, color: "white" },
            }}>
              {hugging ? "전송 중..." : alreadyHugged ? "✓ 토닥여줬어요! 💜" : "❤️ 토닥토닥"}
            </Button>
          )}
          {isLowMe && (myRec?.hugs ?? []).length > 0 && (
            <Box sx={{ mt: 1.2, px: 1.5, py: 0.8, borderRadius: "12px", bgcolor: B.pants + "15", border: `1px solid ${B.pants}33`, display: "inline-flex", alignItems: "center", gap: 0.6 }}>
              <Typography sx={{ fontSize: "1rem" }}>💜</Typography>
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.78rem", color: B.pants, fontWeight: 700 }}>{highUser}가 토닥여줬어요!</Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

// ── 스트릭 배너 ─────────────────────────────────────────────────
function StreakDangerBanner({ streak, submitted, currentUser, otherUser, records }) {
  const today    = toDateStr(new Date());
  const otherRec = records.find(r => r.author === otherUser && r.date === today);
  const hour     = new Date().getHours();
  const otherStreak = (() => {
    let s = 0; const d = new Date();
    while (s < 365) {
      const rec = records.find(r => r.author === otherUser && r.date === toDateStr(d));
      if (!rec || rec.isPenalty) break;
      s++; d.setDate(d.getDate() - 1);
    }
    return s;
  })();
  const showMy    = !submitted;
  const showOther = !otherRec && hour >= 18;
  if (!showMy && !showOther) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {showMy && streak > 0 && (
        <Box sx={{ p: 1.8, borderRadius: 3, background: `linear-gradient(135deg, ${B.danger}18, ${B.accent}12)`, border: `1.5px solid ${B.danger}44`, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontSize: "1.5rem" }}>🔥</Typography>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: B.danger }}>{streak}일 스트릭이 끊길 위기예요!</Typography>
            <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem", color: B.dark + "99", mt: 0.3 }}>오늘 기록 안 하면 💀 0도 패널티가 부여돼요</Typography>
          </Box>
        </Box>
      )}
      {showMy && streak === 0 && (
        <Box sx={{ p: 1.8, borderRadius: 3, background: `linear-gradient(135deg, #85B7EB18, ${B.lavender}44)`, border: `1.5px solid #85B7EB55`, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontSize: "1.5rem" }}>😶</Typography>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: "#5B8FBB" }}>오늘 아직 기록 전이에요</Typography>
            <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem", color: B.dark + "99", mt: 0.3 }}>기록하면 스트릭을 시작할 수 있어요 🌱</Typography>
          </Box>
        </Box>
      )}
      {showOther && (
        <Box sx={{ p: 1.8, borderRadius: 3, background: `linear-gradient(135deg, ${B.accent}12, ${B.peach}44)`, border: `1.5px solid ${B.accent}33`, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontSize: "1.5rem" }}>👀</Typography>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: B.accent }}>{otherUser}가 아직 안 했어요!</Typography>
            <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem", color: B.dark + "99", mt: 0.3 }}>
              {otherStreak > 0 ? `${otherStreak}일 스트릭이 위험해요 — 알려줘요 📣` : "오늘 기록하라고 알려주세요!"}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── recharts 툴팁 ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: "white", borderRadius: 2.5, p: "8px 12px", border: `1.5px solid ${B.lavender}`, boxShadow: `0 4px 16px ${B.pants}18` }}>
      <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.72rem", color: B.dark + "88", mb: 0.3 }}>{label}</Typography>
      {payload.map(({ name, value, color }) => value == null ? null : (
        <Stack key={name} direction="row" alignItems="center" gap={0.6}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color }} />
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.76rem", color: B.dark }}>
            {name}: {value}° {getTempMeta(value).emoji}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
const EmotionThermometer = ({ currentUser }) => {
  const [records,      setRecords]      = useState([]);
  const [todayTemp,    setTodayTemp]    = useState(50);
  const [submitted,    setSubmitted]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [chartTab,     setChartTab]     = useState("week");
  const [backfilled,   setBackfilled]   = useState(false);
  const [memo,         setMemo]         = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const today     = toDateStr(new Date());
  const otherUser = USERS.find(u => u !== currentUser) ?? USERS[0];

  useEffect(() => {
    const q = query(collection(db, "temperatures"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, async snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecords(data);
      const myToday = data.find(r => r.author === currentUser && r.date === today);
      if (myToday) { setTodayTemp(myToday.temp); setSubmitted(true); }
      if (!backfilled) { setBackfilled(true); await backfillMissedDays(currentUser, data); }
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const handleSubmit = async e => {
    if (submitted) return;
    createBuriPang(e);
    vibrate([20, 10, 20, 10, 40]);
    try {
      await addDoc(collection(db, "temperatures"), {
        author: currentUser, temp: todayTemp, date: today,
        memo: memo.trim(), tags: selectedTags,
        isPenalty: false, hugs: [], createdAt: serverTimestamp(),
      });
      recordCheckin(currentUser).catch(console.error);
      if (todayTemp >= 80)
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: [B.pants, B.skin, "#ffffff"] });
      const otherRec = records.find(r => r.author === otherUser && r.date === today);
      if (otherRec && Math.abs(todayTemp - otherRec.temp) >= 25) {
        await addDoc(collection(db, "notifications"), {
          writer: currentUser, type: "temp_diff",
          content: `${currentUser}의 오늘 온도가 ${todayTemp}°! 온도 차이가 크네요 🌡️`,
          createdAt: serverTimestamp(), isRead: false,
        });
      }
      setSubmitted(true);
    } catch (err) { console.error(err); }
  };

  const getStreak = user => {
    let s = 0; const d = new Date();
    while (s < 365) {
      const rec = records.find(r => r.author === user && r.date === toDateStr(d));
      if (!rec || rec.isPenalty) break;
      s++; d.setDate(d.getDate() - 1);
    }
    return s;
  };

  const getChartData = () => {
    const map = {};
    records.forEach(r => { map[`${r.author}_${r.date}`] = r.temp; });
    if (chartTab === "week") {
      return getDateRange(7).map(d => ({
        label: `${parseInt(d.slice(5,7))}/${parseInt(d.slice(8))}`,
        [currentUser]: map[`${currentUser}_${d}`] ?? null,
        [otherUser]:   map[`${otherUser}_${d}`]   ?? null,
      }));
    }
    if (chartTab === "month") {
      return getMonthRange().map(d => ({
        label: `${parseInt(d.slice(8))}일`,
        [currentUser]: map[`${currentUser}_${d}`] ?? null,
        [otherUser]:   map[`${otherUser}_${d}`]   ?? null,
      }));
    }
    const avg = (user, ym) => {
      const vals = records.filter(r => r.author === user && r.date.startsWith(ym) && !r.isPenalty).map(r => r.temp);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    return getYearMonths().map(m => ({
      label: `${parseInt(m.slice(5))}월`,
      [currentUser]: avg(currentUser, m),
      [otherUser]:   avg(otherUser, m),
    }));
  };

  const getDiffMsg = () => {
    const myRec    = records.find(r => r.author === currentUser && r.date === today);
    const otherRec = records.find(r => r.author === otherUser   && r.date === today);
    if (!myRec || !otherRec) return "아직 둘 다 기록 전이에요 🌡️";
    const diff = Math.abs(myRec.temp - otherRec.temp);
    if (diff <= 5) return "오늘 둘 다 비슷한 하루네요! 💜🐷";
    return myRec.temp > otherRec.temp
      ? `${currentUser}가 오늘 더 행복해 보여요! ${otherUser}도 힘내요 🐷`
      : `${otherUser}가 오늘 더 행복해 보여요! ${currentUser}도 힘내요 🐷`;
  };

  if (loading) return <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress sx={{ color: B.pants }} size={28} /></Box>;

  const streak   = getStreak(currentUser);
  const myRec    = records.find(r => r.author === currentUser && r.date === today);
  const otherRec = records.find(r => r.author === otherUser   && r.date === today);
  const currentVal = submitted ? (myRec?.temp ?? 0) : todayTemp;
  const meta       = getTempMeta(currentVal);
  const chartData  = getChartData();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

      {/* 스트릭 배너 */}
      <StreakDangerBanner streak={streak} submitted={submitted} currentUser={currentUser} otherUser={otherUser} records={records} />

      {/* 공감 카드 */}
      <EmpathyCard records={records} currentUser={currentUser} otherUser={otherUser} today={today} />

      {/* ── 오늘 입력 카드 ── */}
      <Box sx={{
        bgcolor: "white", borderRadius: 4,
        border: `2px solid ${B.pants}22`,
        boxShadow: `0 4px 20px ${B.pants}10`,
        position: "relative", overflow: "visible",
        backgroundImage: `radial-gradient(circle at 95% 5%, ${B.lavender}88 0%, transparent 40%)`,
      }}>
        <Box component="img" src={buri1} alt="" sx={{
          position: "absolute", top: -22, right: 10, width: 48,
          animation: "headBob 2s ease-in-out infinite",
          filter: `drop-shadow(0 2px 8px ${B.pants}44)`, pointerEvents: "none",
        }} />
        <Box sx={{ p: 2.5 }}>
          {/* 헤더 */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1rem" }}>오늘 온도는? 🌡️</Typography>
            <Stack direction="row" gap={0.8}>
              {streak > 0 && (
                <Box sx={{ px: 1.2, py: "2px", borderRadius: "20px", bgcolor: B.accent + "22", color: B.accent, fontSize: "0.65rem", fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif" }}>
                  🔥 {streak}일 연속
                </Box>
              )}
              <Box sx={{ px: 1.2, py: "2px", borderRadius: "20px", bgcolor: B.lavender, color: B.pants, fontSize: "0.65rem", fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif" }}>
                {today.slice(5).replace("-", "/")}
              </Box>
            </Stack>
          </Stack>

          {/* ② 원형 게이지 */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
            <CircleGauge value={currentVal} color={meta.color} size={112} />
          </Box>

          {/* ③ 감정 레이블 — 점선박스 제거, left-border accent 스타일 */}
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.2,
            py: 1.2, px: 1.5, mb: 2,
            bgcolor: meta.color + "10", borderRadius: 2.5,
            borderLeft: `4px solid ${meta.color}`,
            transition: "all 0.25s",
          }}>
            <Typography sx={{ fontSize: "1.3rem", lineHeight: 1 }}>{meta.emoji}</Typography>
            <Box>
              <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.95rem", color: meta.color, lineHeight: 1 }}>
                {meta.label}
              </Typography>
              {!submitted && (
                <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55", mt: 0.3, fontFamily: "'Noto Sans KR',sans-serif" }}>
                  자정 전까지 기록 안 하면 💀 0도 패널티
                </Typography>
              )}
            </Box>
          </Box>

          {!submitted ? (
            <>
              {/* ① MUI Slider */}
              <Slider
                value={todayTemp} min={1} max={100} step={1}
                onChange={(_, val) => setTodayTemp(val)}
                sx={{
                  color: meta.color, mb: 0.5,
                  '& .MuiSlider-thumb': {
                    width: 26, height: 26,
                    boxShadow: `0 2px 8px ${meta.color}55`,
                    '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 10px ${meta.color}20` },
                    transition: 'box-shadow 0.2s',
                  },
                  '& .MuiSlider-rail': { bgcolor: B.lavender, opacity: 1, height: 8 },
                  '& .MuiSlider-track': { height: 8, border: 'none', transition: 'background-color 0.25s' },
                }}
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55" }}>😶 0</Typography>
                <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55" }}>50</Typography>
                <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55" }}>100 🔥</Typography>
              </Stack>

              {/* ⑧ 감정 태그 */}
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.7rem", color: B.dark + "66", mb: 0.8 }}>
                오늘의 감정 태그 (선택)
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", mb: 1.5 }}>
                {EMOTION_TAGS.map(tag => (
                  <Chip key={tag} label={tag} size="small"
                    onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                    sx={{
                      fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.7rem", height: 26,
                      bgcolor: selectedTags.includes(tag) ? B.pants : B.lavender + "88",
                      color:   selectedTags.includes(tag) ? "white"  : B.dark + "88",
                      border:  `1px solid ${selectedTags.includes(tag) ? B.pants : "transparent"}`,
                      cursor: "pointer", transition: "all 0.15s",
                      '&:hover': { bgcolor: selectedTags.includes(tag) ? "#6A3D96" : B.lavender },
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                ))}
              </Box>

              {/* ⑦ 메모 */}
              <TextField
                fullWidth size="small"
                placeholder="오늘 하루 한 줄 메모... (선택)"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                inputProps={{ maxLength: 80 }}
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5, fontSize: '0.82rem', fontFamily: "'Noto Sans KR',sans-serif",
                    '& fieldset': { borderColor: B.lavender },
                    '&:hover fieldset': { borderColor: B.pants + "88" },
                    '&.Mui-focused fieldset': { borderColor: B.pants },
                  },
                }}
              />
            </>
          ) : (
            /* 기록 완료 후 태그 + 메모 표시 */
            <>
              {myRec?.tags?.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "5px", mb: 1 }}>
                  {myRec.tags.map(tag => (
                    <Box key={tag} sx={{ px: 1, py: "2px", borderRadius: "20px", bgcolor: B.pants + "15", border: `1px solid ${B.pants}30`, fontSize: "0.68rem", color: B.pants, fontFamily: "'Noto Sans KR',sans-serif" }}>
                      {tag}
                    </Box>
                  ))}
                </Box>
              )}
              {myRec?.memo && (
                <Box sx={{ mb: 1.5, px: 1.4, py: 1, borderRadius: 2.5, bgcolor: B.lavender + "55", fontSize: "0.8rem", color: B.dark + "bb", fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{myRec.memo}"
                </Box>
              )}
            </>
          )}

          {/* 기록 버튼 */}
          <Button fullWidth variant="contained"
            disabled={submitted}
            onPointerDown={e => !submitted && createBuriPang(e)}
            onClick={handleSubmit}
            sx={{
              bgcolor: submitted ? B.green : B.pants,
              borderRadius: "14px", py: 1.2,
              fontFamily: "'Jua',sans-serif", fontSize: "0.95rem",
              boxShadow: submitted ? "none" : `0 4px 14px ${B.pants}44`,
              transition: "transform 0.1s",
              "&:active": { transform: "scale(0.96)" },
              "&:hover": { bgcolor: submitted ? B.green : "#6A3D96" },
              "&.Mui-disabled": { bgcolor: B.green, color: "white" },
            }}
          >
            {submitted ? `✓ 오늘 온도 기록 완료! (${myRec?.temp ?? todayTemp}°)` : "🌡️ 오늘 온도 기록하기"}
          </Button>

          {/* ⑨ 상대방 대기 상태 */}
          {submitted && (
            <Box sx={{ mt: 1.2, textAlign: "center" }}>
              {!otherRec ? (
                <Box sx={{ py: 1, px: 2, borderRadius: 2.5, bgcolor: B.lavender + "55" }}>
                  <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.78rem", color: B.pants + "cc" }}>
                    {otherUser} 기록 기다리는 중... 👀
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.82rem", color: B.green }}>
                  ✓ 둘 다 기록 완료! 💑
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* 주간 리포트 */}
      <WeeklyReport records={records} currentUser={currentUser} otherUser={otherUser} />

      {/* ④ 오늘 비교 — 원형 게이지 */}
      <Box sx={{ bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`, p: 2.5 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem", mb: 2 }}>💜 오늘 둘의 온도</Typography>
        <Stack direction="row" justifyContent="space-around" alignItems="flex-end" sx={{ mb: 2 }}>
          <CircleGauge value={myRec?.temp ?? 0} color={myRec ? getTempMeta(myRec.temp).color : B.lavender} size={96} label={currentUser} />
          <Box sx={{ textAlign: "center", pb: 1 }}>
            {myRec && otherRec ? (
              <>
                <Typography sx={{ fontSize: "1.4rem" }}>{Math.abs(myRec.temp - otherRec.temp) <= 5 ? "💜" : "🌡️"}</Typography>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.72rem", color: B.dark + "66" }}>
                  {Math.abs(myRec.temp - otherRec.temp) <= 5 ? "싱크" : `${Math.abs(myRec.temp - otherRec.temp)}도 차`}
                </Typography>
              </>
            ) : <Typography sx={{ fontSize: "1.2rem" }}>⋯</Typography>}
          </Box>
          <CircleGauge value={otherRec?.temp ?? 0} color={otherRec ? getTempMeta(otherRec.temp).color : B.lavender} size={96} label={otherUser} />
        </Stack>
        <Box sx={{ textAlign: "center", py: 1, bgcolor: B.lavender + "55", borderRadius: 3 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.78rem", color: B.dark + "88" }}>{getDiffMsg()}</Typography>
        </Box>
      </Box>

      {/* ⑩ 이달의 하이라이트 */}
      <MonthHighlights records={records} currentUser={currentUser} otherUser={otherUser} />

      {/* ⑤ recharts 그래프 */}
      <Box sx={{ bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`, p: 2.5, position: "relative", overflow: "visible" }}>
        <Box component="img" src={buri2} alt="" sx={{ position: "absolute", top: -20, right: 10, width: 40, animation: "headBob 2.5s ease-in-out infinite", filter: `drop-shadow(0 2px 6px ${B.accent}44)`, pointerEvents: "none" }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem" }}>📈 온도 히스토리</Typography>
          <Stack direction="row" gap={0.6}>
            {[{ key: "week", label: "주" }, { key: "month", label: "월" }, { key: "year", label: "년" }].map(({ key, label }) => (
              <Box key={key} onClick={() => { setChartTab(key); vibrate(12); }} sx={{
                px: 1.4, py: "4px", borderRadius: "20px", cursor: "pointer",
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", fontWeight: 700,
                bgcolor: chartTab === key ? B.pants : B.lavender,
                color:   chartTab === key ? "white"  : B.pants,
                transition: "all 0.15s", "&:active": { transform: "scale(0.93)" },
              }}>{label}</Box>
            ))}
          </Stack>
        </Stack>

        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={B.lavender} />
            <XAxis dataKey="label"
              tick={{ fontSize: 10, fontFamily: "'Noto Sans KR',sans-serif", fill: B.dark + "66" }}
              axisLine={false} tickLine={false}
              interval={chartTab === "month" ? "preserveStartEnd" : 0}
            />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 9, fill: B.dark + "55" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={50} stroke={B.lavender} strokeDasharray="4 2" />
            <Line dataKey={currentUser} name={currentUser} stroke={B.pants} strokeWidth={2.5} type="monotone" connectNulls dot={{ r: 4, fill: B.pants, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 6 }} />
            <Line dataKey={otherUser}   name={otherUser}   stroke={B.accent} strokeWidth={2.5} type="monotone" connectNulls dot={{ r: 4, fill: B.accent, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>

        <Stack direction="row" gap={2} justifyContent="center" sx={{ mt: 1 }}>
          {[{ user: currentUser, color: B.pants }, { user: otherUser, color: B.accent }].map(({ user, color }) => (
            <Stack key={user} direction="row" alignItems="center" gap={0.6}>
              <Box sx={{ width: 18, height: 3, borderRadius: 2, bgcolor: color }} />
              <Typography sx={{ fontSize: "0.7rem", color: B.dark + "77", fontFamily: "'Noto Sans KR',sans-serif" }}>{user}</Typography>
            </Stack>
          ))}
        </Stack>
        {chartTab === "year" && (
          <Typography sx={{ fontSize: "0.68rem", color: B.dark + "55", textAlign: "center", mt: 1, fontFamily: "'Noto Sans KR',sans-serif" }}>
            * 연 그래프는 해당 월 평균 온도 (패널티 0° 제외)
          </Typography>
        )}
      </Box>

    </Box>
  );
};

export default EmotionThermometer;
