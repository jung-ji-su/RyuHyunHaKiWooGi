import React, { useState } from "react";
import {
  TextField, Button, Typography, Paper, Box, CircularProgress,
  IconButton, ToggleButton, ToggleButtonGroup, Stack,
} from "@mui/material";
import { storage, db } from "./firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from '@mui/icons-material/Close';

import { createRipple, createBuriPang, vibrate } from "./touchEffects";
import buri4 from "./assets/KakaoTalk_20260316_132913765.png"; // 칼 든 부리부리 (코너)
import buri5 from "./assets/KakaoTalk_20260316_132923854.png"; // 얼굴 클로즈업 (하단 장식)

const B = {
  pants:   "#7B4FA6",
  skin:    "#F5B8A0",
  cream:   "#FFF8F2",
  peach:   "#FFE4D4",
  lavender:"#EDE0F5",
  accent:  "#E8630A",
  dark:    "#3D1F00",
};

const emotions = [
  { label:"행복", emoji:"🥰" },
  { label:"신남", emoji:"🥳" },
  { label:"울음", emoji:"😭" },
  { label:"슬픔", emoji:"😢" },
  { label:"화남", emoji:"👹" },
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
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState("행복");

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
      const selectedEmoji = emotions.find(e => e.label === emotion)?.emoji ?? "📝";
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
      p: 3, width:"100%", boxSizing:"border-box", borderRadius:4, maxWidth:'none',
      bgcolor: B.cream,
      border: `1.5px solid ${B.accent}33`,
      backgroundImage: `radial-gradient(circle at 5% 95%, ${B.peach}88 0%, transparent 40%)`,
      position: 'relative', overflow:'visible',
    }}>

      {/* 코너 부리부리 */}
      <Box
        component="img" src={buri4} alt=""
        sx={{
          position:'absolute', top:-28, right: 12, width:56,
          filter:`drop-shadow(0 3px 8px ${B.accent}44)`,
          animation:'headBob 2s ease-in-out infinite',
          pointerEvents:'none',
        }}
      />

      {/* 타이틀 */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
        <Typography sx={{
          fontFamily:"'Jua', sans-serif", fontSize:'1.1rem', color: B.accent,
          textShadow:`1px 1px 0 ${B.skin}88`,
        }}>
          오늘의 기록 ✍️
        </Typography>
      </Stack>

      {/* 감정 선택 */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ mb:1, color: B.dark + "88", fontWeight:'bold', fontSize:'0.82rem', fontFamily:"'Noto Sans KR', sans-serif" }}>
          지금 기분은 어떤가요?
        </Typography>
        <ToggleButtonGroup
          value={emotion} exclusive
          onChange={(e, v) => v && setEmotion(v)}
          fullWidth
          sx={{
            display:'flex', gap:1, border:'none', flexWrap:'wrap',
            '& .MuiToggleButton-root': {
              border:'none', borderRadius:'12px !important',
              bgcolor: B.peach + "88",
              boxShadow:`0 2px 6px ${B.skin}66`,
              fontSize:'1.2rem', flex:1, minWidth:'50px',
              transition:'all 0.18s',
              '&:hover': { bgcolor: B.lavender, transform:'scale(1.08)' },
              '&.Mui-selected': {
                bgcolor: B.pants, color:'white !important',
                boxShadow:`0 4px 12px ${B.pants}55`,
                transform:'scale(1.1)',
                '&:hover': { bgcolor:'#6A3D96' },
              },
            },
          }}
        >
          {emotions.map((em) => (
            <ToggleButton key={em.label} value={em.label}>{em.emoji}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* 텍스트 입력 */}
      <TextField
        fullWidth multiline rows={4}
        placeholder="어떤 일이 있었나요? 사진과 함께 기록해 보세요! 🐷"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#fff', borderRadius:3,
            fontFamily:"'Noto Sans KR', sans-serif",
            '& fieldset': { borderColor: B.pants + "33" },
            '&:hover fieldset': { borderColor: B.pants + "88" },
            '&.Mui-focused fieldset': { borderColor: B.pants },
          },
        }}
      />

      {/* 이미지 미리보기 */}
      {preview && (
        <Box sx={{ position:'relative', width:'100%', mb:2 }}>
          <img src={preview} alt="미리보기"
            style={{ width:'100%', maxHeight:'250px', objectFit:'cover',
              borderRadius:'12px', border:`1.5px solid ${B.pants}33` }}
          />
          <IconButton
            size="small" onClick={handleCancelFile}
            sx={{ position:'absolute', top:8, right:8,
              bgcolor:'rgba(0,0,0,0.55)', color:'white', '&:hover':{ bgcolor:'black' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* 하단 액션 */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <input accept="image/*" id="icon-button-file" type="file"
            style={{ display:'none' }} onChange={handleFileChange}
          />
          <label htmlFor="icon-button-file">
            <IconButton component="span"
              onPointerDown={(e) => createRipple(e)}
              sx={{
                color: B.pants, bgcolor: '#fff',
                boxShadow:`0 2px 8px ${B.pants}22`,
                border:`1px solid ${B.pants}33`,
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.1s',
                '&:hover': { bgcolor: B.lavender },
                '&:active': { transform: 'scale(0.9)' },
              }}>
              <PhotoCamera />
            </IconButton>
          </label>
          <Typography sx={{ fontSize:'0.72rem', color: B.dark + "55", fontFamily:"'Noto Sans KR', sans-serif" }}>
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
            bgcolor: B.pants, borderRadius:'20px', px:3.5, py:1,
            fontFamily:"'Jua', sans-serif", fontSize:'0.95rem',
            position: 'relative', overflow: 'hidden',
            boxShadow:`0 4px 14px ${B.pants}44`,
            transition: 'transform 0.1s, box-shadow 0.1s',
            '&:hover': { bgcolor:'#6A3D96', boxShadow:`0 6px 18px ${B.pants}55` },
            '&:active': { transform: 'scale(0.94)' },
            '&:disabled': { bgcolor: B.skin },
          }}
        >
          {loading ? "전송 중..." : "기록하기 🐷"}
        </Button>
      </Box>

      {/* 하단 장식 */}
      <Box sx={{ textAlign:'center', mt:2.5, opacity:0.3 }}>
        <Box component="img" src={buri5} alt="" sx={{ width:44, animation:'headBob 3s ease-in-out infinite' }} />
      </Box>
    </Paper>
  );
};

export default DiaryWrite;