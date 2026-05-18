import React from "react";
import {
  Drawer, Button, Typography, Box, IconButton, List, ListItem,
  TextField, FormControlLabel, Checkbox, Stack, Chip,
} from "@mui/material";
import CloseIcon      from "@mui/icons-material/Close";
import DeleteIcon      from "@mui/icons-material/Delete";
import EditIcon        from "@mui/icons-material/Edit";
import AccessTimeIcon  from "@mui/icons-material/AccessTime";
import PlaceIcon       from "@mui/icons-material/Place";

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
  { value: "둘다",    label: "👫 둘 다"   },
  { value: "나만",    label: "🙋 나만"    },
  { value: "상대방만", label: "💌 상대방만" },
];

const B = {
  pants:    "#7B4FA6",
  lavender: "#EDE0F5",
  cream:    "#FFF8F2",
  dark:     "#3D1F00",
  skin:     "#F5B8A0",
};

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour}:${String(m).padStart(2, "0")}`;
};

// ── 기존 일정 카드 ─────────────────────────────────────────────
const ScheduleItem = ({ item, onStartEdit, onDelete, isEditing }) => {
  const catColor = CATEGORY_COLORS[item.category] || B.pants;
  return (
    <ListItem disablePadding sx={{
      mb: 0.7, borderRadius: 2.5, overflow: "hidden",
      bgcolor: isEditing ? `${B.pants}0e` : "white",
      border: isEditing ? `1.5px solid ${B.pants}55` : "1.5px solid transparent",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      transition: "all 0.2s",
    }}>
      <Box sx={{ width: 4, bgcolor: catColor, alignSelf: "stretch", flexShrink: 0 }} />
      <Box sx={{ flex: 1, px: 1.2, py: 0.9, minWidth: 0 }}>
        <Typography sx={{
          fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
          fontSize: "0.82rem", color: B.dark, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.isImportant && "⭐ "}{item.title}
        </Typography>
        {(item.startTime || item.location) && (
          <Stack direction="row" gap={1} sx={{ mt: 0.3, flexWrap: "wrap" }}>
            {item.startTime && (
              <Stack direction="row" alignItems="center" gap={0.3}>
                <AccessTimeIcon sx={{ fontSize: "0.62rem", color: "#bbb" }} />
                <Typography sx={{ fontSize: "0.65rem", color: "#999", fontFamily: "'Noto Sans KR',sans-serif" }}>
                  {formatTime(item.startTime)}{item.endTime && ` ~ ${formatTime(item.endTime)}`}
                </Typography>
              </Stack>
            )}
            {item.location && (
              <Stack direction="row" alignItems="center" gap={0.3}>
                <PlaceIcon sx={{ fontSize: "0.62rem", color: "#bbb" }} />
                <Typography sx={{
                  fontSize: "0.65rem", color: "#999", fontFamily: "'Noto Sans KR',sans-serif",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90,
                }}>
                  {item.location}
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
        {item.participants && item.participants !== "둘다" && (
          <Box sx={{ mt: 0.4 }}>
            <Typography sx={{
              fontSize: "0.58rem", color: B.pants,
              fontFamily: "'Noto Sans KR',sans-serif",
              bgcolor: `${B.pants}14`, px: 0.8, py: 0.2, borderRadius: 1, display: "inline-block",
            }}>
              {PARTICIPANT_OPTIONS.find(p => p.value === item.participants)?.label || item.participants}
            </Typography>
          </Box>
        )}
        {item.memo && (
          <Typography sx={{
            fontSize: "0.63rem", color: "#bbb", mt: 0.3,
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
          sx={{ color: "#ddd", p: 0.7, "&:active": { transform: "scale(0.85)" } }}>
          <DeleteIcon sx={{ fontSize: "0.9rem" }} />
        </IconButton>
      </Stack>
    </ListItem>
  );
};

// ── 메인 Bottom Sheet ──────────────────────────────────────────
const ScheduleDetailDialog = ({
  open, onClose, date, selectedSchedules,
  newPlan, setNewPlan, category, setCategory,
  isImportant, setIsImportant,
  startTime, setStartTime, endTime, setEndTime,
  memo, setMemo, location, setLocation,
  participants, setParticipants,
  editTarget, onAdd, onEdit, onStartEdit, onCancelEdit, onDelete,
}) => {
  const isMultiMode = typeof date === "string" && date.includes("일");
  const isEditMode  = !!editTarget;
  const canSubmit   = !!newPlan.trim();

  const timeInputSx = {
    "& .MuiOutlinedInput-root": { borderRadius: 2.5, fontSize: "0.82rem", bgcolor: "white" },
    "& input[type='time']::-webkit-calendar-picker-indicator": { opacity: 0.4, cursor: "pointer" },
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "22px 22px 0 0",
          maxHeight: "90vh",
          bgcolor: B.cream,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* 드래그 핸들 */}
      <Box sx={{ display: "flex", justifyContent: "center", pt: 1.4, pb: 0.5, flexShrink: 0 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: B.pants + "33" }} />
      </Box>

      {/* 헤더 */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 2.5, pt: 0.5, pb: 1.4, flexShrink: 0,
        borderBottom: `1px solid ${B.pants}14`,
      }}>
        <Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1rem", color: B.pants, lineHeight: 1.2 }}>
            💕 {date}
          </Typography>
          <Typography sx={{ fontSize: "0.66rem", color: "#bbb", mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
            {isMultiMode ? "선택한 날짜 전체에 일괄 등록됩니다" : "일정을 추가하거나 수정하세요"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}
          sx={{ color: "#ccc", "&:active": { transform: "scale(0.85)" } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 스크롤 콘텐츠 */}
      <Box sx={{ overflowY: "auto", flex: 1, px: 2.5, py: 1.8 }}>

        {/* 기존 일정 목록 */}
        {!isMultiMode && (
          <Box sx={{ mb: 2 }}>
            {selectedSchedules.length === 0 ? (
              <Box sx={{
                textAlign: "center", py: 2.5, bgcolor: "white",
                borderRadius: 3, border: "1.5px dashed #e0d6ec",
              }}>
                <Typography sx={{ fontSize: "1.3rem", mb: 0.4 }}>📭</Typography>
                <Typography sx={{ fontSize: "0.73rem", color: "#ccc", fontFamily: "'Noto Sans KR',sans-serif" }}>
                  이 날은 아직 일정이 없어요
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {selectedSchedules.map(item => (
                  <ScheduleItem
                    key={item.id}
                    item={item}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    isEditing={editTarget === item.id}
                  />
                ))}
              </List>
            )}
          </Box>
        )}

        {/* 구분선 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Box sx={{ flex: 1, height: 1, bgcolor: `${B.pants}14` }} />
          <Typography sx={{ fontSize: "0.65rem", color: B.pants + "88", fontFamily: "'Jua',sans-serif", flexShrink: 0 }}>
            {isEditMode ? "✏️ 수정 중" : isMultiMode ? "✨ 기간 일정 추가" : "✨ 새 일정"}
          </Typography>
          {isEditMode && (
            <Button size="small" onClick={onCancelEdit} sx={{
              fontSize: "0.62rem", color: "#bbb", py: 0.2, px: 0.9, minWidth: 0,
              borderRadius: 2, border: "1px solid #e0e0e0",
              fontFamily: "'Noto Sans KR',sans-serif", flexShrink: 0,
            }}>
              취소
            </Button>
          )}
          <Box sx={{ flex: 1, height: 1, bgcolor: `${B.pants}14` }} />
        </Box>

        <Stack spacing={1.6}>

          {/* 카테고리 칩 선택 */}
          <Box>
            <Typography sx={{ fontSize: "0.68rem", color: "#aaa", fontFamily: "'Noto Sans KR',sans-serif", mb: 0.8 }}>
              카테고리
            </Typography>
            <Stack direction="row" spacing={0.8}>
              {CATEGORIES.map(cat => (
                <Box
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  sx={{
                    flex: 1, py: 0.9, borderRadius: 2.5, textAlign: "center",
                    cursor: "pointer", transition: "all 0.15s",
                    border: `1.5px solid ${category === cat.value ? cat.color : "#e8e8e8"}`,
                    bgcolor: category === cat.value ? cat.color + "18" : "white",
                    "&:active": { transform: "scale(0.94)" },
                  }}
                >
                  <Typography sx={{ fontSize: "1rem", lineHeight: 1, mb: 0.2 }}>{cat.emoji}</Typography>
                  <Typography sx={{
                    fontSize: "0.64rem", fontFamily: "'Noto Sans KR',sans-serif",
                    fontWeight: category === cat.value ? 700 : 400,
                    color: category === cat.value ? cat.color : "#bbb",
                    lineHeight: 1,
                  }}>
                    {cat.value}
                  </Typography>
                </Box>
              ))}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isImportant}
                    onChange={e => setIsImportant(e.target.checked)}
                    size="small"
                    sx={{ color: "#ddd", "&.Mui-checked": { color: "#f7b731" }, p: 0.5 }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: "0.72rem", fontFamily: "'Noto Sans KR',sans-serif", color: B.dark }}>
                    ⭐
                  </Typography>
                }
                sx={{ mr: 0, ml: 0.3, alignSelf: "center" }}
              />
            </Stack>
          </Box>

          {/* 일정 제목 */}
          <TextField
            placeholder={isMultiMode ? "기간 내 공통 일정 제목" : "일정 제목을 적어주세소 ✦"}
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
                borderRadius: 3, fontSize: "0.92rem", fontWeight: 600, bgcolor: "white",
                "& fieldset": { borderColor: `${B.pants}28` },
                "&:hover fieldset": { borderColor: `${B.pants}66` },
                "&.Mui-focused fieldset": { borderColor: B.pants },
              },
            }}
          />

          {/* 시간 */}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="time" size="small" label="시작"
              value={startTime} onChange={e => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true, sx: { fontSize: "0.75rem" } }}
              sx={{ flex: 1, ...timeInputSx }}
            />
            <Typography sx={{ color: "#ccc", fontSize: "0.9rem", flexShrink: 0 }}>→</Typography>
            <TextField
              type="time" size="small" label="종료"
              value={endTime} onChange={e => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true, sx: { fontSize: "0.75rem" } }}
              sx={{ flex: 1, ...timeInputSx }}
            />
          </Stack>

          {/* 장소 */}
          <TextField
            size="small" placeholder="📍 장소"
            value={location} onChange={e => setLocation(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, fontSize: "0.82rem", bgcolor: "white" } }}
          />

          {/* 메모 */}
          <TextField
            size="small" multiline rows={2}
            placeholder="📝 메모 (선택)"
            value={memo} onChange={e => setMemo(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: 2.5, fontSize: "0.8rem", bgcolor: "white" },
              "& textarea": { lineHeight: 1.6 },
            }}
          />

          {/* 참여자 */}
          <Box>
            <Typography sx={{ fontSize: "0.68rem", color: "#aaa", fontFamily: "'Noto Sans KR',sans-serif", mb: 0.7 }}>
              참여자
            </Typography>
            <Stack direction="row" spacing={0.8}>
              {PARTICIPANT_OPTIONS.map(opt => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  size="small"
                  onClick={() => setParticipants(opt.value)}
                  sx={{
                    fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.7rem",
                    height: 30, cursor: "pointer", transition: "all 0.15s",
                    ...(participants === opt.value
                      ? { bgcolor: B.pants, color: "white", fontWeight: 700, boxShadow: `0 2px 8px ${B.pants}44` }
                      : { bgcolor: "white", color: "#999", border: "1.5px solid #e8e8e8", "&:hover": { bgcolor: B.lavender } }
                    ),
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ height: 16 }} />
      </Box>

      {/* 고정 하단 버튼 */}
      <Box sx={{
        px: 2.5, pt: 1.2, pb: 2.5, flexShrink: 0,
        borderTop: `1px solid ${B.pants}0e`,
        bgcolor: B.cream,
      }}>
        <Button
          fullWidth variant="contained"
          disabled={!canSubmit}
          onClick={isEditMode ? onEdit : onAdd}
          sx={{
            py: 1.4, borderRadius: 3,
            fontFamily: "'Jua',sans-serif", fontSize: "1rem", letterSpacing: "0.02em",
            bgcolor: isEditMode ? "#4caf50" : B.pants,
            boxShadow: isEditMode ? "0 4px 16px rgba(76,175,80,0.35)" : `0 4px 16px ${B.pants}44`,
            transition: "all 0.18s",
            "&:hover": { bgcolor: isEditMode ? "#43a047" : "#6A3D96" },
            "&:active": { transform: "scale(0.97)" },
            "&.Mui-disabled": { bgcolor: "#e8e8e8", color: "#bbb", boxShadow: "none" },
          }}
        >
          {isEditMode ? "✅ 수정 완료" : isMultiMode ? "📅 전체 기간 추가" : "💕 일정 추가하기"}
        </Button>
      </Box>
    </Drawer>
  );
};

export default ScheduleDetailDialog;
