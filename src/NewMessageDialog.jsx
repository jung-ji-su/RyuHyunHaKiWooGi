import React, { useState, useEffect } from "react";
import { Dialog, Box, Typography, IconButton, Paper, Zoom } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email"; 
import DraftsIcon from "@mui/icons-material/Drafts";

const NewMessageDialog = ({ open, onClose, messages }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // 열릴 때마다 첫 번째 편지부터 시작
    useEffect(() => {
        if (open) setCurrentIndex(0);
    }, [open]);

    if (!messages || messages.length === 0) return null;

    const currentMsg = messages[currentIndex];
    const isLast = currentIndex === messages.length - 1;

    const handleNext = () => {
        if (isLast) {
            onClose();
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            TransitionComponent={Zoom}
            PaperProps={{
                sx: {
                    borderRadius: 6,
                    overflow: "visible",
                    bgcolor: "#fff9fb",
                    border: "3px solid #ff4081",
                    width: "320px",
                    textAlign: "center",
                    p: 3,
                    boxShadow: '0 10px 30px rgba(255, 64, 129, 0.3)'
                }
            }}
        >
            <IconButton 
                onClick={onClose} 
                sx={{ position: "absolute", top: -10, right: -10, bgcolor: "#ff4081", color: "white", "&:hover": { bgcolor: "#f50057" } }}
                size="small"
            >
                <CloseIcon fontSize="small" />
            </IconButton>

            <Box onClick={handleNext} sx={{ cursor: "pointer" }}>
                <Box sx={{ mb: 1 }}>
                    {isLast ? <DraftsIcon sx={{ fontSize: 70, color: "#ff9800" }} /> : <EmailIcon sx={{ fontSize: 70, color: "#ff4081" }} />}
                </Box>

                <Typography variant="body2" sx={{ color: "#ff4081", fontWeight: 'bold', mb: 1 }}>
                    일정 배달 [{currentIndex + 1} / {messages.length}]
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333", mb: 2 }}>
                    {currentMsg.writer}님의 소식!
                </Typography>

                <Paper elevation={0} sx={{ bgcolor: "#fff0f3", p: 2, borderRadius: 3, mb: 2, border: '1px dashed #ff4081' }}>
                    <Typography variant="body1" sx={{ color: "#333", fontWeight: "500" }}>
                        "{currentMsg.title}"
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#888", display: 'block', mt: 1 }}>
                        날짜: {currentMsg.date}
                    </Typography>
                </Paper>

                <Typography variant="caption" sx={{ color: "#aaa" }}>
                    {isLast ? "클릭하면 창이 닫힙니다" : "클릭해서 다음 소식 보기"}
                </Typography>
            </Box>
        </Dialog>
    );
};

export default NewMessageDialog;