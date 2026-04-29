import React, { useEffect, useState, useRef } from "react";
import { db } from "./firebase.js";
import {
    collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, addDoc, query, where, getDocs
} from "firebase/firestore";
import {
    Box, Typography, Button, TextField, Paper, Stack, Chip,
    IconButton, ToggleButtonGroup, ToggleButton, Slider, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import BrushIcon from "@mui/icons-material/Brush";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { getRandomCoupon } from "./gameCoupons.js";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png"; //기본
import buri2 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png"; //웃음
import buri6 from "./assets/KakaoTalk_20260316_132934584.png"; // 승리

const B = {
    pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
    peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A", dark: "#3D1F00",
};

// ────────────────────────────────────────────────────────────
// 제시어 데이터베이스
// ────────────────────────────────────────────────────────────
const WORD_SETS = {
    easy: [
        "퇴계이황", 
        "지드래곤", 
        "청주",
        "지한이", 
        "창피해", 
        "오리무중", 
        "식은죽먹기",
        "자물쇠", 
        "해수욕장", 
        "게이" 
    ],
    normal: [
        "신사임당",
        "육개장", 
        "전주비빔밥", 
        "이모티콘", 
        "포크레인", 
        "와이파이", 
        "구구단", 
        "개불",
        "추풍낙엽",
        "고추"
    ],
    hard: [
        "단소살인마",
        "키움히어로즈",
        "정전기", 
        "백설공주", 
        "천고마비", 
        "벤앤제리스", 
        "동문서답", 
        "일석이조", 
        "현덩이",
        "무능이",
    ],
    hell: [
        "안드로메다",
        "다금바리",
        "박학다식",
        "아리랑",
        "모나리자",
        "무소유",
        "이구아나",
        "이심전심",
        "장기기증",
        "알리바이",
        "모나리자",
        "베토벤", 
        "우유부단",
        "자격지심",
        "개인정보", 
        "일석이조",
        "장례식장", 
        "해당사항",
        "탭댄스", 
        "침착맨",
    ]
};

// ────────────────────────────────────────────────────────────
// 색상 팔레트
// ────────────────────────────────────────────────────────────
const COLORS = [
    { name: "검정", value: "#000000" },
    { name: "빨강", value: "#FF0000" },
    { name: "파랑", value: "#0066FF" },
    { name: "초록", value: "#00AA00" },
    { name: "보라", value: "#7B4FA6" },
    { name: "주황", value: "#E8630A" },
];

// ────────────────────────────────────────────────────────────
// 승리 폭죽
// ────────────────────────────────────────────────────────────
const fireConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ['#7B4FA6', '#F5B8A0', '#E8630A', '#FFD700'];

    const frame = () => {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors,
        });
        confetti({
            particleCount: 3,
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
// 스피드 그림 퀴즈 메인 컴포넌트
// ────────────────────────────────────────────────────────────
const DrawingGame = ({ currentUser, opponentUser }) => {
    const canvasRef = useRef(null);
    const inputRef = useRef(null); // TextField ref 추가
    const [isDrawing, setIsDrawing] = useState(false);
    const [paths, setPaths] = useState([]); // [{ points: [{x,y}], color, width }]
    const [currentPath, setCurrentPath] = useState([]);

    // 게임 상태
    const [gameId, setGameId] = useState(null);
    const [gameState, setGameState] = useState("lobby"); // lobby | waiting | ready | drawing | guessing | finished
    const [players, setPlayers] = useState({ drawer: null, guesser: null });
    const [currentWord, setCurrentWord] = useState("");
    const [difficulty, setDifficulty] = useState("normal");
    const [timeLeft, setTimeLeft] = useState(45); // 30초 → 45초로 변경!
    const [round, setRound] = useState(1);
    const [scores, setScores] = useState({ drawer: 0, guesser: 0 });
    const [guessInput, setGuessInput] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [recentMessage, setRecentMessage] = useState(null); // 토스트 메시지
    const [usedWords, setUsedWords] = useState([]); // 사용한 단어 추적

    // 그리기 도구
    const [brushColor, setBrushColor] = useState("#000000");
    const [brushWidth, setBrushWidth] = useState(3);
    const [isEraser, setIsEraser] = useState(false);

    // UI 상태
    const [difficultyDialogOpen, setDifficultyDialogOpen] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState("normal");
    const [couponDialogOpen, setCouponDialogOpen] = useState(false);
    const [wonCoupon, setWonCoupon] = useState("");

    const myRole = players.drawer === currentUser ? "drawer" : "guesser";

    // ── 중복 없는 랜덤 단어 선택 ────────────────────
    const getRandomWordNoDuplicate = (difficulty, usedWordsList = []) => {
        const wordList = WORD_SETS[difficulty || "normal"];
        const availableWords = wordList.filter(word => !usedWordsList.includes(word));

        // 모든 단어를 다 썼으면 리셋
        if (availableWords.length === 0) {
            return wordList[Math.floor(Math.random() * wordList.length)];
        }

        return availableWords[Math.floor(Math.random() * availableWords.length)];
    };

    // ── 새 채팅 메시지 토스트 표시 ────────────────────
    useEffect(() => {
        if (chatMessages.length > 0) {
            const lastMessage = chatMessages[chatMessages.length - 1];

            // 새 메시지일 때만 토스트 표시
            if (!recentMessage || lastMessage.time !== recentMessage.time) {
                setRecentMessage(lastMessage);

                // 3초 후 사라짐
                const timer = setTimeout(() => {
                    setRecentMessage(null);
                }, 3000);

                return () => clearTimeout(timer);
            }
        }
    }, [chatMessages.length]); // length로 변경!

    // ── 방 생성 (난이도 선택 후) ──────────────────────────────────────
    const openDifficultyDialog = () => {
        setDifficultyDialogOpen(true);
    };

    const createRoomWithDifficulty = async () => {
        setDifficultyDialogOpen(false);

        const newGameId = `draw_${Date.now()}`;

        await setDoc(doc(db, "drawingGames", newGameId), {
            gameState: "waiting",
            players: {
                drawer: currentUser,
                guesser: null,
            },
            paths: [],
            currentWord: "",
            difficulty: selectedDifficulty, // 선택한 난이도!
            timeLeft: 45, // 45초!
            round: 1,
            maxRounds: 10,
            scores: { [currentUser]: 0 },
            chatMessages: [],
            usedWords: [], // 사용한 단어 추적!
            createdAt: serverTimestamp(),
        });

        setGameId(newGameId);
        setGameState("waiting");
        setDifficulty(selectedDifficulty);
        startListener(newGameId);
    };

    // ── 방 입장 ──────────────────────────────────────
    const joinRoom = async () => {
        try {
            const q = query(
                collection(db, "drawingGames"),
                where("gameState", "==", "waiting")
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("대기 중인 방이 없어요!");
                return;
            }

            const rooms = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            const targetRoom = rooms.find(room => room.players.drawer !== currentUser);

            if (!targetRoom) {
                alert("입장 가능한 방이 없어요!");
                return;
            }

            await updateDoc(doc(db, "drawingGames", targetRoom.id), {
                "players.guesser": currentUser,
                [`scores.${currentUser}`]: 0,
                gameState: "ready",
            });

            setGameId(targetRoom.id);
            startListener(targetRoom.id);

        } catch (error) {
            alert("에러: " + error.message);
        }
    };

    // ── 실시간 리스너 ──────────────────────────────────
    const startListener = (roomId) => {
        const unsubscribe = onSnapshot(doc(db, "drawingGames", roomId), (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.data();

            setGameState(data.gameState);
            setPlayers(data.players);
            setCurrentWord(data.currentWord || "");
            setDifficulty(data.difficulty);
            setTimeLeft(data.timeLeft);
            setRound(data.round);
            setScores(data.scores || {});
            setChatMessages(data.chatMessages || []);
            setUsedWords(data.usedWords || []); // 사용한 단어 동기화!

            // 그림 동기화
            if (data.paths && JSON.stringify(data.paths) !== JSON.stringify(paths)) {
                setPaths(data.paths);
                redrawCanvas(data.paths);
            }

            // 두 명 다 입장하면 자동으로 게임 시작 (오목 방식!)
            if (data.gameState === "ready" && data.players.drawer && data.players.guesser) {
                setTimeout(async () => {
                    // 중복 없는 랜덤 제시어 선택!
                    const randomWord = getRandomWordNoDuplicate(data.difficulty, data.usedWords || []);
                    const newUsedWords = [...(data.usedWords || []), randomWord];

                    await updateDoc(doc(db, "drawingGames", roomId), {
                        gameState: "drawing",
                        currentWord: randomWord,
                        usedWords: newUsedWords, // 사용한 단어 목록 업데이트!
                        timeLeft: 45, // 45초!
                        paths: [],
                        chatMessages: [],
                    });
                }, 1000);
            }
        });

        return unsubscribe;
    };

    // ── 타이머 ──────────────────────────────────────
    useEffect(() => {
        if (gameState !== "drawing" || !gameId) return;

        const timer = setInterval(async () => {
            const newTime = timeLeft - 1;

            if (newTime <= 0) {
                // 시간 종료 - 다음 라운드
                await nextRound(false);
            } else {
                await updateDoc(doc(db, "drawingGames", gameId), {
                    timeLeft: newTime,
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, timeLeft, gameId]);

    // ── 터치 이벤트 passive 에러 해결 ──────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleTouchStart = (e) => {
            if (myRole !== "drawer" || gameState !== "drawing") return;
            e.preventDefault();
            const { x, y } = getCoordinates(e);
            setIsDrawing(true);
            setCurrentPath([{ x, y }]);
        };

        const handleTouchMove = (e) => {
            if (!isDrawing || myRole !== "drawer") return;
            e.preventDefault();
            const { x, y } = getCoordinates(e);
            const newPath = [...currentPath, { x, y }];
            setCurrentPath(newPath);

            const ctx = canvas.getContext("2d");
            ctx.strokeStyle = isEraser ? "#FFFFFF" : brushColor;
            ctx.lineWidth = isEraser ? brushWidth * 3 : brushWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            if (newPath.length > 1) {
                const prev = newPath[newPath.length - 2];
                const curr = newPath[newPath.length - 1];

                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.stroke();
            }
        };

        const handleTouchEnd = async () => {
            if (!isDrawing) return;
            setIsDrawing(false);

            if (currentPath.length > 0) {
                const newPaths = [
                    ...paths,
                    {
                        points: currentPath,
                        color: isEraser ? "#FFFFFF" : brushColor,
                        width: isEraser ? brushWidth * 3 : brushWidth,
                    }
                ];

                setPaths(newPaths);
                setCurrentPath([]);

                if (gameId) {
                    await updateDoc(doc(db, "drawingGames", gameId), {
                        paths: newPaths,
                    });
                }
            }
        };

        // passive: false로 등록!
        canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
        canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
        canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

        return () => {
            canvas.removeEventListener("touchstart", handleTouchStart);
            canvas.removeEventListener("touchmove", handleTouchMove);
            canvas.removeEventListener("touchend", handleTouchEnd);
        };
    }, [myRole, gameState, isDrawing, currentPath, paths, isEraser, brushColor, brushWidth, gameId]);

    // ── Canvas 터치 이벤트 직접 등록 (passive 에러 방지) ────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // passive: false로 직접 등록
        canvas.addEventListener("touchstart", startDrawing, { passive: false });
        canvas.addEventListener("touchmove", draw, { passive: false });
        canvas.addEventListener("touchend", endDrawing, { passive: false });

        return () => {
            canvas.removeEventListener("touchstart", startDrawing);
            canvas.removeEventListener("touchmove", draw);
            canvas.removeEventListener("touchend", endDrawing);
        };
    }, [isDrawing, currentPath, brushColor, brushWidth, isEraser, myRole, gameState]);

    // ── Canvas 그리기 (마우스 + 터치) ──────────────────────────────────
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Canvas의 실제 크기와 화면에 표시되는 크기의 비율 계산
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;

        // 터치 이벤트
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            // 마우스 이벤트
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e) => {
        if (myRole !== "drawer" || gameState !== "drawing") return;

        e.preventDefault(); // 터치 스크롤 방지

        const { x, y } = getCoordinates(e);

        setIsDrawing(true);
        setCurrentPath([{ x, y }]);
    };

    const draw = (e) => {
        if (!isDrawing || myRole !== "drawer") return;

        e.preventDefault(); // 터치 스크롤 방지

        const { x, y } = getCoordinates(e);

        const newPath = [...currentPath, { x, y }];
        setCurrentPath(newPath);

        // Canvas에 그리기
        const ctx = canvasRef.current.getContext("2d");
        ctx.strokeStyle = isEraser ? "#FFFFFF" : brushColor;
        ctx.lineWidth = isEraser ? brushWidth * 3 : brushWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (newPath.length > 1) {
            const prev = newPath[newPath.length - 2];
            const curr = newPath[newPath.length - 1];

            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.stroke();
        }
    };

    const endDrawing = async () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentPath.length > 0) {
            const newPaths = [
                ...paths,
                {
                    points: currentPath,
                    color: isEraser ? "#FFFFFF" : brushColor,
                    width: isEraser ? brushWidth * 3 : brushWidth,
                }
            ];

            setPaths(newPaths);
            setCurrentPath([]);

            // Firebase 업데이트
            if (gameId) {
                await updateDoc(doc(db, "drawingGames", gameId), {
                    paths: newPaths,
                });
            }
        }
    };

    // ── Canvas 재그리기 ──────────────────────────────────
    const redrawCanvas = (pathsData) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 저장된 경로 그리기
        pathsData.forEach(path => {
            if (path.points.length < 2) return;

            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.width;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);

            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }

            ctx.stroke();
        });

        // 현재 그리는 중인 경로도 그리기 (사라지지 않게!)
        if (currentPath.length > 1) {
            ctx.strokeStyle = isEraser ? "#FFFFFF" : brushColor;
            ctx.lineWidth = isEraser ? brushWidth * 3 : brushWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);

            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }

            ctx.stroke();
        }
    };

    // ── Canvas 지우기 ──────────────────────────────────
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleClearAll = async () => {
        setPaths([]);
        clearCanvas();

        if (gameId) {
            await updateDoc(doc(db, "drawingGames", gameId), {
                paths: [],
            });
        }
    };

    const handleUndo = async () => {
        if (paths.length === 0) return;

        const newPaths = paths.slice(0, -1);
        setPaths(newPaths);
        redrawCanvas(newPaths);

        if (gameId) {
            await updateDoc(doc(db, "drawingGames", gameId), {
                paths: newPaths,
            });
        }
    };

    // ── 정답 제출 ──────────────────────────────────────
    const handleGuessSubmit = async (e) => {
        e.preventDefault();

        if (!guessInput.trim() || myRole !== "guesser") return;

        const newMessage = {
            user: currentUser,
            text: guessInput,
            isCorrect: false,
            time: Date.now(),
        };

        // 정답 체크
        if (guessInput.trim() === currentWord) {
            newMessage.isCorrect = true;

            // 점수 추가
            const newScores = { ...scores };
            newScores[currentUser] = (newScores[currentUser] || 0) + 1;

            await updateDoc(doc(db, "drawingGames", gameId), {
                scores: newScores,
                chatMessages: [...chatMessages, newMessage],
            });

            fireConfetti();

            // 다음 라운드
            setTimeout(() => nextRound(true), 1500);

        } else {
            await updateDoc(doc(db, "drawingGames", gameId), {
                chatMessages: [...chatMessages, newMessage],
            });
        }

        setGuessInput("");
    };

    // ── 다음 라운드 ──────────────────────────────────
    const nextRound = async (correctAnswer) => {
        if (!gameId) return;

        const data = (await getDocs(query(collection(db, "drawingGames")))).docs
            .find(d => d.id === gameId)?.data();

        if (!data) return;

        const nextRoundNum = data.round + 1;

        if (nextRoundNum > data.maxRounds) {
            // 게임 종료
            await updateDoc(doc(db, "drawingGames", gameId), {
                gameState: "finished",
            });

            // 결과 저장
            const winner = data.scores[data.players.drawer] > data.scores[data.players.guesser]
                ? data.players.drawer
                : data.players.guesser;
            const loser = winner === data.players.drawer ? data.players.guesser : data.players.drawer;

            // 승자에게 랜덤 쿠폰 지급!
            const randomCoupon = getRandomCoupon();

            await addDoc(collection(db, "gameResults"), {
                gameType: "그림 퀴즈",
                winner: winner,
                loser: loser,
                wishRequest: "",
                wishCompleted: false,
                playedAt: serverTimestamp(),
            });

            // 쿠폰 저장
            await addDoc(collection(db, "coupons"), {
                owner: winner,
                title: randomCoupon,
                used: false,
                createdAt: serverTimestamp(),
                fromGame: "그림 퀴즈",
            });

            // 승자에게 쿠폰 알림
            if (winner === currentUser) {
                setWonCoupon(randomCoupon);
                setCouponDialogOpen(true);
            }

            return;
        }

        // 역할 교체
        const newDrawer = data.players.guesser;
        const newGuesser = data.players.drawer;

        // 중복 없는 새 제시어!
        const randomWord = getRandomWordNoDuplicate(data.difficulty, data.usedWords || []);
        const newUsedWords = [...(data.usedWords || []), randomWord];

        await updateDoc(doc(db, "drawingGames", gameId), {
            round: nextRoundNum,
            "players.drawer": newDrawer,
            "players.guesser": newGuesser,
            currentWord: randomWord,
            usedWords: newUsedWords, // 사용한 단어 목록 업데이트!
            timeLeft: 45, // 45초!
            paths: [],
            chatMessages: [],
            gameState: "drawing",
        });

        setPaths([]);
        clearCanvas();
    };

    // ── 게임 초기화 ──────────────────────────────────
    const resetGame = () => {
        setGameId(null);
        setGameState("lobby");
        setPaths([]);
        setCurrentPath([]);
        setPlayers({ drawer: null, guesser: null });
        setScores({});
        setChatMessages([]);
        clearCanvas();
    };

    // ────────────────────────────────────────────────────────────
    // UI 렌더링
    // ────────────────────────────────────────────────────────────
    return (
        <Box sx={{ p: 2, maxWidth: 700, mx: "auto" }}>
            {/* 헤더 */}
            <Box sx={{
                display: "flex", alignItems: "center", gap: 2, mb: 3,
                p: 2, borderRadius: 4,
                background: `linear-gradient(135deg, ${B.lavender} 0%, ${B.peach} 100%)`,
                border: `2px solid ${B.accent}`,
            }}>
                <Box component="img" src={buri2} alt="" sx={{ width: 50 }} />
                <Box>
                    <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "1.3rem",
                        color: B.accent,
                    }}>
                        🎨 스피드 그림 퀴즈
                    </Typography>
                    <Typography sx={{ fontSize: "0.8rem", color: B.dark + "88" }}>
                        30초 안에 그림 그리고 맞춰보세요!
                    </Typography>
                </Box>
            </Box>

            {/* 로비 */}
            {gameState === "lobby" && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <Box component="img" src={buri1} alt="" sx={{ width: 120, mb: 3 }} />
                    <Stack spacing={2}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={openDifficultyDialog}
                            startIcon={<PersonAddIcon />}
                            sx={{
                                bgcolor: B.accent,
                                fontFamily: "'Jua', sans-serif",
                                fontSize: "1.1rem",
                                "&:hover": { bgcolor: B.pants },
                            }}
                        >
                            방 만들기
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
                                "&:hover": { bgcolor: B.peach + "33" },
                            }}
                        >
                            입장하기
                        </Button>
                    </Stack>
                </Box>
            )}

            {/* 대기 중 */}
            {gameState === "waiting" && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <Box component="img" src={buri1} alt="" sx={{ width: 100, mb: 3 }} />
                    <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "1.2rem",
                        color: B.pants,
                        mb: 2,
                    }}>
                        상대방을 기다리는 중...
                    </Typography>
                </Box>
            )}

            {/* 준비 완료 */}
            {gameState === "ready" && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                    >
                        <Box component="img" src={buri6} alt="" sx={{ width: 120, mb: 3 }} />
                    </motion.div>
                    <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "1.5rem",
                        color: B.accent,
                    }}>
                        🎉 준비 완료!
                    </Typography>
                    <Typography sx={{ mt: 1, color: B.dark + "88" }}>
                        곧 게임이 시작됩니다...
                    </Typography>
                </Box>
            )}

            {/* 게임 진행 중 */}
            {gameState === "drawing" && (
                <Box sx={{ position: "relative" }}>
                    {/* 토스트 알림 (채팅 메시지) */}
                    <AnimatePresence>
                        {recentMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    position: "fixed",
                                    top: 80,
                                    left: 0,
                                    right: 0,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    zIndex: 1000,
                                    pointerEvents: "none", // 터치 이벤트 통과
                                }}
                            >
                                <Paper
                                    elevation={6}
                                    sx={{
                                        px: 3,
                                        py: 1.5,
                                        borderRadius: 3,
                                        bgcolor: recentMessage.isCorrect ? B.accent + "DD" : "white" + "DD",
                                        border: `2px solid ${recentMessage.isCorrect ? B.accent : B.pants}`,
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                                        backdropFilter: "blur(8px)",
                                        maxWidth: "90%",
                                    }}
                                >
                                    <Typography sx={{
                                        fontFamily: "'Jua', sans-serif",
                                        fontSize: "1rem",
                                        color: recentMessage.isCorrect ? "white" : B.dark,
                                        fontWeight: 700,
                                        textAlign: "center",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}>
                                        {recentMessage.isCorrect
                                            ? `🎉 ${recentMessage.user}님이 정답!`
                                            : `${recentMessage.user}: ${recentMessage.text}`
                                        }
                                    </Typography>
                                </Paper>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 상단 정보 */}
                    <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: "space-between" }}>
                        <Box>
                            <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88" }}>
                                라운드 {round} / 10
                            </Typography>
                            <Typography sx={{
                                fontFamily: "'Jua', sans-serif",
                                fontSize: "1.3rem",
                                color: timeLeft <= 10 ? B.accent : B.pants,
                            }}>
                                {timeLeft}초
                            </Typography>
                        </Box>

                        <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontSize: "0.85rem", color: B.dark + "66" }}>
                                {players.drawer}: {scores[players.drawer] || 0}점
                            </Typography>
                            <Typography sx={{ fontSize: "0.85rem", color: B.dark + "66" }}>
                                {players.guesser}: {scores[players.guesser] || 0}점
                            </Typography>
                        </Box>
                    </Stack>

                    {/* 타이머 프로그레스 바 */}
                    <LinearProgress
                        variant="determinate"
                        value={(timeLeft / 45) * 100}
                        sx={{
                            mb: 2,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: B.cream,
                            '& .MuiLinearProgress-bar': {
                                bgcolor: timeLeft <= 10 ? B.accent : B.pants,
                                borderRadius: 4,
                            }
                        }}
                    />

                    {/* 제시어 (그리는 사람만) */}
                    {myRole === "drawer" && (
                        <Box sx={{
                            textAlign: "center",
                            p: 2,
                            mb: 2,
                            borderRadius: 3,
                            bgcolor: B.accent + "22",
                            border: `2px solid ${B.accent}`,
                        }}>
                            <Typography sx={{ fontSize: "0.8rem", color: B.dark + "66", mb: 0.5 }}>
                                제시어
                            </Typography>
                            <Typography sx={{
                                fontFamily: "'Jua', sans-serif",
                                fontSize: "1.5rem",
                                color: B.accent,
                            }}>
                                {currentWord}
                            </Typography>
                        </Box>
                    )}

                    {/* 힌트 (맞추는 사람만) */}
                    {myRole === "guesser" && (
                        <Box sx={{
                            textAlign: "center",
                            p: 2,
                            mb: 2,
                            borderRadius: 3,
                            bgcolor: B.pants + "22",
                        }}>
                            <Typography sx={{
                                fontFamily: "'Jua', sans-serif",
                                fontSize: "1.2rem",
                                color: B.pants,
                            }}>
                                {currentWord.split("").map((_, i) => "□").join(" ")}
                            </Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: B.dark + "66", mt: 0.5 }}>
                                ({currentWord.length}글자)
                            </Typography>
                        </Box>
                    )}

                    {/* Canvas */}
                    <Paper elevation={3} sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
                        <canvas
                            ref={canvasRef}
                            width={650}
                            height={400}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={endDrawing}
                            onMouseLeave={endDrawing}
                            style={{
                                display: "block",
                                width: "100%",
                                cursor: myRole === "drawer" ? "crosshair" : "default",
                                backgroundColor: "#FFF",
                                touchAction: "none",
                            }}
                        />
                    </Paper>

                    {/* 그리기 도구 (그리는 사람만) */}
                    {myRole === "drawer" && (
                        <Box sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
                                {COLORS.map(color => (
                                    <Box
                                        key={color.value}
                                        onClick={() => {
                                            setBrushColor(color.value);
                                            setIsEraser(false);
                                        }}
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: "50%",
                                            bgcolor: color.value,
                                            border: brushColor === color.value && !isEraser
                                                ? `3px solid ${B.accent}`
                                                : "2px solid #ccc",
                                            cursor: "pointer",
                                            transition: "transform 0.1s",
                                            "&:active": { transform: "scale(0.9)" },
                                        }}
                                    />
                                ))}
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <BrushIcon sx={{ color: B.dark + "88" }} />
                                <Slider
                                    value={brushWidth}
                                    onChange={(e, val) => setBrushWidth(val)}
                                    min={1}
                                    max={10}
                                    sx={{ flex: 1, color: B.pants }}
                                />
                                <Typography sx={{ fontSize: "0.85rem", minWidth: 30 }}>
                                    {brushWidth}
                                </Typography>
                            </Stack>

                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant={isEraser ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => setIsEraser(!isEraser)}
                                    sx={{
                                        fontFamily: "'Jua', sans-serif",
                                        bgcolor: isEraser ? B.dark : "transparent",
                                        color: isEraser ? "white" : B.dark,
                                    }}
                                >
                                    지우개
                                </Button>
                                <IconButton onClick={handleUndo} size="small">
                                    <UndoIcon />
                                </IconButton>
                                <IconButton onClick={handleClearAll} size="small" color="error">
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                        </Box>
                    )}

                    {/* 채팅 기록 (간소화 - 토스트가 메인) */}
                    <Paper sx={{
                        p: 1.5,
                        mb: 2,
                        maxHeight: 80,
                        overflowY: "auto",
                        bgcolor: B.cream + "88",
                        touchAction: "manipulation",
                        pointerEvents: "auto",
                        border: `1px dashed ${B.pants}44`,
                    }}>
                        {chatMessages.length === 0 ? (
                            <Typography sx={{ fontSize: "0.75rem", color: B.dark + "44", textAlign: "center" }}>
                                {myRole === "drawer" ? "상대방의 답변이 위에 표시돼요" : "입력한 답변이 위에 표시돼요"}
                            </Typography>
                        ) : (
                            <Stack spacing={0.5}>
                                {chatMessages.slice(-3).map((msg, i) => (
                                    <Typography
                                        key={i}
                                        sx={{
                                            fontSize: "0.7rem",
                                            color: msg.isCorrect ? B.accent : B.dark + "88",
                                            fontWeight: msg.isCorrect ? 700 : 400,
                                        }}
                                    >
                                        {msg.user}: {msg.isCorrect ? "✓ 정답" : msg.text}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                    </Paper>

                    {/* 정답 입력 (맞추는 사람만) */}
                    {myRole === "guesser" && (
                        <form onSubmit={handleGuessSubmit}>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    inputRef={inputRef}
                                    fullWidth
                                    size="small"
                                    placeholder="정답을 입력하세요..."
                                    value={guessInput}
                                    onChange={(e) => setGuessInput(e.target.value)}
                                    autoComplete="off"
                                    inputProps={{
                                        autoCapitalize: "off",
                                        autoCorrect: "off",
                                        readOnly: false,
                                    }}
                                    onTouchStart={(e) => {
                                        // 모바일에서 확실하게 포커스
                                        e.stopPropagation();
                                        if (inputRef.current) {
                                            inputRef.current.focus();
                                        }
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (inputRef.current) {
                                            inputRef.current.focus();
                                        }
                                    }}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            fontFamily: "'Jua', sans-serif",
                                            bgcolor: "white",
                                        },
                                        "& input": {
                                            cursor: "text !important",
                                            userSelect: "text",
                                            WebkitUserSelect: "text",
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    sx={{
                                        bgcolor: B.pants,
                                        fontFamily: "'Jua', sans-serif",
                                        "&:hover": { bgcolor: B.accent },
                                        minWidth: 60,
                                    }}
                                >
                                    제출
                                </Button>
                            </Stack>
                        </form>
                    )}
                </Box>
            )}

            {/* 게임 종료 */}
            {gameState === "finished" && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                    >
                        <Box component="img" src={buri6} alt="" sx={{ width: 150, mb: 3 }} />
                    </motion.div>

                    <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "1.8rem",
                        color: B.accent,
                        mb: 2,
                    }}>
                        🎉 게임 종료!
                    </Typography>

                    <Stack spacing={1} sx={{ mb: 3 }}>
                        <Typography sx={{ fontSize: "1.1rem", color: B.dark }}>
                            {players.drawer}: {scores[players.drawer] || 0}점
                        </Typography>
                        <Typography sx={{ fontSize: "1.1rem", color: B.dark }}>
                            {players.guesser}: {scores[players.guesser] || 0}점
                        </Typography>
                    </Stack>

                    <Typography sx={{
                        fontSize: "1.3rem",
                        color: B.accent,
                        fontFamily: "'Jua', sans-serif",
                        mb: 3,
                    }}>
                        🏆 승자: {scores[players.drawer] > scores[players.guesser] ? players.drawer : players.guesser}
                    </Typography>

                    <Button
                        variant="outlined"
                        onClick={resetGame}
                        sx={{
                            borderColor: B.accent,
                            color: B.accent,
                            fontFamily: "'Jua', sans-serif",
                        }}
                    >
                        다시 하기
                    </Button>
                </Box>
            )}

            {/* 난이도 선택 다이얼로그 */}
            <Dialog open={difficultyDialogOpen} onClose={() => setDifficultyDialogOpen(false)}>
                <DialogTitle sx={{ fontFamily: "'Jua', sans-serif", color: B.pants }}>
                    난이도 선택
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {[
                            { value: "easy", label: "쉬움", desc: "간단한 단어 (하트, 별, 꽃...)", emoji: "😊" },
                            { value: "normal", label: "보통", desc: "커플 일상 (데이트, 포옹...)", emoji: "💑" },
                            { value: "hard", label: "어려움", desc: "복잡한 상황 (백허그, 첫 뽀뽀...)", emoji: "🎨" },
                            { value: "couple", label: "우리만", desc: "우리만의 추억 (첫 데이트...)", emoji: "💕" },
                        ].map((diff) => (
                            <Paper
                                key={diff.value}
                                onClick={() => setSelectedDifficulty(diff.value)}
                                sx={{
                                    p: 2,
                                    cursor: "pointer",
                                    border: selectedDifficulty === diff.value
                                        ? `3px solid ${B.accent}`
                                        : `2px solid ${B.cream}`,
                                    bgcolor: selectedDifficulty === diff.value ? B.peach + "33" : "white",
                                    transition: "all 0.2s",
                                    "&:hover": {
                                        transform: "translateY(-2px)",
                                        boxShadow: 2,
                                    },
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography sx={{ fontSize: "2rem" }}>{diff.emoji}</Typography>
                                    <Box>
                                        <Typography sx={{
                                            fontFamily: "'Jua', sans-serif",
                                            fontSize: "1.1rem",
                                            color: B.pants,
                                        }}>
                                            {diff.label}
                                        </Typography>
                                        <Typography sx={{ fontSize: "0.85rem", color: B.dark + "88" }}>
                                            {diff.desc}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDifficultyDialogOpen(false)}>취소</Button>
                    <Button
                        onClick={createRoomWithDifficulty}
                        variant="contained"
                        sx={{
                            bgcolor: B.accent,
                            fontFamily: "'Jua', sans-serif",
                            "&:hover": { bgcolor: B.pants },
                        }}
                    >
                        시작하기
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 쿠폰 받기 다이얼로그 */}
            <Dialog
                open={couponDialogOpen}
                onClose={() => setCouponDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogContent sx={{ textAlign: "center", py: 4 }}>
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", duration: 0.8 }}
                    >
                        <Typography sx={{ fontSize: "5rem", mb: 2 }}>🎁</Typography>
                    </motion.div>

                    <Typography sx={{
                        fontFamily: "'Jua', sans-serif",
                        fontSize: "1.5rem",
                        color: B.accent,
                        mb: 2,
                    }}>
                        승리 보상!
                    </Typography>

                    <Paper sx={{
                        p: 3,
                        bgcolor: B.peach + "33",
                        border: `2px solid ${B.accent}`,
                        borderRadius: 3,
                        mb: 3,
                    }}>
                        <Typography sx={{
                            fontFamily: "'Jua', sans-serif",
                            fontSize: "1.3rem",
                            color: B.pants,
                        }}>
                            {wonCoupon}
                        </Typography>
                    </Paper>

                    <Typography sx={{ fontSize: "0.85rem", color: B.dark + "88", mb: 1 }}>
                        쿠폰이 쿠폰북에 추가되었어요!
                    </Typography>
                    <Typography sx={{ fontSize: "0.85rem", color: B.dark + "88" }}>
                        상대방에게 써먹어보세요! 😉
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setCouponDialogOpen(false)}
                        variant="contained"
                        fullWidth
                        sx={{
                            bgcolor: B.accent,
                            fontFamily: "'Jua', sans-serif",
                            "&:hover": { bgcolor: B.pants },
                        }}
                    >
                        확인
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DrawingGame;