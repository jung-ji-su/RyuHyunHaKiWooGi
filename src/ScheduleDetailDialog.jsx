import {
  Drawer, Typography, Box, IconButton, Stack, TextField, Button,
} from "@mui/material";
import CloseIcon  from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon   from "@mui/icons-material/Edit";
import PlaceIcon  from "@mui/icons-material/Place";

const CATEGORY_COLORS = {
  기념일:   "#ffc628",
  데이트:   "#ff3434",
  개인일정: "#4079f3",
};

const CATEGORIES = [
  { value: "기념일",   emoji: "💖", color: "#ffc628" },
  { value: "데이트",   emoji: "🍕", color: "#ff3434" },
  { value: "개인일정", emoji: "👤", color: "#4079f3" },
];

const PARTICIPANT_OPTIONS = [
  { value: "둘다",    label: "👫 둘다"    },
  { value: "나만",    label: "🙋 나만"    },
  { value: "상대방만", label: "💌 상대방만" },
];

const B = {
  pants: "#7B4FA6", lavender: "#EDE0F5",
  cream: "#FFF8F2", dark: "#3D1F00", skin: "#F5B8A0",
};

const GLASS_INPUT = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease",
    "& fieldset": { borderColor: "rgba(123,79,166,0.14)" },
    "&:hover fieldset": { borderColor: `${B.pants}44` },
    "&.Mui-focused": {
      background: "rgba(255,255,255,0.96)",
      boxShadow: `0 0 0 3px ${B.pants}14`,
    },
    "&.Mui-focused fieldset": { borderColor: B.pants },
  },
};

// ── 기존 일정 카드 ────────────────────────────────────────────────
function ScheduleItem({ item, onStartEdit, onDelete, isEditing }) {
  const catColor = CATEGORY_COLORS[item.category] || B.pants;
  const cat = CATEGORIES.find(c => c.value === item.category);

  return (
    <Box sx={{
      mb: 0.9,
      display: "flex", alignItems: "stretch",
      borderRadius: "14px", overflow: "hidden",
      background: isEditing
        ? `linear-gradient(135deg, ${catColor}12, ${catColor}06)`
        : "rgba(255,255,255,0.82)",
      border: isEditing ? `1.5px solid ${catColor}55` : "1px solid rgba(255,255,255,0.9)",
      boxShadow: isEditing ? `0 4px 18px ${catColor}22` : "0 2px 10px rgba(123,79,166,0.07)",
      backdropFilter: "blur(8px)",
      transition: "all 0.22s ease",
    }}>
      <Box sx={{ width: 4, background: `linear-gradient(to bottom, ${catColor}, ${catColor}66)`, flexShrink: 0 }} />
      <Box sx={{ flex: 1, px: 1.4, py: 1.1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          {cat && <Typography sx={{ fontSize: "0.8rem", lineHeight: 1 }}>{cat.emoji}</Typography>}
          <Typography sx={{
            fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
            fontSize: "0.85rem", color: B.dark, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {item.isImportant && "⭐ "}{item.title}
          </Typography>
        </Stack>
        {item.location && (
          <Stack direction="row" alignItems="center" gap={0.3} sx={{ mt: 0.4 }}>
            <PlaceIcon sx={{ fontSize: "0.6rem", color: "#ccc" }} />
            <Typography sx={{
              fontSize: "0.63rem", color: "#aaa", fontFamily: "'Noto Sans KR',sans-serif",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130,
            }}>
              {item.location}
            </Typography>
          </Stack>
        )}
        {item.memo && (
          <Typography sx={{
            fontSize: "0.62rem", color: "#bbb", mt: 0.35,
            fontFamily: "'Noto Sans KR',sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            📝 {item.memo}
          </Typography>
        )}
      </Box>
      <Stack direction="row" alignItems="center" sx={{ pr: 0.5, flexShrink: 0 }}>
        <IconButton size="small" onClick={() => onStartEdit(item)}
          sx={{ color: B.pants, p: 0.7, "&:active": { transform: "scale(0.85)" } }}>
          <EditIcon sx={{ fontSize: "0.9rem" }} />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(item.id)}
          sx={{ color: "#e0d0d0", p: 0.7, "&:active": { transform: "scale(0.85)" }, "&:hover": { color: "#ff5555" }, transition: "color 0.15s" }}>
          <DeleteIcon sx={{ fontSize: "0.9rem" }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

// ── 메인 Drawer ───────────────────────────────────────────────────
export default function ScheduleDetailDialog({
  open, onClose, date, selectedSchedules,
  newPlan, setNewPlan, category, setCategory,
  isImportant, setIsImportant,
  startTime, setStartTime, endTime, setEndTime,
  memo, setMemo, location, setLocation,
  participants, setParticipants,
  editTarget, onAdd, onEdit, onStartEdit, onCancelEdit, onDelete,
}) {
  const isMultiMode = typeof date === "string" && date.includes("일");
  const isEditMode  = !!editTarget;
  const canSubmit   = !!newPlan.trim();

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "24px 24px 0 0",
          maxHeight: "92vh",
          background: "linear-gradient(160deg, #FAF5FF 0%, #FFF8F2 55%, #F5F0FF 100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 40px rgba(123,79,166,0.18)",
        },
      }}
    >
      {/* 드래그 핸들 */}
      <Box sx={{ display: "flex", justifyContent: "center", pt: 1.4, pb: 0.3, flexShrink: 0 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, background: `linear-gradient(to right, ${B.pants}44, ${B.pants}22)` }} />
      </Box>

      {/* 헤더 */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 2.5, pt: 0.6, pb: 1.2, flexShrink: 0,
      }}>
        <Box>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "1.1rem", lineHeight: 1.2,
            background: `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            💕 {date}
          </Typography>
          <Typography sx={{ fontSize: "0.63rem", color: B.pants + "66", mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
            {isMultiMode ? "선택한 날짜 전체에 일괄 등록됩니다" : "일정을 추가하거나 수정하세요"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}
          sx={{
            color: B.pants + "55",
            bgcolor: "rgba(255,255,255,0.82)",
            border: `1px solid ${B.pants}18`,
            backdropFilter: "blur(8px)",
            "&:active": { transform: "scale(0.85)" },
          }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 스크롤 콘텐츠 */}
      <Box sx={{ overflowY: "auto", flex: 1, px: 2.2, pb: 1 }}>

        {/* 기존 일정 목록 */}
        {!isMultiMode && (
          <Box sx={{ mb: 2.2 }}>
            {selectedSchedules.length === 0 ? (
              <Box sx={{
                textAlign: "center", py: 3.5,
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(12px)",
                borderRadius: "18px",
                border: "1px solid rgba(255,255,255,0.88)",
                boxShadow: "0 4px 20px rgba(123,79,166,0.07)",
              }}>
                <Typography sx={{ fontSize: "2.2rem", mb: 0.8, lineHeight: 1 }}>🗓️</Typography>
                <Typography sx={{
                  fontSize: "0.82rem", fontWeight: 700,
                  color: B.pants + "66",
                  fontFamily: "'Noto Sans KR',sans-serif", mb: 0.4,
                }}>
                  아직 등록된 일정이 없어요
                </Typography>
                <Typography sx={{ fontSize: "0.64rem", color: "#ccc", fontFamily: "'Noto Sans KR',sans-serif" }}>
                  아래에서 새 일정을 추가해보세요 ✨
                </Typography>
              </Box>
            ) : (
              <Box>
                {selectedSchedules.map(item => (
                  <ScheduleItem
                    key={item.id} item={item}
                    onStartEdit={onStartEdit} onDelete={onDelete}
                    isEditing={editTarget === item.id}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* 구분선 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.2 }}>
          <Box sx={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${B.pants}20)` }} />
          <Typography sx={{ fontSize: "0.62rem", color: B.pants + "88", fontFamily: "'Jua',sans-serif", flexShrink: 0 }}>
            {isEditMode ? "✏️ 수정 중" : isMultiMode ? "✨ 기간 일정 추가" : "✨ 새 일정"}
          </Typography>
          {isEditMode && (
            <Button size="small" onClick={onCancelEdit} sx={{
              fontSize: "0.6rem", color: "#bbb", py: 0.2, px: 0.9, minWidth: 0,
              borderRadius: 2, border: "1px solid #e8e8e8",
              fontFamily: "'Noto Sans KR',sans-serif", flexShrink: 0,
            }}>
              취소
            </Button>
          )}
          <Box sx={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${B.pants}20)` }} />
        </Box>

        <Stack spacing={2.2}>

          {/* 카테고리 */}
          <Box>
            <Typography sx={{
              fontSize: "0.62rem", color: B.pants + "88",
              fontFamily: "'Noto Sans KR',sans-serif", mb: 1,
              fontWeight: 700, letterSpacing: "0.08em",
            }}>
              CATEGORY
            </Typography>
            <Stack direction="row" spacing={0.9}>
              {CATEGORIES.map(cat => {
                const active = category === cat.value;
                return (
                  <Box
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    sx={{
                      flex: 1, py: 1.2, borderRadius: "14px", textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                      background: active
                        ? `linear-gradient(135deg, ${cat.color}20, ${cat.color}0d)`
                        : "rgba(255,255,255,0.7)",
                      border: active ? `1.5px solid ${cat.color}66` : "1.5px solid rgba(255,255,255,0.8)",
                      boxShadow: active
                        ? `0 4px 18px ${cat.color}30, 0 0 0 3px ${cat.color}14`
                        : "0 2px 8px rgba(123,79,166,0.06)",
                      transform: active ? "scale(1.05)" : "scale(1)",
                      backdropFilter: "blur(8px)",
                      WebkitTapHighlightColor: "transparent",
                      "&:active": { transform: "scale(0.95)" },
                    }}
                  >
                    <Typography sx={{ fontSize: "1.4rem", lineHeight: 1, mb: 0.4 }}>{cat.emoji}</Typography>
                    <Typography sx={{
                      fontSize: "0.64rem", fontFamily: "'Noto Sans KR',sans-serif",
                      fontWeight: active ? 700 : 400,
                      color: active ? cat.color : "#bbb", lineHeight: 1,
                    }}>
                      {cat.value}
                    </Typography>
                  </Box>
                );
              })}
              {/* 중요 토글 */}
              <Box
                onClick={() => setIsImportant(v => !v)}
                sx={{
                  width: 60, flexShrink: 0, py: 1.2, borderRadius: "14px", textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                  background: isImportant ? "linear-gradient(135deg, #ffd70022, #ffbb0010)" : "rgba(255,255,255,0.7)",
                  border: isImportant ? "1.5px solid #ffd70066" : "1.5px solid rgba(255,255,255,0.8)",
                  boxShadow: isImportant ? "0 4px 18px #ffd70030, 0 0 0 3px #ffd70014" : "0 2px 8px rgba(123,79,166,0.06)",
                  transform: isImportant ? "scale(1.05)" : "scale(1)",
                  backdropFilter: "blur(8px)",
                  WebkitTapHighlightColor: "transparent",
                  "&:active": { transform: "scale(0.95)" },
                }}
              >
                <Typography sx={{ fontSize: "1.4rem", lineHeight: 1, mb: 0.4 }}>⭐</Typography>
                <Typography sx={{
                  fontSize: "0.6rem", fontFamily: "'Noto Sans KR',sans-serif",
                  color: isImportant ? "#cc8800" : "#bbb", fontWeight: isImportant ? 700 : 400, lineHeight: 1,
                }}>
                  중요
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* 일정 제목 */}
          <TextField
            placeholder={isMultiMode ? "기간 내 공통 일정 제목" : "일정 제목을 입력하세요 ✦"}
            value={newPlan}
            onChange={e => setNewPlan(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSubmit) isEditMode ? onEdit() : onAdd();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px", fontSize: "0.96rem", fontWeight: 600,
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(8px)",
                transition: "all 0.2s ease",
                "& fieldset": { borderColor: "rgba(123,79,166,0.16)" },
                "&:hover fieldset": { borderColor: `${B.pants}44` },
                "&.Mui-focused": {
                  background: "rgba(255,255,255,0.97)",
                  boxShadow: `0 0 0 3px ${B.pants}14`,
                },
                "&.Mui-focused fieldset": { borderColor: B.pants },
              },
            }}
          />

          {/* 장소 */}
          <TextField
            size="small" placeholder="📍 장소 (선택)"
            value={location} onChange={e => setLocation(e.target.value)}
            sx={GLASS_INPUT}
          />

          {/* 메모 */}
          <TextField
            size="small" multiline rows={2}
            placeholder="📝 메모 (선택)"
            value={memo} onChange={e => setMemo(e.target.value)}
            sx={{ ...GLASS_INPUT, "& textarea": { lineHeight: 1.6 } }}
          />

          {/* 참여자 */}
          <Box>
            <Typography sx={{
              fontSize: "0.62rem", color: B.pants + "88",
              fontFamily: "'Noto Sans KR',sans-serif", mb: 1,
              fontWeight: 700, letterSpacing: "0.08em",
            }}>
              PARTICIPANTS
            </Typography>
            <Stack direction="row" spacing={0.8}>
              {PARTICIPANT_OPTIONS.map(opt => {
                const active = participants === opt.value;
                return (
                  <Box
                    key={opt.value}
                    onClick={() => setParticipants(opt.value)}
                    sx={{
                      flex: 1, py: 1, borderRadius: "12px", textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                      background: active
                        ? `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`
                        : "rgba(255,255,255,0.72)",
                      border: active ? "none" : "1px solid rgba(123,79,166,0.12)",
                      boxShadow: active ? `0 4px 16px ${B.pants}44` : "0 1px 6px rgba(123,79,166,0.07)",
                      transform: active ? "scale(1.03)" : "scale(1)",
                      backdropFilter: "blur(8px)",
                      WebkitTapHighlightColor: "transparent",
                      "&:active": { transform: "scale(0.96)" },
                    }}
                  >
                    <Typography sx={{
                      fontSize: "0.76rem", fontFamily: "'Noto Sans KR',sans-serif",
                      fontWeight: active ? 700 : 400,
                      color: active ? "white" : "#999",
                    }}>
                      {opt.label}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ height: 16 }} />
      </Box>

      {/* 하단 버튼 */}
      <Box sx={{ px: 2.2, pt: 0.8, pb: 3, flexShrink: 0 }}>
        <Box
          onClick={canSubmit ? (isEditMode ? onEdit : onAdd) : undefined}
          sx={{
            py: 1.6, borderRadius: "16px", textAlign: "center",
            cursor: canSubmit ? "pointer" : "default",
            background: canSubmit
              ? (isEditMode
                  ? "linear-gradient(135deg, #43a047 0%, #66bb6a 100%)"
                  : `linear-gradient(135deg, ${B.pants} 0%, #A855F7 100%)`)
              : "rgba(200,200,200,0.35)",
            boxShadow: canSubmit
              ? (isEditMode ? "0 6px 22px rgba(76,175,80,0.40)" : `0 6px 22px ${B.pants}44`)
              : "none",
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
            "&:active": canSubmit ? { transform: "scale(0.97)", opacity: 0.88 } : {},
          }}
        >
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: "1.02rem",
            color: canSubmit ? "white" : "#bbb",
            letterSpacing: "0.02em",
          }}>
            {isEditMode ? "✅ 수정 완료" : isMultiMode ? "📅 전체 기간 추가" : "💕 일정 추가하기"}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
