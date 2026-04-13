import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, query, onSnapshot, updateDoc,
  doc, deleteDoc, serverTimestamp, orderBy,
} from "firebase/firestore";
import {
  Box, Typography, Stack, Button, Chip, IconButton,
  TextField, Collapse,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import confetti from "canvas-confetti";
import { vibrate } from "./touchEffects";

const B = {
  pants:   "#7B4FA6",
  skin:    "#F5B8A0",
  cream:   "#FFF8F2",
  peach:   "#FFE4D4",
  lavender:"#EDE0F5",
  accent:  "#E8630A",
  dark:    "#3D1F00",
  pink:    "#FF6B9D",
};

const USERS = ["지수", "현하"];

const CATEGORIES = [
  { key: "food",    label: "밥",    emoji: "🍜" },
  { key: "date",    label: "데이트", emoji: "🎬" },
  { key: "chore",   label: "집안일", emoji: "🧹" },
  { key: "hug",     label: "스킨십", emoji: "🐷" },
  { key: "wish",    label: "소원",   emoji: "⭐" },
  { key: "etc",     label: "기타",   emoji: "🎁" },
];


const EXPIRY_DAYS = 14; // 유효기간 (일)

function getCatMeta(key) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[5];
}

function daysLeft(createdAt) {
  if (!createdAt?.seconds) return EXPIRY_DAYS;
  const created = new Date(createdAt.seconds * 1000);
  const diff = EXPIRY_DAYS - Math.floor((Date.now() - created) / 86400000);
  return Math.max(0, diff);
}

function isExpired(coupon) {
  if (coupon.status !== "available") return false;
  return daysLeft(coupon.createdAt) === 0;
}

// ── 룰렛 모달 ────────────────────────────────────────────────────
const RouletteModal = ({ coupons, currentUser, onClose, onUse }) => {
  const available = coupons.filter(
    c => c.receiver === currentUser && c.status === "available" && !isExpired(c)
  );
  const [picked, setPicked] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    if (!available.length || spinning) return;
    setSpinning(true);
    setPicked(null);
    setTimeout(() => {
      const chosen = available[Math.floor(Math.random() * available.length)];
      setPicked(chosen);
      setSpinning(false);
      vibrate([20, 10, 30, 10, 50]);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 },
        colors: [B.pants, B.pink, B.accent, "#fff"] });
    }, 1200);
  };

  return (
    <Box sx={{
      position: "fixed", inset: 0, zIndex: 9999,
      bgcolor: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center",
      px: 3,
    }} onClick={onClose}>
      <Box onClick={e => e.stopPropagation()} sx={{
        bgcolor: "white", borderRadius: 5, p: 3.5, width: "100%", maxWidth: 340,
        background: `linear-gradient(135deg, ${B.cream} 0%, white 60%)`,
        border: `2px solid ${B.lavender}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: "1.3rem",
          color: B.pants, textAlign: "center", mb: 0.5,
        }}>
          🎰 쿠폰 룰렛
        </Typography>
        <Typography sx={{
          fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.78rem",
          color: B.dark + "88", textAlign: "center", mb: 2.5,
        }}>
          받은 쿠폰 중에서 랜덤으로 하나 뽑아요!
        </Typography>

        {/* 결과 박스 */}
        <Box sx={{
          minHeight: 80, borderRadius: 3, mb: 2.5,
          border: `2px dashed ${B.lavender}`,
          bgcolor: B.lavender + "33",
          display: "flex", alignItems: "center", justifyContent: "center",
          px: 2,
        }}>
          {spinning ? (
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: "1.5rem",
              animation: "spin 0.15s linear infinite",
            }}>🎰</Typography>
          ) : picked ? (
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "2rem", mb: 0.5 }}>
                {getCatMeta(picked.cat).emoji}
              </Typography>
              <Typography sx={{
                fontFamily: "'Jua',sans-serif", fontSize: "1rem", color: B.pants,
              }}>
                {picked.title}
              </Typography>
              <Typography sx={{
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
                color: B.dark + "66", mt: 0.5,
              }}>
                From. {picked.sender}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.82rem",
              color: B.dark + "55",
            }}>
              {available.length === 0 ? "사용 가능한 쿠폰이 없어요 😢" : "버튼을 눌러 뽑아요!"}
            </Typography>
          )}
        </Box>

        <Stack gap={1}>
          <Button fullWidth variant="contained"
            onClick={spin}
            disabled={spinning || !available.length}
            sx={{
              bgcolor: B.pants, borderRadius: "14px", py: 1.2,
              fontFamily: "'Jua',sans-serif", fontSize: "1rem",
              boxShadow: `0 4px 14px ${B.pants}44`,
              "&:hover": { bgcolor: "#6A3D96" },
            }}
          >
            {spinning ? "뽑는 중..." : "🎰 뽑기!"}
          </Button>
          {picked && (
            <Button fullWidth variant="outlined"
              onClick={() => { onUse(picked.id); onClose(); }}
              sx={{
                borderColor: B.pink, color: B.pink,
                borderRadius: "14px", py: 1,
                fontFamily: "'Jua',sans-serif", fontSize: "0.9rem",
                "&:hover": { bgcolor: B.pink + "11" },
              }}
            >
              ✓ 이 쿠폰 바로 사용하기
            </Button>
          )}
          <Button fullWidth onClick={onClose}
            sx={{
              color: B.dark + "55", fontFamily: "'Noto Sans KR',sans-serif",
              fontSize: "0.8rem",
            }}
          >
            닫기
          </Button>
        </Stack>
      </Box>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </Box>
  );
};

// ── 발급 폼 ──────────────────────────────────────────────────────
const IssueForm = ({ currentUser, onIssue }) => {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState("");
  const [selCat, setSelCat]   = useState("wish");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const otherUser = USERS.find(u => u !== currentUser);

  const handleIssue = async (title, cat) => {
    if (!title.trim()) return;
    setLoading(true);
    await onIssue(title.trim(), cat);
    setText(""); setSelCat("wish"); setOpen(false); setLoading(false);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 },
      colors: [B.pants, B.pink, "#fff"] });
    vibrate([15, 10, 25]);
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* 빠른 발급 템플릿 */}
      <Box sx={{
        display: "flex", gap: 1, overflowX: "auto", pb: 1, mb: 1,
        "&::-webkit-scrollbar": { height: "4px" },
        "&::-webkit-scrollbar-thumb": { bgcolor: B.lavender, borderRadius: 10 },
      }}>
        <Button size="small" variant="contained"
          onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 150); }}
          sx={{
            borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
            bgcolor: open ? B.accent : B.pants, px: 2,
            fontFamily: "'Jua',sans-serif", fontSize: "0.78rem",
            boxShadow: `0 2px 8px ${B.pants}33`,
            "&:hover": { bgcolor: open ? "#C8550A" : "#6A3D96" },
          }}
        >
          ✏️ 직접 쓰기
        </Button>
      </Box>

      {/* 직접 입력 폼 */}
      <Collapse in={open}>
        <Box sx={{
          p: 2, borderRadius: 3,
          border: `1.5px solid ${B.lavender}`,
          bgcolor: B.cream,
          display: "flex", flexDirection: "column", gap: 1.5,
        }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "0.82rem", color: B.pants,
          }}>
            {otherUser}에게 쿠폰 발급하기 🎫
          </Typography>

          {/* 카테고리 */}
          <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <Box key={cat.key}
                onClick={() => setSelCat(cat.key)}
                sx={{
                  px: 1.2, py: "4px", borderRadius: "20px", cursor: "pointer",
                  border: `1.5px solid ${selCat === cat.key ? B.pants : B.lavender}`,
                  bgcolor: selCat === cat.key ? B.pants : "white",
                  color:   selCat === cat.key ? "white"  : B.dark + "88",
                  fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", fontWeight: 700,
                  transition: "all 0.15s",
                  userSelect: "none",
                }}
              >
                {cat.emoji} {cat.label}
              </Box>
            ))}
          </Box>

          {/* 텍스트 입력 */}
          <TextField
            inputRef={inputRef}
            fullWidth size="small"
            placeholder="예: 야식 사주기 권, 영화 골라주기 권..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleIssue(text, selCat)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2, bgcolor: "white",
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.85rem",
                "& fieldset": { borderColor: B.lavender },
                "&:hover fieldset": { borderColor: B.pants },
                "&.Mui-focused fieldset": { borderColor: B.pants },
              },
            }}
          />

          <Button fullWidth variant="contained"
            disabled={!text.trim() || loading}
            onClick={() => handleIssue(text, selCat)}
            sx={{
              bgcolor: B.pants, borderRadius: "12px", py: 1,
              fontFamily: "'Jua',sans-serif", fontSize: "0.9rem",
              boxShadow: `0 3px 10px ${B.pants}44`,
              "&:hover": { bgcolor: "#6A3D96" },
              "&.Mui-disabled": { bgcolor: B.lavender, color: "white" },
            }}
          >
            {loading ? "발급 중..." : `🎫 ${otherUser}에게 발급!`}
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
};

// ── 쿠폰 카드 ────────────────────────────────────────────────────
const CouponCard = ({ coupon, currentUser, onUse, onDelete }) => {
  const expired  = isExpired(coupon);
  const left     = daysLeft(coupon.createdAt);
  const catMeta  = getCatMeta(coupon.cat);
  const isUsed   = coupon.status === "used";
  const isAvailable = coupon.status === "available" && !expired;
  const isMine   = coupon.sender === currentUser;
  const canUse   = coupon.receiver === currentUser && isAvailable;

  return (
    <Box sx={{
      borderRadius: 3, overflow: "hidden",
      border: `2px dashed ${isUsed || expired ? "#DDD" : B.lavender}`,
      bgcolor: isUsed || expired ? "#F9F9F9" : "white",
      opacity: isUsed || expired ? 0.7 : 1,
      transition: "all 0.2s",
    }}>
      {/* 상단 컬러 바 */}
      <Box sx={{
        height: 4,
        bgcolor: isUsed || expired
          ? "#DDD"
          : catMeta.key === "food"  ? "#FF8A65"
          : catMeta.key === "date"  ? B.pants
          : catMeta.key === "chore" ? "#66BB6A"
          : catMeta.key === "hug"   ? B.pink
          : catMeta.key === "wish"  ? B.accent
          : "#90CAF9",
      }} />

      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="flex-start" gap={1.2}>
          {/* 이모지 */}
          <Typography sx={{
            fontSize: "1.8rem", lineHeight: 1, mt: 0.2,
            filter: isUsed || expired ? "grayscale(1)" : "none",
          }}>
            {catMeta.emoji}
          </Typography>

          {/* 내용 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: "0.92rem",
              color: isUsed || expired ? "#AAA" : B.dark,
              textDecoration: isUsed ? "line-through" : "none",
              wordBreak: "keep-all",
            }}>
              {coupon.title}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.8} sx={{ mt: 0.4 }}>
              <Typography sx={{
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.68rem",
                color: B.dark + "55",
              }}>
                From. {coupon.sender}
              </Typography>
              {isAvailable && left <= 3 && (
                <Box sx={{
                  px: 0.8, py: "1px", borderRadius: "10px",
                  bgcolor: "#FF525211", color: "#E53935",
                  fontSize: "0.62rem", fontWeight: 700,
                  fontFamily: "'Noto Sans KR',sans-serif",
                }}>
                  ⏰ {left}일 남음
                </Box>
              )}
              {expired && (
                <Box sx={{
                  px: 0.8, py: "1px", borderRadius: "10px",
                  bgcolor: "#88888811", color: "#888",
                  fontSize: "0.62rem", fontWeight: 700,
                  fontFamily: "'Noto Sans KR',sans-serif",
                }}>
                  만료됨
                </Box>
              )}
              {isUsed && (
                <Box sx={{
                  px: 0.8, py: "1px", borderRadius: "10px",
                  bgcolor: "#43A04711", color: "#43A047",
                  fontSize: "0.62rem", fontWeight: 700,
                  fontFamily: "'Noto Sans KR',sans-serif",
                }}>
                  ✓ 사용완료
                </Box>
              )}
            </Stack>
          </Box>

          {/* 액션 */}
          <Stack direction="row" alignItems="center" gap={0.5}>
            {isMine && (
              <IconButton size="small" onClick={() => onDelete(coupon.id)}
                sx={{ color: "#DDD", p: 0.5, "&:hover": { color: "#FF5252" } }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            {canUse ? (
              <Button variant="contained" size="small"
                onClick={() => onUse(coupon.id)}
                sx={{
                  bgcolor: B.pink, borderRadius: "10px",
                  fontFamily: "'Jua',sans-serif", fontSize: "0.78rem",
                  px: 1.5, py: 0.5, minWidth: 0,
                  boxShadow: `0 2px 8px ${B.pink}44`,
                  "&:hover": { bgcolor: "#E05588" },
                }}
              >
                사용
              </Button>
            ) : (
              !isUsed && !expired && (
                <Box sx={{
                  px: 1, py: "3px", borderRadius: "10px",
                  border: `1px solid ${B.lavender}`,
                  color: B.pants + "88",
                  fontSize: "0.65rem", fontFamily: "'Noto Sans KR',sans-serif",
                }}>
                  대기중
                </Box>
              )
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

// ── 메인 ─────────────────────────────────────────────────────────
const CoupleCoupons = ({ currentUser }) => {
  const [coupons, setCoupons]       = useState([]);
  const [tab, setTab]               = useState("received"); // received | sent | used
  const [showRoulette, setShowRoulette] = useState(false);

  const otherUser = USERS.find(u => u !== currentUser);

  useEffect(() => {
    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const issueCoupon = async (title, cat) => {
    await addDoc(collection(db, "coupons"), {
      title, cat: cat ?? "etc",
      sender: currentUser,
      receiver: otherUser,
      status: "available",
      createdAt: serverTimestamp(),
    });
  };

  const useCoupon = async (id) => {
    await updateDoc(doc(db, "coupons", id), { status: "used" });
    vibrate([10, 10, 20]);
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("이 쿠폰을 삭제하시겠어요?")) return;
    await deleteDoc(doc(db, "coupons", id));
  };

  // 탭별 필터
  const receivedCoupons = coupons.filter(
    c => c.receiver === currentUser && c.status === "available" && !isExpired(c)
  );
  const sentCoupons = coupons.filter(
    c => c.sender === currentUser && c.status === "available" && !isExpired(c)
  );
  const usedCoupons = coupons.filter(
    c => (c.receiver === currentUser || c.sender === currentUser)
      && (c.status === "used" || isExpired(c))
  );

  const tabData = tab === "received" ? receivedCoupons
    : tab === "sent"     ? sentCoupons
    : usedCoupons;

  const TABS = [
    { key: "received", label: `받은 쿠폰 ${receivedCoupons.length}` },
    { key: "sent",     label: `보낸 쿠폰 ${sentCoupons.length}` },
    { key: "used",     label: `사용/만료 ${usedCoupons.length}` },
  ];

  return (
    <Box>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: "1.15rem", color: B.pants,
          display: "flex", alignItems: "center", gap: 0.8,
        }}>
          🎫 쿠폰북
        </Typography>
        <Button
          size="small" variant="outlined"
          onClick={() => setShowRoulette(true)}
          sx={{
            borderRadius: 20, borderColor: B.accent, color: B.accent,
            fontFamily: "'Jua',sans-serif", fontSize: "0.78rem", px: 1.8,
            "&:hover": { bgcolor: B.accent + "11" },
          }}
        >
          🎰 랜덤 뽑기
        </Button>
      </Stack>

      {/* 발급 폼 */}
      <IssueForm currentUser={currentUser} onIssue={issueCoupon} />

      {/* 탭 */}
      <Stack direction="row" gap={0.8} sx={{ mb: 2 }}>
        {TABS.map(t => (
          <Box key={t.key}
            onClick={() => setTab(t.key)}
            sx={{
              px: 1.6, py: "5px", borderRadius: "20px", cursor: "pointer",
              bgcolor: tab === t.key ? B.pants : B.lavender,
              color:   tab === t.key ? "white"  : B.pants,
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", fontWeight: 700,
              transition: "all 0.15s",
              "&:active": { transform: "scale(0.95)" },
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </Box>
        ))}
      </Stack>

      {/* 쿠폰 목록 */}
      {tabData.length === 0 ? (
        <Box sx={{
          textAlign: "center", py: 5,
          color: B.dark + "44",
          fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.85rem",
        }}>
          {tab === "received" ? "받은 쿠폰이 없어요 😢\n상대방한테 졸라보세요 ㅋㅋ"
           : tab === "sent"   ? "발급한 쿠폰이 없어요\n위에서 만들어 보세요 🎫"
           : "아직 사용한 쿠폰이 없어요"}
        </Box>
      ) : (
        <Stack gap={1.5}>
          {tabData.map(c => (
            <CouponCard
              key={c.id} coupon={c}
              currentUser={currentUser}
              onUse={useCoupon}
              onDelete={deleteCoupon}
            />
          ))}
        </Stack>
      )}

      {/* 룰렛 모달 */}
      {showRoulette && (
        <RouletteModal
          coupons={coupons}
          currentUser={currentUser}
          onClose={() => setShowRoulette(false)}
          onUse={useCoupon}
        />
      )}
    </Box>
  );
};

export default CoupleCoupons;