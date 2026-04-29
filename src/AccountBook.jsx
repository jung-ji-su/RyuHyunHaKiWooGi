import React, { useState, useEffect } from "react";
import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, 
  updateDoc, serverTimestamp, setDoc, getDoc
} from "firebase/firestore";
import {
  Box, Typography, Button, Paper, Stack, IconButton, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  ToggleButtonGroup, ToggleButton, Select, MenuItem, Switch,
  FormControlLabel, Card, CardContent, Fab, Divider
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SettingsIcon from "@mui/icons-material/Settings";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

import buri1 from "./assets/494ea37cf81a6a1efb5dfab1783ab487f604e7b0e6900f9ac53a43965300eb9a.png"; //기본
import buri5 from "./assets/cc187d26dc66195eaea58cecb8a4acde7154249a3890514a43687a85e6b6cc82.png"; //웃음
import buri9 from "./assets/KakaoTalk_20260316_132934584.png"; // 승리

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A", dark: "#3D1F00",
};

// ────────────────────────────────────────────────────────────
// 카테고리 설정
// ────────────────────────────────────────────────────────────
const CATEGORIES = {
  expense: [
    { name: "식비", icon: "🍽️", color: "#FF6B6B" },
    { name: "교통", icon: "🚗", color: "#4ECDC4" },
    { name: "쇼핑", icon: "🛍️", color: "#FFD93D" },
    { name: "문화생활", icon: "🎬", color: "#95E1D3" },
    { name: "고정비", icon: "🏠", color: "#A8E6CF" },
    { name: "의료", icon: "💊", color: "#FFB6C1" },
    { name: "기타", icon: "📦", color: "#C7CEEA" },
  ],
  income: [
    { name: "급여", icon: "💰", color: "#6BCF7F" },
    { name: "용돈", icon: "💵", color: "#95E1D3" },
    { name: "부수입", icon: "💸", color: "#A8E6CF" },
    { name: "기타", icon: "🎁", color: "#C7CEEA" },
  ],
};

// ────────────────────────────────────────────────────────────
// 가계부 메인 컴포넌트
// ────────────────────────────────────────────────────────────
const AccountBook = ({ currentUser, opponentUser }) => {
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // 거래 입력
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState("expense"); // income or expense
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  // 접근 권한 설정
  const [isPrivate, setIsPrivate] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // 추가 기능
  const [budget, setBudget] = useState(0);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, income, expense
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeTab, setActiveTab] = useState(0); // 0: 거래내역, 1: 통계

  // ── 초기 로딩: 접근 권한 확인 ──────────────────────
  useEffect(() => {
    checkAccess();
    loadBudget();
  }, [currentUser]);

  const checkAccess = async () => {
    try {
      // 설정 문서 확인
      const settingsRef = doc(db, "accountBookSettings", "settings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        // 최초 설정 생성 (지수 전용)
        await setDoc(settingsRef, {
          owner: "지수",
          isPrivate: true,
          allowedUsers: ["지수"],
          createdAt: serverTimestamp(),
        });
        
        setIsOwner(currentUser === "지수");
        setHasAccess(currentUser === "지수");
        setIsPrivate(true);
      } else {
        const settings = settingsSnap.data();
        const owner = settings.owner;
        const allowed = settings.allowedUsers || [owner];
        
        setIsOwner(currentUser === owner);
        setHasAccess(allowed.includes(currentUser));
        setIsPrivate(settings.isPrivate);
      }
    } catch (error) {
      console.error("접근 권한 확인 실패:", error);
    }
  };

  const loadBudget = async () => {
    try {
      const budgetRef = doc(db, "accountBookBudget", "budget");
      const budgetSnap = await getDoc(budgetRef);
      
      if (budgetSnap.exists()) {
        setBudget(budgetSnap.data().amount || 0);
      }
    } catch (error) {
      console.error("예산 로딩 실패:", error);
    }
  };

  const saveBudget = async (newBudget) => {
    try {
      await setDoc(doc(db, "accountBookBudget", "budget"), {
        amount: parseInt(newBudget),
        updatedAt: serverTimestamp(),
      });
      setBudget(parseInt(newBudget));
      setBudgetDialogOpen(false);
      alert("✅ 예산이 설정되었어요!");
    } catch (error) {
      console.error("예산 저장 실패:", error);
      alert("❌ 예산 저장에 실패했어요");
    }
  };

  // ── 거래 내역 로딩 ──────────────────────────────────
  useEffect(() => {
    if (hasAccess) {
      loadTransactions();
    }
  }, [selectedMonth, hasAccess]);

  const loadTransactions = async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const q = query(
      collection(db, "accountBook"),
      where("date", ">=", startDate.toISOString().split("T")[0]),
      where("date", "<=", endDate.toISOString().split("T")[0]),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTransactions(data);
  };

  // ── 접근 권한 설정 토글 ──────────────────────────────
  const togglePrivacy = async () => {
    if (!isOwner) return;

    const newIsPrivate = !isPrivate;
    const newAllowedUsers = newIsPrivate ? ["지수"] : ["지수", "현하"];

    await updateDoc(doc(db, "accountBookSettings", "settings"), {
      isPrivate: newIsPrivate,
      allowedUsers: newAllowedUsers,
    });

    setIsPrivate(newIsPrivate);
    alert(newIsPrivate ? "🔒 가계부를 비공개로 설정했어요" : "🔓 가계부를 공개했어요");
    setSettingsOpen(false);
  };

  // ── 거래 추가/수정 ──────────────────────────────────
  const handleSave = async () => {
    if (!amount || !category) {
      alert("금액과 카테고리를 입력해주세요!");
      return;
    }

    const transactionData = {
      userId: currentUser,
      type,
      amount: parseInt(amount),
      category,
      memo,
      date: transactionDate,
      createdAt: serverTimestamp(),
    };

    if (editingId) {
      await updateDoc(doc(db, "accountBook", editingId), transactionData);
    } else {
      await addDoc(collection(db, "accountBook"), transactionData);
    }

    resetForm();
    loadTransactions();
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setMemo(transaction.memo || "");
    setTransactionDate(transaction.date);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("정말 삭제하시겠어요?")) {
      await deleteDoc(doc(db, "accountBook", id));
      loadTransactions();
    }
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setType("expense");
    setAmount("");
    setCategory("");
    setMemo("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
  };

  // ── 통계 계산 ──────────────────────────────────────
  const getTotalIncome = () => {
    return transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpense = () => {
    return transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryData = () => {
    const expenseTransactions = transactions.filter(t => t.type === "expense");
    const categoryTotals = {};

    expenseTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => {
      const categoryInfo = CATEGORIES.expense.find(c => c.name === name);
      return {
        name,
        value,
        color: categoryInfo?.color || "#999",
      };
    });
  };

  // 필터링된 거래 내역
  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      // 타입 필터
      if (filterType !== "all" && t.type !== filterType) return false;
      
      // 검색 필터
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const matchCategory = t.category.toLowerCase().includes(keyword);
        const matchMemo = (t.memo || "").toLowerCase().includes(keyword);
        if (!matchCategory && !matchMemo) return false;
      }
      
      return true;
    });
  };

  // ── 월 변경 ──────────────────────────────────────
  const changeMonth = (delta) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1));
  };

  // ────────────────────────────────────────────────────────────
  // UI 렌더링
  // ────────────────────────────────────────────────────────────

  // 접근 권한 없음
  if (!hasAccess) {
    return (
      <Box sx={{ p: 3, textAlign: "center", py: 8 }}>
        <Box component="img" src={buri9} alt="" sx={{ width: 120, mb: 3, opacity: 0.5 }} />
        <Typography sx={{
          fontFamily: "'Jua', sans-serif",
          fontSize: "1.3rem",
          color: B.dark,
          mb: 2,
        }}>
          🔒 접근 권한이 없어요
        </Typography>
        <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88", mb: 3 }}>
          가계부 소유자가 공개 설정을 해야 사용할 수 있어요
        </Typography>
        <Paper sx={{
          p: 3,
          bgcolor: B.cream,
          border: `2px dashed ${B.pants}44`,
          borderRadius: 3,
        }}>
          <Typography sx={{ fontSize: "0.85rem", color: B.dark + "66" }}>
            💡 소유자에게 가계부 공개를 요청해보세요!
          </Typography>
        </Paper>
      </Box>
    );
  }

  const totalIncome = getTotalIncome();
  const totalExpense = getTotalExpense();
  const balance = totalIncome - totalExpense;
  const categoryData = getCategoryData();
  const filteredTransactions = getFilteredTransactions();
  const budgetProgress = budget > 0 ? (totalExpense / budget) * 100 : 0;

  return (
    <Box sx={{ pb: 10 }}>
      {/* 헤더 */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        background: `linear-gradient(135deg, ${B.lavender} 0%, ${B.peach} 100%)`,
        borderRadius: "0 0 20px 20px",
        mb: 2,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box component="img" src={buri5} alt="" sx={{ width: 45 }} />
          <Box>
            <Typography sx={{
              fontFamily: "'Jua', sans-serif",
              fontSize: "1.3rem",
              color: B.accent,
            }}>
              💰 가계부
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: B.dark + "88" }}>
              {isPrivate ? "🔒 나만 보기" : "🔓 공개 중"}
            </Typography>
          </Box>
        </Box>
        
        {isOwner && (
          <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: B.pants }}>
            <SettingsIcon />
          </IconButton>
        )}
      </Box>

      {/* 월 선택 */}
      <Stack direction="row" spacing={2} sx={{ px: 2, mb: 2, alignItems: "center", justifyContent: "center" }}>
        <Button onClick={() => changeMonth(-1)} size="small" sx={{ minWidth: 40 }}>
          ◀
        </Button>
        <Typography sx={{
          fontFamily: "'Jua', sans-serif",
          fontSize: "1.1rem",
          color: B.pants,
        }}>
          {selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월
        </Typography>
        <Button onClick={() => changeMonth(1)} size="small" sx={{ minWidth: 40 }}>
          ▶
        </Button>
      </Stack>

      {/* 요약 카드 */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Paper elevation={2} sx={{
          p: 2.5,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${B.cream} 0%, ${B.peach}44 100%)`,
          border: `2px solid ${B.accent}33`,
        }}>
          <Stack spacing={2}>
            {/* 수입 */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TrendingUpIcon sx={{ color: "#4CAF50", fontSize: 24 }} />
                <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88" }}>
                  수입
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: "'Jua', sans-serif",
                fontSize: "1.3rem",
                color: "#4CAF50",
              }}>
                +{totalIncome.toLocaleString()}원
              </Typography>
            </Stack>

            <Divider />

            {/* 지출 */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TrendingDownIcon sx={{ color: "#F44336", fontSize: 24 }} />
                <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88" }}>
                  지출
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: "'Jua', sans-serif",
                fontSize: "1.3rem",
                color: "#F44336",
              }}>
                -{totalExpense.toLocaleString()}원
              </Typography>
            </Stack>

            <Divider />

            {/* 잔액 */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{
                fontSize: "0.95rem",
                color: B.dark,
                fontWeight: 700,
              }}>
                잔액
              </Typography>
              <Typography sx={{
                fontFamily: "'Jua', sans-serif",
                fontSize: "1.5rem",
                color: balance >= 0 ? B.accent : "#F44336",
                fontWeight: 700,
              }}>
                {balance.toLocaleString()}원
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      {/* 예산 진행률 */}
      {budget > 0 && (
        <Box sx={{ px: 2, mb: 2 }}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{
                fontSize: "0.9rem",
                color: B.dark,
                fontWeight: 600,
              }}>
                💵 이번 달 예산
              </Typography>
              <Typography sx={{
                fontSize: "0.85rem",
                color: budgetProgress > 100 ? "#F44336" : B.pants,
                fontWeight: 700,
              }}>
                {totalExpense.toLocaleString()} / {budget.toLocaleString()}원
              </Typography>
            </Stack>
            
            {/* 진행률 바 */}
            <Box sx={{
              width: "100%",
              height: 12,
              bgcolor: B.cream,
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}>
              <Box sx={{
                width: `${Math.min(budgetProgress, 100)}%`,
                height: "100%",
                bgcolor: budgetProgress > 100 ? "#F44336" : budgetProgress > 80 ? "#FF9800" : "#4CAF50",
                transition: "width 0.3s",
              }} />
            </Box>
            
            <Typography sx={{
              fontSize: "0.75rem",
              color: B.dark + "66",
              textAlign: "right",
              mt: 0.5,
            }}>
              {budgetProgress > 100 
                ? `예산 ${(budgetProgress - 100).toFixed(0)}% 초과! ⚠️`
                : `${budgetProgress.toFixed(0)}% 사용 중`
              }
            </Typography>
          </Paper>
        </Box>
      )}

      {/* 필터 & 검색 */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Stack spacing={1}>
          {/* 타입 필터 */}
          <Stack direction="row" spacing={1}>
            {[
              { value: "all", label: "전체", icon: "📋" },
              { value: "income", label: "수입", icon: "💰" },
              { value: "expense", label: "지출", icon: "💸" },
            ].map((filter) => (
              <Chip
                key={filter.value}
                label={`${filter.icon} ${filter.label}`}
                onClick={() => setFilterType(filter.value)}
                sx={{
                  flex: 1,
                  bgcolor: filterType === filter.value ? B.pants : B.cream,
                  color: filterType === filter.value ? "white" : B.dark,
                  fontFamily: "'Jua', sans-serif",
                  fontWeight: filterType === filter.value ? 700 : 400,
                  "&:hover": { bgcolor: filterType === filter.value ? B.pants : B.peach },
                }}
              />
            ))}
          </Stack>

          {/* 검색 */}
          <TextField
            size="small"
            placeholder="🔍 카테고리나 메모로 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "white",
                borderRadius: 3,
              },
            }}
          />
        </Stack>
      </Box>

      {/* 카테고리별 지출 차트 */}
      {categoryData.length > 0 && (
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1rem",
            color: B.pants,
            mb: 1.5,
          }}>
            📊 카테고리별 지출
          </Typography>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 3 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${((entry.value / totalExpense) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString()}원`} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* 범례 (하단) */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {categoryData.map((item) => (
                <Chip
                  key={item.name}
                  label={`${item.name} ${((item.value / totalExpense) * 100).toFixed(0)}%`}
                  size="small"
                  sx={{
                    bgcolor: item.color + "33",
                    color: item.color,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    border: `1px solid ${item.color}`,
                  }}
                />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {/* 거래 내역 */}
      <Box sx={{ px: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{
            fontFamily: "'Jua', sans-serif",
            fontSize: "1rem",
            color: B.pants,
          }}>
            📝 거래 내역 ({filteredTransactions.length})
          </Typography>
          
          <Button
            size="small"
            onClick={() => setBudgetDialogOpen(true)}
            sx={{
              fontSize: "0.75rem",
              color: B.accent,
              fontFamily: "'Jua', sans-serif",
            }}
          >
            💵 예산 설정
          </Button>
        </Stack>

        {filteredTransactions.length === 0 ? (
          <Paper sx={{
            p: 4,
            textAlign: "center",
            bgcolor: B.cream,
            borderRadius: 3,
          }}>
            <Box component="img" src={buri1} alt="" sx={{ width: 80, mb: 2, opacity: 0.6 }} />
            <Typography sx={{ fontSize: "0.9rem", color: B.dark + "66" }}>
              {searchKeyword || filterType !== "all" 
                ? "검색 결과가 없어요"
                : "아직 거래 내역이 없어요"
              }
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            <AnimatePresence>
              {filteredTransactions.map((transaction) => {
                const categoryInfo = CATEGORIES[transaction.type].find(
                  c => c.name === transaction.category
                );

                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        borderLeft: `4px solid ${categoryInfo?.color || "#999"}`,
                        "&:active": { transform: "scale(0.98)" },
                        transition: "transform 0.1s",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography sx={{ fontSize: "1.2rem" }}>
                              {categoryInfo?.icon}
                            </Typography>
                            <Typography sx={{
                              fontFamily: "'Jua', sans-serif",
                              fontSize: "1rem",
                              color: B.dark,
                            }}>
                              {transaction.category}
                            </Typography>
                          </Stack>
                          {transaction.memo && (
                            <Typography sx={{ fontSize: "0.8rem", color: B.dark + "66", mb: 0.5 }}>
                              {transaction.memo}
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: "0.75rem", color: B.dark + "44" }}>
                            {transaction.date}
                          </Typography>
                        </Box>

                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{
                            fontFamily: "'Jua', sans-serif",
                            fontSize: "1.2rem",
                            color: transaction.type === "income" ? "#4CAF50" : "#F44336",
                            mb: 0.5,
                          }}>
                            {transaction.type === "income" ? "+" : "-"}
                            {transaction.amount.toLocaleString()}원
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(transaction)}
                              sx={{ color: B.pants }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(transaction.id)}
                              sx={{ color: B.accent }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Stack>
        )}
      </Box>

      {/* FAB - 추가 버튼 */}
      <Fab
        color="primary"
        onClick={() => setDialogOpen(true)}
        sx={{
          position: "fixed",
          bottom: 80,
          right: 20,
          bgcolor: B.accent,
          "&:hover": { bgcolor: B.pants },
        }}
      >
        <AddIcon />
      </Fab>

      {/* 거래 추가/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={resetForm}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{
          fontFamily: "'Jua', sans-serif",
          bgcolor: B.peach,
          color: B.dark,
        }}>
          {editingId ? "✏️ 거래 수정" : "➕ 새 거래 추가"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            {/* 수입/지출 선택 */}
            <Box>
              <Typography sx={{ fontSize: "0.85rem", color: B.dark + "88", mb: 1 }}>
                구분
              </Typography>
              <ToggleButtonGroup
                value={type}
                exclusive
                onChange={(e, val) => {
                  if (val) {
                    setType(val);
                    setCategory("");
                  }
                }}
                fullWidth
              >
                <ToggleButton value="income" sx={{
                  fontFamily: "'Jua', sans-serif",
                  "&.Mui-selected": { bgcolor: "#4CAF50", color: "white" },
                }}>
                  💰 수입
                </ToggleButton>
                <ToggleButton value="expense" sx={{
                  fontFamily: "'Jua', sans-serif",
                  "&.Mui-selected": { bgcolor: "#F44336", color: "white" },
                }}>
                  💸 지출
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* 금액 */}
            <TextField
              label="금액"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: <Typography sx={{ color: B.dark + "66" }}>원</Typography>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: "'Jua', sans-serif",
                },
              }}
            />

            {/* 카테고리 */}
            <Box>
              <Typography sx={{ fontSize: "0.85rem", color: B.dark + "88", mb: 1 }}>
                카테고리
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {CATEGORIES[type].map((cat) => (
                  <Chip
                    key={cat.name}
                    label={`${cat.icon} ${cat.name}`}
                    onClick={() => setCategory(cat.name)}
                    sx={{
                      bgcolor: category === cat.name ? cat.color : B.cream,
                      color: category === cat.name ? "white" : B.dark,
                      fontFamily: "'Jua', sans-serif",
                      fontWeight: category === cat.name ? 700 : 400,
                      "&:hover": { bgcolor: cat.color + "88" },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* 날짜 */}
            <TextField
              label="날짜"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            {/* 메모 */}
            <TextField
              label="메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="간단한 메모를 남겨보세요"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={resetForm} sx={{ color: B.dark + "88" }}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              bgcolor: B.accent,
              fontFamily: "'Jua', sans-serif",
              "&:hover": { bgcolor: B.pants },
            }}
          >
            {editingId ? "수정" : "추가"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 예산 설정 다이얼로그 */}
      <Dialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{
          fontFamily: "'Jua', sans-serif",
          bgcolor: B.peach,
          color: B.dark,
        }}>
          💵 월 예산 설정
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Typography sx={{ fontSize: "0.9rem", color: B.dark + "88" }}>
              이번 달 지출 목표 금액을 설정하세요
            </Typography>
            <TextField
              type="number"
              label="예산 금액"
              defaultValue={budget || ""}
              fullWidth
              autoFocus
              InputProps={{
                endAdornment: <Typography sx={{ color: B.dark + "66" }}>원</Typography>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: "'Jua', sans-serif",
                  fontSize: "1.2rem",
                },
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  saveBudget(e.target.value);
                }
              }}
              id="budget-input"
            />
            <Paper sx={{ p: 2, bgcolor: B.cream, borderRadius: 2 }}>
              <Typography sx={{ fontSize: "0.8rem", color: B.dark + "66" }}>
                💡 예산을 초과하면 빨간색으로 경고해드려요!
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBudgetDialogOpen(false)} sx={{ color: B.dark + "88" }}>
            취소
          </Button>
          <Button
            onClick={() => {
              const input = document.getElementById("budget-input");
              saveBudget(input.value);
            }}
            variant="contained"
            sx={{
              bgcolor: B.accent,
              fontFamily: "'Jua', sans-serif",
              "&:hover": { bgcolor: B.pants },
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 설정 다이얼로그 */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{
          fontFamily: "'Jua', sans-serif",
          bgcolor: B.lavender,
          color: B.dark,
        }}>
          ⚙️ 가계부 설정
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Paper sx={{ p: 2, bgcolor: B.cream, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography sx={{
                  fontFamily: "'Jua', sans-serif",
                  fontSize: "1rem",
                  color: B.pants,
                  mb: 1,
                }}>
                  접근 권한
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!isPrivate}
                      onChange={togglePrivacy}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {isPrivate ? <LockIcon sx={{ fontSize: 20 }} /> : <LockOpenIcon sx={{ fontSize: 20 }} />}
                      <Typography sx={{ fontSize: "0.9rem" }}>
                        {isPrivate ? "나만 보기" : "상대방과 공유"}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
              <Divider />
              <Typography sx={{ fontSize: "0.8rem", color: B.dark + "66" }}>
                💡 공개하면 {opponentUser}님도 가계부를 볼 수 있어요
              </Typography>
            </Stack>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSettingsOpen(false)}
            variant="outlined"
            sx={{
              borderColor: B.pants,
              color: B.pants,
              fontFamily: "'Jua', sans-serif",
            }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountBook;