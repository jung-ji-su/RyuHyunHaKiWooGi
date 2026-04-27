import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Box, Typography, Stack, CircularProgress, Chip } from "@mui/material";

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A",
  dark: "#3D1F00", pink: "#FF8FAB", green: "#1D9E75",
};

const EMOTIONS = [
  { label: "행복", emoji: "🥰", color: "#E8630A" },
  { label: "신남", emoji: "🥳", color: "#7B4FA6" },
  { label: "설렘", emoji: "🫶", color: "#FF8FAB" },
  { label: "최고", emoji: "🔥", color: "#E8630A" },
  { label: "보통", emoji: "😊", color: "#EF9F27" },
  { label: "슬픔", emoji: "😢", color: "#85B7EB" },
  { label: "피곤", emoji: "🥱", color: "#B4B2A9" },
  { label: "울음", emoji: "😭", color: "#85B7EB" },
  { label: "화남", emoji: "👹", color: "#E24B4A" },
];

const getEmoji        = (label) => EMOTIONS.find(e => e.label === label)?.emoji || "📝";
const getEmotionColor = (label) => EMOTIONS.find(e => e.label === label)?.color || B.pants;

// ── 미니 바 차트 ─────────────────────────────────────────────────
const MiniBarChart = ({ data, maxVal, color }) => (
  <Stack spacing={0.6}>
    {data.map(({ label, value, emoji }) => (
      <Stack key={label} direction="row" alignItems="center" gap={1}>
        <Typography sx={{ fontSize: "0.75rem", minWidth: 20, textAlign: "center" }}>{emoji}</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: B.dark + "99", minWidth: 28, fontFamily: "'Noto Sans KR',sans-serif" }}>
          {label}
        </Typography>
        <Box sx={{ flex: 1, bgcolor: B.peach, borderRadius: 99, height: 8, overflow: "hidden" }}>
          <Box sx={{
            height: "100%", borderRadius: 99,
            bgcolor: color || getEmotionColor(label),
            width: `${maxVal > 0 ? Math.round((value / maxVal) * 100) : 0}%`,
            transition: "width 0.8s ease",
            minWidth: value > 0 ? 4 : 0,
          }} />
        </Box>
        <Typography sx={{ fontSize: "0.72rem", color: B.dark + "88", minWidth: 20, textAlign: "right",
          fontFamily: "'Noto Sans KR',sans-serif" }}>
          {value}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

// ── 통계 카드 ────────────────────────────────────────────────────
const StatCard = ({ emoji, label, value, sub, color, bgColor }) => (
  <Box sx={{
    bgcolor: bgColor || "white", borderRadius: 3, p: 1.8,
    border: `1.5px solid ${color || B.pants}22`,
    flex: 1, minWidth: 0,
    display: "flex", flexDirection: "column", gap: 0.3,
  }}>
    <Typography sx={{ fontSize: "1.4rem", lineHeight: 1 }}>{emoji}</Typography>
    <Typography sx={{ fontSize: "1.4rem", fontFamily: "'Jua',sans-serif", color: color || B.pants, lineHeight: 1.2, mt: 0.5 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: "0.7rem", color: B.dark + "99", fontFamily: "'Noto Sans KR',sans-serif" }}>
      {label}
    </Typography>
    {sub && (
      <Typography sx={{ fontSize: "0.65rem", color: B.dark + "55", fontFamily: "'Noto Sans KR',sans-serif" }}>
        {sub}
      </Typography>
    )}
  </Box>
);

// ── 섹션 헤더 ────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }) => (
  <Typography sx={{
    fontFamily: "'Jua',sans-serif", fontSize: "0.92rem", color: B.pants,
    display: "flex", alignItems: "center", gap: 0.8, mb: 1.2,
  }}>
    {icon} {title}
  </Typography>
);

// ── 메인 컴포넌트 ────────────────────────────────────────────────
const LoveStats = ({ currentUser }) => {
  const [diaries, setDiaries] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [pins,    setPins]    = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [thermo,  setThermo]  = useState([]);

  // ✅ Fix 2: 컬렉션별 로딩 상태를 독립적으로 관리 — 경쟁 조건 제거
  const [loadedMap, setLoadedMap] = useState({
    diaries: false, coupons: false, pins: false, buckets: false, thermo: false,
  });
  const markLoaded = (key) =>
    setLoadedMap(prev => ({ ...prev, [key]: true }));
  const loading = !Object.values(loadedMap).every(Boolean);

  const [period, setPeriod] = useState("전체");

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "diaries"),    orderBy("createdAt", "desc")),
      s => { setDiaries(s.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded("diaries"); }
    );
    const u2 = onSnapshot(
      query(collection(db, "coupons"),    orderBy("createdAt", "desc")),
      s => { setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded("coupons"); }
    );
    const u3 = onSnapshot(
      query(collection(db, "travelPins"), orderBy("createdAt", "desc")),
      s => { setPins(s.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded("pins"); }
    );
    const u4 = onSnapshot(
      query(collection(db, "buckets"),    orderBy("createdAt", "desc")),
      s => { setBuckets(s.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded("buckets"); }
    );
    // ✅ Fix 3: 컬렉션명 "temperatures"로 수정 (EmotionThermometer 실제 저장 컬렉션)
    const u5 = onSnapshot(
      query(collection(db, "temperatures"), orderBy("date", "desc")),
      s => { setThermo(s.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded("thermo"); }
    );
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  // ── 기간 필터 ─────────────────────────────────────────────────
  const filterByPeriod = (items, dateField = "createdAt") => {
    if (period === "전체") return items;
    const days = period === "30일" ? 30 : 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return items.filter(item => {
      const d = item[dateField]?.toDate?.() || (item[dateField] ? new Date(item[dateField]) : null);
      return d && d >= cutoff;
    });
  };

  const filteredDiaries = filterByPeriod(diaries);
  const filteredCoupons = filterByPeriod(coupons);
  const filteredPins    = filterByPeriod(pins);

  // ── 다이어리 감정 통계 ────────────────────────────────────────
  const emotionCount = {};
  filteredDiaries.forEach(d => {
    const e = d.emotion || "행복";
    emotionCount[e] = (emotionCount[e] || 0) + 1;
  });
  const emotionData = Object.entries(emotionCount)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, emoji: getEmoji(label) }));
  const maxEmotion = emotionData[0]?.value || 1;
  const topEmotion = emotionData[0];

  const jsuCount = filteredDiaries.filter(d => d.author === "지수").length;
  const hyCount  = filteredDiaries.filter(d => d.author === "현하").length;

  const topLiked = [...filteredDiaries]
    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0];

  // ── 쿠폰 통계 ────────────────────────────────────────────────
  const usedCoupons  = filteredCoupons.filter(c => c.status === "used");
  const availCoupons = filteredCoupons.filter(c => c.status === "available");
  const couponRate   = filteredCoupons.length > 0
    ? Math.round((usedCoupons.length / filteredCoupons.length) * 100) : 0;

  const couponTitles = {};
  usedCoupons.forEach(c => {
    couponTitles[c.title] = (couponTitles[c.title] || 0) + 1;
  });
  const topCoupon = Object.entries(couponTitles).sort((a, b) => b[1] - a[1])[0];

  // ── 여행 핀 통계 ──────────────────────────────────────────────
  const pinCatCount = {};
  filteredPins.forEach(p => {
    const cat = p.category || "기타";
    pinCatCount[cat] = (pinCatCount[cat] || 0) + 1;
  });
  const catEmojis = { "카페": "☕", "맛집": "🍽️", "여행": "✈️", "데이트": "💜", "산책": "🌿", "기타": "📍" };
  const pinCatData = Object.entries(pinCatCount)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, emoji: catEmojis[label] || "📍" }));
  const maxPin = pinCatData[0]?.value || 1;

  const jsuPins = filteredPins.filter(p => p.addedBy === "지수").length;
  const hyPins  = filteredPins.filter(p => p.addedBy === "현하").length;

  // ✅ Fix 1: b.done → b.isDone (BucketList 저장 필드명과 일치)
  // ✅ Fix 4: 버킷은 전체 기준 (생성일 기간 필터 적용 시 달성률 왜곡)
  const doneBuckets = buckets.filter(b => b.isDone === true);
  const bucketRate  = buckets.length > 0
    ? Math.round((doneBuckets.length / buckets.length) * 100) : 0;

  // ── 감정 온도 통계 ────────────────────────────────────────────
  const recent14 = thermo.slice(0, 14);
  const avgTemp  = recent14.length > 0
    ? Math.round(recent14.reduce((s, t) => s + (parseInt(t.temp) || 0), 0) / recent14.length)
    : null;

  if (loading) return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, gap: 2 }}>
      <CircularProgress sx={{ color: B.pants }} size={32} />
      <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "0.9rem" }}>
        통계 불러오는 중... 🐷
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ pb: 4 }}>

      {/* 헤더 */}
      <Box sx={{
        textAlign: "center", mb: 3, py: 2.5, px: 2, borderRadius: 4,
        bgcolor: B.lavender + "66", border: `1.5px dashed ${B.pants}33`,
      }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.5rem", color: B.pants }}>
          📊 우리의 연애 통계
        </Typography>
        <Typography sx={{ fontSize: "0.75rem", color: B.dark + "77", mt: 0.3,
          fontFamily: "'Noto Sans KR',sans-serif" }}>
          지수 & 현하의 데이터로 만든 우리만의 리포트 💜
        </Typography>
      </Box>

      {/* 기간 필터 */}
      <Stack direction="row" gap={0.8} mb={2.5} justifyContent="center">
        {["7일", "30일", "전체"].map(p => (
          <Chip key={p} label={p} size="small"
            onClick={() => setPeriod(p)}
            sx={{
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem",
              bgcolor: period === p ? B.pants : B.peach,
              color: period === p ? "white" : B.dark,
              fontWeight: period === p ? 700 : 400,
              border: `1.5px solid ${period === p ? B.pants : "transparent"}`,
              transition: "all 0.15s", cursor: "pointer",
            }} />
        ))}
      </Stack>

      <Stack spacing={2.5}>

        {/* ── 요약 카드 4개 ── */}
        <Box>
          <SectionHeader icon="✨" title="한눈에 보기" />
          <Stack direction="row" gap={1.2}>
            <StatCard emoji="✍️" label="총 기록" value={`${filteredDiaries.length}개`}
              sub={`지수 ${jsuCount} · 현하 ${hyCount}`}
              color={B.accent} bgColor="#FFF5EE" />
            <StatCard emoji="🎟️" label="쿠폰 사용률" value={`${couponRate}%`}
              sub={`${usedCoupons.length}/${filteredCoupons.length}장`}
              color={B.pants} bgColor={B.lavender + "44"} />
          </Stack>
          <Stack direction="row" gap={1.2} mt={1.2}>
            <StatCard emoji="📍" label="방문 장소" value={`${filteredPins.length}곳`}
              sub={`지수 ${jsuPins} · 현하 ${hyPins}`}
              color="#3A86FF" bgColor="#F0F7FF" />
            {/* ✅ Fix 1 반영: 올바른 doneBuckets, bucketRate 표시 */}
            <StatCard emoji="🪣" label="버킷리스트" value={`${bucketRate}%`}
              sub={`${doneBuckets.length}/${buckets.length}개 달성`}
              color={B.green} bgColor="#F0FBF6" />
          </Stack>
        </Box>

        {/* ── 감정 분석 ── */}
        <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2, border: `1.5px solid ${B.accent}22` }}>
          <SectionHeader icon="🥰" title="감정 분석" />
          {filteredDiaries.length === 0 ? (
            <Typography sx={{ textAlign: "center", color: B.dark + "55", fontSize: "0.8rem", py: 2,
              fontFamily: "'Noto Sans KR',sans-serif" }}>
              기록이 없어요 🐷
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {topEmotion && (
                <Box sx={{
                  bgcolor: getEmotionColor(topEmotion.label) + "15",
                  borderRadius: 2.5, p: 1.5,
                  border: `1.5px solid ${getEmotionColor(topEmotion.label)}33`,
                  display: "flex", alignItems: "center", gap: 1.5,
                }}>
                  <Typography sx={{ fontSize: "2rem", lineHeight: 1 }}>{topEmotion.emoji}</Typography>
                  <Box>
                    <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.9rem",
                      color: getEmotionColor(topEmotion.label) }}>
                      요즘 기분은 "{topEmotion.label}"!
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: B.dark + "77",
                      fontFamily: "'Noto Sans KR',sans-serif" }}>
                      전체 기록의 {Math.round((topEmotion.value / filteredDiaries.length) * 100)}% · {topEmotion.value}번
                    </Typography>
                  </Box>
                </Box>
              )}
              <MiniBarChart data={emotionData.slice(0, 6)} maxVal={maxEmotion} />
            </Stack>
          )}
        </Box>

        {/* ── 쿠폰 통계 ── */}
        <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2, border: `1.5px solid ${B.pants}22` }}>
          <SectionHeader icon="🎟️" title="쿠폰 현황" />
          <Stack spacing={1.5}>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.6}>
                <Typography sx={{ fontSize: "0.75rem", color: B.dark + "88",
                  fontFamily: "'Noto Sans KR',sans-serif" }}>사용률</Typography>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: B.pants,
                  fontFamily: "'Noto Sans KR',sans-serif" }}>{couponRate}%</Typography>
              </Stack>
              <Box sx={{ bgcolor: B.peach, borderRadius: 99, height: 10, overflow: "hidden" }}>
                <Box sx={{
                  height: "100%", borderRadius: 99, bgcolor: B.pants,
                  width: `${couponRate}%`, transition: "width 0.8s ease",
                  minWidth: couponRate > 0 ? 6 : 0,
                }} />
              </Box>
            </Box>
            <Stack direction="row" gap={1}>
              <Box sx={{ flex: 1, bgcolor: B.green + "15", borderRadius: 2, p: 1.2,
                textAlign: "center", border: `1px solid ${B.green}33` }}>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.2rem", color: B.green }}>
                  {availCoupons.length}
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                  fontFamily: "'Noto Sans KR',sans-serif" }}>사용 가능</Typography>
              </Box>
              <Box sx={{ flex: 1, bgcolor: B.pants + "15", borderRadius: 2, p: 1.2,
                textAlign: "center", border: `1px solid ${B.pants}33` }}>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.2rem", color: B.pants }}>
                  {usedCoupons.length}
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                  fontFamily: "'Noto Sans KR',sans-serif" }}>사용 완료</Typography>
              </Box>
            </Stack>
            {topCoupon && (
              <Box sx={{ bgcolor: B.lavender + "55", borderRadius: 2, p: 1.2,
                border: `1px dashed ${B.pants}33` }}>
                <Typography sx={{ fontSize: "0.72rem", color: B.dark + "88",
                  fontFamily: "'Noto Sans KR',sans-serif" }}>🏆 가장 많이 쓴 쿠폰</Typography>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.88rem", color: B.pants, mt: 0.3 }}>
                  {topCoupon[0]} ({topCoupon[1]}번)
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {/* ── 여행 지도 통계 ── */}
        <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2, border: "1.5px solid #3A86FF22" }}>
          <SectionHeader icon="🗺️" title="우리가 간 곳들" />
          {filteredPins.length === 0 ? (
            <Typography sx={{ textAlign: "center", color: B.dark + "55", fontSize: "0.8rem", py: 2,
              fontFamily: "'Noto Sans KR',sans-serif" }}>
              아직 핀이 없어요 📍
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" gap={1}>
                <Box sx={{ flex: 1, bgcolor: "#F0F7FF", borderRadius: 2, p: 1.2,
                  textAlign: "center", border: "1px solid #3A86FF22" }}>
                  <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.2rem", color: "#3A86FF" }}>
                    {filteredPins.length}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                    fontFamily: "'Noto Sans KR',sans-serif" }}>총 방문지</Typography>
                </Box>
                <Box sx={{ flex: 1, bgcolor: "#F0FBF6", borderRadius: 2, p: 1.2,
                  textAlign: "center", border: `1px solid ${B.green}33` }}>
                  <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.2rem", color: B.green }}>
                    {pinCatData[0]?.emoji || "📍"} {pinCatData[0]?.label || "-"}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                    fontFamily: "'Noto Sans KR',sans-serif" }}>가장 많이 간 곳</Typography>
                </Box>
              </Stack>
              {pinCatData.length > 0 && (
                <MiniBarChart data={pinCatData} maxVal={maxPin} color="#3A86FF" />
              )}
            </Stack>
          )}
        </Box>

        {/* ── 버킷리스트 현황 ── */}
        <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2, border: `1.5px solid ${B.green}22` }}>
          <SectionHeader icon="🪣" title="버킷리스트 현황" />
          {buckets.length === 0 ? (
            <Typography sx={{ textAlign: "center", color: B.dark + "55", fontSize: "0.8rem", py: 2,
              fontFamily: "'Noto Sans KR',sans-serif" }}>
              버킷리스트가 없어요 🪣
            </Typography>
          ) : (
            <Stack spacing={1.2}>
              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.6}>
                  <Typography sx={{ fontSize: "0.75rem", color: B.dark + "88",
                    fontFamily: "'Noto Sans KR',sans-serif" }}>달성률</Typography>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: B.green,
                    fontFamily: "'Noto Sans KR',sans-serif" }}>
                    {doneBuckets.length}/{buckets.length}개 · {bucketRate}%
                  </Typography>
                </Stack>
                <Box sx={{ bgcolor: B.peach, borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <Box sx={{
                    height: "100%", borderRadius: 99, bgcolor: B.green,
                    width: `${bucketRate}%`, transition: "width 0.8s ease",
                    minWidth: bucketRate > 0 ? 6 : 0,
                  }} />
                </Box>
              </Box>
              <Stack direction="row" gap={1}>
                <Box sx={{ flex: 1, bgcolor: B.green + "15", borderRadius: 2, p: 1.2,
                  textAlign: "center", border: `1px solid ${B.green}33` }}>
                  <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.2rem", color: B.green }}>
                    {doneBuckets.length}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                    fontFamily: "'Noto Sans KR',sans-serif" }}>달성 완료 🎉</Typography>
                </Box>
                <Box sx={{ flex: 1, bgcolor: B.peach, borderRadius: 2, p: 1.2,
                  textAlign: "center", border: `1px solid ${B.accent}33` }}>
                  <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.2rem", color: B.accent }}>
                    {buckets.length - doneBuckets.length}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                    fontFamily: "'Noto Sans KR',sans-serif" }}>도전 중 🔥</Typography>
                </Box>
              </Stack>
              {bucketRate === 100 && (
                <Box sx={{ textAlign: "center", py: 0.8, bgcolor: "#E8FFF2",
                  borderRadius: 2, border: `1px dashed ${B.green}66` }}>
                  <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.82rem", color: B.green }}>
                    🎉 모든 버킷리스트 완료! 최고의 커플 🐷💜
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* ── 감정 온도 통계 ── */}
        {avgTemp !== null && (
          <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2, border: `1.5px solid ${B.skin}66` }}>
            <SectionHeader icon="🌡️" title="감정 온도" />
            <Stack direction="row" gap={1} alignItems="center">
              <Box sx={{ flex: 1, bgcolor: B.peach, borderRadius: 2, p: 1.5,
                textAlign: "center", border: `1px solid ${B.skin}44` }}>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "1.6rem",
                  color: avgTemp >= 70 ? B.accent : avgTemp >= 40 ? "#EF9F27" : "#85B7EB" }}>
                  {avgTemp}°
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: B.dark + "77",
                  fontFamily: "'Noto Sans KR',sans-serif" }}>최근 평균 온도</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: "0.72rem", color: B.dark + "88", mb: 0.5,
                  fontFamily: "'Noto Sans KR',sans-serif" }}>
                  {avgTemp >= 80 ? "🔥 요즘 사이 너무 좋은데요?" :
                   avgTemp >= 60 ? "☀️ 안정적인 온도예요!" :
                   avgTemp >= 40 ? "🌤️ 보통이에요, 힘내요!" :
                   "🌧️ 요즘 좀 힘드나요? 파이팅!"}
                </Typography>
                <Typography sx={{ fontSize: "0.65rem", color: B.dark + "55",
                  fontFamily: "'Noto Sans KR',sans-serif" }}>
                  최근 {recent14.length}개 기록 기준
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* ── 좋아요 많은 기록 ── */}
        {topLiked && (topLiked.likes?.length || 0) > 0 && (
          <Box sx={{ bgcolor: "#FFF0F8", borderRadius: 3, p: 2, border: `1.5px solid ${B.pink}33` }}>
            <SectionHeader icon="❤️" title="가장 사랑받은 기록" />
            <Box sx={{ bgcolor: "white", borderRadius: 2.5, p: 1.5, border: `1px solid ${B.pink}22` }}>
              <Stack direction="row" alignItems="center" gap={1} mb={0.8}>
                <Typography sx={{ fontSize: "1.2rem" }}>{getEmoji(topLiked.emotion)}</Typography>
                <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.85rem", color: B.dark }}>
                  {topLiked.author}의 기록
                </Typography>
                <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.4 }}>
                  <Typography sx={{ fontSize: "0.9rem" }}>❤️</Typography>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: B.pink,
                    fontFamily: "'Noto Sans KR',sans-serif" }}>
                    {topLiked.likes.length}
                  </Typography>
                </Box>
              </Stack>
              <Typography sx={{
                fontSize: "0.78rem", color: B.dark + "aa", lineHeight: 1.5,
                fontFamily: "'Noto Sans KR',sans-serif",
                overflow: "hidden", textOverflow: "ellipsis",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {topLiked.content || "사진만 있는 기록이에요 📸"}
              </Typography>
            </Box>
          </Box>
        )}

        {/* 푸터 */}
        <Box sx={{ textAlign: "center", pt: 1, opacity: 0.5 }}>
          <Typography sx={{ fontSize: "0.72rem", color: B.dark + "66", fontFamily: "'Jua',sans-serif" }}>
            🐷 부리부리가 열심히 집계했어요 🐷
          </Typography>
        </Box>

      </Stack>
    </Box>
  );
};

export default LoveStats;