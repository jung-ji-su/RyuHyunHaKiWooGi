import { Box, Container, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useNavigate } from 'react-router-dom';
import { B } from '../lib/constants';
import { vibrate } from '../touchEffects';

export default function SubPage({ title, icon, children }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* 상단 헤더 */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        bgcolor: B.cream + 'ee', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${B.pants}22`,
        px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <IconButton
          onPointerDown={() => vibrate(15)}
          onClick={() => setTimeout(() => navigate(-1), 50)}
          sx={{ color: B.pants, p: 0.5, '&:active': { transform: 'scale(0.88)' } }}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", color: B.pants,
          fontSize: '1.05rem', lineHeight: 1,
        }}>
          {icon} {title}
        </Typography>
      </Box>

      {/* 페이지 내용 */}
      <Container maxWidth="sm" sx={{ py: 2, pb: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
