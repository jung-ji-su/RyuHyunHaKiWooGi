import React, { useEffect, useState, useRef } from "react";
import { db } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc,
  serverTimestamp, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import {
  Card, CardContent, Typography, Stack, Box, Avatar, Divider,
  IconButton, TextField, InputAdornment,
} from "@mui/material";
import DeleteIcon      from "@mui/icons-material/Delete";
import SendIcon        from "@mui/icons-material/Send";
import { Favorite, FavoriteBorder } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

import meImg from "./assets/JS.jpg";
import gfImg from "./assets/HY.jpg";

import buri9 from "./assets/KakaoTalk_20260316_133007779.png";
import buri3 from "./assets/image.png";

// ── 새 캐릭터 이미지 ──────────────────────────────────────────
import buriHappy    from "./assets/KakaoTalk_20260424_173752880.png"; // 웃는 (행복)
import buriExcited  from "./assets/KakaoTalk_20260424_173800871.png"; // 꽃 들고 (신남)
import buriCry      from "./assets/KakaoTalk_20260424_173745257.png"; // 우는 (울음/슬픔)
import buriAngry    from "./assets/KakaoTalk_20260424_173820661.png"; // 불꽃 (화남)
import buriLove     from "./assets/KakaoTalk_20260424_173810950.png"; // 하트눈 (설렘)
import buriTired    from "./assets/KakaoTalk_20260424_173840927.png"; // 졸린 (피곤)
import buriLucky    from "./assets/KakaoTalk_20260424_173734582.png"; // 네잎클로버 (최고)
import buriCouple   from "./assets/KakaoTalk_20260424_173657493.png"; // 커플 (빈 화면)
import buriSurprise from "./assets/KakaoTalk_20260424_173832207.png"; // 놀란 (당황)
import buriFunny    from "./assets/KakaoTalk_20260424_173712715.png"; // 혀 내밈 (장식)

import { createHeartPang, shakeElement, vibrate } from "./touchEffects";

// ── 감정별 이미지 매핑 ────────────────────────────────────────
const EMOTION_BURI = {
  "행복": buriHappy,
  "신남": buriExcited,
  "울음": buriCry,
  "슬픔": buriCry,
  "화남": buriAngry,
  "설렘": buriLove,
  "피곤": buriTired,
  "최고": buriLucky,
};

const B = {
  pants:    "#7B4FA6",
  skin:     "#F5B8A0",
  cream:    "#FFF8F2",
  peach:    "#FFE4D4",
  lavender: "#EDE0F5",
  accent:   "#E8630A",
  dark:     "#3D1F00",
};

const DiaryList = ({ currentUser, pageSize }) => {
  const [diaries, setDiaries]           = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [page, setPage]                 = useState(0);

  const PER        = pageSize || 999;
  const totalPages = Math.ceil(diaries.length / PER);
  const visible    = diaries.slice(page * PER, (page + 1) * PER);

  useEffect(() => {
    const q = query(collection(db, "diaries"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDiaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddComment = async (diaryId) => {
    const commentText = commentInputs[diaryId];
    if (!currentUser) { alert("로그인 정보가 없어서 댓글을 달 수 없어요 ㅠ_ㅠ"); return; }
    if (!commentText?.trim()) return;
    try {
      await addDoc(collection(db, "diaries", diaryId, "comments"), {
        text: commentText, author: currentUser, createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, type: "comment",
        content: `${currentUser}님이 내 기록에 댓글을 남겼어요! 💬`,
        targetId: diaryId, createdAt: serverTimestamp(), isRead: false,
      });
      setCommentInputs({ ...commentInputs, [diaryId]: "" });
    } catch (e) { console.error("댓글 저장 실패:", e); }
  };

  return (
    <Box sx={{ mt: 2, mb: 4 }}>

      {/* 섹션 타이틀 */}
      {!pageSize && (
        <Stack direction="row" alignItems="center" justifyContent="center" gap={1.2} sx={{ mb: 3 }}>
          <Box component="img" src={buri9} alt="" sx={{
            width: 32, objectFit: "contain",
            animation: "headBob 2.8s ease-in-out infinite",
            filter: `drop-shadow(0 2px 6px ${B.pants}44)`,
          }} />
          <Typography sx={{
            fontFamily: "'Jua', sans-serif", fontSize: "1.1rem",
            color: B.pants, textShadow: `1px 1px 0 ${B.skin}88`,
          }}>
            우리의 소중한 기록들 📖
          </Typography>
          <Box component="img" src={buri9} alt="" sx={{
            width: 32, objectFit: "contain", transform: "scaleX(-1)",
            animation: "headBob 2.8s ease-in-out infinite",
            filter: `drop-shadow(0 2px 6px ${B.pants}44)`,
          }} />
        </Stack>
      )}

      <Stack spacing={3}>
        {visible.map((item) => (
          <DiaryCard
            key={item.id}
            item={item}
            currentUser={currentUser}
            commentText={commentInputs[item.id] || ""}
            setCommentText={(val) => setCommentInputs({ ...commentInputs, [item.id]: val })}
            onAddComment={() => handleAddComment(item.id)}
            meImg={meImg}
            gfImg={gfImg}
          />
        ))}

        {/* 빈 상태 — 커플 이미지 */}
        {diaries.length === 0 && (
          <Box sx={{ textAlign: "center", py: 6, opacity: 0.6 }}>
            <Box component="img" src={buriCouple} alt=""
              sx={{ width: 90, mb: 1.5, animation: "headBob 3s ease-in-out infinite" }} />
            <Typography sx={{
              fontFamily: "'Jua', sans-serif", color: B.dark + "88", fontSize: "0.9rem",
            }}>
              아직 기록이 없어요 🐷<br />첫 번째 추억을 남겨봐요!
            </Typography>
          </Box>
        )}
      </Stack>

      {/* 페이징 */}
      {pageSize && totalPages > 1 && (
        <Stack direction="row" justifyContent="center" alignItems="center" gap={1.5} sx={{ mt: 2 }}>
          {[
            { dir: -1, label: "‹", disabled: page === 0 },
            { dir:  1, label: "›", disabled: page >= totalPages - 1 },
          ].map(({ dir, label, disabled }) => (
            <Box key={label}
              onClick={() => { if (!disabled) { setPage(p => p + dir); vibrate(12); } }}
              sx={{
                width: 36, height: 36, borderRadius: "50%",
                bgcolor: disabled ? B.lavender : B.pants,
                color: disabled ? B.pants + "55" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: disabled ? "default" : "pointer",
                fontFamily: "'Jua',sans-serif", fontSize: "1.1rem",
                transition: "all 0.15s",
                "&:active": !disabled ? { transform: "scale(0.9)" } : {},
              }}
            >
              {label}
            </Box>
          ))}
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.85rem", color: B.pants }}>
            {page + 1} / {totalPages}
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

// ── 개별 다이어리 카드 ───────────────────────────────────────────
const DiaryCard = ({ item, currentUser, commentText, setCommentText, onAddComment, meImg, gfImg }) => {
  const [comments, setComments] = useState([]);
  const isMyPost  = item.author === currentUser;
  const deleteRef = useRef(null);
  const likeRef   = useRef(null);
  const buriImg   = EMOTION_BURI[item.emotion];

  const handleDeleteDiary = async () => {
    shakeElement(deleteRef.current);
    setTimeout(async () => {
      if (window.confirm("이 소중한 추억을 정말 삭제하시겠습니까? 😢")) {
        try { await deleteDoc(doc(db, "diaries", item.id)); }
        catch (e) { console.error("삭제 실패:", e); alert("삭제 중 오류가 발생했습니다."); }
      }
    }, 150);
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const diaryRef = doc(db, "diaries", item.id);
    const isLiked  = item.likes?.includes(currentUser);
    try {
      if (isLiked) {
        await updateDoc(diaryRef, { likes: arrayRemove(currentUser) });
      } else {
        await updateDoc(diaryRef, { likes: arrayUnion(currentUser) });
        if (likeRef.current) createHeartPang(likeRef.current);
      }
    } catch (e) { console.error("좋아요 처리 실패:", e); }
  };

  useEffect(() => {
    const q = query(
      collection(db, "diaries", item.id, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [item.id]);

  return (
    <Card
      id={`diary-${item.id}`}
      elevation={0}
      sx={{
        borderRadius: 4,
        bgcolor: B.cream,
        border: `1.5px solid ${isMyPost ? B.pants + "33" : B.skin + "88"}`,
        backgroundImage: isMyPost
          ? `radial-gradient(circle at 100% 0%, ${B.lavender}55 0%, transparent 40%)`
          : `radial-gradient(circle at 0% 100%, ${B.peach}66 0%, transparent 40%)`,
        overflow: "visible",
        position: "relative",
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer",
        "&:active": { transform: "scale(0.975) translateY(2px)", boxShadow: `0 1px 6px ${B.pants}18` },
        "&:hover": { boxShadow: `0 6px 24px ${B.pants}22`, transform: "translateY(-2px)" },
        "&:hover .card-buri": { opacity: 0.7, transform: "translateY(-6px) rotate(8deg) scale(1.1)" },
      }}
      onPointerDown={() => vibrate(12)}
    >
      {/* 감정별 부리 코너 장식 */}
      {buriImg && (
        <Box
          className="card-buri"
          component="img"
          src={buriImg}
          alt=""
          sx={{
            position: "absolute",
            top: -24, right: 10,
            width: 52,
            objectFit: "contain",
            opacity: 0.35,
            pointerEvents: "none",
            transition: "all 0.3s ease",
            filter: `drop-shadow(0 2px 8px ${B.pants}55)`,
            zIndex: 2,
          }}
        />
      )}

      <CardContent sx={{ p: 2.5 }}>

        {/* 작성자 헤더 */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Box sx={{ position: "relative", mr: 1.5 }}>
            <Avatar
              src={item.author === "현하" ? gfImg : meImg}
              sx={{ width: 42, height: 42, border: `2.5px solid ${isMyPost ? B.pants : B.skin}` }}
            />
            {isMyPost && (
              <Box sx={{
                position: "absolute", bottom: -4, right: -4,
                width: 18, height: 18, borderRadius: "50%",
                bgcolor: B.cream, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "11px",
                border: `1px solid ${B.pants}44`,
              }}>🐷</Box>
            )}
          </Box>

          <Box flexGrow={1}>
            <Typography sx={{
              fontWeight: "bold", color: B.dark, fontSize: "0.92rem",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              {item.author}
              {item.emotion && buriImg && (
                <Box component="img" src={buriImg} alt={item.emotion} sx={{
                  width: 18, height: 18, objectFit: "contain",
                  ml: 0.8, verticalAlign: "middle",
                  display: "inline-block",
                }} />
              )}
              {item.emotion && (
                <Box component="span" sx={{ fontSize: "0.72rem", color: B.pants, ml: 0.4 }}>
                  {item.emotion}
                </Box>
              )}
            </Typography>
            <Typography variant="caption" sx={{ color: B.dark + "66" }}>
              {item.createdAt?.toDate().toLocaleString("ko-KR")}
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            {(currentUser === item.author || currentUser === "지수") && (
              <IconButton ref={deleteRef} onClick={handleDeleteDiary} size="small"
                sx={{ color: B.skin, "&:hover": { color: B.accent }, mr: 0.5 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            <Stack ref={likeRef} direction="row" alignItems="center" sx={{ position: "relative" }}>
              <IconButton onClick={handleLike} sx={{ p: 0.5 }}>
                <AnimatePresence mode="wait">
                  {item.likes?.includes(currentUser) ? (
                    <motion.div key="liked"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Favorite sx={{ color: B.pants }} />
                    </motion.div>
                  ) : (
                    <motion.div key="unliked" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                      <FavoriteBorder sx={{ color: B.skin }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </IconButton>
              <Typography sx={{ fontWeight: "bold", color: B.pants, fontSize: "0.78rem", minWidth: "12px" }}>
                {item.likes?.length || 0}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* 본문 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            {item.emoji && (
              <Typography variant="h3" sx={{
                lineHeight: 1, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
              }}>
                {item.emoji}
              </Typography>
            )}
            <Typography sx={{
              whiteSpace: "pre-wrap", flex: 1, color: B.dark,
              pt: 0.5, lineHeight: 1.7,
              fontFamily: "'Noto Sans KR', sans-serif", fontSize: "0.95rem",
            }}>
              {item.content}
            </Typography>
          </Box>
        </Box>

        {/* 이미지 */}
        {item.imageUrl && (
          <Box sx={{
            mt: 1, mb: 2, borderRadius: 3, overflow: "hidden",
            boxShadow: `0 4px 16px ${B.pants}22`,
            border: `1.5px solid ${B.pants}22`,
          }}>
            <img src={item.imageUrl} alt="추억 사진"
              style={{ width: "100%", display: "block", maxHeight: "450px", objectFit: "cover" }} />
          </Box>
        )}

        <Divider sx={{ my: 2, borderStyle: "dashed", borderColor: B.pants + "33" }} />

        {/* 댓글 목록 */}
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {comments.map((c) => (
            <Box key={c.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Avatar src={c.author === "현하" ? gfImg : meImg}
                sx={{ width: 28, height: 28, border: `1.5px solid ${B.pants}44` }} />
              <Box sx={{
                bgcolor: B.lavender, p: 1.2,
                borderRadius: "15px", borderTopLeftRadius: "2px", maxWidth: "85%",
              }}>
                <Typography sx={{
                  fontWeight: "bold", display: "block", color: B.pants,
                  fontSize: "0.7rem", fontFamily: "'Noto Sans KR', sans-serif",
                }}>
                  {c.author}
                </Typography>
                <Typography sx={{
                  color: B.dark, fontSize: "0.85rem", fontFamily: "'Noto Sans KR', sans-serif",
                }}>
                  {c.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        {/* 댓글 입력 */}
        <TextField
          fullWidth size="small" placeholder="따뜻한 한마디 남기기... 🐷"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onAddComment()}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 5, bgcolor: B.cream,
              fontFamily: "'Noto Sans KR', sans-serif",
              "& fieldset": { borderColor: B.pants + "33" },
              "&:hover fieldset": { borderColor: B.pants + "88" },
              "&.Mui-focused fieldset": { borderColor: B.pants },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={onAddComment} disabled={!commentText?.trim()}>
                  <SendIcon fontSize="small"
                    sx={{ color: commentText?.trim() ? B.pants : B.skin }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </CardContent>
    </Card>
  );
};

export default DiaryList;