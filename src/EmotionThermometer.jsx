import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, query, onSnapshot, addDoc,
  serverTimestamp, orderBy, doc, updateDoc, arrayUnion,
} from "firebase/firestore";
import { Box, Typography, Stack, Button, CircularProgress, Collapse } from "@mui/material";
import confetti from "canvas-confetti";
import { createBuriPang, vibrate } from "./touchEffects";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png";
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png";

const B = {
  pants:   "#7B4FA6",
  skin:    "#F5B8A0",
  cream:   "#FFF8F2",
  peach:   "#FFE4D4",
  lavender:"#EDE0F5",
  accent:  "#E8630A",
  dark:    "#3D1F00",
  danger:  "#E53935",
  green:   "#43A047",
};
const USERS = ["지수", "현하"];

// ── 유틸 ─────────────────────────────────────────────────────────
function getTempMeta(v) {
  v = parseInt(v ?? 0);
  if (v === 0)  return { emoji: "💀", label: "패널티",    color: "#888787" };
  if (v < 20)   return { emoji: "😶", label: "무기력",    color: "#B4B2A9" };
  if (v < 40)   return { emoji: "😔", label: "우울해요",  color: "#85B7EB" };
  if (v < 60)   return { emoji: "😊", label: "보통이에요",color: "#EF9F27" };
  if (v < 80)   return { emoji: "😄", label: "좋아요!",   color: "#7B4FA6" };
  return         { emoji: "🥰", label: "최고예요!",        color: "#E8630A" };
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateRange(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return toDateStr(d);
  });
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = Math.floor((now - start) / 86400000) + 1;
  return getDateRange(days);
}

function getYearMonths() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// ── 패널티 백필 ──────────────────────────────────────────────────
async function backfillMissedDays(currentUser, existingRecords) {
  const today = toDateStr(new Date());
  const recordedDates = new Set(
    existingRecords.filter(r => r.author === currentUser).map(r => r.date)
  );
  const range = getDateRange(30);
  const missedDays = range.filter(d => d < today && !recordedDates.has(d));
  await Promise.all(
    missedDays.map(date =>
      addDoc(collection(db, "temperatures"), {
        author: currentUser, temp: 0, date,
        isPenalty: true, createdAt: serverTimestamp(),
      })
    )
  );
}

// ── 캔버스 차트 ─────────────────────────────────────────────────
const TempChart = ({ myData, otherData, labels, myColor, otherColor }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const PAD = { top: 12, right: 12, bottom: 28, left: 28 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const n = labels.length;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#EDE0F588";
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(v => {
      const y = PAD.top + chartH - (v / 100) * chartH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.fillStyle = "#3D1F0055"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(v, PAD.left - 4, y + 3);
    });
    ctx.fillStyle = "#3D1F0066"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
    const step = n <= 12 ? 1 : Math.ceil(n / 8);
    labels.forEach((lbl, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      const x = PAD.left + (i / Math.max(n - 1, 1)) * chartW;
      ctx.fillText(lbl, x, H - 6);
    });
    const drawLine = (data, color) => {
      const pts = data.map((v, i) => ({
        x: PAD.left + (i / Math.max(n - 1, 1)) * chartW,
        y: PAD.top + chartH - ((v ?? 0) / 100) * chartH, v,
      }));
      ctx.beginPath(); ctx.moveTo(pts[0].x, PAD.top + chartH);
      pts.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(pts[pts.length - 1].x, PAD.top + chartH);
      ctx.closePath(); ctx.fillStyle = color + "22"; ctx.fill();
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round";
      pts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      pts.forEach(pt => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = pt.v === 0 ? "#888" : color; ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
      });
    };
    if (myData.length)    drawLine(myData, myColor);
    if (otherData.length) drawLine(otherData, otherColor);
  }, [myData, otherData, labels]);
  return (
    <canvas ref={canvasRef} width={340} height={140}
      style={{ width: "100%", height: "140px", display: "block" }} />
  );
};

// ── 주간 리포트 카드 ─────────────────────────────────────────────
const WeeklyReport = ({ records, currentUser, otherUser }) => {
  const [open, setOpen] = useState(false);

  const getWeekAvg = (user) => {
    const dates = getDateRange(7);
    const vals = dates
      .map(d => records.find(r => r.author === user && r.date === d))
      .filter(r => r && !r.isPenalty)
      .map(r => r.temp);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const getWeekMsg = (user, avg) => {
    if (avg === null) return `${user}는 이번 주 기록이 부족해요 😢`;
    if (avg >= 80) return `${user}는 이번 주 평균 ${avg}도! 최고의 한 주였어요 🥰🔥`;
    if (avg >= 60) return `${user}는 이번 주 평균 ${avg}도! 기분 좋은 한 주였네요 😄`;
    if (avg >= 40) return `${user}는 이번 주 평균 ${avg}도. 무난한 한 주였어요 😊`;
    return `${user}는 이번 주 평균 ${avg}도... 힘든 한 주였군요. 토닥토닥 🤗`;
  };

  const getTrend = (user) => {
    const dates = getDateRange(7);
    const vals = dates
      .map(d => records.find(r => r.author === user && r.date === d)?.temp ?? null)
      .filter(v => v !== null && v > 0);
    if (vals.length < 2) return null;
    const diff = vals[vals.length - 1] - vals[0];
    if (diff > 10)  return { icon: "📈", text: "점점 좋아지는 중!", color: B.green };
    if (diff < -10) return { icon: "📉", text: "조금 힘들어지고 있어요", color: "#85B7EB" };
    return { icon: "➡️", text: "안정적인 한 주", color: B.dark + "88" };
  };

  const myAvg    = getWeekAvg(currentUser);
  const otherAvg = getWeekAvg(otherUser);
  const myTrend    = getTrend(currentUser);
  const otherTrend = getTrend(otherUser);

  return (
    <Box sx={{ bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`, overflow: "hidden" }}>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          p: 2, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          bgcolor: open ? B.lavender + "55" : "white",
          transition: "background 0.2s",
          "&:active": { opacity: 0.8 },
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography sx={{ fontSize: "1.2rem" }}>📊</Typography>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem" }}>
            이번 주 리포트
          </Typography>
          {myAvg !== null && (
            <Box sx={{
              px: 1.2, py: "2px", borderRadius: "20px",
              bgcolor: getTempMeta(myAvg).color + "22",
              color: getTempMeta(myAvg).color,
              fontSize: "0.68rem", fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
            }}>
              내 평균 {myAvg}°
            </Box>
          )}
        </Stack>
        <Typography sx={{
          color: B.pants, fontSize: "0.9rem", transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
        }}>▼</Typography>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {[
            { user: currentUser, avg: myAvg, tr: myTrend, color: B.pants },
            { user: otherUser,   avg: otherAvg, tr: otherTrend, color: B.accent },
          ].map(({ user, avg, tr, color }) => (
            <Box key={user} sx={{
              p: 1.8, borderRadius: 3,
              bgcolor: color + "0D",
              border: `1px solid ${color}22`,
            }}>
              <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.8 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.85rem", color }}>
                  {user}
                </Typography>
                {avg !== null && (
                  <Typography sx={{ fontSize: "1.1rem" }}>{getTempMeta(avg).emoji}</Typography>
                )}
              </Stack>
              <Typography sx={{
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.82rem",
                color: B.dark + "CC", lineHeight: 1.5,
              }}>
                {getWeekMsg(user, avg)}
              </Typography>
              {tr && (
                <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.8 }}>
                  <Typography sx={{ fontSize: "0.85rem" }}>{tr.icon}</Typography>
                  <Typography sx={{
                    fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
                    color: tr.color, fontWeight: 700,
                  }}>
                    {tr.text}
                  </Typography>
                </Stack>
              )}
              {avg !== null && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ height: 6, bgcolor: B.lavender, borderRadius: "6px", overflow: "hidden" }}>
                    <Box sx={{
                      height: "100%", borderRadius: "6px",
                      bgcolor: getTempMeta(avg).color,
                      width: `${avg}%`, transition: "width 0.8s ease",
                    }} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.4 }}>
                    <Typography sx={{ fontSize: "0.6rem", color: B.dark + "44" }}>0</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: getTempMeta(avg).color, fontWeight: 700 }}>
                      주간 평균 {avg}°
                    </Typography>
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
};

// ── 공감 반응 카드 ───────────────────────────────────────────────
const EmpathyCard = ({ records, currentUser, otherUser, today }) => {
  const myRec    = records.find(r => r.author === currentUser && r.date === today);
  const otherRec = records.find(r => r.author === otherUser   && r.date === today);
  const [hugging, setHugging] = useState(false);

  if (!myRec || !otherRec) return null;
  const diff = Math.abs(myRec.temp - otherRec.temp);
  if (diff < 25) return null;

  const lowUser  = myRec.temp < otherRec.temp ? currentUser : otherUser;
  const highUser = myRec.temp > otherRec.temp ? currentUser : otherUser;
  const lowTemp  = Math.min(myRec.temp, otherRec.temp);
  const isLowMe  = lowUser === currentUser;

  const targetRec    = isLowMe ? myRec : otherRec;
  const alreadyHugged = (targetRec?.hugs ?? []).includes(currentUser);

  const handleHug = async () => {
    if (hugging || alreadyHugged || isLowMe) return;
    setHugging(true);
    vibrate([15, 10, 15, 10, 30]);
    try {
      if (targetRec?.id) {
        await updateDoc(doc(db, "temperatures", targetRec.id), {
          hugs: arrayUnion(currentUser),
        });
      }
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, type: "hug",
        content: `${currentUser}가 토닥토닥 해줬어요! 🤗💜`,
        createdAt: serverTimestamp(), isRead: false,
      });
      confetti({
        particleCount: 50, spread: 55, origin: { y: 0.6 },
        colors: [B.pants, B.skin, "#ffffff"],
      });
    } catch (e) { console.error(e); }
    setHugging(false);
  };

  return (
    <Box sx={{
      bgcolor: "white", borderRadius: 4,
      border: `2px solid ${B.accent}44`,
      p: 2.2,
      background: `linear-gradient(135deg, ${B.peach}44 0%, white 60%)`,
      position: "relative", overflow: "hidden",
    }}>
      <Box sx={{
        position: "absolute", top: -10, right: -10,
        width: 80, height: 80, borderRadius: "50%",
        bgcolor: B.accent + "08",
      }} />
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        <Typography sx={{ fontSize: "2rem", lineHeight: 1, mt: 0.3 }}>🌡️</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "0.9rem",
            color: B.accent, mb: 0.5,
          }}>
            온도 차이가 {diff}도나 나요!
          </Typography>
          <Typography sx={{
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.8rem",
            color: B.dark + "BB", lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}>
            {isLowMe
              ? `오늘 ${highUser}보다 기분이 처져있네요 😔\n${highUser}가 토닥여줄 거예요!`
              : `오늘 ${lowUser}가 ${lowTemp}도로 많이 힘들어 보여요.\n따뜻하게 안아주세요 🤗`
            }
          </Typography>

          {!isLowMe && (
            <Button
              variant="contained"
              disabled={hugging || alreadyHugged}
              onClick={handleHug}
              sx={{
                mt: 1.2,
                bgcolor: alreadyHugged ? B.green : B.accent,
                borderRadius: "20px", px: 2.5, py: 0.8,
                fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
                boxShadow: alreadyHugged ? "none" : `0 4px 12px ${B.accent}44`,
                "&:hover": { bgcolor: alreadyHugged ? B.green : "#C8550A" },
                "&.Mui-disabled": { bgcolor: B.green, color: "white" },
              }}
            >
              {hugging ? "전송 중..." : alreadyHugged ? "✓ 토닥여줬어요! 💜" : "❤️ 토닥토닥"}
            </Button>
          )}

          {isLowMe && (myRec?.hugs ?? []).length > 0 && (
            <Box sx={{
              mt: 1.2, px: 1.5, py: 0.8, borderRadius: "12px",
              bgcolor: B.pants + "15", border: `1px solid ${B.pants}33`,
              display: "inline-flex", alignItems: "center", gap: 0.6,
            }}>
              <Typography sx={{ fontSize: "1rem" }}>💜</Typography>
              <Typography sx={{
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.78rem",
                color: B.pants, fontWeight: 700,
              }}>
                {highUser}가 토닥여줬어요!
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

// ── 스트릭 위험 배너 ─────────────────────────────────────────────
const StreakDangerBanner = ({ streak, submitted, currentUser, otherUser, records }) => {
  const today    = toDateStr(new Date());
  const otherRec = records.find(r => r.author === otherUser && r.date === today);
  const hour     = new Date().getHours();

  const otherStreak = (() => {
    let s = 0;
    const d = new Date();
    while (s < 365) {
      const ds  = toDateStr(d);
      const rec = records.find(r => r.author === otherUser && r.date === ds);
      if (!rec || rec.isPenalty) break;
      s++; d.setDate(d.getDate() - 1);
    }
    return s;
  })();

  const showMyWarning    = !submitted;
  const showOtherWarning = !otherRec && hour >= 18;

  if (!showMyWarning && !showOtherWarning) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {showMyWarning && streak > 0 && (
        <Box sx={{
          p: 1.8, borderRadius: 3,
          background: `linear-gradient(135deg, ${B.danger}18, ${B.accent}12)`,
          border: `1.5px solid ${B.danger}44`,
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Typography sx={{ fontSize: "1.5rem" }}>🔥</Typography>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: B.danger }}>
              {streak}일 스트릭이 끊길 위기예요!
            </Typography>
            <Typography sx={{
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem",
              color: B.dark + "99", mt: 0.3,
            }}>
              오늘 기록 안 하면 💀 0도 패널티가 부여돼요
            </Typography>
          </Box>
        </Box>
      )}
      {showMyWarning && streak === 0 && (
        <Box sx={{
          p: 1.8, borderRadius: 3,
          background: `linear-gradient(135deg, #85B7EB18, ${B.lavender}44)`,
          border: `1.5px solid #85B7EB55`,
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Typography sx={{ fontSize: "1.5rem" }}>😶</Typography>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: "#5B8FBB" }}>
              오늘 아직 기록 전이에요
            </Typography>
            <Typography sx={{
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem",
              color: B.dark + "99", mt: 0.3,
            }}>
              기록하면 스트릭을 시작할 수 있어요 🌱
            </Typography>
          </Box>
        </Box>
      )}
      {showOtherWarning && (
        <Box sx={{
          p: 1.8, borderRadius: 3,
          background: `linear-gradient(135deg, ${B.accent}12, ${B.peach}44)`,
          border: `1.5px solid ${B.accent}33`,
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Typography sx={{ fontSize: "1.5rem" }}>👀</Typography>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: B.accent }}>
              {otherUser}가 아직 안 했어요!
            </Typography>
            <Typography sx={{
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem",
              color: B.dark + "99", mt: 0.3,
            }}>
              {otherStreak > 0
                ? `${otherStreak}일 스트릭이 위험해요 — 알려줘요 📣`
                : "오늘 기록하라고 알려주세요!"}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
const EmotionThermometer = ({ currentUser }) => {
  const [records, setRecords]       = useState([]);
  const [todayTemp, setTodayTemp]   = useState(50);
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [chartTab, setChartTab]     = useState("week");
  const [backfilled, setBackfilled] = useState(false);

  const today     = toDateStr(new Date());
  const otherUser = USERS.find(u => u !== currentUser) ?? USERS[0];

  useEffect(() => {
    const q = query(collection(db, "temperatures"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, async snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecords(data);
      const myToday = data.find(r => r.author === currentUser && r.date === today);
      if (myToday) { setTodayTemp(myToday.temp); setSubmitted(true); }
      if (!backfilled) {
        setBackfilled(true);
        await backfillMissedDays(currentUser, data);
      }
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
        isPenalty: false, hugs: [], createdAt: serverTimestamp(),
      });
      if (todayTemp >= 80)
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 },
          colors: [B.pants, B.skin, "#ffffff"] });

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

  const getChartData = () => {
    const map = {};
    records.forEach(r => { map[`${r.author}_${r.date}`] = r.temp; });
    if (chartTab === "week") {
      const dates = getDateRange(7);
      return {
        labels:    dates.map(d => `${parseInt(d.slice(5,7))}/${parseInt(d.slice(8))}`),
        myData:    dates.map(d => map[`${currentUser}_${d}`] ?? null),
        otherData: dates.map(d => map[`${otherUser}_${d}`]  ?? null),
      };
    }
    if (chartTab === "month") {
      const dates = getMonthRange();
      return {
        labels:    dates.map(d => `${parseInt(d.slice(8))}일`),
        myData:    dates.map(d => map[`${currentUser}_${d}`] ?? null),
        otherData: dates.map(d => map[`${otherUser}_${d}`]  ?? null),
      };
    }
    const months = getYearMonths();
    const avg = (user, ym) => {
      const vals = records.filter(r =>
        r.author === user && r.date.startsWith(ym) && !r.isPenalty
      ).map(r => r.temp);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    return {
      labels:    months.map(m => `${parseInt(m.slice(5))}월`),
      myData:    months.map(m => avg(currentUser, m)),
      otherData: months.map(m => avg(otherUser, m)),
    };
  };

  const getStreak = (user) => {
    let streak = 0;
    const d = new Date();
    while (streak < 365) {
      const ds  = toDateStr(d);
      const rec = records.find(r => r.author === user && r.date === ds);
      if (!rec || rec.isPenalty) break;
      streak++; d.setDate(d.getDate() - 1);
    }
    return streak;
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

  if (loading) return (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <CircularProgress sx={{ color: B.pants }} size={28} />
    </Box>
  );

  const streak   = getStreak(currentUser);
  const myRec    = records.find(r => r.author === currentUser && r.date === today);
  const otherRec = records.find(r => r.author === otherUser   && r.date === today);
  const myMeta    = getTempMeta(myRec?.temp);
  const otherMeta = getTempMeta(otherRec?.temp);
  const { labels, myData, otherData } = getChartData();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

      {/* ── 스트릭 위험 배너 ── */}
      <StreakDangerBanner
        streak={streak} submitted={submitted}
        currentUser={currentUser} otherUser={otherUser} records={records}
      />

      {/* ── 공감 반응 카드 ── */}
      <EmpathyCard
        records={records} currentUser={currentUser}
        otherUser={otherUser} today={today}
      />

      {/* ── 오늘 입력 카드 ── */}
      <Box sx={{
        bgcolor: "white", borderRadius: 4,
        border: `1.5px solid ${B.lavender}`,
        position: "relative", overflow: "visible",
        backgroundImage: `radial-gradient(circle at 95% 5%, ${B.lavender} 0%, transparent 40%)`,
      }}>
        <Box component="img" src={buri1} alt="" sx={{
          position: "absolute", top: -22, right: 10, width: 48,
          animation: "headBob 2s ease-in-out infinite",
          filter: `drop-shadow(0 2px 8px ${B.pants}44)`,
          pointerEvents: "none",
        }} />
        <Box sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1rem" }}>
              오늘 온도는? 🌡️
            </Typography>
            <Stack direction="row" gap={0.8}>
              {streak > 0 && (
                <Box sx={{
                  px: 1.2, py: "2px", borderRadius: "20px",
                  bgcolor: B.accent + "22", color: B.accent,
                  fontSize: "0.65rem", fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
                }}>
                  🔥 {streak}일 연속
                </Box>
              )}
              <Box sx={{
                px: 1.2, py: "2px", borderRadius: "20px",
                bgcolor: B.lavender, color: B.pants,
                fontSize: "0.65rem", fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
              }}>
                {today.slice(5).replace("-", "/")}
              </Box>
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.85rem", color: B.dark }}>
              {currentUser}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.8}>
              <Typography sx={{
                fontFamily: "'Jua',sans-serif", fontSize: "1.8rem", lineHeight: 1,
                color: getTempMeta(todayTemp).color, transition: "color 0.2s",
              }}>
                {todayTemp}
              </Typography>
              <Typography sx={{ fontSize: "20px" }}>{getTempMeta(todayTemp).emoji}</Typography>
            </Stack>
          </Stack>

          <Box
            component="input" type="range" min="1" max="100" step="1"
            value={todayTemp} disabled={submitted}
            onChange={e => !submitted && setTodayTemp(parseInt(e.target.value))}
            sx={{
              width: "100%", height: "8px", borderRadius: "8px",
              outline: "none", border: "none", display: "block",
              cursor: submitted ? "not-allowed" : "pointer",
              WebkitAppearance: "none", appearance: "none",
              opacity: submitted ? 0.65 : 1,
              background: `linear-gradient(to right, ${getTempMeta(todayTemp).color} ${todayTemp}%, ${B.lavender} ${todayTemp}%)`,
              mb: 0.5,
              "&::-webkit-slider-thumb": {
                WebkitAppearance: "none",
                width: "22px", height: "22px", borderRadius: "50%",
                background: getTempMeta(todayTemp).color,
                border: "2.5px solid white", boxShadow: "0 2px 6px #0002",
                cursor: submitted ? "not-allowed" : "pointer",
              },
            }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55" }}>😶 0</Typography>
            <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55" }}>50</Typography>
            <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55" }}>100 🔥</Typography>
          </Stack>

          <Box sx={{
            textAlign: "center", py: 1, mb: 2,
            bgcolor: getTempMeta(todayTemp).color + "18",
            borderRadius: 3, border: `1.5px dashed ${getTempMeta(todayTemp).color}44`,
          }}>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: "0.88rem",
              color: getTempMeta(todayTemp).color,
            }}>
              {getTempMeta(todayTemp).emoji} {getTempMeta(todayTemp).label}
            </Typography>
            {!submitted && (
              <Typography sx={{ fontSize: "0.65rem", color: B.dark + "55", mt: 0.3 }}>
                오늘 자정 전까지 기록해야 해요! 빠지면 0도 💀
              </Typography>
            )}
          </Box>

          <Button fullWidth variant="contained"
            disabled={submitted}
            onPointerDown={e => !submitted && createBuriPang(e)}
            onClick={handleSubmit}
            sx={{
              bgcolor: submitted ? B.green : B.pants,
              borderRadius: "14px", py: 1.2,
              fontFamily: "'Jua',sans-serif", fontSize: "0.95rem",
              position: "relative", overflow: "hidden",
              boxShadow: submitted ? "none" : `0 4px 14px ${B.pants}44`,
              transition: "transform 0.1s",
              "&:active": { transform: "scale(0.96)" },
              "&:hover": { bgcolor: submitted ? B.green : "#6A3D96" },
              "&.Mui-disabled": { bgcolor: B.green, color: "white" },
            }}
          >
            {submitted ? `✓ 오늘 온도 기록 완료! (${todayTemp}°)` : "🌡️ 오늘 온도 기록하기"}
          </Button>
        </Box>
      </Box>

      {/* ── 주간 리포트 ── */}
      <WeeklyReport records={records} currentUser={currentUser} otherUser={otherUser} />

      {/* ── 오늘 비교 ── */}
      <Box sx={{ bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`, p: 2.5 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem", mb: 1.5 }}>
          💜 오늘 둘의 온도
        </Typography>
        {[
          { user: currentUser, meta: myMeta,    record: myRec,    color: B.pants },
          { user: otherUser,   meta: otherMeta, record: otherRec, color: B.accent },
        ].map(({ user, meta, record, color }) => (
          <Stack key={user} direction="row" alignItems="center" gap={1.2} sx={{ mb: 1 }}>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: "0.8rem",
              color: B.dark, width: 32, flexShrink: 0,
            }}>{user}</Typography>
            <Box sx={{ flex: 1, height: 12, bgcolor: B.lavender, borderRadius: "8px", overflow: "hidden" }}>
              <Box sx={{
                height: "100%", borderRadius: "8px",
                bgcolor: record ? meta.color : B.lavender,
                width: `${record?.temp ?? 0}%`,
                transition: "width 0.6s ease",
              }} />
            </Box>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
              color: record ? meta.color : B.dark + "44",
              width: 52, textAlign: "right", flexShrink: 0,
            }}>
              {record ? `${record.temp}° ${meta.emoji}` : "미기록"}
            </Typography>
          </Stack>
        ))}
        <Box sx={{
          textAlign: "center", py: 1, mt: 0.5,
          bgcolor: B.lavender + "55", borderRadius: 3,
        }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "0.78rem", color: B.dark + "88",
          }}>
            {getDiffMsg()}
          </Typography>
        </Box>
      </Box>

      {/* ── 그래프 ── */}
      <Box sx={{
        bgcolor: "white", borderRadius: 4, border: `1.5px solid ${B.lavender}`,
        p: 2.5, position: "relative", overflow: "visible",
      }}>
        <Box component="img" src={buri2} alt="" sx={{
          position: "absolute", top: -20, right: 10, width: 40,
          animation: "headBob 2.5s ease-in-out infinite",
          filter: `drop-shadow(0 2px 6px ${B.accent}44)`,
          pointerEvents: "none",
        }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.95rem" }}>
            📈 온도 히스토리
          </Typography>
          <Stack direction="row" gap={0.6}>
            {[{ key: "week", label: "주" }, { key: "month", label: "월" }, { key: "year", label: "년" }]
              .map(({ key, label }) => (
                <Box key={key}
                  onClick={() => { setChartTab(key); vibrate(12); }}
                  sx={{
                    px: 1.4, py: "4px", borderRadius: "20px", cursor: "pointer",
                    fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", fontWeight: 700,
                    bgcolor: chartTab === key ? B.pants : B.lavender,
                    color:   chartTab === key ? "white"  : B.pants,
                    transition: "all 0.15s",
                    "&:active": { transform: "scale(0.93)" },
                  }}
                >{label}</Box>
              ))}
          </Stack>
        </Stack>
        <TempChart
          myData={myData} otherData={otherData} labels={labels}
          myColor={B.pants} otherColor={B.accent}
        />
        <Stack direction="row" gap={2} justifyContent="center" sx={{ mt: 1.2 }}>
          {[
            { user: currentUser, color: B.pants },
            { user: otherUser,   color: B.accent },
            { user: "💀 패널티(0°)", color: "#888" },
          ].map(({ user, color }) => (
            <Stack key={user} direction="row" alignItems="center" gap={0.6}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
              <Typography sx={{
                fontSize: "0.7rem", color: B.dark + "77",
                fontFamily: "'Noto Sans KR',sans-serif",
              }}>{user}</Typography>
            </Stack>
          ))}
        </Stack>
        {chartTab === "year" && (
          <Typography sx={{
            fontSize: "0.68rem", color: B.dark + "55", textAlign: "center", mt: 1,
            fontFamily: "'Noto Sans KR',sans-serif",
          }}>
            * 연 그래프는 해당 월 평균 온도시소 (패널티 0° 제외)
          </Typography>
        )}
      </Box>

    </Box>
  );
};

export default EmotionThermometer;