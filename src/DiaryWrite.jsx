import React, { useState } from "react";
import {
  TextField, Button, Typography, Paper, Box, CircularProgress,
  IconButton, Stack,
} from "@mui/material";
import { storage, db } from "./firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from '@mui/icons-material/Close';

import { createRipple, createBuriPang, vibrate } from "./touchEffects";
import buri4 from "./assets/KakaoTalk_20260316_132913765.png";
import buri5 from "./assets/KakaoTalk_20260316_132923854.png";

// ── 새 캐릭터 이미지 ──────────────────────────────────────────
import buriHappy   from "./assets/KakaoTalk_20260424_173752880.png"; // 웃는 (행복)
import buriExcited from "./assets/KakaoTalk_20260424_173800871.png"; // 꽃 들고 (신남)
import buriCry     from "./assets/KakaoTalk_20260424_173745257.png"; // 울음
import buriCry2     from "./assets/KakaoTalk_20260424_173832207.png"; // 슬픔
import buriAngry   from "./assets/KakaoTalk_20260424_173820661.png"; // 불꽃 (화남)
import buriLove    from "./assets/KakaoTalk_20260424_173810950.png"; // 하트눈 (설렘)
import buriTired   from "./assets/KakaoTalk_20260424_173840927.png"; // 졸린 (피곤)
import buriLucky   from "./assets/KakaoTalk_20260424_173734582.png"; // 네잎클로버 (최고)
import buriCouple  from "./assets/KakaoTalk_20260424_173657493.png"; // 커플 (장식)

const B = {
  pants:    "#7B4FA6",
  skin:     "#F5B8A0",
  cream:    "#FFF8F2",
  peach:    "#FFE4D4",
  lavender: "#EDE0F5",
  accent:   "#E8630A",
  dark:     "#3D1F00",
};

const emotions = [
  { label: "행복", emoji: "🥰", buriImg: buriHappy   },
  { label: "신남", emoji: "🥳", buriImg: buriExcited  },
  { label: "울음", emoji: "😭", buriImg: buriCry      },
  { label: "슬픔", emoji: "😢", buriImg: buriCry2      },
  { label: "화남", emoji: "👹", buriImg: buriAngry    },
  { label: "설렘", emoji: "🫶", buriImg: buriLove     },
  { label: "피곤", emoji: "🥱", buriImg: buriTired    },
  { label: "최고", emoji: "🔥", buriImg: buriLucky    },
];

const sendNotification = async (currentUser, diaryId) => {
  try {
    await addDoc(collection(db, "notifications"), {
      writer: currentUser, type: "diary",
      content: `${currentUser}님이 새로운 기록을 남겼어요! 📝`,
      targetId: diaryId, createdAt: serverTimestamp(), isRead: false,
    });
  } catch (e) { console.error("알림 전송 실패:", e); }
};

const DiaryWrite = ({ currentUser }) => {
  const [content, setContent]   = useState("");
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [emotion, setEmotion]   = useState("행복");

  const selectedEm = emotions.find(e => e.label === emotion);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleCancelFile = () => { setFile(null); setPreview(null); };

  const handleSave = async () => {
    if (!content.trim() && !file) { alert("내용을 입력하거나 사진을 선택해주세요."); return; }
    setLoading(true);
    try {
      let finalImageUrl = "";
      if (file) {
        const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytesResumable(storageRef, file);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }
      const selectedEmoji = selectedEm?.emoji ?? "📝";
      const docRef = await addDoc(collection(db, "diaries"), {
        content, imageUrl: finalImageUrl, emoji: selectedEmoji,
        author: currentUser || "지수", emotion,
        createdAt: serverTimestamp(), likes: [],
      });
      await sendNotification(currentUser, docRef.id);
      alert("추억 저장 완료! 🐷");
      setContent(""); setFile(null); setPreview(null); setEmotion("행복");
    } catch (e) {
      console.error("저장 실패:", e);
      alert("저장 중 오류 발생! 다시 시도해 주세요.");
    } finally { setLoading(false); }
  };

  return (
    <Paper elevation={0} sx={{
      p: 3, width: "100%", boxSizing: "border-box", borderRadius: 4, maxWidth: "none",
      bgcolor: B.cream,
      border: `1.5px solid ${B.accent}33`,
      backgroundImage: `radial-gradient(circle at 5% 95%, ${B.peach}88 0%, transparent 40%)`,
      position: "relative", overflow: "visible",
    }}>

      {/* 코너 부리부리 (기존) */}
      <Box component="img" src={buri4} alt="" sx={{
        position: "absolute", top: -28, right: 12, width: 56,
        filter: `drop-shadow(0 3px 8px ${B.accent}44)`,
        animation: "headBob 2s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* 타이틀 */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
        <Typography sx={{
          fontFamily: "'Jua', sans-serif", fontSize: "1.1rem", color: B.accent,
          textShadow: `1px 1px 0 ${B.skin}88`,
        }}>
          오늘의 기록 ✍️
        </Typography>
      </Stack>

      {/* ── 감정 선택 (부리 이미지 그리드) ────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          mb: 1.2, color: B.dark + "88", fontWeight: "bold",
          fontSize: "0.82rem", fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          지금 기분은 어떤가요?
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.8 }}>
          {emotions.map((em) => {
            const isSelected = emotion === em.label;
            return (
              <Box
                key={em.label}
                onClick={() => { setEmotion(em.label); vibrate(12); }}
                sx={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "flex-end",
                  gap: "4px", pt: 0.8, pb: 0.8, px: 0.4,
                  borderRadius: "14px", cursor: "pointer",
                  transition: "all 0.18s",
                  bgcolor: isSelected ? B.pants : "white",
                  border: `2px solid ${isSelected ? B.pants : B.lavender}`,
                  boxShadow: isSelected
                    ? `0 4px 14px ${B.pants}55`
                    : `0 2px 6px ${B.skin}44`,
                  transform: isSelected ? "scale(1.07) translateY(-2px)" : "scale(1)",
                  "&:hover": {
                    bgcolor: isSelected ? "#6A3D96" : B.lavender,
                    transform: "scale(1.07) translateY(-2px)",
                  },
                  "&:active": { transform: "scale(0.94)" },
                }}
              >
                {/* 부리 캐릭터 이미지 */}
                <Box
                  component="img"
                  src={em.buriImg}
                  alt={em.label}
                  sx={{
                    width: 42, height: 42, objectFit: "contain",
                    filter: isSelected
                      ? "drop-shadow(0 2px 6px rgba(0,0,0,0.25)) brightness(1.05)"
                      : "none",
                    transition: "all 0.18s",
                    animation: isSelected ? "headBob 1.5s ease-in-out infinite" : "none",
                  }}
                />
                <Typography sx={{
                  fontSize: "0.62rem", lineHeight: 1,
                  color: isSelected ? "white" : B.dark + "99",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: isSelected ? 700 : 400,
                }}>
                  {em.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* 선택된 감정 미리보기 배너 */}
        {selectedEm && (
          <Box sx={{
            mt: 1.2, display: "flex", alignItems: "center", gap: 1.2,
            bgcolor: `${B.pants}11`, borderRadius: 3,
            px: 1.5, py: 0.8, border: `1px solid ${B.pants}22`,
          }}>
            <Box component="img" src={selectedEm.buriImg} alt=""
              sx={{ width: 28, height: 28, objectFit: "contain" }} />
            <Typography sx={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "0.78rem", color: B.pants, fontWeight: 600,
            }}>
              {selectedEm.emoji} 오늘의 기분: <b>{selectedEm.label}</b>
            </Typography>
          </Box>
        )}
      </Box>

      {/* 텍스트 입력 */}
      <TextField
        fullWidth multiline rows={4}
        placeholder="어떤 일이 있었나요? 사진과 함께 기록해 보세요! 🐷"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        sx={{
          mb: 2,
          "& .MuiOutlinedInput-root": {
            bgcolor: "#fff", borderRadius: 3,
            fontFamily: "'Noto Sans KR', sans-serif",
            "& fieldset": { borderColor: B.pants + "33" },
            "&:hover fieldset": { borderColor: B.pants + "88" },
            "&.Mui-focused fieldset": { borderColor: B.pants },
          },
        }}
      />

      {/* 이미지 미리보기 */}
      {preview && (
        <Box sx={{ position: "relative", width: "100%", mb: 2 }}>
          <img src={preview} alt="미리보기" style={{
            width: "100%", maxHeight: "250px", objectFit: "cover",
            borderRadius: "12px", border: `1.5px solid ${B.pants}33`,
          }} />
          <IconButton size="small" onClick={handleCancelFile} sx={{
            position: "absolute", top: 8, right: 8,
            bgcolor: "rgba(0,0,0,0.55)", color: "white",
            "&:hover": { bgcolor: "black" },
          }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* 하단 액션 */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <input accept="image/*" id="icon-button-file" type="file"
            style={{ display: "none" }} onChange={handleFileChange} />
          <label htmlFor="icon-button-file">
            <IconButton component="span"
              onPointerDown={(e) => createRipple(e)}
              sx={{
                color: B.pants, bgcolor: "#fff",
                boxShadow: `0 2px 8px ${B.pants}22`,
                border: `1px solid ${B.pants}33`,
                position: "relative", overflow: "hidden",
                transition: "transform 0.1s",
                "&:hover": { bgcolor: B.lavender },
                "&:active": { transform: "scale(0.9)" },
              }}>
              <PhotoCamera />
            </IconButton>
          </label>
          <Typography sx={{
            fontSize: "0.72rem", color: B.dark + "55",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}>
            {file ? file.name : "사진 첨부"}
          </Typography>
        </Box>

        <Button
          variant="contained"
          endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          onClick={handleSave}
          disabled={loading}
          onPointerDown={(e) => { createRipple(e); if (!loading) createBuriPang(e); }}
          sx={{
            bgcolor: B.pants, borderRadius: "20px", px: 3.5, py: 1,
            fontFamily: "'Jua', sans-serif", fontSize: "0.95rem",
            position: "relative", overflow: "hidden",
            boxShadow: `0 4px 14px ${B.pants}44`,
            transition: "transform 0.1s, box-shadow 0.1s",
            "&:hover": { bgcolor: "#6A3D96", boxShadow: `0 6px 18px ${B.pants}55` },
            "&:active": { transform: "scale(0.94)" },
            "&:disabled": { bgcolor: B.skin },
          }}
        >
          {loading ? "전송 중..." : "기록하기 🐷"}
        </Button>
      </Box>

      {/* 하단 커플 장식 */}
      <Box sx={{ textAlign: "center", mt: 2.5, opacity: 0.35 }}>
        <Box component="img" src={buriCouple} alt=""
          sx={{ width: 60, animation: "headBob 3s ease-in-out infinite" }} />
      </Box>
    </Paper>
  );
};

export default DiaryWrite;