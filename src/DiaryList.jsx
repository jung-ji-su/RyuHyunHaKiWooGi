import React, { useEffect, useState, useRef } from "react";
import { db } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc,
  serverTimestamp, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import {
  Card, CardContent, Typography, Stack, Box, Avatar, Divider,
  IconButton, TextField, InputAdornment, Skeleton,
} from "@mui/material";
import DeleteIcon      from "@mui/icons-material/Delete";
import SendIcon        from "@mui/icons-material/Send";
import EditIcon        from "@mui/icons-material/Edit";
import CheckIcon       from "@mui/icons-material/Check";
import CloseIcon       from "@mui/icons-material/Close";
import { Favorite, FavoriteBorder } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

import meImg from "./assets/JS.jpg";
import gfImg from "./assets/HY.jpg";

import buri9    from "./assets/KakaoTalk_20260316_133007779.png";
import buri3    from "./assets/image.png";

import buriHappy    from "./assets/KakaoTalk_20260424_173752880.png";
import buriExcited  from "./assets/KakaoTalk_20260424_173800871.png";
import buriCry      from "./assets/KakaoTalk_20260424_173745257.png";
import buriAngry    from "./assets/KakaoTalk_20260424_173820661.png";
import buriLove     from "./assets/KakaoTalk_20260424_173810950.png";
import buriTired    from "./assets/KakaoTalk_20260424_173840927.png";
import buriLucky    from "./assets/KakaoTalk_20260424_173734582.png";
import buriCouple   from "./assets/KakaoTalk_20260424_173657493.png";
import buriSurprise from "./assets/KakaoTalk_20260424_173832207.png";
import buriFunny    from "./assets/KakaoTalk_20260424_173712715.png";

import { createHeartPang, shakeElement, vibrate } from "./touchEffects";

const EMOTION_BURI = {
  "행복": buriHappy, "신남": buriExcited, "울음": buriCry, "슬픔": buriCry,
  "화남": buriAngry, "설렘": buriLove, "피곤": buriTired, "최고": buriLucky,
  "당황": buriSurprise,
};

const EMOTIONS = [
  { emoji: "😊", label: "행복" }, { emoji: "🎉", label: "신남" },
  { emoji: "😢", label: "슬픔" }, { emoji: "😭", label: "울음" },
  { emoji: "😡", label: "화남" }, { emoji: "💝", label: "설렘" },
  { emoji: "😴", label: "피곤" }, { emoji: "🍀", label: "최고" },
  { emoji: "😮", label: "당황" },
];

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A", dark: "#3D1F00",
};

// ── 스켈레톤 카드 ────────────────────────────────────────────
const SkeletonCard = () => (
  <Card elevation={0} sx={{
    borderRadius: 4, bgcolor: B.cream,
    border: `1.5px solid ${B.pants}22`,
  }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Skeleton variant="circular" width={42} height={42} sx={{ mr: 1.5, bgcolor: B.lavender }} />
        <Box flexGrow={1}>
          <Skeleton variant="text" width="40%" sx={{ bgcolor: B.lavender }} />
          <Skeleton variant="text" width="25%" sx={{ bgcolor: B.lavender, fontSize: "0.75rem" }} />
        </Box>
      </Box>
      <Skeleton variant="rounded" height={60} sx={{ bgcolor: B.lavender, mb: 1.5, borderRadius: 2 }} />
      <Skeleton variant="rounded" height={160} sx={{ bgcolor: B.lavender + "99", borderRadius: 3 }} />
    </CardContent>
  </Card>
);

// ── 메인 컴포넌트 ────────────────────────────────────────────
const DiaryList = ({ currentUser, pageSize }) => {
  const [diaries, setDiaries]             = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const [page, setPage]                   = useState(0);
  const [activeTab, setActiveTab]         = useState("list");
  const [lightboxImg, setLightboxImg]     = useState(null);

  const PER        = pageSize || 999;
  const totalPages = Math.ceil(diaries.length / PER);
  const visible    = diaries.slice(page * PER, (page + 1) * PER);
  const galleryItems = diaries.filter(d => d.imageUrl);

  useEffect(() => {
    const q = query(collection(db, "diaries"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setDiaries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
  }, []);

  const handleAddComment = async (diaryId) => {
    const commentText = commentInputs[diaryId];
    if (!currentUser) { alert("로그인 정보가 없어서 댓글을 달 수 없어요 ㅠ_ㅠ"); return; }
    if (!commentText?.trim()) return;
    try {
      await addDoc(collection(db, "diaries", diaryId, "comments"), {
        text: commentText, author: currentUser, createdAt: serverTimestamp(),
      });
      const diary = diaries.find(d => d.id === diaryId);
      const dateStr = diary?.createdAt?.toDate
        ? `${diary.createdAt.toDate().getMonth() + 1}/${diary.createdAt.toDate().getDate()}`
        : '';
      await addDoc(collection(db, "notifications"), {
        writer: currentUser, type: "comment",
        content: `${currentUser}가 ${dateStr ? dateStr + ' ' : ''}기록에 댓글을 남겼어요! 💬`,
        targetId: diaryId, createdAt: serverTimestamp(), isRead: false,
      });
      setCommentInputs({ ...commentInputs, [diaryId]: "" });
    } catch (e) { console.error("댓글 저장 실패:", e); }
  };

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      {/* 타이틀 + 탭 (전체 페이지에서만) */}
      {!pageSize && (
        <>
          <Stack direction="row" alignItems="center" justifyContent="center" gap={1.2} sx={{ mb: 2 }}>
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

          {/* 목록/사진 탭 */}
          <Stack direction="row" justifyContent="center" gap={1} sx={{ mb: 2.5 }}>
            {[
              { val: "list",    icon: "📋", label: "목록" },
              { val: "gallery", icon: "🖼️", label: "사진" },
            ].map(({ val, icon, label }) => (
              <Box key={val}
                onClick={() => setActiveTab(val)}
                sx={{
                  px: 2.5, py: 0.8, borderRadius: 10,
                  bgcolor: activeTab === val ? B.pants : B.lavender + "66",
                  color: activeTab === val ? "white" : B.pants,
                  cursor: "pointer",
                  fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
                  transition: "all 0.2s",
                  border: `1.5px solid ${activeTab === val ? B.pants : B.pants + "22"}`,
                  userSelect: "none",
                  "&:active": { transform: "scale(0.94)" },
                }}
              >
                {icon} {label}
                {val === "gallery" && galleryItems.length > 0 && (
                  <Box component="span" sx={{
                    ml: 0.8, px: 0.8, py: 0.05, borderRadius: 5,
                    bgcolor: activeTab === val ? "rgba(255,255,255,0.28)" : B.pants + "22",
                    fontSize: "0.7rem",
                  }}>
                    {galleryItems.length}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </>
      )}

      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <Stack spacing={3}>
          <SkeletonCard />
          <SkeletonCard />
          {!pageSize && <SkeletonCard />}
        </Stack>
      )}

      {/* 사진 갤러리 */}
      {!isLoading && !pageSize && activeTab === "gallery" && (
        <Box>
          {galleryItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, opacity: 0.6 }}>
              <Typography sx={{ fontSize: "3rem", mb: 1.5 }}>🖼️</Typography>
              <Typography sx={{
                fontFamily: "'Jua', sans-serif", color: B.dark + "88", fontSize: "0.9rem",
              }}>
                아직 사진이 없어요<br />기록에 사진을 추가해봐요!
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
              {galleryItems.map(item => (
                <Box key={item.id}
                  onClick={() => setLightboxImg(item.imageUrl)}
                  sx={{
                    borderRadius: 3, overflow: "hidden",
                    cursor: "pointer", position: "relative",
                    aspectRatio: "1",
                    boxShadow: `0 4px 16px ${B.pants}22`,
                    border: `1.5px solid ${B.pants}18`,
                    transition: "all 0.2s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: `0 8px 28px ${B.pants}33` },
                    "&:active": { transform: "scale(0.96)" },
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <Box sx={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(transparent, rgba(61,31,0,0.6))",
                    p: 1,
                  }}>
                    <Typography sx={{
                      fontSize: "0.65rem", color: "rgba(255,255,255,0.92)",
                      fontFamily: "'Noto Sans KR',sans-serif",
                    }}>
                      {item.emoji} {item.author}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* 목록 */}
      {!isLoading && (pageSize || activeTab === "list") && (
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
              onOpenLightbox={setLightboxImg}
            />
          ))}

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
      )}

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

      {/* 라이트박스 */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9999, cursor: "pointer",
            }}
          >
            <motion.img
              src={lightboxImg}
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.82, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "95vw", maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "16px",
                boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
                cursor: "default",
              }}
            />
            <Box
              onClick={() => setLightboxImg(null)}
              sx={{
                position: "fixed", top: 16, right: 16,
                width: 40, height: 40, borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: "1.1rem", cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.2)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}
            >
              ✕
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

// ── 개별 다이어리 카드 ───────────────────────────────────────────
const DiaryCard = ({ item, currentUser, commentText, setCommentText, onAddComment, meImg, gfImg, onOpenLightbox }) => {
  const [comments, setComments]       = useState([]);
  const [editMode, setEditMode]       = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editEmotion, setEditEmotion] = useState("");
  const [editEmoji, setEditEmoji]     = useState("");
  const [imgLoaded, setImgLoaded]     = useState(false);
  const isMyPost  = item.author === currentUser;
  const deleteRef = useRef(null);
  const likeRef   = useRef(null);
  const buriImg   = EMOTION_BURI[item.emotion];

  const handleEnterEditMode = () => {
    setEditContent(item.content || "");
    setEditEmotion(item.emotion || "");
    setEditEmoji(item.emoji || "");
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleUpdateDiary = async () => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, "diaries", item.id), {
        content: editContent,
        emotion: editEmotion,
        emoji: editEmoji,
      });
      setEditMode(false);
    } catch (e) {
      console.error("수정 실패:", e);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

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
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
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
        cursor: editMode ? "default" : "pointer",
        ...(!editMode && {
          "&:active": { transform: "scale(0.975) translateY(2px)", boxShadow: `0 1px 6px ${B.pants}18` },
          "&:hover": { boxShadow: `0 6px 24px ${B.pants}22`, transform: "translateY(-2px)" },
          "&:hover .card-buri": { opacity: 0.7, transform: "translateY(-6px) rotate(8deg) scale(1.1)" },
        }),
      }}
      onPointerDown={() => !editMode && vibrate(12)}
    >
      {/* 감정별 부리 코너 장식 */}
      {buriImg && !editMode && (
        <Box
          className="card-buri"
          component="img"
          src={buriImg}
          alt=""
          sx={{
            position: "absolute", top: -24, right: 10, width: 52,
            objectFit: "contain", opacity: 0.35, pointerEvents: "none",
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
              {!editMode && item.emotion && EMOTION_BURI[item.emotion] && (
                <Box component="img" src={EMOTION_BURI[item.emotion]} alt={item.emotion} sx={{
                  width: 18, height: 18, objectFit: "contain",
                  ml: 0.8, verticalAlign: "middle", display: "inline-block",
                }} />
              )}
              {!editMode && item.emotion && (
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
            {editMode ? (
              <>
                <IconButton onClick={handleUpdateDiary} size="small"
                  sx={{
                    color: "white", bgcolor: B.pants,
                    "&:hover": { bgcolor: B.pants + "cc" }, mr: 0.3,
                  }}>
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton onClick={handleCancelEdit} size="small"
                  sx={{ color: B.dark + "66", "&:hover": { color: B.dark } }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <>
                {isMyPost && (
                  <IconButton onClick={handleEnterEditMode} size="small"
                    sx={{ color: B.pants + "66", "&:hover": { color: B.pants }, mr: 0.2 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
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
              </>
            )}
          </Stack>
        </Box>

        {/* 수정 모드 UI */}
        {editMode && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.72rem", color: B.pants, fontFamily: "'Noto Sans KR',sans-serif", mb: 1 }}>
              오늘의 감정
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.7} sx={{ mb: 1.5 }}>
              {EMOTIONS.map(({ emoji, label }) => (
                <Box key={label}
                  onClick={() => { setEditEmotion(label); setEditEmoji(emoji); }}
                  sx={{
                    px: 1.4, py: 0.4, borderRadius: 10,
                    bgcolor: editEmotion === label ? B.pants : B.lavender + "66",
                    color: editEmotion === label ? "white" : B.dark,
                    cursor: "pointer", fontSize: "0.78rem",
                    fontFamily: "'Noto Sans KR',sans-serif",
                    border: `1.5px solid ${editEmotion === label ? B.pants : "transparent"}`,
                    transition: "all 0.15s",
                    userSelect: "none",
                    "&:active": { transform: "scale(0.91)" },
                  }}
                >
                  {emoji} {label}
                </Box>
              ))}
            </Stack>
            <TextField
              fullWidth multiline minRows={3} maxRows={10}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="오늘의 기록을 수정해요..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3, bgcolor: B.cream,
                  fontFamily: "'Noto Sans KR', sans-serif",
                  "& fieldset": { borderColor: B.pants + "55" },
                  "&:hover fieldset": { borderColor: B.pants + "88" },
                  "&.Mui-focused fieldset": { borderColor: B.pants },
                },
              }}
            />
          </Box>
        )}

        {/* 본문 (보기 모드) */}
        {!editMode && (
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
        )}

        {/* 이미지 */}
        {item.imageUrl && (
          <Box
            onClick={() => onOpenLightbox && onOpenLightbox(item.imageUrl)}
            sx={{
              mt: 1, mb: 2, borderRadius: 3, overflow: "hidden",
              boxShadow: `0 4px 16px ${B.pants}22`,
              border: `1.5px solid ${B.pants}22`,
              cursor: "zoom-in", position: "relative",
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.01)", boxShadow: `0 8px 24px ${B.pants}33` },
            }}
          >
            {!imgLoaded && (
              <Skeleton
                variant="rectangular"
                height={200}
                sx={{
                  bgcolor: B.lavender + "66",
                  position: "absolute", top: 0, left: 0, right: 0, zIndex: 1,
                }}
              />
            )}
            <img
              src={item.imageUrl}
              alt="추억 사진"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              style={{
                width: "100%", display: "block",
                maxHeight: "450px", objectFit: "cover",
                opacity: imgLoaded ? 1 : 0,
                minHeight: imgLoaded ? 0 : 200,
                transition: "opacity 0.4s ease",
              }}
            />
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
        {!editMode && (
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
        )}
      </CardContent>
    </Card>
  );
};

export default DiaryList;
