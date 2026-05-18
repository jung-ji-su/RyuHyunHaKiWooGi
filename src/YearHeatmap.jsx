import { Box, Typography, Stack } from '@mui/material';

const B = { pants: '#7B4FA6', accent: '#E8630A', dark: '#3D1F00' };
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function getHeatColor(avg) {
  const v = Math.round(avg);
  if (v === 0)  return 'rgba(136,136,136,0.25)';
  if (v < 20)   return '#B4B2A9';
  if (v < 40)   return '#85B7EB';
  if (v < 60)   return '#EF9F27';
  if (v < 80)   return '#7B4FA6';
  return         '#E8630A';
}

const CELL = 8;  // px
const GAP  = 1;  // px

export default function YearHeatmap({ temperatures, year }) {
  const today = new Date();

  const getColor = (iso) => {
    const dayTemps = temperatures.filter(t => t.date === iso && !t.isPenalty);
    if (!dayTemps.length) return null;
    const avg = dayTemps.reduce((s, t) => s + parseInt(t.temp ?? 0), 0) / dayTemps.length;
    return getHeatColor(avg);
  };

  const maxDays = 31;
  const gridWidth = maxDays * (CELL + GAP) - GAP; // 31*9-1 = 278

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* 색상 범례 */}
      <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={0.5} sx={{ mb: 1.2 }}>
        <Typography sx={{ fontSize: '0.54rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif" }}>낮음</Typography>
        {['#85B7EB','#EF9F27','#7B4FA6','#E8630A'].map((c, i) => (
          <Box key={i} sx={{ width: CELL, height: CELL, borderRadius: '2px', bgcolor: c }} />
        ))}
        <Typography sx={{ fontSize: '0.54rem', color: B.dark+'66', fontFamily: "'Noto Sans KR',sans-serif" }}>높음</Typography>
      </Stack>

      {/* 가로 스크롤 가능한 히트맵 */}
      <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', pb: 0.5 }}>
        <Box sx={{ minWidth: gridWidth + 28 }}>
          {/* 날짜 헤더 (1~31) */}
          <Box sx={{ display: 'flex', gap: `${GAP}px`, mb: '2px', ml: '28px' }}>
            {[5,10,15,20,25,31].map(n => (
              <Box key={n} sx={{
                width: (n === 5 ? 5 : n === 10 ? 5 : 1) * (CELL + GAP) - (n === 5 ? GAP : 0),
                textAlign: 'right', flexShrink: 0,
              }}>
                <Typography sx={{ fontSize: '0.5rem', color: B.dark+'55', fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1 }}>
                  {n}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* 월별 행 */}
          {Array.from({ length: 12 }, (_, m) => {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            return (
              <Box key={m} sx={{ display: 'flex', alignItems: 'center', gap: '4px', mb: `${GAP + 1}px` }}>
                {/* 월 라벨 */}
                <Typography sx={{
                  width: 24, fontSize: '0.54rem', color: B.dark+'88', flexShrink: 0,
                  textAlign: 'right', fontFamily: "'Noto Sans KR',sans-serif", lineHeight: 1,
                }}>
                  {MONTH_NAMES[m]}
                </Typography>
                {/* 날짜 셀들 */}
                <Box sx={{ display: 'flex', gap: `${GAP}px` }}>
                  {Array.from({ length: maxDays }, (_, dIdx) => {
                    const day = dIdx + 1;
                    const invalid = day > daysInMonth;
                    const iso = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const isFuture = !invalid && new Date(iso) > today;
                    const color = !invalid ? getColor(iso) : null;

                    return (
                      <Box key={day} sx={{
                        width: CELL, height: CELL, borderRadius: '2px', flexShrink: 0,
                        bgcolor: invalid
                          ? 'transparent'
                          : isFuture
                            ? 'rgba(200,200,200,0.10)'
                            : (color ?? 'rgba(200,200,200,0.18)'),
                        border: isFuture && !invalid ? '1px solid rgba(180,180,180,0.15)' : 'none',
                      }} />
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Typography sx={{
        textAlign: 'center', mt: 0.8, fontSize: '0.58rem',
        color: B.dark+'55', fontFamily: "'Noto Sans KR',sans-serif",
      }}>
        {year}년 감정 온도 · 좌우로 스크롤 가능해요
      </Typography>
    </Box>
  );
}
