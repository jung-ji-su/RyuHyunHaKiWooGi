import { lazy, Suspense } from 'react';
import { Box, Container, Stack, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { alpha, B, ROUTES } from '../lib/constants';
import {
  buri3, buri4, buri6, buri8, buri9,
  buriCouple, buriSmile,
} from '../lib/buriAssets';
import SectionCard from '../components/SectionCard';
import NotifButton from '../components/NotifButton';
import ThemeQuickToggle from '../components/ThemeQuickToggle';
import QuickNotif from '../components/QuickNotif';
import CoupleCalendar from '../CoupleCalendar';
import DiaryWrite from '../DiaryWrite';
import CoupleDDay from '../CoupleDDay';
import CharacterPet from '../CharacterPet';

// DiaryList는 전체 모듈이 JS.jpg/HY.jpg(실사진) 등 큰 자산을 import하므로,
// 홈 화면에 정적 import하면 홈 진입 즉시 같이 받아와진다 — lazy로 분리해
// 실제로 이 섹션이 렌더될 때만 내려받게 한다.
const DiaryList = lazy(() => import('../DiaryList'));

export default function HomePage({ currentUser, logout, effectiveColorMode, setColorMode }) {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
      {setColorMode && <ThemeQuickToggle effective={effectiveColorMode} setColorMode={setColorMode} />}
      <CoupleDDay />
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <NotifButton />
      </Box>

      {/* 메인 헤더 배너 */}

      <Stack spacing={2}>
        <SectionCard
          index={0}
          icon="🐷" title= {currentUser}
          sub="매일 기록하면 HP가 올라가요 💗"
          buriImg={buriSmile} bgColor={alpha(B.lavender, '44')} borderColor={B.pants}>
          <CharacterPet currentUser={currentUser} />
        </SectionCard>

        <SectionCard
          index={1}
          icon="💌" title="콕 찌르기"
          sub="버튼 하나로 상대방에게 알림 보내기 👉"
          buriImg={buriSmile} bgColor={alpha(B.peach, '66')} borderColor={B.accent}>
          <QuickNotif />
        </SectionCard>

        <SectionCard
          index={2}
          icon="📅" title="우리의 일정"
          buriImg={buri6} bgColor={alpha(B.lavender, '44')} borderColor={B.pants}
          onMore={() => navigate(ROUTES.SCHEDULE)}
          noPadding>
          <CoupleCalendar currentUser={currentUser} />
        </SectionCard>

        <SectionCard
          index={3}
          icon="✍️" title="오늘의 기록"
          sub="칼 든 부리부리처럼 기록해요 ⚔️"
          buriImg={buri4} bgColor={alpha(B.accent, '15')} borderColor={B.accent}>
          <DiaryWrite currentUser={currentUser} />
        </SectionCard>

        <SectionCard
          index={4}
          icon="📖" title="최근 기록"
          sub="탐정 부리부리가 기억해요 🕵️"
          buriImg={buri9} bgColor={alpha(B.lavender, '44')} borderColor={B.pants}
          onMore={() => navigate(ROUTES.DIARY)}>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={22} sx={{ color: B.pants }} />
            </Box>
          }>
            <DiaryList currentUser={currentUser} pageSize={3} />
          </Suspense>
        </SectionCard>
      </Stack>

      {/* 메인 푸터 */}
      <Box sx={{ textAlign: 'center', mt: 5, opacity: 0.42 }}>
        <Stack direction="row" justifyContent="center" alignItems="flex-end" gap={1.5}>
          <Box component="img" src={buri3} alt=""      sx={{ width: 56, animation: 'buriFloat3 5s ease-in-out infinite' }} />
          <Box component="img" src={buriCouple} alt="" sx={{ width: 72, animation: 'buriFloat1 5.5s ease-in-out 0.3s infinite' }} />
          <Box component="img" src={buri8} alt=""      sx={{ width: 56, animation: 'buriFloat1 5s ease-in-out infinite' }} />
        </Stack>
        <Typography sx={{ fontSize: '0.72rem', color: alpha(B.dark, '66'), mt: 1, fontFamily: "'Jua',sans-serif" }}>
          🐷 부리부리 미니홈피 🐷
        </Typography>
      </Box>
    </Container>
  );
}
