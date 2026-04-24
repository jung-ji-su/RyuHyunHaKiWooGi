import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, IconButton, List, ListItem,
  TextField, FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Checkbox, Stack, Divider, Chip
} from "@mui/material";
import CloseIcon    from "@mui/icons-material/Close";
import DeleteIcon   from "@mui/icons-material/Delete";
import EditIcon     from "@mui/icons-material/Edit";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon    from "@mui/icons-material/Place";

const CATEGORY_COLORS = {
  기념일:   "#ffc628",
  데이트:   "#ff3434",
  개인일정: "#4079f3",
};

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

// ── 시간 포맷 헬퍼 (HH:MM → 오전/오후 H:MM) ───────────────────
const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour}:${String(m).padStart(2, "0")}`;
};

// ── 일정 카드 (리스트 아이템) ──────────────────────────────────
const ScheduleItem = ({ item, onStartEdit, onDelete, isEditing }) => {
  const catColor = CATEGORY_COLORS[item.category] || B.pants;
  const hasTime  = item.startTime || item.endTime;

  return (
    <ListItem
      disablePadding
      sx={{
        mb: 0.8,
        borderRadius: 2.5,
        overflow: "hidden",
        bgcolor: isEditing ? `${B.pants}11` : "white",
        border: isEditing ? `1.5px solid ${B.pants}55` : "1.5px solid transparent",
        transition: "all 0.2s",
      }}
    >
      {/* 카테고리 색 바 */}
      <Box sx={{ width: 4, minHeight: "100%", bgcolor: catColor, alignSelf: "stretch", flexShrink: 0 }} />

      {/* 본문 */}
      <Box sx={{ flex: 1, px: 1.2, py: 1, minWidth: 0 }}>
        {/* 제목 행 */}
        <Typography sx={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 700, fontSize: "0.82rem",
          color: B.dark, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.isImportant && "⭐ "}{item.title}
        </Typography>

        {/* 시간 & 장소 */}
        {(hasTime || item.location) && (
          <Stack direction="row" gap={1} sx={{ mt: 0.3, flexWrap: "wrap" }}>
            {hasTime && (
              <Stack direction="row" alignItems="center" gap={0.3}>
                <AccessTimeIcon sx={{ fontSize: "0.65rem", color: "#999" }} />
                <Typography sx={{ fontSize: "0.67rem", color: "#888", fontFamily: "'Noto Sans KR', sans-serif" }}>
                  {formatTime(item.startTime)}
                  {item.endTime && ` ~ ${formatTime(item.endTime)}`}
                </Typography>
              </Stack>
            )}
            {item.location && (
              <Stack direction="row" alignItems="center" gap={0.3}>
                <PlaceIcon sx={{ fontSize: "0.65rem", color: "#999" }} />
                <Typography sx={{
                  fontSize: "0.67rem", color: "#888",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100,
                }}>
                  {item.location}
                </Typography>
              </Stack>
            )}
          </Stack>
        )}

        {/* 참여자 뱃지 */}
        {item.participants && item.participants !== "둘다" && (
          <Box sx={{ mt: 0.4 }}>
            <Typography sx={{
              fontSize: "0.6rem", color: B.pants,
              fontFamily: "'Noto Sans KR', sans-serif",
              bgcolor: `${B.pants}15`, px: 0.8, py: 0.2,
              borderRadius: 1, display: "inline-block",
            }}>
              {PARTICIPANT_OPTIONS.find(p => p.value === item.participants)?.label || item.participants}
            </Typography>
          </Box>
        )}

        {/* 메모 미리보기 */}
        {item.memo && (
          <Typography sx={{
            fontSize: "0.67rem", color: "#aaa", mt: 0.4,
            fontFamily: "'Noto Sans KR', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            📝 {item.memo}
          </Typography>
        )}
      </Box>

      {/* 버튼들 */}
      <Stack direction="row" alignItems="center" sx={{ pr: 0.5 }}>
        <IconButton size="small" onClick={() => onStartEdit(item)}
          sx={{ color: B.pants, p: 0.8, "&:active": { transform: "scale(0.88)" } }}>
          <EditIcon sx={{ fontSize: "0.95rem" }} />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(item.id)}
          sx={{ color: "#ccc", p: 0.8, "&:active": { transform: "scale(0.88)" } }}>
          <DeleteIcon sx={{ fontSize: "0.95rem" }} />
        </IconButton>
      </Stack>
    </ListItem>
  );
};

// ── 메인 다이얼로그 ────────────────────────────────────────────
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

  // 시간 input 공통 스타일
  const timeInputSx = {
    "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.82rem" },
    "& input[type='time']::-webkit-calendar-picker-indicator": {
      opacity: 0.5, cursor: "pointer",
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: "20px 20px 16px 16px",
          m: 1.5,
          maxHeight: "92vh",
          bgcolor: B.cream,
        }
      }}
    >
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <DialogTitle sx={{
        p: "14px 16px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1.5px solid ${B.pants}18`,
      }}>
        <Box>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif", fontSize: "1rem",
            color: B.pants, lineHeight: 1.2,
          }}>
            💕 {date}
          </Typography>
          <Typography sx={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "0.68rem", color: "#aaa", mt: 0.2,
          }}>
            {isMultiMode ? "선택한 날짜 전체에 일괄 등록됩니다" : "날짜를 클릭해 일정을 관리하세요"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}
          sx={{ color: "#bbb", "&:active": { transform: "scale(0.88)" } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: "12px 14px", overflow: "auto" }}>
        <Stack spacing={1.8}>

          {/* ── 기존 일정 목록 ───────────────────────────────── */}
          {!isMultiMode && (
            <Box>
              {selectedSchedules.length === 0 ? (
                <Box sx={{
                  textAlign: "center", py: 2.5,
                  bgcolor: "white", borderRadius: 2.5,
                  border: "1.5px dashed #e0d6ec",
                }}>
                  <Typography sx={{ fontSize: "1.4rem", mb: 0.5 }}>📭</Typography>
                  <Typography sx={{
                    fontSize: "0.75rem", color: "#bbb",
                    fontFamily: "'Noto Sans KR', sans-serif",
                  }}>
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

          {/* ── 구분선 ───────────────────────────────────────── */}
          <Divider sx={{ borderStyle: "dashed", borderColor: `${B.pants}22` }} />

          {/* ── 폼 영역 ──────────────────────────────────────── */}
          <Box>
            {/* 섹션 타이틀 */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{
                fontFamily: "'Jua', sans-serif",
                fontSize: "0.85rem", color: B.pants,
              }}>
                {isEditMode ? "✏️ 일정 수정 중" : isMultiMode ? "✨ 기간 일정 추가" : "✨ 새 일정 추가"}
              </Typography>
              {isEditMode && (
                <Button size="small" onClick={onCancelEdit}
                  sx={{
                    fontSize: "0.68rem", color: "#bbb", py: 0.3, px: 1,
                    minWidth: 0, borderRadius: 2,
                    fontFamily: "'Noto Sans KR', sans-serif",
                    border: "1px solid #e0e0e0",
                  }}>
                  취소
                </Button>
              )}
            </Stack>

            <Stack spacing={1.4}>

              {/* 카테고리 + 중요 */}
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel sx={{ fontSize: "0.8rem" }}>카테고리</InputLabel>
                  <Select
                    value={category}
                    label="카테고리"
                    onChange={e => setCategory(e.target.value)}
                    sx={{ borderRadius: 2, fontSize: "0.82rem" }}
                  >
                    <MenuItem value="기념일">💖 기념일</MenuItem>
                    <MenuItem value="데이트">🍕 데이트</MenuItem>
                    <MenuItem value="개인일정">👤 개인일정</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isImportant}
                      onChange={e => setIsImportant(e.target.checked)}
                      size="small"
                      sx={{
                        color: "#ddd",
                        "&.Mui-checked": { color: "#f7b731" },
                        p: 0.5,
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: "0.78rem", fontFamily: "'Noto Sans KR', sans-serif", color: B.dark }}>
                      ⭐ 중요
                    </Typography>
                  }
                  sx={{ mr: 0, ml: 0.5 }}
                />
              </Stack>

              {/* 시간 (시작 ~ 종료) */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="time"
                  size="small"
                  label="시작"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true, sx: { fontSize: "0.78rem" } }}
                  sx={{ flex: 1, ...timeInputSx }}
                />
                <Typography sx={{ color: "#ccc", fontSize: "0.8rem", flexShrink: 0 }}>~</Typography>
                <TextField
                  type="time"
                  size="small"
                  label="종료"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true, sx: { fontSize: "0.78rem" } }}
                  sx={{ flex: 1, ...timeInputSx }}
                />
              </Stack>

              {/* 장소 */}
              <TextField
                size="small"
                placeholder="📍 장소를 입력해주세소"
                value={location}
                onChange={e => setLocation(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.82rem" } }}
              />

              {/* 제목 */}
              <TextField
                size="medium"
                placeholder={isMultiMode ? "기간 내 공통 일정 제목" : "일정 제목을 적어주세소 *"}
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    isEditMode ? onEdit() : onAdd();
                  }
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, fontSize: "0.9rem", fontWeight: 600 } }}
              />

              {/* 메모 */}
              <TextField
                size="small"
                multiline
                rows={2}
                placeholder="📝 상세내용이 있다면 적어주세소"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.8rem" },
                  "& textarea": { lineHeight: 1.6 },
                }}
              />

              {/* 참여자 */}
              <Box>
                <Typography sx={{
                  fontSize: "0.72rem", color: "#aaa",
                  fontFamily: "'Noto Sans KR', sans-serif", mb: 0.7,
                }}>
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
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "0.72rem",
                        height: 30,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        ...(participants === opt.value
                          ? {
                              bgcolor: B.pants, color: "white",
                              fontWeight: 700,
                              boxShadow: `0 2px 8px ${B.pants}44`,
                            }
                          : {
                              bgcolor: "white", color: "#888",
                              border: "1.5px solid #e0e0e0",
                              "&:hover": { bgcolor: B.lavender },
                            }
                        ),
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* 등록 / 수정 완료 버튼 */}
              <Button
                fullWidth
                variant="contained"
                disabled={!newPlan.trim()}
                onClick={isEditMode ? onEdit : onAdd}
                sx={{
                  py: 1.3,
                  borderRadius: 3,
                  fontFamily: "'Jua', sans-serif",
                  fontSize: "0.95rem",
                  letterSpacing: "0.02em",
                  bgcolor: isEditMode ? "#4caf50" : B.pants,
                  boxShadow: isEditMode
                    ? "0 4px 14px rgba(76,175,80,0.35)"
                    : `0 4px 14px ${B.pants}44`,
                  transition: "all 0.2s",
                  "&:hover": { bgcolor: isEditMode ? "#43a047" : "#6A3D96" },
                  "&:active": { transform: "scale(0.97)" },
                  "&.Mui-disabled": { bgcolor: "#e0e0e0", color: "#bbb", boxShadow: "none" },
                }}
              >
                {isEditMode
                  ? "✅ 수정 완료"
                  : isMultiMode
                    ? "📅 전체 기간 추가하기"
                    : "💕 일정 추가하기"
                }
              </Button>

            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      {/* 닫기 */}
      <DialogActions sx={{ p: "8px 14px 14px", pt: 0 }}>
        <Button
          onClick={onClose}
          fullWidth
          variant="text"
          sx={{
            color: "#bbb", py: 1, borderRadius: 2.5,
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "0.8rem",
            "&:hover": { bgcolor: "#f5f5f5" },
          }}
        >
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleDetailDialog;