import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, query, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, orderBy,
} from "firebase/firestore";
import {
  Box, Typography, Stack, IconButton, TextField,
  Button, CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon    from "@mui/icons-material/Add";
import confetti   from "canvas-confetti";
import { createBuriPang, shakeElement, vibrate } from "./touchEffects";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png";
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png";
import buri7 from "./assets/KakaoTalk_20260316_132945257.png";

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A",
  dark: "#3D1F00", pink: "#FF8FAB", teal: "#1D9E75",
};

const CATEGORIES = [
  { key: "전체",   label: "🐷 전체",   color: B.pants,   bg: B.lavender },
  { key: "데이트", label: "🧡 데이트", color: B.accent,  bg: B.peach    },
  { key: "여행",   label: "✈️ 여행",   color: "#185FA5", bg: "#E6F1FB"  },
  { key: "도전",   label: "💪 도전",   color: "#FF4081", bg: "#FFF0F8"  },
  { key: "일상",   label: "☀️ 일상",   color: B.teal,    bg: "#E1F5EE"  },
];

function getCatMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[1];
}

function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

function fireConfetti() {
  const colors = [B.pants, B.skin, "#FFE44D", "#ffffff", B.pink];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors });
  setTimeout(() =>
    confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 }, colors }), 200
  );
}

// ── 개별 아이템 ───────────────────────────────────────────────────
const BucketItem = ({ item, currentUser, index }) => {
  const deleteRef = useRef(null);
  const cat    = getCatMeta(item.category);
  const isDone = item.isDone;

  const handleToggle = async () => {
    vibrate([15, 8, 15]);
    const ref = doc(db, "buckets", item.id);
    if (!isDone) {
      await updateDoc(ref, { isDone: true, doneAt: serverTimestamp(), doneBy: currentUser });
      fireConfetti();
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, type: "bucket",
        content: `${currentUser}가 버킷리스트를 완료했어요! 🎉 "${item.title}"`,
        targetId: item.id, createdAt: serverTimestamp(), isRead: false,
      });
    } else {
      await updateDoc(ref, { isDone: false, doneAt: null, doneBy: null });
    }
  };

  const handleDelete = () => {
    shakeElement(deleteRef.current);
    setTimeout(async () => {
      if (window.confirm(`"${item.title}" 항목을 삭제할까요?`)) {
        await deleteDoc(doc(db, "buckets", item.id));
      }
    }, 150);
  };

  return (
    <Box onClick={handleToggle} sx={{
      display: "flex", alignItems: "center", gap: 1.2,
      bgcolor: isDone ? "#F4FFF8" : "white",
      borderRadius: "14px",
      border: isDone ? `1.5px solid ${B.teal}55` : `1.5px solid ${cat.color}22`,
      px: 1.6, py: 1.4,
      cursor: "pointer", position: "relative", overflow: "hidden",
      transition: "transform 0.12s",
      animation: `bucketSlide 0.3s ease ${index * 0.04}s both`,
      "&:active": { transform: "scale(0.97)" },
      "&::before": isDone ? {
        content: '""', position: "absolute",
        left: 0, top: 0, bottom: 0, width: "4px",
        bgcolor: B.teal, borderRadius: "4px 0 0 4px",
      } : {},
    }}>
      {/* 체크 원 */}
      <Box sx={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        border: isDone ? `2px solid ${B.teal}` : `2px solid ${B.lavender}`,
        bgcolor: isDone ? B.teal : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: "14px", transition: "all 0.2s",
      }}>
        {isDone && "✓"}
      </Box>

      {/* 텍스트 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: "0.9rem",
          color: isDone ? B.dark + "55" : B.dark,
          textDecoration: isDone ? "line-through" : "none",
          mb: 0.3, lineHeight: 1.3,
        }}>{item.title}</Typography>
        <Stack direction="row" alignItems="center" gap={0.8} flexWrap="wrap">
          <Box sx={{
            px: 0.9, py: "1px", borderRadius: "10px",
            bgcolor: cat.bg, color: cat.color,
            fontSize: "0.6rem", fontWeight: 700,
            fontFamily: "'Noto Sans KR',sans-serif",
          }}>{cat.label}</Box>
          <Typography sx={{ fontSize: "0.62rem", color: B.dark + "55",
            fontFamily: "'Noto Sans KR',sans-serif" }}>
            {item.writer} 등록
          </Typography>
          {isDone && item.doneAt && (
            <Typography sx={{ fontSize: "0.62rem", color: B.teal,
              fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif" }}>
              · {fmtDate(item.doneAt)} 완료 🎉
            </Typography>
          )}
        </Stack>
      </Box>

      {/* 삭제 버튼 */}
      <IconButton ref={deleteRef}
        onClick={e => { e.stopPropagation(); handleDelete(); }}
        size="small"
        sx={{ color: "#ccc", flexShrink: 0,
          "&:hover": { color: B.accent },
          "&:active": { transform: "scale(0.85)" },
          transition: "all 0.15s",
        }}>
        <DeleteIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  );
};

// ── 추가 폼 ───────────────────────────────────────────────────────
const AddForm = ({ currentUser, onClose }) => {
  const [title,   setTitle]   = useState("");
  const [cat,     setCat]     = useState("데이트");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "buckets"), {
        title: title.trim(), category: cat, writer: currentUser,
        isDone: false, doneAt: null, doneBy: null,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, type: "bucket_add",
        content: `${currentUser}가 버킷리스트에 새 항목을 추가했어요! 🪣 "${title.trim()}"`,
        createdAt: serverTimestamp(), isRead: false,
      });
      setTitle(""); onClose();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{
      bgcolor: "white", borderRadius: 3,
      border: `1.5px solid ${B.pants}33`,
      p: 2, mb: 1.5,
      animation: "fadeInUp 0.25s ease both",
    }}>
      <Stack direction="row" gap={0.7} sx={{ mb: 1.5, flexWrap: "wrap" }}>
        {CATEGORIES.slice(1).map(c => (
          <Box key={c.key} onClick={() => setCat(c.key)} sx={{
            px: 1.2, py: "4px", borderRadius: "20px", cursor: "pointer",
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", fontWeight: 700,
            bgcolor: cat === c.key ? c.color : c.bg,
            color:   cat === c.key ? "white" : c.color,
            border: `1.5px solid ${cat === c.key ? "transparent" : c.color + "44"}`,
            transition: "all 0.15s", "&:active": { transform: "scale(0.93)" },
          }}>{c.label}</Box>
        ))}
      </Stack>
      <Stack direction="row" gap={1}>
        <TextField size="small" fullWidth autoFocus
          placeholder="버킷리스트 항목을 입력하세요 🪣"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyPress={e => e.key === "Enter" && handleAdd()}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px", bgcolor: B.cream,
              fontFamily: "'Noto Sans KR',sans-serif",
              "& fieldset": { borderColor: B.pants + "33" },
              "&:hover fieldset": { borderColor: B.pants + "88" },
              "&.Mui-focused fieldset": { borderColor: B.pants },
            }
          }}
        />
        <Button variant="contained" onClick={handleAdd}
          disabled={!title.trim() || loading}
          onPointerDown={e => title.trim() && createBuriPang(e)}
          sx={{
            bgcolor: B.pants, borderRadius: "10px", px: 2, flexShrink: 0,
            fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
            minWidth: 0, boxShadow: `0 3px 10px ${B.pants}33`,
            "&:hover": { bgcolor: "#6A3D96" },
            "&:disabled": { bgcolor: B.lavender },
            "&:active": { transform: "scale(0.94)" },
            transition: "transform 0.1s",
          }}>
          {loading ? <CircularProgress size={16} sx={{ color: "white" }} /> : "추가"}
        </Button>
        <Button onClick={onClose} sx={{
          color: B.dark + "55", borderRadius: "10px", minWidth: 0, px: 1,
          "&:hover": { bgcolor: B.lavender },
        }}>✕</Button>
      </Stack>
    </Box>
  );
};

// ── 메인 ─────────────────────────────────────────────────────────
const BucketList = ({ currentUser }) => {
  const [items,    setItems]    = useState([]);
  const [filter,   setFilter]   = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const q = query(collection(db, "buckets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = items
    .filter(i => filter === "전체" || i.category === filter)
    .sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    });

  const total     = items.length;
  const doneCount = items.filter(i => i.isDone).length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Box>
      <style>{`
        @keyframes bucketSlide {
          from { opacity:0; transform:translateX(16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes buriJump {
          0%,100% { transform:translateY(0) rotate(0deg); }
          35%     { transform:translateY(-10px) rotate(-6deg); }
          65%     { transform:translateY(-4px) rotate(4deg); }
        }
      `}</style>

      {/* 진행률 카드 */}
      <Box sx={{
        bgcolor: "white", borderRadius: 4,
        border: `1.5px solid ${B.lavender}`,
        p: 2.2, mb: 2,
        backgroundImage: `radial-gradient(circle at 95% 5%, ${B.lavender} 0%, transparent 40%)`,
        position: "relative", overflow: "visible",
      }}>
        <Box component="img" src={buri1} alt="" sx={{
          position: "absolute", top: -22, right: 10, width: 46,
          animation: "buriJump 2.5s ease-in-out infinite",
          filter: `drop-shadow(0 2px 8px ${B.pants}44)`,
          pointerEvents: "none",
        }} />
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1rem" }}>
              우리의 버킷리스트 🪣
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", color: B.dark + "66",
              fontFamily: "'Noto Sans KR',sans-serif" }}>
              탭해서 완료 체크!
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "2rem",
              color: pct === 100 ? B.teal : B.pants, lineHeight: 1 }}>
              {pct}%
            </Typography>
            <Typography sx={{ fontSize: "0.62rem", color: B.dark + "66",
              fontFamily: "'Noto Sans KR',sans-serif" }}>
              {doneCount} / {total}개 완료
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ height: 10, bgcolor: B.lavender, borderRadius: "10px", overflow: "hidden", mb: 1 }}>
          <Box sx={{
            height: "100%", borderRadius: "10px",
            bgcolor: pct === 100 ? B.teal : B.pants,
            width: `${pct}%`, transition: "width 0.8s ease",
          }} />
        </Box>
        {pct === 100 && total > 0 && (
          <Box sx={{
            textAlign: "center", py: 0.8, bgcolor: "#E8FFF2",
            borderRadius: 2, border: `1px dashed ${B.teal}66`,
          }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.82rem", color: B.teal }}>
              🎉 모든 버킷리스트 완료! 최고의 커플 🐷💜
            </Typography>
          </Box>
        )}
      </Box>

      {/* 카테고리 필터 */}
      <Stack direction="row" gap={0.7} sx={{ mb: 1.5, flexWrap: "wrap" }}>
        {CATEGORIES.map(c => (
          <Box key={c.key} onClick={() => { setFilter(c.key); vibrate(12); }} sx={{
            px: 1.3, py: "5px", borderRadius: "20px", cursor: "pointer",
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem", fontWeight: 700,
            bgcolor: filter === c.key ? c.color : "white",
            color:   filter === c.key ? "white" : c.color,
            border: `1.5px solid ${filter === c.key ? "transparent" : c.color + "44"}`,
            transition: "all 0.15s", "&:active": { transform: "scale(0.93)" },
          }}>{c.label}</Box>
        ))}
      </Stack>

      {/* 추가 폼 */}
      {showForm && <AddForm currentUser={currentUser} onClose={() => setShowForm(false)} />}

      {/* 추가 버튼 */}
      {!showForm && (
        <Button fullWidth variant="outlined" startIcon={<AddIcon />}
          onClick={() => { setShowForm(true); vibrate(15); }}
          onPointerDown={e => createBuriPang(e)}
          sx={{
            mb: 1.5, borderRadius: "12px", py: 1,
            borderColor: B.pants + "44", color: B.pants,
            fontFamily: "'Jua',sans-serif", fontSize: "0.88rem",
            position: "relative", overflow: "hidden",
            "&:hover": { bgcolor: B.lavender, borderColor: B.pants },
            "&:active": { transform: "scale(0.97)" },
            transition: "transform 0.1s",
          }}>
          새 항목 추가하기
        </Button>
      )}

      {/* 로딩 */}
      {loading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress sx={{ color: B.pants }} size={28} />
        </Box>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <Box sx={{ textAlign: "center", py: 5, opacity: 0.5 }}>
          <Box component="img" src={buri7} alt="" sx={{
            width: 60, mb: 1.5, animation: "buriJump 2.5s ease-in-out infinite",
            filter: `drop-shadow(0 2px 8px ${B.pants}44)`,
          }} />
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.dark + "88", fontSize: "0.88rem" }}>
            {filter === "전체"
              ? "아직 버킷리스트가 없어요 🪣\n첫 항목을 추가해봐요!"
              : `${filter} 카테고리 항목이 없어요 🐷`}
          </Typography>
        </Box>
      )}

      {/* 리스트 */}
      {!loading && (
        <Stack spacing={1}>
          {filtered.map((item, i) => (
            <BucketItem key={item.id} item={item} currentUser={currentUser} index={i} />
          ))}
        </Stack>
      )}

      {/* 하단 장식 */}
      {!loading && filtered.length > 0 && (
        <Box sx={{ textAlign: "center", mt: 2.5, opacity: 0.35 }}>
          <Box component="img" src={buri2} alt=""
            sx={{ width: 48, animation: "buriJump 3s ease-in-out infinite" }} />
        </Box>
      )}
    </Box>
  );
};

export default BucketList;