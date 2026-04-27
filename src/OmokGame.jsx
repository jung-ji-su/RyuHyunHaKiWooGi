import React, { useEffect, useState } from "react";
import { db } from "./firebase.js";
import {
  collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, addDoc, query, where, getDocs, orderBy
} from "firebase/firestore";
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Paper, Stack, Chip
} from "@mui/material";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png"; //기본
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png"; //웃음
import buri6 from "./assets/KakaoTalk_20260316_132934584.png"; // 승리

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

const BOARD_SIZE = 15;
const EMPTY = null;
const BLACK = "black";
const WHITE = "white";

// ────────────────────────────────────────────────────────────
// Firebase용 배열 변환 함수 (2D ↔ 1D)
// ────────────────────────────────────────────────────────────
const flatten2D = (board2D) => {
  return board2D.flat();
};

const unflatten1D = (board1D) => {
  const board2D = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board2D.push(board1D.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE));
  }
  return board2D;
};

// ────────────────────────────────────────────────────────────
// 오목 승부 판정 로직
// ────────────────────────────────────────────────────────────
const checkWin = (board, row, col, stone) => {
  const directions = [
    [0, 1],   // 가로 →
    [1, 0],   // 세로 ↓
    [1, 1],   // 대각선 ↘
    [1, -1],  // 대각선 ↙
  ];

  for (let [dr, dc] of directions) {
    let count = 1; // 현재 돌 포함

    // 정방향 카운트
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board[r][c] !== stone) break;
      count++;
    }

    // 역방향 카운트
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board[r][c] !== stone) break;
      count++;
    }

    if (count >= 5) return true;
  }

  return false;
};

// ────────────────────────────────────────────────────────────
// 승리 폭죽 효과
// ────────────────────────────────────────────────────────────
const fireWinConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#7B4FA6', '#F5B8A0', '#E8630A', '#FFD700'];

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
};

// ────────────────────────────────────────────────────────────
// 오목 게임 메인 컴포넌트
// ────────────────────────────────────────────────────────────
const OmokGame = ({ currentUser, opponentUser }) => {
  const [board, setBoard] = useState(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
  );
  const [currentTurn, setCurrentTurn] = useState(BLACK);
  const [winner, setWinner] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState("lobby"); // lobby | waiting | ready | playing | finished
  const [myColor, setMyColor] = useState(null);
  const [players, setPlayers] = useState({ black: null, white: null });
  
  // 클릭 확정 시스템
  const [pendingMove, setPendingMove] = useState(null); // { row, col }
  
  // 소원 입력 다이얼로그
  const [wishDialogOpen, setWishDialogOpen] = useState(false);
  const [wishText, setWishText] = useState("");

  // ── 방 생성 ──────────────────────────────────────
  const createRoom = async () => {
    const newGameId = `game_${Date.now()}`;
    const initialBoard2D = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
    const initialBoard1D = flatten2D(initialBoard2D);
    
    alert("🎮 방 생성 시작: " + newGameId);
    
    // 방 생성자가 흑돌
    await setDoc(doc(db, "omokGames", newGameId), {
      board: initialBoard1D,
      currentTurn: BLACK,
      gameState: "waiting", // 대기 중
      players: {
        black: currentUser,
        white: null, // 아직 입장 안 함
      },
      winner: null,
      wishRequest: "",
      createdAt: serverTimestamp(),
    });

    alert("✅ 방 생성 완료! 리스너 시작합니다");
    
    // 상태 업데이트
    setGameId(newGameId);
    setGameState("waiting");
    setMyColor(BLACK);
    setPlayers({ black: currentUser, white: null });
    
    // 즉시 리스너 시작 (useEffect 기다리지 않고)
    startListener(newGameId);
  };

  // ── 방 입장 ──────────────────────────────────────
  const joinRoom = async () => {
    alert("🚪 입장하기 시도...");
    
    // 대기 중인 방 찾기 (최신순)
    const q = query(
      collection(db, "omokGames"),
      where("gameState", "==", "waiting"),
      orderBy("createdAt", "desc") // ← 최신 방 먼저!
    );
    
    const snapshot = await getDocs(q);
    
    alert("🔍 대기 중인 방 개수: " + snapshot.size);
    
    if (snapshot.empty) {
      alert("대기 중인 방이 없어요! 새로 만들어주세요.");
      return;
    }

    // 첫 번째 대기 중인 방에 입장 (= 가장 최근 방)
    const roomDoc = snapshot.docs[0];
    const roomId = roomDoc.id;
    const roomData = roomDoc.data();

    alert("📍 입장 시도\n방 ID: " + roomId + "\n방 주인: " + roomData.players.black + "\n나: " + currentUser);

    // 이미 내가 만든 방이면 입장 불가
    if (roomData.players.black === currentUser) {
      alert("자기가 만든 방에는 입장할 수 없어요!");
      return;
    }

    // 방에 입장 (백돌로 배정)
    await updateDoc(doc(db, "omokGames", roomId), {
      "players.white": currentUser,
      gameState: "ready", // 준비 완료
    });

    alert("✅ 입장 완료! gameState를 ready로 변경");

    setGameId(roomId);
    setGameState("ready");
    setMyColor(WHITE);
    
    // 즉시 리스너 시작
    startListener(roomId);
  };

  // ── 실시간 리스너 시작 함수 ──────────────────────
  const startListener = (roomId) => {
    alert("👂 실시간 리스너 시작: " + roomId);

    const unsubscribe = onSnapshot(doc(db, "omokGames", roomId), (snapshot) => {
      if (!snapshot.exists()) {
        alert("❌ 문서가 존재하지 않음: " + roomId);
        return;
      }
      
      const data = snapshot.data();
      alert("📡 실시간 업데이트!\ngameState: " + data.gameState + "\nblack: " + data.players.black + "\nwhite: " + data.players.white);

      const board2D = unflatten1D(data.board);
      setBoard(board2D);
      setCurrentTurn(data.currentTurn);
      setWinner(data.winner);
      setGameState(data.gameState);
      setPlayers(data.players);

      // 두 명 다 입장하면 자동으로 게임 시작
      if (data.gameState === "ready" && data.players.black && data.players.white) {
        alert("🎮 두 명 모두 준비 완료! 1초 후 게임 시작...");
        setTimeout(async () => {
          await updateDoc(doc(db, "omokGames", roomId), {
            gameState: "playing",
          });
          alert("✅ gameState를 playing으로 변경");
        }, 1000);
      }

      // 게임 종료되면 승자가 소원 입력
      if (data.winner && data.winner === myColor && !data.wishRequest) {
        alert("🏆 승리! 폭죽 발사!");
        fireWinConfetti();
        setWishDialogOpen(true);
      }
    });

    return unsubscribe;
  };

  // ── 실시간 동기화 (useEffect는 백업용) ──────────────────────────────────
  useEffect(() => {
    if (!gameId) {
      return;
    }

    // startListener를 이미 호출했으므로 여기서는 추가 작업 없음
    // 단, 컴포넌트 언마운트 시 cleanup은 필요
    
  }, [gameId, myColor]);

  // ── 착수 (2단계: 하이라이트 → 확정) ──────────────
  const handleCellClick = async (row, col) => {
    if (gameState !== "playing") return;
    if (board[row][col] !== EMPTY) return; // 이미 돌이 있음
    if (winner) return; // 게임 종료
    if (currentTurn !== myColor) return; // 내 턴 아님

    // 1단계: 하이라이트 표시
    if (!pendingMove || pendingMove.row !== row || pendingMove.col !== col) {
      setPendingMove({ row, col });
      return;
    }

    // 2단계: 같은 곳 다시 클릭 → 확정
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = myColor;

    // 승부 판정
    const hasWon = checkWin(newBoard, row, col, myColor);
    const nextTurn = myColor === BLACK ? WHITE : BLACK;

    const newBoard1D = flatten2D(newBoard);

    await updateDoc(doc(db, "omokGames", gameId), {
      board: newBoard1D,
      currentTurn: hasWon ? myColor : nextTurn,
      winner: hasWon ? myColor : null,
      gameState: hasWon ? "finished" : "playing",
    });

    setPendingMove(null); // 하이라이트 제거
  };

  // ── 소원 제출 ──────────────────────────────────────
  const handleWishSubmit = async () => {
    if (!wishText.trim()) {
      alert("소원을 입력해주세요!");
      return;
    }

    // 게임 결과 저장
    await addDoc(collection(db, "gameResults"), {
      gameType: "오목",
      winner: myColor === BLACK ? players.black : players.white,
      loser: myColor === BLACK ? players.white : players.black,
      wishRequest: wishText,
      wishCompleted: false,
      playedAt: serverTimestamp(),
      completedAt: null,
    });

    // 게임 문서에도 소원 저장
    await updateDoc(doc(db, "omokGames", gameId), {
      wishRequest: wishText,
    });

    setWishDialogOpen(false);
    alert("🎉 소원이 등록되었어요! 상대방이 들어줘야 해요~");
  };

  // ── 게임 초기화 ──────────────────────────────────
  const resetGame = () => {
    setGameId(null);
    setGameState("lobby");
    setWinner(null);
    setMyColor(null);
    setPlayers({ black: null, white: null });
    setPendingMove(null);
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY)));
  };

  // ── 내 턴인지 확인 ──────────────────────────────────
  const isMyTurn = currentTurn === myColor;

  // ────────────────────────────────────────────────────────────
  // UI 렌더링
  // ────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: "auto" }}>
      {/* ── 헤더 ──────────────────────────────────────── */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 2, mb: 3,
        p: 2, borderRadius: 4,
        background: `linear-gradient(135deg, ${B.lavender} 0%, ${B.peach} 100%)`,
        border: `2px solid ${B.accent}`,
      }}>
        <Box component="img" src={buri2} alt="" sx={{ width: 50, height: 50 }} />
        <Box>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1.3rem",
            color: B.accent,
          }}>
            🎮 오목 대결
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
            5개를 먼저 이어서 승리하세요!
          </Typography>
        </Box>
      </Box>

      {/* ── 로비 화면 ──────────────────────────────── */}
      {gameState === "lobby" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Box component="img" src={buri1} alt="" sx={{ width: 120, mb: 3 }} />
          <Typography sx={{ mb: 4, color: B.dark, fontSize: "1rem" }}>
            부리부리와 함께 오목 대결을 시작해볼까요?
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={createRoom}
              startIcon={<PersonAddIcon />}
              sx={{
                bgcolor: B.accent,
                color: "white",
                fontFamily: "'Jua', sans-serif",
                fontSize: "1.1rem",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                "&:hover": { bgcolor: B.pants },
              }}
            >
              🎮 방 만들기
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={joinRoom}
              startIcon={<PlayArrowIcon />}
              sx={{
                borderColor: B.pants,
                color: B.pants,
                fontFamily: "'Jua', sans-serif",
                fontSize: "1.1rem",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                "&:hover": { borderColor: B.accent, bgcolor: B.peach + "33" },
              }}
            >
              🚪 입장하기
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── 대기 중 화면 ──────────────────────────────── */}
      {gameState === "waiting" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Box component="img" src={buri1} alt="" sx={{ 
            width: 100, mb: 3,
            animation: "headBob 1.5s ease-in-out infinite",
          }} />
          <Typography sx={{ 
            mb: 2, 
            color: B.pants,
            fontFamily: "'Jua', sans-serif",
            fontSize: "1.2rem",
          }}>
            상대방을 기다리는 중...
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: B.dark + "66", mb: 1 }}>
            상대방이 입장하면 자동으로 시작돼요!
          </Typography>
          
          {/* 방 ID 표시 (디버깅용) */}
          <Typography sx={{ 
            fontSize: "0.7rem", 
            color: B.dark + "44", 
            fontFamily: "monospace",
            mb: 3,
            wordBreak: "break-all",
            px: 2,
          }}>
            방 ID: {gameId}
          </Typography>

          <Box sx={{
            display: "flex",
            justifyContent: "center",
            gap: 1,
          }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: B.pants,
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
                    "50%": { opacity: 1, transform: "scale(1.2)" },
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── 게임 시작 준비 ──────────────────────────────── */}
      {gameState === "ready" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Box component="img" src={buri6} alt="" sx={{ width: 120, mb: 3 }} />
          </motion.div>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1.5rem",
            color: B.accent,
            mb: 2,
          }}>
            🎉 준비 완료!
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88" }}>
            곧 게임이 시작됩니다...
          </Typography>
        </Box>
      )}

      {/* ── 게임 진행 중 ──────────────────────────────── */}
      {gameState === "playing" && !winner && (
        <Box>
          {/* 플레이어 정보 */}
          <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: "space-around" }}>
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #333, #000)",
                border: myColor === BLACK ? `4px solid ${B.accent}` : "2px solid #ccc",
                mx: "auto",
                mb: 1,
                boxShadow: currentTurn === BLACK 
                  ? `0 0 20px ${B.accent}, 0 4px 12px rgba(0,0,0,0.5)` 
                  : "0 3px 8px rgba(0,0,0,0.3)",
                transition: "all 0.3s",
              }} />
              <Typography sx={{
                fontFamily: "'Jua', sans-serif",
                fontSize: "0.9rem",
                color: myColor === BLACK ? B.accent : B.dark + "88",
                fontWeight: myColor === BLACK ? 700 : 400,
              }}>
                {players.black}
              </Typography>
              {currentTurn === BLACK && (
                <Chip 
                  label="차례" 
                  size="small"
                  sx={{ 
                    bgcolor: B.accent, 
                    color: "white",
                    fontFamily: "'Jua', sans-serif",
                    fontSize: "0.7rem",
                    mt: 0.5,
                  }} 
                />
              )}
            </Box>

            <Box sx={{ textAlign: "center" }}>
              <Box sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #FFF, #E8E8E8)",
                border: myColor === WHITE ? `4px solid ${B.pants}` : "2px solid #333",
                mx: "auto",
                mb: 1,
                boxShadow: currentTurn === WHITE 
                  ? `0 0 20px ${B.pants}, 0 3px 8px rgba(0,0,0,0.3)` 
                  : "0 3px 8px rgba(0,0,0,0.2)",
                transition: "all 0.3s",
              }} />
              <Typography sx={{
                fontFamily: "'Jua', sans-serif",
                fontSize: "0.9rem",
                color: myColor === WHITE ? B.pants : B.dark + "88",
                fontWeight: myColor === WHITE ? 700 : 400,
              }}>
                {players.white}
              </Typography>
              {currentTurn === WHITE && (
                <Chip 
                  label="차례" 
                  size="small"
                  sx={{ 
                    bgcolor: B.pants, 
                    color: "white",
                    fontFamily: "'Jua', sans-serif",
                    fontSize: "0.7rem",
                    mt: 0.5,
                  }} 
                />
              )}
            </Box>
          </Stack>

          {/* 턴 안내 */}
          <Box sx={{
            textAlign: "center",
            mb: 2,
            p: 1,
            borderRadius: 2,
            bgcolor: isMyTurn ? B.accent + "22" : B.dark + "11",
          }}>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              fontSize: "0.95rem",
              color: isMyTurn ? B.accent : B.dark + "66",
            }}>
              {isMyTurn 
                ? `내 턴! 클릭 2번으로 착수하세요 ${myColor === BLACK ? '●' : '○'}`
                : "상대방의 턴입니다..."}
            </Typography>
          </Box>

          {/* 바둑판 */}
          <Paper elevation={3} sx={{ p: 2, bgcolor: B.cream, borderRadius: 2 }}>
            <Box sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              gap: 0,
              aspectRatio: "1 / 1",
              bgcolor: "#D4A574",
              border: "3px solid #8B6F47",
              borderRadius: 1,
            }}>
              {board.map((row, i) =>
                row.map((cell, j) => {
                  const isPending = pendingMove?.row === i && pendingMove?.col === j;
                  
                  return (
                    <motion.div
                      key={`${i}-${j}`}
                      whileHover={cell === EMPTY && isMyTurn ? { scale: 1.15 } : {}}
                      whileTap={cell === EMPTY && isMyTurn ? { scale: 0.9 } : {}}
                      style={{
                        position: "relative",
                        cursor: cell === EMPTY && isMyTurn ? "pointer" : "default",
                        borderRight: j < BOARD_SIZE - 1 ? "1px solid #8B6F47" : "none",
                        borderBottom: i < BOARD_SIZE - 1 ? "1px solid #8B6F47" : "none",
                      }}
                      onClick={() => handleCellClick(i, j)}
                    >
                      {/* 실제 돌 */}
                      {cell !== EMPTY && (
                        <motion.div
                          initial={{ scale: 0, rotate: 180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "85%",
                            height: "85%",
                            borderRadius: "50%",
                            background: cell === BLACK 
                              ? "radial-gradient(circle at 30% 30%, #333, #000)"
                              : "radial-gradient(circle at 30% 30%, #FFF, #E8E8E8)",
                            border: cell === WHITE ? "2px solid #333" : "none",
                            boxShadow: cell === BLACK
                              ? "0 3px 8px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(255,255,255,0.2)"
                              : "0 3px 8px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.8)",
                          }}
                        />
                      )}

                      {/* 하이라이트 (1차 클릭) */}
                      {isPending && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: 1,
                          }}
                          transition={{ 
                            scale: { 
                              repeat: Infinity,
                              duration: 0.8,
                            },
                            opacity: { duration: 0.2 }
                          }}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "85%",
                            height: "85%",
                            borderRadius: "50%",
                            background: myColor === BLACK 
                              ? "radial-gradient(circle at 30% 30%, #555, #222)"
                              : "radial-gradient(circle at 30% 30%, #FFF, #CCC)",
                            border: `3px solid ${myColor === BLACK ? B.accent : B.pants}`,
                            opacity: 0.7,
                            boxShadow: `0 0 15px ${myColor === BLACK ? B.accent : B.pants}`,
                          }}
                        />
                      )}
                    </motion.div>
                  );
                })
              )}
            </Box>
          </Paper>
        </Box>
      )}

      {/* ── 게임 종료 ──────────────────────────────────── */}
      {winner && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Box component="img" src={buri6} alt="" sx={{ width: 150, mb: 3 }} />
          </motion.div>
          
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1.5rem",
            color: B.accent,
            mb: 1,
          }}>
            🎉 {winner === myColor ? "승리했어요!" : "아쉽게 졌어요..."}
          </Typography>
          
          <Typography sx={{ 
            fontSize: "1.1rem", 
            color: B.dark, 
            mb: 1,
            fontFamily: "'Jua', sans-serif",
          }}>
            승자: {winner === BLACK ? players.black : players.white}
          </Typography>

          <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88", mb: 3 }}>
            {winner === myColor
              ? "소원을 말해보세요! 상대방이 들어줘야 해요 💕"
              : "승자의 소원을 들어줘야 해요~"}
          </Typography>

          <Button
            variant="outlined"
            onClick={resetGame}
            sx={{
              borderColor: B.accent,
              color: B.accent,
              fontFamily: "'Jua', sans-serif",
              "&:hover": { borderColor: B.pants, color: B.pants },
            }}
          >
            다시 하기
          </Button>
        </Box>
      )}

      {/* ── 소원 입력 다이얼로그 ──────────────────────── */}
      <Dialog open={wishDialogOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          fontFamily: "'Jua', sans-serif",
          color: B.accent,
          textAlign: "center",
        }}>
          <EmojiEventsIcon sx={{ fontSize: 40, color: B.accent, mb: 1 }} />
          <Typography variant="h6">축하합니다! 🎉</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, textAlign: "center", color: B.dark + "88" }}>
            이긴 사람의 특권! 소원을 말해보세요
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="예: 오늘 저녁은 내가 먹고 싶은 거 먹기!"
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontFamily: "'Jua', sans-serif",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={handleWishSubmit}
            sx={{
              bgcolor: B.accent,
              fontFamily: "'Jua', sans-serif",
              px: 4,
              "&:hover": { bgcolor: B.pants },
            }}
            startIcon={<FavoriteIcon />}
          >
            소원 등록하기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OmokGame;