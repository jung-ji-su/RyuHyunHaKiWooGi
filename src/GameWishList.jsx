import React, { useEffect, useState } from "react";
import { db } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, updateDoc, doc, where
} from "firebase/firestore";
import {
  Box, Typography, Card, CardContent, Button, Chip, Stack, Divider
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FavoriteIcon from "@mui/icons-material/Favorite";

import buri7 from "./assets/KakaoTalk_20260316_132945257.png";
import buri8 from "./assets/KakaoTalk_20260316_132954818.png";

// 부리부리 컬러 팔레트
const B = {
  pants:   "#7B4FA6",
  skin:    "#F5B8A0",
  cream:   "#FFF8F2",
  peach:   "#FFE4D4",
  lavender:"#EDE0F5",
  accent:  "#E8630A",
  dark:    "#3D1F00",
};

const GameWishList = ({ currentUser }) => {
  const [gameResults, setGameResults] = useState([]);
  const [myWishes, setMyWishes] = useState([]); // 내가 받은 소원
  const [theirWishes, setTheirWishes] = useState([]); // 내가 들어줘야 할 소원

  useEffect(() => {
    if (!currentUser) return;

    // 전체 게임 결과 불러오기 (최근 20개)
    const qAll = query(
      collection(db, "gameResults"),
      orderBy("playedAt", "desc")
    );

    const unsubscribe = onSnapshot(qAll, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGameResults(results);

      // 내가 이긴 게임 (내가 받은 소원)
      const mine = results.filter(r => r.winner === currentUser);
      setMyWishes(mine);

      // 내가 진 게임 (내가 들어줘야 할 소원)
      const theirs = results.filter(r => r.loser === currentUser);
      setTheirWishes(theirs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 소원 완료 처리
  const handleCompleteWish = async (resultId) => {
    await updateDoc(doc(db, "gameResults", resultId), {
      wishCompleted: true,
      completedAt: new Date(),
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* ── 헤더 ──────────────────────────────────────── */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 2, mb: 3,
        p: 2, borderRadius: 4,
        background: `linear-gradient(135deg, ${B.lavender} 0%, ${B.peach} 100%)`,
        border: `2px solid ${B.accent}`,
      }}>
        <Box component="img" src={buri8} alt="" sx={{ width: 50, height: 50 }} />
        <Box>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1.3rem",
            color: B.accent,
          }}>
            🏆 게임 전적 & 소원
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
            우리의 대결 기록과 소원 목록이에요
          </Typography>
        </Box>
      </Box>

      {/* ── 통계 요약 ──────────────────────────────────── */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{
          flex: 1,
          bgcolor: B.cream,
          border: `2px solid ${B.accent}33`,
          borderRadius: 3,
        }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              fontSize: "2rem",
              color: B.accent,
            }}>
              {myWishes.length}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
              내가 이긴 횟수
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{
          flex: 1,
          bgcolor: B.lavender,
          border: `2px solid ${B.pants}33`,
          borderRadius: 3,
        }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              fontSize: "2rem",
              color: B.pants,
            }}>
              {theirWishes.length}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
              내가 진 횟수
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{
          flex: 1,
          bgcolor: B.peach,
          border: `2px solid ${B.skin}`,
          borderRadius: 3,
        }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              fontSize: "2rem",
              color: B.accent,
            }}>
              {gameResults.length}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
              총 게임 수
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* ── 내가 들어줘야 할 소원 ──────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{
          fontFamily: "'Jua', sans-serif",
          fontSize: "1.2rem",
          color: B.pants,
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}>
          <FavoriteIcon sx={{ color: B.accent }} />
          내가 들어줘야 할 소원
        </Typography>

        {theirWishes.length === 0 ? (
          <Card sx={{
            bgcolor: B.cream,
            border: `2px dashed ${B.pants}33`,
            borderRadius: 3,
            p: 3,
            textAlign: "center",
          }}>
            <Typography sx={{ color: B.dark + "66" }}>
              아직 들어줄 소원이 없어요!
            </Typography>
          </Card>
        ) : (
          <Stack spacing={2}>
            <AnimatePresence>
              {theirWishes.map((wish) => (
                <motion.div
                  key={wish.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card sx={{
                    bgcolor: wish.wishCompleted ? B.cream : B.lavender,
                    border: `2px solid ${wish.wishCompleted ? B.dark + "22" : B.pants}`,
                    borderRadius: 3,
                    opacity: wish.wishCompleted ? 0.6 : 1,
                  }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography sx={{
                            fontFamily: "'Jua', sans-serif",
                            fontSize: "0.9rem",
                            color: B.dark + "88",
                            mb: 0.5,
                          }}>
                            {wish.gameType} • {new Date(wish.playedAt?.toDate()).toLocaleDateString()}
                          </Typography>
                          <Typography sx={{
                            fontFamily: "'Jua', sans-serif",
                            fontSize: "1.1rem",
                            color: B.dark,
                            mb: 1,
                          }}>
                            {wish.wishRequest}
                          </Typography>
                          <Chip
                            label={wish.wishCompleted ? "완료 ✓" : "미완료"}
                            size="small"
                            sx={{
                              bgcolor: wish.wishCompleted ? B.accent : B.pants,
                              color: "white",
                              fontFamily: "'Jua', sans-serif",
                            }}
                          />
                        </Box>
                        {!wish.wishCompleted && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleCompleteWish(wish.id)}
                            sx={{
                              bgcolor: B.accent,
                              fontFamily: "'Jua', sans-serif",
                              ml: 2,
                              "&:hover": { bgcolor: B.pants },
                            }}
                            startIcon={<CheckCircleIcon />}
                          >
                            완료
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </Stack>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* ── 내가 받은 소원 ──────────────────────────────── */}
      <Box>
        <Typography sx={{
          fontFamily: "'Jua', sans-serif",
          fontSize: "1.2rem",
          color: B.accent,
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}>
          <EmojiEventsIcon sx={{ color: B.accent }} />
          내가 받은 소원
        </Typography>

        {myWishes.length === 0 ? (
          <Card sx={{
            bgcolor: B.cream,
            border: `2px dashed ${B.accent}33`,
            borderRadius: 3,
            p: 3,
            textAlign: "center",
          }}>
            <Box component="img" src={buri7} alt="" sx={{ width: 80, mb: 2, opacity: 0.6 }} />
            <Typography sx={{ color: B.dark + "66" }}>
              아직 승리한 게임이 없어요!<br />
              게임에서 이겨서 소원을 받아보세요 🎮
            </Typography>
          </Card>
        ) : (
          <Stack spacing={2}>
            <AnimatePresence>
              {myWishes.map((wish) => (
                <motion.div
                  key={wish.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card sx={{
                    bgcolor: wish.wishCompleted ? B.cream : B.peach,
                    border: `2px solid ${wish.wishCompleted ? B.dark + "22" : B.accent}`,
                    borderRadius: 3,
                    opacity: wish.wishCompleted ? 0.6 : 1,
                  }}>
                    <CardContent>
                      <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "0.9rem",
                        color: B.dark + "88",
                        mb: 0.5,
                      }}>
                        {wish.gameType} • {new Date(wish.playedAt?.toDate()).toLocaleDateString()}
                      </Typography>
                      <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "1.1rem",
                        color: B.dark,
                        mb: 1,
                      }}>
                        {wish.wishRequest}
                      </Typography>
                      <Chip
                        label={wish.wishCompleted ? "완료 ✓" : "대기 중"}
                        size="small"
                        sx={{
                          bgcolor: wish.wishCompleted ? B.accent : B.pants,
                          color: "white",
                          fontFamily: "'Jua', sans-serif",
                        }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default GameWishList;