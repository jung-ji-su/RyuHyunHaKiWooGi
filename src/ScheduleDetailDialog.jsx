import React from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, IconButton, List, ListItem,
    ListItemText, TextField, FormControl, InputLabel,
    Select, MenuItem, FormControlLabel, Checkbox, Stack, Divider
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import DeleteIconMui from "@mui/icons-material/Delete";

const CATEGORY_COLORS = {
    기념일: "#ff4081",
    데이트: "#ff9800",
    개인일정: "#2196f3"
};

const ScheduleDetailDialog = ({
    open, onClose, date, selectedSchedules,
    newPlan, setNewPlan, category, setCategory,
    isImportant, setIsImportant, onAdd, onDelete
}) => {

    // ⭐ 날짜 표시 로직: 문자열(범위)이면 그대로 쓰고, 객체면 변환
    const displayDate = typeof date === 'string'
        ? date
        : date instanceof Date
            ? date.toLocaleDateString()
            : "";

    // ⭐ 범위 선택 모드인지 확인 (문자열에 '~'가 포함되어 있는지로 판단)
    const isRangeMode = typeof date === 'string' && date.includes('~');

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{ sx: { borderRadius: 4, m: 2 } }}
        >
            <DialogTitle sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold', color: '#ff4081' }}>
                    💕 {
                        date instanceof Date ? date.toLocaleDateString() : date
                    } 일정
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ p: 2, pt: 0 }}>
                <Stack spacing={2.5}>
                    {/* 1. 리스트 영역 */}
                    <Box sx={{ bgcolor: '#f9f9f9', borderRadius: 3, p: 1 }}>
                        {isRangeMode ? (
                            // ⭐ 범위 선택 시 안내 문구
                            <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: '#666', fontWeight: '500' }}>
                                🗓️ 선택하신 기간 전체에<br />새 일정이 일괄 등록됩니다.
                            </Typography>
                        ) : selectedSchedules.length === 0 ? (
                            <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: '#aaa' }}>일정이 없습니다.</Typography>
                        ) : (
                            <List disablePadding>
                                {selectedSchedules.map((item) => (
                                    <ListItem
                                        key={item.id}
                                        secondaryAction={
                                            <IconButton edge="end" onClick={() => onDelete(item.id)} size="small">
                                                <DeleteIconMui fontSize="small" />
                                            </IconButton>
                                        }
                                        sx={{ py: 1 }}
                                    >
                                        <Box sx={{ width: 4, height: 20, bgcolor: CATEGORY_COLORS[item.category], mr: 1.5, borderRadius: 1 }} />
                                        <ListItemText
                                            primary={item.isImportant ? `⭐ ${item.title}` : item.title}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: '600' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* 2. 입력 영역 */}
                    <Box component="section">
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: '#ff4081' }}>
                            {isRangeMode ? "✨ 기간 일정 일괄 추가" : "✨ 새 일정 추가"}
                        </Typography>

                        <Stack spacing={2}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <FormControl fullWidth size="small">
                                    <InputLabel>카테고리</InputLabel>
                                    <Select
                                        value={category}
                                        label="카테고리"
                                        onChange={(e) => setCategory(e.target.value)}
                                        sx={{ borderRadius: 2 }}
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
                                            onChange={(e) => setIsImportant(e.target.checked)}
                                            color="error"
                                            size="small"
                                        />
                                    }
                                    label="중요"
                                    sx={{ minWidth: '80px', mr: 0 }}
                                />
                            </Stack>

                            <TextField
                                fullWidth
                                size="medium"
                                placeholder={isRangeMode ? "기간 내 공통 할 일 입력" : "할 일을 적어주세요"}
                                value={newPlan}
                                onChange={(e) => setNewPlan(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={onAdd} // ⭐ add 후 close는 부모의 handleAddSchedule에서 처리하도록 위임하거나 그대로 유지
                                sx={{
                                    bgcolor: '#ff4081',
                                    borderRadius: 2.5,
                                    py: 1.2,
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 12px rgba(255, 64, 129, 0.3)',
                                    '&:hover': { bgcolor: '#f50057' }
                                }}
                            >
                                {isRangeMode ? "전체 기간 추가하기" : "일정 추가하기"}
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} fullWidth variant="text" sx={{ color: '#999', py: 1 }}>
                    닫기
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ScheduleDetailDialog;