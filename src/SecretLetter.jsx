import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, query, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, orderBy,
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { Box, Typography, Stack, IconButton, TextField, Button,
  CircularProgress, ToggleButton, ToggleButtonGroup } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import LockIcon from "@mui/icons-material/Lock";
import CloseIcon from "@mui/icons-material/Close";
import { createBuriPang, vibrate } from "./touchEffects";

import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png";
import buri6 from "./assets/KakaoTalk_20260316_132934584.png";
import buri9 from "./assets/KakaoTalk_20260316_133007779.png";

// ── 부리부리 팔레트 ───────────────────────────────────────────────
const B = {
  pants:   "#7B4FA6",
  skin:    "#F5B8A0",
  cream:   "#FFF8F2",
  peach:   "#FFE4D4",
  lavender:"#EDE0F5",
  accent:  "#E8630A",
  dark:    "#3D1F00",
};

// 봉투 색상 옵션
const ENVELOPE_COLORS = [
  { id:"purple", bg:"#EDE0F5", border:"#7B4FA6", ribbon:"#7B4FA6", label:"보라" },
  { id:"peach",  bg:"#FFE4D4", border:"#F5B8A0", ribbon:"#E8630A", label:"복숭아" },
  { id:"pink",   bg:"#FFE4F0", border:"#FF8FAB", ribbon:"#FF4081", label:"핑크" },
  { id:"mint",   bg:"#E0F5EE", border:"#4DB89A", ribbon:"#2E9E7A", label:"민트" },
];

// 공개 시간 옵션
const OPEN_PRESETS = [
  { label:"1시간 후",  ms: 1 * 60 * 60 * 1000 },
  { label:"오늘 자정", ms: null, type:"midnight" },
  { label:"내일 아침", ms: null, type:"tomorrow9" },
  { label:"직접 입력", ms: null, type:"custom" },
];

function getMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}
function getTomorrow9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

// ── 봉투 SVG 컴포넌트 ─────────────────────────────────────────────
const EnvelopeSVG = ({ color, isOpen, size = 80, wobble = false }) => {
  const c = ENVELOPE_COLORS.find(e => e.id === color) || ENVELOPE_COLORS[0];
  return (
    <Box sx={{
      width: size, height: size * 0.75,
      position: "relative", flexShrink: 0,
      animation: wobble ? "headBob 2s ease-in-out infinite" : "none",
      filter: `drop-shadow(0 4px 12px ${c.border}66)`,
    }}>
      <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%" }}>
        {/* 봉투 몸통 */}
        <rect x="2" y="10" width="76" height="48" rx="6"
          fill={c.bg} stroke={c.border} strokeWidth="2.5" />
        {/* 봉투 뚜껑 (열리면 위로) */}
        {isOpen ? (
          <path d="M2 10 L40 2 L78 10" fill={c.bg} stroke={c.border} strokeWidth="2.5" strokeLinejoin="round" />
        ) : (
          <path d="M2 10 L40 36 L78 10" fill={c.border + "55"} stroke={c.border} strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {/* 봉투 대각선 */}
        <line x1="2" y1="58" x2="36" y2="32" stroke={c.border + "44"} strokeWidth="1.5" />
        <line x1="78" y1="58" x2="44" y2="32" stroke={c.border + "44"} strokeWidth="1.5" />
        {/* 봉인 리본 (잠겼을 때) */}
        {!isOpen && (
          <circle cx="40" cy="36" r="7" fill={c.ribbon} opacity="0.9" />
        )}
        {!isOpen && (
          <text x="40" y="40" textAnchor="middle" fontSize="8" fill="white">🔒</text>
        )}
        {/* 열렸을 때 하트 */}
        {isOpen && (
          <text x="40" y="42" textAnchor="middle" fontSize="14">💜</text>
        )}
      </svg>
    </Box>
  );
};

// ── 카운트다운 훅 ─────────────────────────────────────────────────
function useCountdown(openAt) {
  const [remaining, setRemaining] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!openAt) return;
    const tick = () => {
      const diff = openAt.toMillis() - Date.now();
      if (diff <= 0) { setIsReady(true); setRemaining(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setRemaining(`${h}시간 ${m}분 후`);
      else if (m > 0) setRemaining(`${m}분 ${s}초 후`);
      else setRemaining(`${s}초 후`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [openAt]);

  return { remaining, isReady };
}

// ── 개별 편지 카드 ────────────────────────────────────────────────
const LetterCard = ({ letter, currentUser }) => {
  const { remaining, isReady } = useCountdown(letter.openAt);
  const [justOpened, setJustOpened] = useState(false);
  const [reply, setReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const cardRef = useRef(null);

  const isMyLetter = letter.from === currentUser;
  const canOpen = isReady && !isMyLetter && !letter.isOpened;
  const isOpened = letter.isOpened;

  // 자동 공개 감지
  useEffect(() => {
    if (isReady && !isMyLetter && !letter.isOpened && !justOpened) {
      handleOpen();
    }
  }, [isReady]);

  const handleOpen = async () => {
    if (justOpened) return;
    setJustOpened(true);
    vibrate([30, 20, 30, 20, 60]);

    // confetti 터트리기
    confetti({
      particleCount: 120, spread: 80, origin: { y: 0.6 },
      colors: ["#7B4FA6", "#F5B8A0", "#ffffff", "#FFE44D"],
    });

    // 팡 이펙트
    if (cardRef.current) createBuriPang({ currentTarget: cardRef.current, clientX: cardRef.current.getBoundingClientRect().left + 60, clientY: cardRef.current.getBoundingClientRect().top + 40 });

    try {
      await updateDoc(doc(db, "letters", letter.id), { isOpened: true });
    } catch (e) { console.error(e); }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setReplyLoading(true);
    try {
      await updateDoc(doc(db, "letters", letter.id), {
        reply: reply.trim(),
        repliedAt: serverTimestamp(),
      });
      // 알림 발송
      await addDoc(collection(db, "notifications"), {
        writer: currentUser,
        type: "letter_reply",
        content: `${currentUser}님이 편지에 답장했어요! 💌`,
        targetId: letter.id,
        createdAt: serverTimestamp(),
        isRead: false,
      });
      setReply("");
    } catch (e) { console.error(e); }
    finally { setReplyLoading(false); }
  };

  const envColor = letter.envelopeColor || "purple";
  const c = ENVELOPE_COLORS.find(e => e.id === envColor) || ENVELOPE_COLORS[0];

  return (
    <Box ref={cardRef}
      sx={{
        borderRadius: 4,
        bgcolor: B.cream,
        border: `2px solid ${c.border}55`,
        overflow: "visible",
        position: "relative",
        transition: "transform 0.15s, box-shadow 0.15s",
        backgroundImage: `radial-gradient(circle at 95% 5%, ${c.bg} 0%, transparent 50%)`,
        animation: "fadeInUp 0.4s ease both",
        mb: 1,
      }}
    >
      <Box sx={{ p: 2.5 }}>

        {/* 헤더 */}
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
          <EnvelopeSVG color={envColor} isOpen={isOpened} size={64} wobble={!isOpened && isReady} />

          <Box flex={1}>
            {/* 발신자 */}
            <Typography sx={{
              fontFamily: "'Jua', sans-serif", fontSize: "0.92rem", color: B.dark,
            }}>
              {letter.isAnonymous && !isOpened ? "🎭 부리부리의 편지" : `💌 ${letter.from}의 편지`}
            </Typography>

            {/* 상태 표시 */}
            {!isOpened && !isReady && (
              <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.4 }}>
                <LockIcon sx={{ fontSize: 12, color: c.border }} />
                <Typography sx={{ fontSize: "0.72rem", color: c.border, fontWeight: 700 }}>
                  {remaining}에 열려요
                </Typography>
              </Stack>
            )}
            {!isOpened && isReady && !isMyLetter && (
              <Typography sx={{ fontSize: "0.72rem", color: B.accent, fontWeight: 700, mt: 0.4,
                animation: "hintPulse 1s ease-in-out infinite" }}>
                ✨ 지금 열 수 있어요!
              </Typography>
            )}
            {isOpened && (
              <Typography sx={{ fontSize: "0.72rem", color: B.pants + "88", mt: 0.4 }}>
                {letter.openedAt
                  ? new Date(letter.openAt?.toMillis()).toLocaleDateString("ko-KR")
                  : "열람됨"} · {isMyLetter ? "내가 보낸 편지" : "받은 편지"}
              </Typography>
            )}
          </Box>
        </Stack>

        {/* 잠긴 상태 */}
        {!isOpened && !isMyLetter && (
          <Box sx={{
            textAlign: "center", py: 2,
            border: `1.5px dashed ${c.border}66`,
            borderRadius: 3, bgcolor: c.bg + "66",
          }}>
            {isReady ? (
              <Button
                variant="contained"
                onPointerDown={(e) => createBuriPang(e)}
                onClick={handleOpen}
                sx={{
                  bgcolor: c.border, borderRadius: "20px", px: 4, py: 1,
                  fontFamily: "'Jua', sans-serif", fontSize: "0.95rem",
                  position: "relative", overflow: "hidden",
                  boxShadow: `0 4px 16px ${c.border}55`,
                  animation: "avatarPulseA 1.5s ease-in-out infinite",
                  "&:hover": { bgcolor: c.ribbon },
                }}
              >
                💌 편지 열기
              </Button>
            ) : (
              <Box>
                <Box component="img" src={buri6} alt=""
                  sx={{ width: 52, mb: 1, animation: "headBob 2s ease-in-out infinite",
                    filter: `drop-shadow(0 2px 8px ${c.border}44)` }} />
                <Typography sx={{ fontFamily: "'Jua', sans-serif", fontSize: "0.82rem", color: c.border }}>
                  {remaining} 기다려주세요 🐷
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* 내가 보낸 편지 — 잠김 중 */}
        {!isOpened && isMyLetter && (
          <Box sx={{
            textAlign: "center", py: 2,
            border: `1.5px dashed ${c.border}44`,
            borderRadius: 3, bgcolor: c.bg + "44",
          }}>
            <Box component="img" src={buri2} alt=""
              sx={{ width: 44, mb: 0.5, opacity: 0.5, animation: "buriFloat1 3s ease-in-out infinite" }} />
            <Typography sx={{ fontSize: "0.75rem", color: B.dark + "66", fontFamily: "'Noto Sans KR', sans-serif" }}>
              상대방이 열기 전이에요 🔒
            </Typography>
          </Box>
        )}

        {/* 열린 편지 내용 */}
        {isOpened && (
          <Box>
            <Box sx={{
              bgcolor: "white", borderRadius: 3, p: 2,
              border: `1.5px solid ${c.border}33`,
              mb: letter.reply ? 1.5 : 0,
              position: "relative",
            }}>
              {/* 편지지 줄 */}
              {[1,2,3].map(i => (
                <Box key={i} sx={{
                  position: "absolute", left: 16, right: 16,
                  height: "1px", bgcolor: c.border + "18",
                  top: `${i * 28 + 10}px`,
                }} />
              ))}
              <Typography sx={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "0.88rem", color: B.dark,
                lineHeight: 1.8, whiteSpace: "pre-wrap",
                position: "relative", zIndex: 1,
              }}>
                {letter.content}
              </Typography>
            </Box>

            {/* 답장 표시 */}
            {letter.reply && (
              <Box sx={{
                bgcolor: c.bg, borderRadius: 3, p: 1.5,
                border: `1.5px solid ${c.border}44`,
                mb: 1,
              }}>
                <Typography sx={{ fontSize: "0.68rem", color: c.border, fontWeight: 700,
                  fontFamily: "'Noto Sans KR', sans-serif", mb: 0.5 }}>
                  💌 답장
                </Typography>
                <Typography sx={{ fontSize: "0.83rem", color: B.dark,
                  fontFamily: "'Noto Sans KR', sans-serif", lineHeight: 1.6 }}>
                  {letter.reply}
                </Typography>
              </Box>
            )}

            {/* 답장 입력 (받은 편지 & 아직 답장 없을 때) */}
            {!isMyLetter && !letter.reply && (
              <Stack direction="row" gap={1} alignItems="center">
                <TextField
                  size="small" fullWidth
                  placeholder="따뜻한 답장 한마디 💌"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleReply()}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 5, bgcolor: "white",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      "& fieldset": { borderColor: c.border + "44" },
                      "&:hover fieldset": { borderColor: c.border },
                      "&.Mui-focused fieldset": { borderColor: c.border },
                    }
                  }}
                />
                <IconButton onClick={handleReply} disabled={!reply.trim() || replyLoading}
                  sx={{ bgcolor: c.border, color: "white", flexShrink: 0,
                    "&:hover": { bgcolor: c.ribbon },
                    "&:disabled": { bgcolor: B.skin },
                    transition: "transform 0.1s",
                    "&:active": { transform: "scale(0.9)" },
                  }}>
                  {replyLoading
                    ? <CircularProgress size={18} sx={{ color: "white" }} />
                    : <SendIcon fontSize="small" />
                  }
                </IconButton>
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ── 편지 작성 폼 ──────────────────────────────────────────────────
const LetterWriteForm = ({ currentUser, onClose }) => {
  const [content, setContent] = useState("");
  const [envColor, setEnvColor] = useState("purple");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [openPreset, setOpenPreset] = useState(0);
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);

  const getOpenAt = () => {
    const preset = OPEN_PRESETS[openPreset];
    if (preset.ms) return new Date(Date.now() + preset.ms);
    if (preset.type === "midnight") return getMidnight();
    if (preset.type === "tomorrow9") return getTomorrow9();
    if (preset.type === "custom" && customDate) return new Date(customDate);
    return getMidnight();
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const openAt = getOpenAt();
      const ref = await addDoc(collection(db, "letters"), {
        content: content.trim(),
        from: currentUser,
        envelopeColor: envColor,
        isAnonymous,
        openAt,
        isOpened: false,
        reply: null,
        createdAt: serverTimestamp(),
      });

      // 알림 발송
      await addDoc(collection(db, "notifications"), {
        writer: currentUser,
        type: "letter",
        content: `${isAnonymous ? "누군가" : currentUser}가 몰래 편지를 보냈어요! 💌`,
        targetId: ref.id,
        createdAt: serverTimestamp(),
        isRead: false,
      });

      vibrate([20, 10, 20]);
      onClose();
    } catch (e) {
      console.error("편지 전송 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      bgcolor: B.cream, borderRadius: 4,
      border: `2px solid ${B.pants}33`,
      overflow: "hidden",
      animation: "fadeInUp 0.35s ease both",
    }}>
      {/* 헤더 */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 2.5, py: 1.8,
        borderBottom: `1.5px dashed ${B.pants}33`,
        bgcolor: B.lavender + "66",
      }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box component="img" src={buri2} alt=""
            sx={{ width: 32, animation: "headBob 2s ease-in-out infinite",
              filter: `drop-shadow(0 2px 6px ${B.pants}44)` }} />
          <Typography sx={{ fontFamily: "'Jua', sans-serif", color: B.pants, fontSize: "1rem" }}>
            몰래 편지 쓰기 ✍️
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: B.pants }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* 봉투 색상 선택 */}
        <Box>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: B.dark + "88",
            fontFamily: "'Noto Sans KR', sans-serif", mb: 1 }}>
            봉투 색상 선택
          </Typography>
          <Stack direction="row" gap={1}>
            {ENVELOPE_COLORS.map(c => (
              <Box key={c.id}
                onClick={() => setEnvColor(c.id)}
                sx={{
                  width: 36, height: 36, borderRadius: "50%",
                  bgcolor: c.bg, border: `2.5px solid ${envColor === c.id ? c.border : c.border + "44"}`,
                  cursor: "pointer",
                  transform: envColor === c.id ? "scale(1.18)" : "scale(1)",
                  boxShadow: envColor === c.id ? `0 2px 10px ${c.border}66` : "none",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  "&:active": { transform: "scale(0.92)" },
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* 편지 내용 */}
        <TextField
          fullWidth multiline rows={5}
          placeholder={`${currentUser === "지수" ? "현하" : "지수"}에게 전하고 싶은 말을 써봐요 💌\n\n상대방이 열기 전까지 아무도 몰라요 🔒`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "white", borderRadius: 3,
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "0.9rem",
              "& fieldset": { borderColor: B.pants + "33" },
              "&:hover fieldset": { borderColor: B.pants + "88" },
              "&.Mui-focused fieldset": { borderColor: B.pants },
            }
          }}
        />

        {/* 공개 시간 */}
        <Box>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: B.dark + "88",
            fontFamily: "'Noto Sans KR', sans-serif", mb: 1 }}>
            언제 열릴까요? 🔒
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.8}>
            {OPEN_PRESETS.map((p, i) => (
              <Box key={i}
                onClick={() => setOpenPreset(i)}
                sx={{
                  px: 1.5, py: 0.6, borderRadius: "20px", cursor: "pointer",
                  fontFamily: "'Noto Sans KR', sans-serif", fontSize: "0.75rem", fontWeight: 700,
                  bgcolor: openPreset === i ? B.pants : B.lavender,
                  color: openPreset === i ? "white" : B.pants,
                  transition: "all 0.15s",
                  "&:active": { transform: "scale(0.94)" },
                }}
              >
                {p.label}
              </Box>
            ))}
          </Stack>

          {/* 직접 입력 */}
          {OPEN_PRESETS[openPreset].type === "custom" && (
            <TextField
              type="datetime-local" size="small" fullWidth
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              sx={{
                mt: 1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3, bgcolor: "white",
                  "& fieldset": { borderColor: B.pants + "44" },
                  "&.Mui-focused fieldset": { borderColor: B.pants },
                }
              }}
            />
          )}
        </Box>

        {/* 익명 토글 */}
        <Box
          onClick={() => setIsAnonymous(!isAnonymous)}
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            bgcolor: "white", borderRadius: 3, px: 2, py: 1.4,
            border: `1.5px solid ${B.pants}22`, cursor: "pointer",
            "&:active": { transform: "scale(0.98)" },
            transition: "transform 0.1s",
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: "16px" }}>🎭</Typography>
            <Box>
              <Typography sx={{ fontFamily: "'Jua', sans-serif", fontSize: "0.85rem", color: B.dark }}>
                익명으로 보내기
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: B.dark + "66",
                fontFamily: "'Noto Sans KR', sans-serif" }}>
                열기 전까지 누가 썼는지 몰라요
              </Typography>
            </Box>
          </Stack>
          {/* 커스텀 토글 */}
          <Box sx={{
            width: 46, height: 24, borderRadius: "12px",
            bgcolor: isAnonymous ? B.pants : B.lavender,
            position: "relative", transition: "background 0.25s",
            flexShrink: 0,
          }}>
            <Box sx={{
              position: "absolute", width: 18, height: 18,
              borderRadius: "50%", bgcolor: "white",
              top: 3, left: isAnonymous ? 24 : 3,
              transition: "left 0.25s",
              boxShadow: "0 1px 4px #0002",
            }} />
          </Box>
        </Box>

        {/* 미리보기 */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          bgcolor: ENVELOPE_COLORS.find(c => c.id === envColor)?.bg + "88",
          borderRadius: 3, px: 2, py: 1.5,
          border: `1.5px dashed ${ENVELOPE_COLORS.find(c => c.id === envColor)?.border}55`,
        }}>
          <EnvelopeSVG color={envColor} isOpen={false} size={44} />
          <Box>
            <Typography sx={{ fontFamily: "'Jua', sans-serif", fontSize: "0.8rem",
              color: ENVELOPE_COLORS.find(c => c.id === envColor)?.border }}>
              {isAnonymous ? "🎭 부리부리의 편지" : `💌 ${currentUser}의 편지`}
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
              fontFamily: "'Noto Sans KR', sans-serif" }}>
              {OPEN_PRESETS[openPreset].type === "custom" && customDate
                ? `${new Date(customDate).toLocaleString("ko-KR")}에 열려요`
                : OPEN_PRESETS[openPreset].type === "midnight"
                ? "오늘 자정에 열려요"
                : OPEN_PRESETS[openPreset].type === "tomorrow9"
                ? "내일 오전 9시에 열려요"
                : `${OPEN_PRESETS[openPreset].label}에 열려요`
              }
            </Typography>
          </Box>
        </Box>

        {/* 전송 버튼 */}
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!content.trim() || loading}
          onPointerDown={(e) => { if (content.trim()) createBuriPang(e); }}
          sx={{
            bgcolor: B.pants, borderRadius: "20px", py: 1.2,
            fontFamily: "'Jua', sans-serif", fontSize: "1rem",
            position: "relative", overflow: "hidden",
            boxShadow: `0 4px 16px ${B.pants}44`,
            transition: "transform 0.1s",
            "&:active": { transform: "scale(0.96)" },
            "&:hover": { bgcolor: "#6A3D96" },
            "&:disabled": { bgcolor: B.skin },
          }}
        >
          {loading
            ? <CircularProgress size={20} sx={{ color: "white" }} />
            : "🐷 몰래 편지 보내기 💌"
          }
        </Button>
      </Box>
    </Box>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
const SecretLetter = ({ currentUser }) => {
  const [letters, setLetters] = useState([]);
  const [showWrite, setShowWrite] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "letters"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLetters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 내가 받은 편지 + 내가 보낸 편지
  const myLetters = letters.filter(l => l.from === currentUser || l.from !== currentUser);
  const unreadCount = letters.filter(l => l.from !== currentUser && !l.isOpened).length;

  return (
    <Box>
      {/* 섹션 헤더 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box component="img" src={buri9} alt=""
            sx={{ width: 30, animation: "headBob 2.5s ease-in-out infinite",
              filter: `drop-shadow(0 2px 4px ${B.pants}44)` }} />
          <Typography sx={{ fontFamily: "'Jua', sans-serif", color: B.pants, fontSize: "1rem" }}>
            몰래 편지함 💌
            {unreadCount > 0 && (
              <Box component="span" sx={{
                ml: 0.8, display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: "50%",
                bgcolor: B.accent, color: "white",
                fontSize: "0.6rem", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700,
                verticalAlign: "middle",
              }}>
                {unreadCount}
              </Box>
            )}
          </Typography>
        </Stack>

        <Button
          variant="contained" size="small"
          onClick={() => setShowWrite(!showWrite)}
          onPointerDown={(e) => createBuriPang(e)}
          sx={{
            bgcolor: showWrite ? B.skin : B.pants,
            borderRadius: "20px", px: 2,
            fontFamily: "'Jua', sans-serif", fontSize: "0.8rem",
            position: "relative", overflow: "hidden",
            boxShadow: `0 3px 10px ${B.pants}33`,
            transition: "all 0.15s",
            "&:active": { transform: "scale(0.93)" },
            "&:hover": { bgcolor: showWrite ? "#e0a090" : "#6A3D96" },
          }}
        >
          {showWrite ? "✕ 닫기" : "✍️ 편지 쓰기"}
        </Button>
      </Stack>

      {/* 편지 작성 폼 */}
      {showWrite && (
        <Box sx={{ mb: 2.5 }}>
          <LetterWriteForm currentUser={currentUser} onClose={() => setShowWrite(false)} />
        </Box>
      )}

      {/* 편지 목록 */}
      {letters.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5, opacity: 0.5 }}>
          <Box component="img" src={buri2} alt=""
            sx={{ width: 64, mb: 1.5, animation: "headBob 2.5s ease-in-out infinite",
              filter: `drop-shadow(0 2px 8px ${B.pants}44)` }} />
          <Typography sx={{ fontFamily: "'Jua', sans-serif", color: B.dark + "88", fontSize: "0.88rem" }}>
            아직 편지가 없어요 🐷<br />첫 번째 몰래 편지를 써봐요!
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {letters.map(letter => (
            <LetterCard key={letter.id} letter={letter} currentUser={currentUser} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default SecretLetter;