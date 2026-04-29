import React, { useState } from "react";
import { Box, Typography, Card, CardContent, Stack, Button, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

import OmokGame from "./OmokGame";
import DrawingGame from "./DrawingGame";
import GameWishList from "./GameWishList";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png"; //기본
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png"; //웃음
import buri6 from "./assets/KakaoTalk_20260316_132934584.png"; // 승리

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A", dark: "#3D1F00",
};

// ────────────────────────────────────────────────────────────
// 게임 데이터
// ────────────────────────────────────────────────────────────
const GAMES = [
  {
    id: "omok",
    name: "오목 대결",
    emoji: "⚫",
    description: "5개를 먼저 이어라!",
    color: "#8B4513",
    buriImg: buri1,
  },
  {
    id: "drawing",
    name: "그림 퀴즈",
    emoji: "🎨",
    description: "30초 안에 맞춰봐!",
    color: "#FF6B9D",
    buriImg: buri2,
  },
  {
    id: "wishlist",
    name: "게임 전적",
    emoji: "🏆",
    description: "승부 기록 & 소원",
    color: "#FFD700",
    buriImg: buri6,
  },
];

// ────────────────────────────────────────────────────────────
// 미니게임 허브 메인 컴포넌트
// ────────────────────────────────────────────────────────────
const MiniGameHub = ({ currentUser, opponentUser, onBack }) => {
  const [selectedGame, setSelectedGame] = useState(null);

  // 게임 선택 해제
  const handleBackToHub = () => {
    setSelectedGame(null);
  };

  // ── 게임 허브 화면 ────────────────────────────────
  if (!selectedGame) {
    return (
      <Box sx={{ p: 2, maxWidth: 700, mx: "auto" }}>
        {/* 헤더 */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 2, mb: 3,
          p: 2, borderRadius: 4,
          background: `linear-gradient(135deg, ${B.lavender} 0%, ${B.peach} 100%)`,
          border: `2px solid ${B.accent}`,
          position: "relative",
        }}>
          <IconButton
            onClick={onBack}
            sx={{
              position: "absolute",
              left: 8,
              color: B.pants,
              "&:active": { transform: "scale(0.9)" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          
          <Box component="img" src={buri1} alt="" sx={{ width: 50, ml: 5 }} />
          <Box>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              fontSize: "1.3rem",
              color: B.accent,
            }}>
              🎮 미니게임 센터
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
              부리부리와 함께 즐거운 게임 타임!
            </Typography>
          </Box>
        </Box>

        {/* 게임 소개 배너 */}
        <Box sx={{
          textAlign: "center",
          mb: 3,
          p: 3,
          borderRadius: 4,
          bgcolor: B.cream,
          border: `2px dashed ${B.pants}44`,
        }}>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1.1rem",
            color: B.pants,
            mb: 1,
          }}>
            🐷 {currentUser}님, 어떤 게임을 할까요?
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: B.dark + "66" }}>
            게임에서 이기면 상대방에게 소원을 요구할 수 있어요!
          </Typography>
        </Box>

        {/* 게임 카드 그리드 */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: 2,
        }}>
          {GAMES.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                onClick={() => setSelectedGame(game.id)}
                sx={{
                  cursor: "pointer",
                  borderRadius: 4,
                  border: `2px solid ${game.color}33`,
                  position: "relative",
                  overflow: "visible",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 8px 24px ${game.color}44`,
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                }}
              >
                {/* 부리부리 캐릭터 */}
                <Box
                  component="img"
                  src={game.buriImg}
                  alt=""
                  sx={{
                    position: "absolute",
                    top: -20,
                    right: -10,
                    width: 60,
                    filter: `drop-shadow(0 2px 8px ${game.color}55)`,
                    animation: "wobble 3s ease-in-out infinite",
                  }}
                />

                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{
                    fontSize: "2.5rem",
                    mb: 1,
                    lineHeight: 1,
                  }}>
                    {game.emoji}
                  </Typography>
                  
                  <Typography sx={{
                    fontFamily: "'Jua', sans-serif",
                    fontSize: "1.2rem",
                    color: game.color,
                    mb: 0.5,
                  }}>
                    {game.name}
                  </Typography>
                  
                  <Typography sx={{
                    fontSize: "0.85rem",
                    color: B.dark + "66",
                    mb: 2,
                  }}>
                    {game.description}
                  </Typography>

                  <Box sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 2,
                    py: 0.5,
                    borderRadius: 10,
                    bgcolor: game.color + "22",
                    color: game.color,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}>
                    <SportsEsportsIcon sx={{ fontSize: 16 }} />
                    플레이하기
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>

        {/* 하단 안내 */}
        <Box sx={{
          textAlign: "center",
          mt: 4,
          p: 2,
          borderRadius: 3,
          bgcolor: B.lavender + "44",
        }}>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
            <Box component="img" src={buri1} alt="" sx={{ width: 30 }} />
            <Box component="img" src={buri2} alt="" sx={{ width: 30 }} />
            <Box component="img" src={buri6} alt="" sx={{ width: 30 }} />
          </Stack>
          <Typography sx={{
            fontSize: "0.75rem",
            color: B.dark + "66",
            fontFamily: "'Jua', sans-serif",
          }}>
            더 많은 게임이 곧 추가될 예정이에요! 🎮
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── 선택된 게임 렌더링 ────────────────────────────
  return (
    <Box>
      {selectedGame === "omok" && (
        <>
          <Box sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            bgcolor: B.cream + "ee",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${B.pants}22`,
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}>
            <IconButton
              onClick={handleBackToHub}
              sx={{ color: B.pants, p: 0.5, "&:active": { transform: "scale(0.88)" } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              color: B.pants,
              fontSize: "1.05rem",
            }}>
              ⚫ 오목 대결
            </Typography>
          </Box>
          <OmokGame
            currentUser={currentUser}
            opponentUser={opponentUser}
          />
        </>
      )}

      {selectedGame === "drawing" && (
        <>
          <Box sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            bgcolor: B.cream + "ee",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${B.pants}22`,
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}>
            <IconButton
              onClick={handleBackToHub}
              sx={{ color: B.pants, p: 0.5, "&:active": { transform: "scale(0.88)" } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              color: B.pants,
              fontSize: "1.05rem",
            }}>
              🎨 그림 퀴즈
            </Typography>
          </Box>
          <DrawingGame
            currentUser={currentUser}
            opponentUser={opponentUser}
          />
        </>
      )}

      {selectedGame === "wishlist" && (
        <>
          <Box sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            bgcolor: B.cream + "ee",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${B.pants}22`,
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}>
            <IconButton
              onClick={handleBackToHub}
              sx={{ color: B.pants, p: 0.5, "&:active": { transform: "scale(0.88)" } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              color: B.pants,
              fontSize: "1.05rem",
            }}>
              🏆 게임 전적
            </Typography>
          </Box>
          <GameWishList currentUser={currentUser} />
        </>
      )}
    </Box>
  );
};

export default MiniGameHub;