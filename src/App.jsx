import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously, updateProfile, signOut } from "firebase/auth";
import { collection, query, onSnapshot, updateDoc, doc, where, addDoc, orderBy } from "firebase/firestore";
import confetti from "canvas-confetti";

import {
  Container, Typography, Box, Stack, Button, CircularProgress,
  Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";

import MenuIcon            from "@mui/icons-material/Menu";
import HomeIcon            from "@mui/icons-material/Home";
import CalendarMonthIcon   from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon     from "@mui/icons-material/ChevronLeft";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CardGiftcardIcon    from "@mui/icons-material/CardGiftcard";
import MailIcon            from "@mui/icons-material/Mail";
import ThermostatIcon      from "@mui/icons-material/Thermostat";
import MenuBookIcon        from "@mui/icons-material/MenuBook";

import CoupleCalendar     from "./CoupleCalendar";
import DiaryWrite         from "./DiaryWrite";
import DiaryList          from "./DiaryList";
import CoupleCoupons      from "./CoupleCoupons";
import CoupleDDay         from "./CoupleDDay";
import SecretLetter       from "./SecretLetter";
import EmotionThermometer from "./EmotionThermometer";
import ScheduleList       from "./ScheduleList";
import BucketList         from "./Bucketlist";
import { createRipple, createBuriPang, vibrate } from "./touchEffects";

import meImg from "./assets/JS.jpg";
import gfImg from "./assets/HY.jpg";
import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png";
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png";
import buri3 from "./assets/image.png";
import buri4 from "./assets/KakaoTalk_20260316_132913765.png";
import buri5 from "./assets/KakaoTalk_20260316_132923854.png";
import buri6 from "./assets/KakaoTalk_20260316_132934584.png";
import buri7 from "./assets/KakaoTalk_20260316_132945257.png";
import buri8 from "./assets/KakaoTalk_20260316_132954818.png";
import buri9 from "./assets/KakaoTalk_20260316_133007779.png";

// ── 상수 ─────────────────────────────────────────────────────────
const B = {
  skin: "#F5B8A0", pants: "#7B4FA6", dark: "#3D1F00",
  cream: "#FFF8F2", peach: "#FFE4D4", lavender: "#EDE0F5",
  accent: "#E8630A", pink: "#FF8FAB", green: "#1D9E75",
};

const PAGE = {
  MAIN: "main", SCHEDULE: "schedule", COUPONS: "coupons",
  LETTER: "letter", THERMO: "thermo", DIARY_ALL: "diary_all", BUCKET: "bucket",
};

// ── 전역 스타일 ────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;700;900&display=swap');
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Noto Sans KR', sans-serif;
      background-color: ${B.cream};
      background-image:
        radial-gradient(circle at 15% 20%, ${B.peach}99 0%, transparent 35%),
        radial-gradient(circle at 85% 70%, ${B.lavender}88 0%, transparent 35%);
      min-height: 100vh;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${B.peach}; }
    ::-webkit-scrollbar-thumb { background: ${B.pants}88; border-radius: 10px; }
    .MuiPaper-root, .MuiTypography-root, .MuiButton-root { font-family: 'Noto Sans KR', sans-serif !important; }
    .buri-float { position: fixed; pointer-events: none; z-index: 0; opacity: 0.13; filter: drop-shadow(0 4px 12px #7B4FA633); }
    .buri-float.b2 { top: 120px; left: -25px; width: 150px; animation: buriFloat2 7s ease-in-out infinite; }
    .buri-float.b3 { bottom: 200px; left: 5px; width: 110px; animation: buriFloat3 5s ease-in-out infinite; }
    @keyframes buriFloat1 { 0%,100%{transform:translateY(0) rotate(-5deg);} 50%{transform:translateY(-18px) rotate(3deg);} }
    @keyframes buriFloat2 { 0%,100%{transform:translateY(0) rotate(6deg);} 50%{transform:translateY(-14px) rotate(-4deg);} }
    @keyframes buriFloat3 { 0%,100%{transform:translateY(0) rotate(-8deg);} 50%{transform:translateY(-22px) rotate(5deg);} }
    @keyframes wobble { 0%,100%{transform:rotate(-1deg);} 50%{transform:rotate(1.5deg);} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
    @keyframes headBob { 0%,100%{transform:rotate(0deg);} 25%{transform:rotate(-4deg);} 75%{transform:rotate(4deg);} }
    @keyframes pageSlideIn { from{opacity:0;transform:translateX(30px);} to{opacity:1;transform:translateX(0);} }
    @keyframes loginBgShift { 0%{background-position:0% 50%;} 50%{background-position:100% 50%;} 100%{background-position:0% 50%;} }
    @keyframes titleDrop { 0%{opacity:0;transform:translateY(-30px) scale(0.8);} 70%{transform:translateY(5px) scale(1.05);} 100%{opacity:1;transform:translateY(0) scale(1);} }
    @keyframes cardSlideUp { 0%{opacity:0;transform:translateY(40px) scale(0.88);} 70%{transform:translateY(-5px) scale(1.02);} 100%{opacity:1;transform:translateY(0) scale(1);} }
    @keyframes avatarPulseA { 0%,100%{box-shadow:0 4px 18px ${B.pants}44,0 0 0 0 ${B.pants}22;} 50%{box-shadow:0 6px 24px ${B.pants}66,0 0 0 10px transparent;} }
    @keyframes avatarPulseB { 0%,100%{box-shadow:0 4px 18px ${B.skin}66,0 0 0 0 ${B.skin}33;} 50%{box-shadow:0 6px 24px ${B.skin}88,0 0 0 10px transparent;} }
    @keyframes shineSlide { 0%,65%{left:-70%;} 80%{left:130%;} 100%{left:130%;} }
    @keyframes floatEmoji { 0%{transform:translateY(0) rotate(0deg);opacity:0.2;} 50%{opacity:0.45;} 100%{transform:translateY(-100px) rotate(20deg);opacity:0;} }
    @keyframes twinkleDot { 0%,100%{opacity:0.12;transform:scale(0.6);} 50%{opacity:0.7;transform:scale(1.3);} }
    @keyframes buriWiggle { 0%,100%{transform:rotate(-10deg) translateY(0);} 50%{transform:rotate(10deg) translateY(-6px);} }
    @keyframes loginBuriFloat { 0%,100%{transform:translateY(0) rotate(-5deg) scale(1);} 50%{transform:translateY(-12px) rotate(4deg) scale(1.04);} }
    @keyframes hintPulse { 0%,100%{opacity:0.45;letter-spacing:1px;} 50%{opacity:0.9;letter-spacing:3px;} }
    @keyframes buriRippleAnim { to{transform:scale(4);opacity:0;} }
    @keyframes buriPangFly { 0%{opacity:1;transform:translate(-50%,-50%) scale(1);} 100%{opacity:0;transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0.2);} }
    @keyframes buriHeartBurst { 0%{opacity:1;transform:translate(-50%,-50%) scale(1.2);} 100%{opacity:0;transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0);} }
    @keyframes buri-shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-7px) rotate(-2deg);} 40%{transform:translateX(7px) rotate(2deg);} 60%{transform:translateX(-5px) rotate(-1deg);} 80%{transform:translateX(4px) rotate(1deg);} }
    .buri-shake { animation: buri-shake 0.4s ease !important; }
    @keyframes hamPulse {
      0%,100%{ box-shadow: 0 4px 18px ${B.pants}66, 0 0 0 0 ${B.pants}33; transform: scale(1); }
      50%    { box-shadow: 0 6px 24px ${B.pants}88, 0 0 0 6px transparent; transform: scale(1.06); }
    }
    @keyframes hamRing {
      0%   { transform: scale(1);   opacity: 0.7; }
      60%  { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    @keyframes gridCardIn {
      from { opacity:0; transform: translateY(12px) scale(0.95); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    @keyframes drawerHeaderIn {
      from { opacity:0; transform: translateY(-10px); }
      to   { opacity:1; transform: translateY(0); }
    }
  `}</style>
);

// ── SectionCard ───────────────────────────────────────────────────
const SectionCard = ({ icon, title, sub, buriImg, bgColor, borderColor, onMore, children }) => (
  <Box sx={{
    bgcolor: bgColor || B.cream, borderRadius: 4,
    border: `1.5px solid ${borderColor || B.pants}33`,
    position: "relative", overflow: "visible",
    animation: "fadeInUp 0.4s ease both",
  }}>
    <Box sx={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      px: 2, py: 1.2,
      borderBottom: `1px dashed ${borderColor || B.pants}22`,
      position: "relative",
    }}>
      {buriImg && (
        <Box component="img" src={buriImg} alt=""
          sx={{ position: "absolute", top: -18, left: 10, width: 38,
            objectFit: "contain", pointerEvents: "none",
            filter: `drop-shadow(0 2px 6px ${borderColor || B.pants}44)`,
            animation: "headBob 2.5s ease-in-out infinite",
          }}
        />
      )}
      <Box sx={{ pl: buriImg ? 5.5 : 0 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.95rem",
          color: borderColor || B.pants, lineHeight: 1.2 }}>
          {icon} {title}
        </Typography>
        {sub && <Typography sx={{ fontSize: "0.68rem", color: B.dark + "66" }}>{sub}</Typography>}
      </Box>
      {onMore && (
        <Box onClick={onMore} sx={{
          display: "flex", alignItems: "center", gap: 0.4,
          px: 1.2, py: "3px", borderRadius: "20px",
          bgcolor: (borderColor || B.pants) + "18",
          color: borderColor || B.pants,
          fontSize: "0.68rem", fontWeight: 700,
          fontFamily: "'Noto Sans KR',sans-serif",
          cursor: "pointer", flexShrink: 0,
          transition: "all 0.15s",
          "&:active": { transform: "scale(0.93)" },
        }}>
          전체보기 <ArrowForwardIosIcon sx={{ fontSize: 10 }} />
        </Box>
      )}
    </Box>
    <Box sx={{ p: 2 }}>{children}</Box>
  </Box>
);

// ── SubPage ───────────────────────────────────────────────────────
const SubPage = ({ title, icon, onBack, children }) => (
  <Box sx={{ animation: "pageSlideIn 0.3s ease both", minHeight: "100vh" }}>
    <Box sx={{
      position: "sticky", top: 0, zIndex: 100,
      bgcolor: B.cream + "ee", backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${B.pants}22`,
      px: 2, py: 1.5,
      display: "flex", alignItems: "center", gap: 1.5,
    }}>
      <IconButton onClick={() => { onBack(); vibrate(15); }}
        sx={{ color: B.pants, p: 0.5, "&:active": { transform: "scale(0.88)" } }}>
        <ChevronLeftIcon />
      </IconButton>
      <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants,
        fontSize: "1.05rem", lineHeight: 1 }}>
        {icon} {title}
      </Typography>
    </Box>
    <Container maxWidth="sm" sx={{ py: 2, pb: 6 }}>
      {children}
    </Container>
  </Box>
);

// ── SecretLetterPreview ───────────────────────────────────────────
const SecretLetterPreview = () => {
  const [latest, setLatest] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "letters"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setLatest(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    });
    return () => unsub();
  }, []);

  if (!latest) return (
    <Typography sx={{ textAlign: "center", py: 2, fontSize: "0.82rem",
      color: B.dark + "66", fontFamily: "'Jua',sans-serif" }}>
      아직 편지가 없어요 🐷
    </Typography>
  );
  const c = { border: "#7B4FA6", bg: "#EDE0F5" };
  return (
    <Box sx={{ bgcolor: c.bg + "55", borderRadius: 3, p: 1.8,
      border: `1.5px dashed ${c.border}44`,
      display: "flex", alignItems: "center", gap: 1.5 }}>
      <Typography sx={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>
        {latest.isOpened ? "💌" : "🔒"}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.85rem", color: B.pants }}>
          {latest.isAnonymous && !latest.isOpened ? "🎭 부리부리의 편지" : `${latest.from}의 편지`}
        </Typography>
        <Typography sx={{ fontSize: "0.68rem", color: B.dark + "66", mt: 0.3 }}>
          {latest.isOpened
            ? latest.content?.slice(0, 30) + (latest.content?.length > 30 ? "..." : "")
            : "아직 열리지 않은 편지예요 🔒"}
        </Typography>
      </Box>
    </Box>
  );
};

// ── LoginScreen ───────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const floatEmojis = ['🐷','💜','✨','🎉','⭐','💕','🎊','🐷','💜','✨'];
  const handleSelect = (role, e) => {
    createBuriPang(e);
    vibrate([30, 15, 30, 15, 60]);
    setTimeout(() => onLogin(role), 200);
  };
  return (
    <Box sx={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${B.cream} 0%, ${B.lavender} 45%, ${B.peach} 100%)`,
      backgroundSize: '300% 300%', animation: 'loginBgShift 8s ease infinite',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      px: 3, py: 4, position: 'relative', overflow: 'hidden',
    }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Box key={i} sx={{
          position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
          width: `${4 + (i % 5) * 1.5}px`, height: `${4 + (i % 5) * 1.5}px`,
          left: `${(i * 5.1) % 100}%`, top: `${(i * 7.3) % 100}%`,
          bgcolor: [B.pants, B.skin, B.accent, B.lavender][i % 4] + '88',
          animation: `twinkleDot ${1.5 + (i % 3) * 0.7}s ease-in-out infinite`,
          animationDelay: `${(i * 0.17).toFixed(1)}s`,
        }} />
      ))}
      {floatEmojis.map((emoji, i) => (
        <Box key={i} sx={{
          position: 'absolute', bottom: '-20px', left: `${8 + i * 9}%`,
          fontSize: '20px', lineHeight: 1,
          animation: `floatEmoji ${5 + (i % 4)}s ease-in-out infinite`,
          animationDelay: `${(i * 0.65).toFixed(1)}s`,
          pointerEvents: 'none', userSelect: 'none',
        }}>{emoji}</Box>
      ))}
      <Stack direction="row" justifyContent="center" alignItems="flex-end"
        gap={1.5} sx={{ mb: 1, position: 'relative', zIndex: 2 }}>
        {[{ img: buri3, w: 52, d: '2.2s', dl: '0s' },
          { img: buri6, w: 76, d: '2.6s', dl: '0.3s' },
          { img: buri2, w: 52, d: '2.4s', dl: '0.6s' }]
          .map(({ img, w, d, dl }, i) => (
            <Box key={i} component="img" src={img} alt="" sx={{
              width: w, objectFit: 'contain',
              filter: `drop-shadow(0 4px 14px ${B.pants}55)`,
              animation: `loginBuriFloat ${d} ease-in-out infinite`,
              animationDelay: dl,
            }} />
          ))}
      </Stack>
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
        <Typography sx={{
          fontFamily: "'Jua', sans-serif", fontSize: '2.2rem', color: B.pants,
          textShadow: `3px 3px 0 ${B.skin}88, 0 0 30px ${B.pants}33`,
          animation: 'titleDrop 0.65s ease both', lineHeight: 1.2,
        }}>Who are you? 🕵️</Typography>
        <Typography sx={{
          fontSize: '0.82rem', color: B.dark + '88', mt: 0.8,
          fontFamily: "'Noto Sans KR', sans-serif",
          animation: 'fadeInUp 0.5s ease 0.3s both',
        }}>부리부리가 기다리고 있어요 🐷</Typography>
      </Box>
      <Stack direction="row" spacing={2.5} sx={{ position: 'relative', zIndex: 2, mb: 3 }}>
        {/* 지수 카드 */}
        <Box component="button" onPointerDown={e => handleSelect("지수", e)}
          sx={{
            width: 148, background: 'white', borderRadius: '28px',
            p: '22px 16px 18px', textAlign: 'center', cursor: 'pointer',
            border: `2.5px solid ${B.pants}55`, boxShadow: `0 8px 28px ${B.pants}22`,
            position: 'relative', overflow: 'visible',
            animation: 'cardSlideUp 0.55s ease 0.15s both',
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:active': { transform: 'scale(0.91)' }, outline: 'none',
          }}>
          <Box sx={{
            position: 'absolute', top: 0, left: '-70%', width: '40%', height: '100%',
            borderRadius: '28px', pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
            animation: 'shineSlide 3.5s ease-in-out infinite',
          }} />
          <Box sx={{
            width: 88, height: 88, borderRadius: '50%', border: `3.5px solid ${B.pants}`,
            overflow: 'hidden', mx: 'auto', mb: 1.5, animation: 'avatarPulseA 2.5s ease-in-out infinite',
          }}>
            <Box component="img" src={meImg} alt="지수" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', color: B.dark, mb: 0.6 }}>지수</Typography>
          <Box sx={{
            display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
            px: 1.5, py: '3px', borderRadius: '20px',
            bgcolor: B.lavender, color: B.pants, fontFamily: "'Noto Sans KR',sans-serif",
          }}>💜 나야나</Box>
          <Box component="img" src={buri1} alt="" sx={{
            position: 'absolute', top: -22, right: -14, width: 46,
            objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 2px 8px ${B.pants}55)`,
            animation: 'buriWiggle 2.2s ease-in-out infinite',
          }} />
        </Box>
        {/* 현하 카드 */}
        <Box component="button" onPointerDown={e => handleSelect("현하", e)}
          sx={{
            width: 148, background: 'white', borderRadius: '28px',
            p: '22px 16px 18px', textAlign: 'center', cursor: 'pointer',
            border: `2.5px solid ${B.skin}`, boxShadow: `0 8px 28px ${B.skin}44`,
            position: 'relative', overflow: 'visible',
            animation: 'cardSlideUp 0.55s ease 0.3s both',
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:active': { transform: 'scale(0.91)' }, outline: 'none',
          }}>
          <Box sx={{
            position: 'absolute', top: 0, left: '-70%', width: '40%', height: '100%',
            borderRadius: '28px', pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
            animation: 'shineSlide 3.5s ease-in-out 1.2s infinite',
          }} />
          <Box sx={{
            width: 88, height: 88, borderRadius: '50%', border: `3.5px solid ${B.skin}`,
            overflow: 'hidden', mx: 'auto', mb: 1.5, animation: 'avatarPulseB 2.8s ease-in-out infinite',
          }}>
            <Box component="img" src={gfImg} alt="현하" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', color: B.dark, mb: 0.6 }}>현하</Typography>
          <Box sx={{
            display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
            px: 1.5, py: '3px', borderRadius: '20px',
            bgcolor: B.peach, color: B.accent, fontFamily: "'Noto Sans KR',sans-serif",
          }}>🧡 나야나</Box>
          <Box component="img" src={buri7} alt="" sx={{
            position: 'absolute', top: -22, right: -14, width: 46,
            objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 2px 8px ${B.skin}88)`,
            animation: 'buriWiggle 2.6s ease-in-out infinite',
            animationDelay: '0.4s',
          }} />
        </Box>
      </Stack>
      <Typography sx={{
        fontFamily: "'Jua',sans-serif", fontSize: '0.72rem', color: B.dark + '66',
        animation: 'hintPulse 2.5s ease-in-out infinite',
        position: 'relative', zIndex: 2, mb: 2.5,
      }}>✨ 나를 선택해서 입장하기 ✨</Typography>
      <Stack direction="row" gap={2} justifyContent="center"
        sx={{ position: 'relative', zIndex: 2, opacity: 0.6 }}>
        {[buri5, buri8, buri4, buri9].map((img, i) => (
          <Box key={i} component="img" src={img} alt="" sx={{
            width: 34, objectFit: 'contain',
            animation: `buriWiggle ${2 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.25}s`,
            filter: `drop-shadow(0 2px 6px ${B.pants}33)`,
          }} />
        ))}
      </Stack>
    </Box>
  );
};

// ── App ───────────────────────────────────────────────────────────
function App() {
  const [currentUser,      setCurrentUser]      = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [isDrawerOpen,     setIsDrawerOpen]     = useState(false);
  const [currentPage,      setCurrentPage]      = useState(PAGE.MAIN);

  // ── 캘린더 알림 state ─────────────────────────────────────────
  const [calNotifOpen, setCalNotifOpen] = useState(false);
  const [calNotifData, setCalNotifData] = useState(null); // { id, writer, count }
  // unreadList를 ref로도 유지해서 클로저 stale 문제 완전 차단
  const [calUnreadList, setCalUnreadList] = useState([]);
  const calUnreadRef   = useRef([]);

  // ── diary/comment 알림 state ──────────────────────────────────
  const [diaryNotifOpen, setDiaryNotifOpen] = useState(false);
  const [diaryNotifMsg,  setDiaryNotifMsg]  = useState("");

  // ── 이미 처리한 알림 ID 세트 (메모리) ────────────────────────
  // ── 이미 처리한 알림 ID (localStorage로 앱 재시작 후에도 유지) ──────
  const shownCalIds = useRef(
    new Set(JSON.parse(localStorage.getItem("shownCalIds") || "[]"))
  );
  const shownDiaryIds = useRef(
    new Set(JSON.parse(localStorage.getItem("shownDiaryIds") || "[]"))
  );
  const addShownCalId = id => {
    shownCalIds.current.add(id);
    localStorage.setItem("shownCalIds", JSON.stringify([...shownCalIds.current]));
  };
  const addShownDiaryId = id => {
    shownDiaryIds.current.add(id);
    localStorage.setItem("shownDiaryIds", JSON.stringify([...shownDiaryIds.current]));
  };

  // ── 페이지 이동 ───────────────────────────────────────────────
  const goTo   = page => { setCurrentPage(page); setIsDrawerOpen(false); window.scrollTo(0, 0); };
  const goMain = ()   => { setCurrentPage(PAGE.MAIN); window.scrollTo(0, 0); };

  // ── 버전 체크 ─────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/version.json?v=${Date.now()}`);
        if (!res.ok) return;
        const { version: sv } = await res.json();
        const lv = localStorage.getItem("app_version");
        if (lv && lv !== sv) {
          const end = Date.now() + 3000;
          const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#F5B8A0', '#7B4FA6', '#fff'], zIndex: 10000 });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#F5B8A0', '#7B4FA6', '#fff'], zIndex: 10000 });
            if (Date.now() < end) requestAnimationFrame(frame);
          };
          frame();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setUpdateDialogOpen(true);
          localStorage.setItem("app_version", sv);
        } else if (!lv) {
          localStorage.setItem("app_version", sv);
        }
      } catch (e) {}
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  // ── localStorage 알림 ID 오래된 것 정리 (100개 초과 시 앞에서 자름) ──
  useEffect(() => {
    ["shownCalIds", "shownDiaryIds"].forEach(key => {
      try {
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        if (arr.length > 100) {
          localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // ── 인증 ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── 캘린더 알림 리스너 ────────────────────────────────────────
  // type 없는 것 = 일정 등록 알림
  // isRead:false 인 것만 구독, 확인하면 Firestore에서도 사라짐
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("isRead", "==", false)
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n =>
          n.writer !== currentUser &&   // 내가 쓴 건 제외
          !n.type &&                    // 캘린더 알림만 (type 없음)
          !shownCalIds.current.has(n.id) // 이미 처리한 건 제외
        )
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

      calUnreadRef.current = list;
      setCalUnreadList(list);

      // 스낵바가 닫혀 있을 때만 첫 번째 알림 세팅
      setCalNotifOpen(prev => {
        if (!prev && list.length > 0) {
          setCalNotifData(list[0]);
          return true;
        }
        if (list.length === 0) return false;
        return prev;
      });
    });
    return () => unsub();
  }, [currentUser]);

  // ── 캘린더 알림 클릭 핸들러 ──────────────────────────────────
  const handleCalNotifClick = async () => {
    if (!calNotifData) return;
    const clickedId = calNotifData.id;

    // 1) 즉시 메모리에 기록 (재표시 차단)
    addShownCalId(clickedId);

    // 2) Firestore 읽음 처리 (await로 순서 보장)
    try { await updateDoc(doc(db, "notifications", clickedId), { isRead: true }); } catch (e) {}

    // 3) ref에서 최신 목록 읽기 (stale 클로저 완전 회피)
    const next = calUnreadRef.current.filter(
      n => n.id !== clickedId && !shownCalIds.current.has(n.id)
    );

    if (next.length > 0) {
      // 다음 알림 표시
      setCalNotifData(next[0]);
    } else {
      // 마지막 알림 → 닫고 일정 페이지로 이동
      setCalNotifOpen(false);
      setCalNotifData(null);
      // state 업데이트 flush 후 페이지 이동
      setTimeout(() => goTo(PAGE.SCHEDULE), 50);
    }
  };

  // ── diary/comment 알림 리스너 ─────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("isRead", "==", false)
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n =>
          n.writer !== currentUser &&
          (n.type === "diary" || n.type === "comment") &&
          !shownDiaryIds.current.has(n.id)
        )
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

      if (list.length === 0) return;

      const latest = list[0];
      addShownDiaryId(latest.id);

      // Firestore 읽음 처리 (await 불필요 — 즉시 처리)
      updateDoc(doc(db, "notifications", latest.id), { isRead: true }).catch(() => {});

      // 스낵바 표시
      setDiaryNotifMsg(latest.content || "새로운 알림이 있어요!");
      setDiaryNotifOpen(true);

      // 해당 일기로 스크롤 (약간 딜레이 후)
      if (latest.targetId) {
        setTimeout(() => {
          const el = document.getElementById(`diary-${latest.targetId}`);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'all 0.5s ease';
          el.style.backgroundColor = B.peach;
          el.style.border = `2px solid ${B.pants}`;
          setTimeout(() => { el.style.backgroundColor = ''; el.style.border = ''; }, 2500);
        }, 400);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // ── 기타 핸들러 ───────────────────────────────────────────────
  const handleUpdateConfirm = async () => {
    try { await signOut(auth); window.location.reload(true); } catch (e) { window.location.reload(true); }
  };

  const login = async role => {
    if (role === "지수") {
      const pw = window.prompt("왜 내꺼로 로그인 하세여???");
      if (pw !== "4579") { alert("[WARNING]👹👹👹류현하 침입 시도 감지!!!👹👹👹"); return; }
    }
    try {
      setLoading(true);
      const uc = await signInAnonymously(auth);
      await updateProfile(uc.user, { displayName: role });
      setCurrentUser(role);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const logout = async () => {
    if (window.confirm("사용자를 전환하시겠습니까?")) {
      await signOut(auth);
      setCurrentUser(null);
      window.location.reload();
    }
  };

  // ── 로딩 ──────────────────────────────────────────────────────
  if (loading) return (
    <>
      <GlobalStyle />
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
        <Box component="img" src={buri5} alt=""
          sx={{ width: 80, animation: "headBob 1s ease-in-out infinite", filter: `drop-shadow(0 4px 12px ${B.pants}55)` }} />
        <CircularProgress sx={{ color: B.pants }} size={28} />
        <Typography sx={{ color: B.pants, fontFamily: "'Jua',sans-serif", fontSize: "0.9rem" }}>부리부리 로딩중...</Typography>
      </Box>
    </>
  );

  // ── 드로어 메뉴 ───────────────────────────────────────────────
  const MENU_ITEMS = [
    { label:"📅 일정 한눈에 보기", emoji:"📅", name:"일정 보기",   sub:"등록된 일정 한눈에",   page:PAGE.SCHEDULE,  color:B.pants  },
    { label:"🎟️ 쿠폰북",          emoji:"🎟️", name:"쿠폰북",     sub:"사용 가능한 쿠폰",     page:PAGE.COUPONS,   color:B.accent },
    { label:"💌 몰래 편지함",      emoji:"💌", name:"몰래 편지함", sub:"깜짝 편지 보내기",     page:PAGE.LETTER,    color:"#FF8FAB"},
    { label:"🌡️ 감정 온도계",      emoji:"🌡️", name:"감정 온도계", sub:"오늘 온도 기록",       page:PAGE.THERMO,    color:B.accent },
    { label:"📖 전체 기록 보기",   emoji:"📖", name:"전체 기록",   sub:"우리의 소중한 기록",   page:PAGE.DIARY_ALL, color:B.pants  },
    { label:"🪣 버킷리스트",        emoji:"🪣", name:"버킷리스트",  sub:"같이 이루고 싶은 것",  page:PAGE.BUCKET,    color:B.green  },
  ];

  return (
    <>
      <GlobalStyle />

      {/* 업데이트 팝업 */}
      <Dialog open={updateDialogOpen} disableEscapeKeyDown disableEnforceFocus aria-hidden={false}
        PaperProps={{ sx: { borderRadius: 5, p: 1, textAlign: 'center', bgcolor: B.cream,
          border: `2px solid ${B.pants}44`, boxShadow: `0 8px 40px ${B.pants}44`, overflow: 'visible' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: -4 }}>
          <Box component="img" src={buri8} alt="" sx={{ width: 80, filter: `drop-shadow(0 4px 12px ${B.pants}66)` }} />
        </Box>
        <DialogTitle sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1.3rem", pt: 0.5 }}>
          ✨ 새로운 기능 업데이트!
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", color: B.dark }}>
            미니홈피가 더 예뻐지고 강력해졌어요!<br />지금 바로 확인해 보세요. 🐷💖
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
          <Button onClick={handleUpdateConfirm} variant="contained"
            onPointerDown={e => { createRipple(e); createBuriPang(e); }}
            sx={{
              bgcolor: B.pants, borderRadius: 10, px: 4,
              fontFamily: "'Jua',sans-serif", fontWeight: 'bold', fontSize: "1rem",
              position: 'relative', overflow: 'hidden',
              boxShadow: `0 4px 16px ${B.pants}55`, transition: 'transform 0.1s',
              '&:active': { transform: 'scale(0.94)' },
              '&:hover': { bgcolor: "#6A3D96" },
            }}>
            업데이트 확인 🚀
          </Button>
        </DialogActions>
      </Dialog>

      {/* 로그인 / 메인 분기 */}
      {!currentUser ? (
        <LoginScreen onLogin={login} />
      ) : (
        <>
          <Box component="img" src={buri7} alt="" className="buri-float b2" />
          <Box component="img" src={buri3} alt="" className="buri-float b3" />

          {/* 햄버거 버튼 — 펄스 효과 */}
          <Box
            onClick={() => { setIsDrawerOpen(true); vibrate([15,10,20]); }}
            onPointerDown={e => createBuriPang(e)}
            sx={{
              position: 'fixed', top: 12, left: 12, zIndex: 1100,
              width: 48, height: 48, borderRadius: '50%',
              bgcolor: B.pants,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: `0 4px 18px ${B.pants}66`,
              animation: 'hamPulse 2.5s ease-in-out infinite',
              transition: 'transform 0.15s',
              '&:active': { transform: 'scale(0.86)' },
              overflow: 'visible',
            }}
          >
            {/* 펄스 링 */}
            <Box sx={{
              position: 'absolute', inset: -4,
              borderRadius: '50%',
              border: `2px solid ${B.pants}55`,
              animation: 'hamRing 2.5s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
            <MenuIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>

          {/* 드로어 — 그리드 카드형 */}
          <Drawer anchor="left" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}
            PaperProps={{ sx: {
              width: 290, bgcolor: B.cream,
              backgroundImage: `
                radial-gradient(circle at 90% 0%, ${B.lavender}99 0%, transparent 45%),
                radial-gradient(circle at 10% 100%, ${B.peach}88 0%, transparent 40%)
              `,
              borderRight: `2px solid ${B.pants}22`,
              display: 'flex', flexDirection: 'column',
            } }}>

            {/* 드로어 헤더 */}
            <Box sx={{
              px: 2.5, pt: 3, pb: 2,
              borderBottom: `1.5px dashed ${B.pants}22`,
              animation: 'drawerHeaderIn 0.3s ease both',
              position: 'relative', overflow: 'visible',
            }}>
              <Box component="img" src={buri1} alt="" sx={{
                position: 'absolute', top: -16, right: 14, width: 52,
                animation: 'headBob 2s ease-in-out infinite',
                filter: `drop-shadow(0 2px 10px ${B.pants}55)`,
                pointerEvents: 'none',
              }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{
                    fontFamily: "'Jua',sans-serif", fontSize: '1.3rem',
                    color: B.pants, lineHeight: 1.2,
                    textShadow: `1px 1px 0 ${B.skin}88`,
                  }}>
                    {currentUser}의 메뉴 🐷
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: B.dark + '66', mt: 0.3 }}>
                    부리부리와 함께하는 우리의 공간 💜
                  </Typography>
                </Box>
                <IconButton onClick={() => setIsDrawerOpen(false)}
                  sx={{ color: B.pants, '&:active': { transform: 'scale(0.85)' } }}>
                  <ChevronLeftIcon />
                </IconButton>
              </Stack>
            </Box>

            {/* 그리드 메뉴 */}
            <Box sx={{ px: 1.6, pt: 2, flex: 1, overflowY: 'auto' }}>
              <Typography sx={{
                fontSize: '0.6rem', fontWeight: 700, color: B.pants + '88',
                letterSpacing: '2px', mb: 1.2, px: 0.5,
                fontFamily: "'Noto Sans KR',sans-serif",
              }}>MENU</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {MENU_ITEMS.map((item, i) => {
                  const isActive = currentPage === item.page;
                  return (
                    <Box key={item.label}
                      onClick={() => { vibrate(15); item.page === PAGE.MAIN ? goMain() : goTo(item.page); }}
                      onPointerDown={e => createBuriPang(e)}
                      sx={{
                        bgcolor: isActive ? B.pants : 'white',
                        borderRadius: '16px',
                        border: `1.5px solid ${isActive ? 'transparent' : item.color + '33'}`,
                        p: '14px 12px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: '5px',
                        position: 'relative', overflow: 'hidden',
                        animation: `gridCardIn 0.3s ease ${i * 0.05}s both`,
                        transition: 'transform 0.12s, box-shadow 0.12s',
                        boxShadow: isActive ? `0 4px 16px ${B.pants}44` : 'none',
                        '&:active': { transform: 'scale(0.93)' },
                      }}>
                      {/* shine 효과 */}
                      {!isActive && (
                        <Box sx={{
                          position: 'absolute', top: 0, left: '-80%', width: '40%', height: '100%',
                          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                          animation: `shineSlide ${3 + i * 0.4}s ease-in-out ${i * 0.2}s infinite`,
                          pointerEvents: 'none',
                        }} />
                      )}
                      <Typography sx={{ fontSize: '22px', lineHeight: 1 }}>{item.emoji}</Typography>
                      <Typography sx={{
                        fontFamily: "'Jua',sans-serif", fontSize: '0.8rem',
                        color: isActive ? 'white' : B.dark, lineHeight: 1.2,
                      }}>{item.name}</Typography>
                      <Typography sx={{
                        fontSize: '0.6rem',
                        color: isActive ? 'rgba(255,255,255,0.7)' : B.dark + '55',
                        fontFamily: "'Noto Sans KR',sans-serif",
                      }}>{item.sub}</Typography>
                      {/* 현재 페이지 표시 */}
                      {isActive && (
                        <Box sx={{
                          position: 'absolute', top: 8, right: 8,
                          width: 7, height: 7, borderRadius: '50%',
                          bgcolor: 'white', opacity: 0.8,
                        }} />
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* 홈 버튼 */}
              <Box
                onClick={() => { goMain(); vibrate(15); }}
                onPointerDown={e => createBuriPang(e)}
                sx={{
                  mt: 1.5, py: 1.2, borderRadius: '14px',
                  bgcolor: B.pants + '18',
                  border: `1.5px solid ${B.pants}33`,
                  textAlign: 'center', cursor: 'pointer',
                  transition: 'transform 0.12s',
                  '&:active': { transform: 'scale(0.97)' },
                  position: 'relative', overflow: 'hidden',
                }}>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '0.88rem', color: B.pants }}>
                  🏠 홈으로 돌아가기
                </Typography>
              </Box>
            </Box>

            {/* 하단 */}
            <Box sx={{ p: 2, textAlign: 'center', borderTop: `1px dashed ${B.pants}22` }}>
              <Box component="img" src={buri2} alt=""
                sx={{ width: 70, opacity: 0.6, animation: 'buriFloat1 4s ease-in-out infinite', mb: 0.5 }} />
              <Box onClick={logout} sx={{ cursor: 'pointer' }}>
                <Typography sx={{ fontSize: '0.65rem', color: B.dark + '44',
                  fontFamily: "'Noto Sans KR',sans-serif",
                  '&:hover': { color: B.accent },
                }}>
                  사용자 전환 (로그아웃)
                </Typography>
              </Box>
            </Box>
          </Drawer>

          {/* 캘린더 알림 스낵바 (보라색, 클릭하면 다음 알림 or 일정 페이지 이동) */}
          <Snackbar
            open={calNotifOpen}
            autoHideDuration={null}
            onClose={(_, reason) => { if (reason === 'escapeKeyDown') setCalNotifOpen(false); }}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ mt: 7, cursor: 'pointer' }}
            onClick={handleCalNotifClick}>
            <Alert
              icon={<Box component="img" src={buri9} sx={{ width: 24, height: 24, objectFit: "contain" }} />}
              sx={{
                width: '100%', bgcolor: B.pants, color: 'white', fontWeight: 'bold',
                fontFamily: "'Noto Sans KR',sans-serif", borderRadius: 3,
                boxShadow: `0 4px 20px ${B.pants}66`,
                '& .MuiAlert-icon': { alignItems: 'center' },
              }}>
              {calUnreadList.length > 1 ? `[${calUnreadList.length}개] ` : ""}
              {calNotifData
                ? `${calNotifData.writer}가 일정을 ${calNotifData.count ?? 1}개 등록했어요! 📅`
                : ""}
            </Alert>
          </Snackbar>

          {/* diary/comment 알림 스낵바 (주황색, 5초 자동닫힘) */}
          <Snackbar
            open={diaryNotifOpen}
            autoHideDuration={5000}
            onClose={() => setDiaryNotifOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ mt: 7 }}>
            <Alert
              icon={<Box component="img" src={buri2} sx={{ width: 24, height: 24, objectFit: "contain" }} />}
              onClose={() => setDiaryNotifOpen(false)}
              sx={{
                width: '100%', bgcolor: B.accent, color: 'white', fontWeight: 'bold',
                fontFamily: "'Noto Sans KR',sans-serif", borderRadius: 3,
                boxShadow: `0 4px 20px ${B.accent}66`,
                '& .MuiAlert-icon': { alignItems: 'center' },
                '& .MuiAlert-action': { color: 'white' },
              }}>
              {diaryNotifMsg} 💌
            </Alert>
          </Snackbar>

          {/* ── 서브 페이지들 ── */}
          {currentPage === PAGE.SCHEDULE && (
            <SubPage title="일정 한눈에 보기" icon="📅" onBack={goMain}>
              <ScheduleList currentUser={currentUser} />
            </SubPage>
          )}
          {currentPage === PAGE.COUPONS && (
            <SubPage title="쿠폰북" icon="🎟️" onBack={goMain}>
              <CoupleCoupons currentUser={currentUser} />
            </SubPage>
          )}
          {currentPage === PAGE.LETTER && (
            <SubPage title="몰래 편지함" icon="💌" onBack={goMain}>
              <SecretLetter currentUser={currentUser} />
            </SubPage>
          )}
          {currentPage === PAGE.THERMO && (
            <SubPage title="감정 온도계" icon="🌡️" onBack={goMain}>
              <EmotionThermometer currentUser={currentUser} />
            </SubPage>
          )}
          {currentPage === PAGE.DIARY_ALL && (
            <SubPage title="전체 기록 보기" icon="📖" onBack={goMain}>
              <DiaryList currentUser={currentUser} />
            </SubPage>
          )}
          {currentPage === PAGE.BUCKET && (
            <SubPage title="버킷리스트" icon="🪣" onBack={goMain}>
              <BucketList currentUser={currentUser} />
            </SubPage>
          )}

          {/* ── 메인 페이지 ── */}
          {currentPage === PAGE.MAIN && (
            <Container maxWidth="sm" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
              <CoupleDDay />
              <Box sx={{ textAlign: 'right', mb: 1 }}>
                <Button size="small" onClick={logout}
                  sx={{ color: B.pants + "88", fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem" }}>
                  사용자 전환 (로그아웃)
                </Button>
              </Box>

              {/* 타이틀 */}
              <Box sx={{
                textAlign: 'center', mb: 3, mt: 1, p: "18px 24px", borderRadius: 5,
                bgcolor: B.lavender + "99", border: `1.5px dashed ${B.pants}44`,
                position: 'relative', animation: 'fadeInUp 0.5s ease both',
              }}>
                <Box component="img" src={buri1} alt="" sx={{
                  position: 'absolute', top: -18, right: -10, width: 52,
                  filter: `drop-shadow(0 2px 8px ${B.pants}44)`,
                  animation: "wobble 3s ease-in-out infinite",
                }} />
                <Typography sx={{
                  fontFamily: "'Jua',sans-serif", fontSize: "1.8rem", color: B.pants,
                  textShadow: `2px 2px 0 ${B.skin}88`, lineHeight: 1.3,
                }}>
                  {currentUser}의 미니홈피 🐷
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: B.dark + "77", mt: 0.3 }}>
                  부리부리와 함께하는 우리의 공간 💜
                </Typography>
              </Box>

              <Stack spacing={2}>
                {/* 캘린더 */}
                <SectionCard icon="📅" title="우리의 일정" sub="활 쏘는 부리부리가 날짜를 지키고 있어요 🏹"
                  buriImg={buri6} bgColor={B.lavender + "44"} borderColor={B.pants}
                  onMore={() => goTo(PAGE.SCHEDULE)}>
                  <CoupleCalendar currentUser={currentUser} />
                </SectionCard>

                {/* 오늘의 기록 */}
                <SectionCard icon="✍️" title="오늘의 기록" sub="칼 든 부리부리처럼 기록해요 ⚔️"
                  buriImg={buri4} bgColor="#FFF0E8" borderColor={B.accent}>
                  <DiaryWrite currentUser={currentUser} />
                </SectionCard>

                {/* 최근 기록 미리보기 (최신 3개) */}
                <SectionCard icon="📖" title="최근 기록" sub="탐정 부리부리가 기억해요 🕵️"
                  buriImg={buri9} bgColor={B.lavender + "44"} borderColor={B.pants}
                  onMore={() => goTo(PAGE.DIARY_ALL)}>
                  <DiaryList currentUser={currentUser} pageSize={3} />
                </SectionCard>
              </Stack>

              {/* 푸터 */}
              <Box sx={{ textAlign: 'center', mt: 5, opacity: 0.4 }}>
                <Stack direction="row" justifyContent="center" alignItems="flex-end" gap={2}>
                  <Box component="img" src={buri3} alt="" sx={{ width: 60, animation: "buriFloat3 5s ease-in-out infinite" }} />
                  <Box component="img" src={buri8} alt="" sx={{ width: 80, animation: "buriFloat1 5s ease-in-out infinite" }} />
                </Stack>
                <Typography sx={{ fontSize: "0.72rem", color: B.dark + "66", mt: 1, fontFamily: "'Jua',sans-serif" }}>
                  🐷 부리부리 미니홈피 🐷
                </Typography>
              </Box>
            </Container>
          )}
        </>
      )}
    </>
  );
}

export default App;