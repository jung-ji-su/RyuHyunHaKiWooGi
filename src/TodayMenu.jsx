import React, { useState, useEffect, useRef } from "react";
import MENU_DB from "./menuData.json";
import {
  Box, Typography, Stack, Button, Chip, CircularProgress,
  IconButton, LinearProgress,
} from "@mui/material";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import TimerIcon from "@mui/icons-material/Timer";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A",
  dark: "#3D1F00", pink: "#FF8FAB", green: "#1D9E75",
  orange: "#FF6B35", yellow: "#FFB830",
};



// ── 유틸 ─────────────────────────────────────────────────────────
const getTotalPrice = (ingredients) =>
  ingredients.reduce((sum, i) => sum + i.price, 0).toLocaleString();

const getSpicyLabel = (n) => {
  if (n === 0) return { label: "안 매워요", color: B.green };
  if (n === 1) return { label: "살짝 매워요", color: B.yellow };
  if (n === 2) return { label: "적당히 매워요", color: B.orange };
  return { label: "매워요 🔥", color: "#E24B4A" };
};

const getDiffColor = (d) => d === "초급" ? B.green : B.orange;

// ── 식재료 이미지 (Unsplash 무료) ────────────────────────────────


// ── 필터 칩 ──────────────────────────────────────────────────────
const FILTERS = [
  { key: "전체", label: "✨ 전체" },
  { key: "밥", label: "🍚 든든한 밥" },
  { key: "면", label: "🍜 면 요리" },
  { key: "고기", label: "🥩 고기" },
  { key: "해산물", label: "🦐 해산물" }, // 일식/양식 카테고리 해산물 메뉴 대응
  { key: "국", label: "🥣 국·찌개" }, // 찌개 카테고리 포함
  { key: "빵", label: "🥪 브런치·빵" },
  { key: "다이어트", label: "💪 고단백·식단" }, // 지수의 벌크업용!
  { key: "안주", label: "🍺 이색 안주" }, // 퇴근 후 힐링용
  { key: "분식", label: "🌶️ 분식·간식" },
  { key: "양식", label: "🍝 양식·파티" }, // 홈파티용
];

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
const TodayMenu = () => {
  const [menu, setMenu] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [filter, setFilter] = useState("전체");
  const [checked, setChecked] = useState({});
  const [step, setStep] = useState("home");
  const rollCount = useRef(0);

  const getFiltered = () =>
    filter === "전체" ? MENU_DB : MENU_DB.filter(m => m.category === filter);

  const handleRoll = () => {
    const pool = getFiltered();
    if (pool.length === 0) return;
    setRolling(true);
    setChecked({});
    rollCount.current = 0;

    // 룰렛 느낌으로 빠르게 메뉴 교체
    const interval = setInterval(() => {
      rollCount.current++;
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setMenu(rand);
      if (rollCount.current >= 12) {
        clearInterval(interval);
        setRolling(false);
        setStep("result");
      }
    }, 80);
  };

  const handleCheck = (name) => {
    setChecked(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalIngredients = menu?.ingredients.length || 0;

  // ── 홈 화면 ──────────────────────────────────────────────────
  if (step === "home") return (
    <Box sx={{ pb: 4 }}>
      {/* 헤더 */}
      <Box sx={{
        textAlign: "center", py: 3, px: 2, mb: 2.5,
        borderRadius: 4, bgcolor: B.peach + "88",
        border: `1.5px dashed ${B.orange}44`,
        position: "relative",
      }}>
        <Typography sx={{ fontSize: "2.5rem", lineHeight: 1, mb: 1 }}>👨‍🍳</Typography>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: "1.6rem", color: B.orange,
          textShadow: `2px 2px 0 ${B.peach}`,
        }}>
          오늘 뭐 먹지?
        </Typography>
        <Typography sx={{
          fontSize: "0.8rem", color: B.dark + "88", mt: 0.5,
          fontFamily: "'Noto Sans KR',sans-serif"
        }}>
          버튼 하나로 오늘 저녁 메뉴 해결! 🍳
        </Typography>
      </Box>

      {/* 필터 */}
      {/* 필터 (가로 스크롤 제거 -> 여러 줄 배치로 수정) */}
      <Box sx={{ mb: 2.5 }}>
        <Stack
          direction="row"
          gap={1}
          sx={{
            flexWrap: "wrap", // 이 속성이 핵심! 자리가 없으면 다음 줄로 넘김
            justifyContent: "flex-start"
          }}
        >
          {FILTERS.map(f => (
            <Chip
              key={f.key}
              label={f.label}
              size="small"
              onClick={() => setFilter(f.key)}
              sx={{
                fontFamily: "'Noto Sans KR',sans-serif",
                fontSize: "0.75rem",
                bgcolor: filter === f.key ? B.orange : B.peach,
                color: filter === f.key ? "white" : B.dark,
                fontWeight: filter === f.key ? 700 : 400,
                border: `1.5px solid ${filter === f.key ? B.orange : "transparent"}`,
                transition: "all 0.15s",
                height: 30, // 모바일에서 터치하기 편하게 살짝 키웠어
                px: 0.5,
                "&:hover": { bgcolor: filter === f.key ? B.orange : B.peach + "BB" }
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* 룰렛 미리보기 (rolling 중) */}
      {rolling && menu && (
        <Box sx={{
          textAlign: "center", py: 3, mb: 2.5,
          bgcolor: "white", borderRadius: 3,
          border: `2px solid ${B.orange}44`,
          animation: "pulse 0.1s ease infinite",
        }}>
          <Typography sx={{ fontSize: "3rem", lineHeight: 1 }}>{menu.emoji}</Typography>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "1.3rem",
            color: B.orange, mt: 1
          }}>
            {menu.name}
          </Typography>
        </Box>
      )}

      {/* 추천 버튼 */}
      <Button
        fullWidth
        onClick={handleRoll}
        disabled={rolling}
        startIcon={rolling
          ? <CircularProgress size={18} sx={{ color: "white" }} />
          : <ShuffleIcon />}
        sx={{
          bgcolor: rolling ? B.orange + "88" : B.orange,
          color: "white", borderRadius: 3, py: 2,
          fontFamily: "'Jua',sans-serif", fontSize: "1.1rem",
          boxShadow: `0 4px 20px ${B.orange}44`,
          transition: "all 0.15s",
          "&:hover": { bgcolor: "#e55a24" },
          "&:active": { transform: "scale(0.97)" },
        }}>
        {rolling ? "메뉴 고르는 중..." : "오늘 메뉴 추천받기 🎲"}
      </Button>

      {/* 메뉴 리스트 미리보기 */}
      <Box sx={{ mt: 3 }}>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", color: B.dark + "88",
          fontSize: "0.82rem", mb: 1.2
        }}>
          📋 오늘의 메뉴 후보 ({getFiltered().length}개)
        </Typography>
        <Stack spacing={0.8}>
          {getFiltered().map(m => (
            <Box key={m.id}
              onClick={() => { setMenu(m); setStep("result"); setChecked({}); }}
              sx={{
                display: "flex", alignItems: "center", gap: 1.5,
                bgcolor: "white", borderRadius: 2.5, px: 1.8, py: 1.2,
                border: `1px solid ${B.orange}18`, cursor: "pointer",
                transition: "all 0.12s",
                "&:active": { transform: "scale(0.98)", bgcolor: B.peach + "55" },
              }}>
              <Typography sx={{ fontSize: "1.4rem", lineHeight: 1 }}>{m.emoji}</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{
                  fontFamily: "'Jua',sans-serif", fontSize: "0.88rem",
                  color: B.dark
                }}>
                  {m.name}
                </Typography>
                <Typography sx={{
                  fontSize: "0.68rem", color: B.dark + "66",
                  fontFamily: "'Noto Sans KR',sans-serif"
                }}>
                  {m.cook_time} · {getTotalPrice(m.ingredients)}원
                </Typography>
              </Box>
              <Chip label={m.difficulty} size="small" sx={{
                bgcolor: getDiffColor(m.difficulty) + "22",
                color: getDiffColor(m.difficulty),
                fontFamily: "'Noto Sans KR',sans-serif",
                fontSize: "0.65rem", height: 20, fontWeight: 700,
              }} />
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );

  // ── 결과 화면 ────────────────────────────────────────────────
  if (step === "result" && menu) {
    const spicy = getSpicyLabel(menu.spicy);
    const total = getTotalPrice(menu.ingredients);

    return (
      <Box sx={{ pb: 4 }}>

        {/* 뒤로 + 다시 뽑기 */}
        <Stack direction="row" gap={1} mb={2}>
          <Button
            onClick={() => setStep("home")}
            sx={{
              color: B.dark + "88", fontFamily: "'Noto Sans KR',sans-serif",
              fontSize: "0.8rem", px: 0,
            }}>
            ← 돌아가기
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={handleRoll}
            startIcon={<ShuffleIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: B.orange + "18", color: B.orange,
              borderRadius: 2, fontFamily: "'Noto Sans KR',sans-serif",
              fontSize: "0.8rem",
              "&:hover": { bgcolor: B.orange + "28" },
            }}>
            다시 뽑기
          </Button>
        </Stack>

        {/* 이모지 헤더 */}
        <Box sx={{
          width: "100%", borderRadius: 3, mb: 2,
          bgcolor: B.peach + "88",
          border: `1.5px solid ${B.orange}33`,
          py: 3, textAlign: "center",
          position: "relative",
        }}>
          <Typography sx={{ fontSize: "5rem", lineHeight: 1 }}>{menu.emoji}</Typography>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "1.4rem",
            color: B.orange, mt: 1,
          }}>
            {menu.name}
          </Typography>
        </Box>

        {/* 기본 정보 뱃지 */}
        <Stack direction="row" gap={0.8} mb={2} flexWrap="wrap">
          <Chip label={menu.difficulty} size="small" sx={{
            bgcolor: getDiffColor(menu.difficulty) + "22",
            color: getDiffColor(menu.difficulty), fontWeight: 700,
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
          }} />
          <Chip
            icon={<TimerIcon sx={{ fontSize: "14px !important" }} />}
            label={menu.cook_time} size="small" sx={{
              bgcolor: B.lavender, color: B.pants,
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
            }} />
          <Chip label={spicy.label} size="small" sx={{
            bgcolor: spicy.color + "22", color: spicy.color,
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
          }} />
          <Chip label={menu.serving} size="small" sx={{
            bgcolor: B.peach, color: B.orange,
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
          }} />
        </Stack>

        {/* 예상 비용 */}
        <Box sx={{
          bgcolor: B.orange + "12", borderRadius: 3, p: 1.8, mb: 2,
          border: `1.5px solid ${B.orange}33`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: "1.3rem" }}>🛒</Typography>
            <Box>
              <Typography sx={{
                fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
                color: B.dark
              }}>
                예상 장보기 비용
              </Typography>
              <Typography sx={{
                fontSize: "0.7rem", color: B.dark + "66",
                fontFamily: "'Noto Sans KR',sans-serif"
              }}>
                {menu.serving} 기준
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "1.4rem",
            color: B.orange
          }}>
            {total}원
          </Typography>
        </Box>

        {/* 실패하지 않는 팁 */}
        <Box sx={{
          bgcolor: B.lavender + "66", borderRadius: 3, p: 1.8, mb: 2.5,
          border: `1.5px solid ${B.pants}22`,
        }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "0.85rem",
            color: B.pants, mb: 0.5
          }}>
            💜 실패하지 않는 팁
          </Typography>
          <Typography sx={{
            fontSize: "0.8rem", color: B.dark + "cc", lineHeight: 1.6,
            fontFamily: "'Noto Sans KR',sans-serif"
          }}>
            {menu.tip}
          </Typography>
        </Box>

        {/* 재료 & 장보기 체크리스트 */}
        <Box sx={{
          bgcolor: "white", borderRadius: 3, p: 2, mb: 2.5,
          border: `1px solid ${B.orange}22`
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: "0.92rem",
              color: B.dark
            }}>
              🛍️ 재료 & 장보기
            </Typography>
            <Typography sx={{
              fontSize: "0.72rem", color: B.dark + "66",
              fontFamily: "'Noto Sans KR',sans-serif"
            }}>
              {checkedCount}/{totalIngredients} 완료
            </Typography>
          </Stack>

          {/* 장보기 진행률 */}
          <LinearProgress
            variant="determinate"
            value={totalIngredients > 0 ? (checkedCount / totalIngredients) * 100 : 0}
            sx={{
              mb: 1.5, borderRadius: 99, height: 6,
              bgcolor: B.peach,
              "& .MuiLinearProgress-bar": { bgcolor: B.orange, borderRadius: 99 },
            }}
          />

          <Stack spacing={0.8}>
            {menu.ingredients.map((ing, i) => (
              <Box key={i}
                onClick={() => handleCheck(ing.name)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.2,
                  py: 0.8, px: 1, borderRadius: 2, cursor: "pointer",
                  bgcolor: checked[ing.name] ? B.green + "12" : "transparent",
                  transition: "all 0.15s",
                  "&:active": { transform: "scale(0.98)" },
                }}>
                {checked[ing.name]
                  ? <CheckCircleIcon sx={{ color: B.green, fontSize: 20, flexShrink: 0 }} />
                  : <RadioButtonUncheckedIcon sx={{ color: B.dark + "44", fontSize: 20, flexShrink: 0 }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontSize: "0.82rem", color: checked[ing.name] ? B.dark + "66" : B.dark,
                    textDecoration: checked[ing.name] ? "line-through" : "none",
                    fontFamily: "'Noto Sans KR',sans-serif",
                    fontWeight: 500,
                  }}>
                    {ing.name}
                  </Typography>
                  <Typography sx={{
                    fontSize: "0.68rem", color: B.dark + "55",
                    fontFamily: "'Noto Sans KR',sans-serif"
                  }}>
                    {ing.amount}
                  </Typography>
                </Box>
                <Typography sx={{
                  fontSize: "0.75rem", color: B.orange,
                  fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600, flexShrink: 0
                }}>
                  {ing.price.toLocaleString()}원
                </Typography>
              </Box>
            ))}
          </Stack>

          {checkedCount === totalIngredients && totalIngredients > 0 && (
            <Box sx={{
              mt: 1.5, py: 1, borderRadius: 2, textAlign: "center",
              bgcolor: B.green + "18", border: `1px solid ${B.green}33`,
            }}>
              <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.green, fontSize: "0.88rem" }}>
                🎉 장보기 완료! 이제 요리 시작!
              </Typography>
            </Box>
          )}
        </Box>

        {/* 레시피 단계 */}
        <Box sx={{
          bgcolor: "white", borderRadius: 3, p: 2,
          border: `1px solid ${B.pants}22`
        }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "0.92rem",
            color: B.dark, mb: 1.5
          }}>
            👨‍🍳 레시피 순서
          </Typography>
          <Stack spacing={1.2}>
            {menu.steps.map((step, i) => (
              <Stack key={i} direction="row" gap={1.5} alignItems="flex-start">
                <Box sx={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  bgcolor: B.orange, display: "flex", alignItems: "center",
                  justifyContent: "center", mt: "1px",
                }}>
                  <Typography sx={{
                    fontFamily: "'Jua',sans-serif", fontSize: "0.75rem",
                    color: "white", lineHeight: 1
                  }}>
                    {i + 1}
                  </Typography>
                </Box>
                <Typography sx={{
                  fontSize: "0.82rem", color: B.dark + "cc", lineHeight: 1.6,
                  fontFamily: "'Noto Sans KR',sans-serif", flex: 1
                }}>
                  {step}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

      </Box>
    );
  }

  return null;
};

export default TodayMenu;