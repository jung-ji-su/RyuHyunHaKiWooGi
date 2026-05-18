import { useMemo } from 'react';
import { Box, Typography, Stack, Drawer, Divider } from '@mui/material';

const B = {
  pants: '#7B4FA6', accent: '#E8630A', cream: '#FFF8F2',
  lavender: '#EDE0F5', dark: '#3D1F00', peach: '#FFE4D4',
};

const EMOTION_LABELS = ['행복','신남','울음','슬픔','화남','설렘','피곤','최고'];

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function calcMaxSyncStreak(temperatures) {
  const today = new Date();
  const allDates = [...new Set(temperatures.map(t => t.date))].filter(iso => new Date(iso) <= today).sort();
  let maxStreak = 0, cur = 0;
  let prev = null;
  for (const iso of allDates) {
    const hasJ = temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
    const hasH = temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
    if (hasJ && hasH) {
      if (prev) {
        const pd = new Date(prev), cd = new Date(iso);
        const diff = Math.round((cd - pd) / 86400000);
        cur = diff === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      maxStreak = Math.max(maxStreak, cur);
      prev = iso;
    } else {
      prev = null;
      cur = 0;
    }
  }
  return maxStreak;
}

function calcCurrentSyncStreak(temperatures) {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toIso(d);
    const hasJ = temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
    const hasH = temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
    if (hasJ && hasH) streak++;
    else break;
  }
  return streak;
}

function getTopEmotion(diaries) {
  const counts = {};
  diaries.forEach(d => {
    if (d.emotion) counts[d.emotion] = (counts[d.emotion] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0] ?? null;
}

function getBestMonth(temperatures) {
  const monthAvgs = {};
  temperatures.filter(t => !t.isPenalty && parseInt(t.temp ?? 0) > 0).forEach(t => {
    const month = t.date?.slice(0, 7);
    if (!month) return;
    if (!monthAvgs[month]) monthAvgs[month] = { sum: 0, count: 0 };
    monthAvgs[month].sum += parseInt(t.temp);
    monthAvgs[month].count++;
  });
  const sorted = Object.entries(monthAvgs)
    .map(([month, { sum, count }]) => ({ month, avg: Math.round(sum / count) }))
    .sort((a, b) => b.avg - a.avg);
  return sorted[0] ?? null;
}

const StatCard = ({ emoji, label, value, color = B.pants }) => (
  <Box sx={{
    flex: 1, bgcolor: 'white', borderRadius: 2.5, p: '12px 8px',
    textAlign: 'center', border: `1.5px solid ${color}18`,
    boxShadow: `0 2px 8px ${color}0a`,
  }}>
    <Typography sx={{ fontSize: '1.2rem', lineHeight: 1, mb: 0.3 }}>{emoji}</Typography>
    <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.1rem', color, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: '0.56rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif", mt: 0.3, lineHeight: 1.3 }}>
      {label}
    </Typography>
  </Box>
);

export default function AiReport({ open, onClose, temperatures, diaries, schedules }) {
  const stats = useMemo(() => {
    const today = new Date();
    const nonPenaltyTemps = temperatures.filter(t => !t.isPenalty && parseInt(t.temp ?? 0) > 0);
    const overallAvg = nonPenaltyTemps.length
      ? Math.round(nonPenaltyTemps.reduce((s, t) => s + parseInt(t.temp), 0) / nonPenaltyTemps.length)
      : null;

    const currentStreak = calcCurrentSyncStreak(temperatures);
    const maxStreak = calcMaxSyncStreak(temperatures);
    const topEmotion = getTopEmotion(diaries);
    const bestMonth = getBestMonth(temperatures);

    const thisYearStart = new Date(today.getFullYear(), 0, 1);
    const diaryCountYear = diaries.filter(d => {
      if (!d.createdAt) return false;
      const dd = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      return dd >= thisYearStart;
    }).length;

    const totalSchedules = schedules.length;

    const allDates = [...new Set(temperatures.map(t => t.date))].filter(iso => new Date(iso) <= today);
    const syncDays = allDates.filter(iso => {
      const hasJ = temperatures.some(t => t.date === iso && t.author === '지수' && !t.isPenalty);
      const hasH = temperatures.some(t => t.date === iso && t.author === '현하' && !t.isPenalty);
      return hasJ && hasH;
    }).length;

    return { overallAvg, currentStreak, maxStreak, topEmotion, bestMonth, diaryCountYear, totalSchedules, syncDays };
  }, [temperatures, diaries, schedules]);

  const insightLines = [
    stats.currentStreak > 0 && `현재 ${stats.currentStreak}일 연속 함께 기록 중이에요 🔥`,
    stats.maxStreak > 0 && `최장 싱크 스트릭은 ${stats.maxStreak}일이에요 🏆`,
    stats.overallAvg !== null && `전체 평균 온도는 ${stats.overallAvg}°예요 🌡️`,
    stats.topEmotion && `가장 많이 기록한 감정은 "${stats.topEmotion[0]}" (${stats.topEmotion[1]}회)이에요`,
    stats.bestMonth && `가장 뜨거웠던 달은 ${stats.bestMonth.month.slice(5)}월 (평균 ${stats.bestMonth.avg}°)이에요 🥰`,
    stats.syncDays > 0 && `지금까지 함께 기록한 날은 총 ${stats.syncDays}일이에요 💑`,
  ].filter(Boolean);

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '22px 22px 0 0',
          maxHeight: '82vh',
          bgcolor: B.cream,
          backgroundImage: `radial-gradient(circle at 90% 0%, ${B.lavender}99 0%, transparent 35%)`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
      }}>

      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.2, pb: 0.5, flexShrink: 0 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: B.pants + '44' }} />
      </Box>

      <Box sx={{ px: 2.5, pt: 0.5, pb: 1.5, flexShrink: 0 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', color: B.pants }}>
          📊 우리 연애 리포트
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif", mt: 0.3 }}>
          지금까지의 기록을 분석했어요 🐷
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: B.pants + '22', flexShrink: 0 }} />

      <Box sx={{ overflowY: 'auto', px: 2, py: 2, flex: 1 }}>
        {/* 핵심 통계 */}
        <Stack direction="row" gap={1} sx={{ mb: 2 }}>
          <StatCard emoji="💑" label="함께 기록한 날" value={`${stats.syncDays}일`} color={B.pants} />
          <StatCard emoji="🔥" label="현재 스트릭" value={`${stats.currentStreak}일`} color={B.accent} />
          <StatCard emoji="🏆" label="최장 스트릭" value={`${stats.maxStreak}일`} color="#1D9E75" />
        </Stack>

        <Stack direction="row" gap={1} sx={{ mb: 2 }}>
          <StatCard emoji="📖" label="올해 기록" value={`${stats.diaryCountYear}개`} color="#3A86FF" />
          <StatCard emoji="📅" label="전체 일정" value={`${stats.totalSchedules}개`} color="#E91E8C" />
          <StatCard emoji="🌡️" label="평균 온도" value={stats.overallAvg !== null ? `${stats.overallAvg}°` : '-'} color={B.accent} />
        </Stack>

        {/* AI 인사이트 메시지 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{
            fontSize: '0.65rem', fontWeight: 700, color: B.pants + '88',
            letterSpacing: '1.5px', mb: 1, fontFamily: "'Noto Sans KR',sans-serif",
          }}>
            AI 분석 결과
          </Typography>
          <Box sx={{
            bgcolor: 'white', borderRadius: 3, p: '14px 16px',
            border: `1.5px solid ${B.pants}22`,
            boxShadow: `0 2px 12px ${B.pants}0c`,
          }}>
            <Stack gap={0.8}>
              {insightLines.map((line, i) => (
                <Typography key={i} sx={{
                  fontSize: '0.8rem', color: B.dark,
                  fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1.6,
                }}>
                  {line}
                </Typography>
              ))}
              {insightLines.length === 0 && (
                <Typography sx={{ fontSize: '0.8rem', color: '#ccc', fontFamily: "'Noto Sans KR',sans-serif" }}>
                  아직 분석할 데이터가 부족해요. 더 많이 기록해봐요! 📝
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>

        {/* 자주 느낀 감정 */}
        {stats.topEmotion && (
          <Box>
            <Typography sx={{
              fontSize: '0.65rem', fontWeight: 700, color: B.pants + '88',
              letterSpacing: '1.5px', mb: 1, fontFamily: "'Noto Sans KR',sans-serif",
            }}>
              가장 많이 기록한 감정
            </Typography>
            <Box sx={{
              display: 'flex', flexWrap: 'wrap', gap: 0.8,
            }}>
              {EMOTION_LABELS.map(label => {
                const count = diaries.filter(d => d.emotion === label).length;
                if (count === 0) return null;
                const isTop = label === stats.topEmotion?.[0];
                return (
                  <Box key={label} sx={{
                    px: 1.4, py: 0.5, borderRadius: 2,
                    bgcolor: isTop ? B.pants : 'white',
                    border: `1.5px solid ${isTop ? B.pants : '#e0d6ec'}`,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                  }}>
                    <Typography sx={{ fontSize: '0.75rem', fontFamily: "'Noto Sans KR',sans-serif", color: isTop ? 'white' : B.dark }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: isTop ? 'rgba(255,255,255,0.7)' : '#bbb', fontFamily: "'Noto Sans KR',sans-serif" }}>
                      {count}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ height: 24 }} />
      </Box>
    </Drawer>
  );
}
