import { Box, Container, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { B, ROUTES } from '../lib/constants';
import {
  buri1, buri3, buri4, buri6, buri8, buri9,
  buriBeard, buriCouple, buriCry, buriShocked, buriSmile,
} from '../lib/buriAssets';
import SectionCard from '../components/SectionCard';
import CoupleCalendar from '../CoupleCalendar';
import DiaryWrite from '../DiaryWrite';
import DiaryList from '../DiaryList';
import CoupleDDay from '../CoupleDDay';
import CharacterPet from '../CharacterPet';

export default function HomePage({ currentUser, logout }) {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
      <CoupleDDay />

      <Box sx={{ textAlign: 'right', mb: 1 }}>
        <Button size="small" onClick={logout}
          sx={{ color: B.pants + '88', fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.75rem' }}>
          사용자 전환 (로그아웃)
        </Button>
      </Box>

      {/* 메인 헤더 배너 */}

      <Stack spacing={2}>
        <SectionCard
          icon="🐷" title= {currentUser}
          sub="매일 기록하면 HP가 올라가요 💗"
          buriImg={buriSmile} bgColor={B.lavender + '44'} borderColor={B.pants}>
          <CharacterPet currentUser={currentUser} />
        </SectionCard>

        <SectionCard
          icon="📅" title="우리의 일정"
          sub="활 쏘는 부리부리가 날짜를 지키고 있어요 🏹"
          buriImg={buri6} bgColor={B.lavender + '44'} borderColor={B.pants}
          onMore={() => navigate(ROUTES.SCHEDULE)}>
          <CoupleCalendar currentUser={currentUser} />
        </SectionCard>

        <SectionCard
          icon="✍️" title="오늘의 기록"
          sub="칼 든 부리부리처럼 기록해요 ⚔️"
          buriImg={buri4} bgColor="#FFF0E8" borderColor={B.accent}>
          <DiaryWrite currentUser={currentUser} />
        </SectionCard>

        <SectionCard
          icon="📖" title="최근 기록"
          sub="탐정 부리부리가 기억해요 🕵️"
          buriImg={buri9} bgColor={B.lavender + '44'} borderColor={B.pants}
          onMore={() => navigate(ROUTES.DIARY)}>
          <DiaryList currentUser={currentUser} pageSize={3} />
        </SectionCard>
      </Stack>

      {/* 메인 푸터 */}
      <Box sx={{ textAlign: 'center', mt: 5, opacity: 0.42 }}>
        <Stack direction="row" justifyContent="center" alignItems="flex-end" gap={1.5}>
          <Box component="img" src={buriBeard} alt="" sx={{ width: 44, animation: 'buriFloat3 6s ease-in-out infinite' }} />
          <Box component="img" src={buri3} alt=""     sx={{ width: 56, animation: 'buriFloat3 5s ease-in-out infinite' }} />
          <Box component="img" src={buriCouple} alt="" sx={{ width: 72, animation: 'buriFloat1 5.5s ease-in-out 0.3s infinite' }} />
          <Box component="img" src={buri8} alt=""     sx={{ width: 56, animation: 'buriFloat1 5s ease-in-out infinite' }} />
          <Box component="img" src={buriCry} alt=""   sx={{ width: 44, animation: 'buriFloat2 6s ease-in-out 0.6s infinite' }} />
        </Stack>
        <Typography sx={{ fontSize: '0.72rem', color: B.dark + '66', mt: 1, fontFamily: "'Jua',sans-serif" }}>
          🐷 부리부리 미니홈피 🐷
        </Typography>
      </Box>
    </Container>
  );
}
