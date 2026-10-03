import { AnimatePresence, motion } from 'framer-motion';
import { Box } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { vibrate } from '../touchEffects';
import { alpha, B } from '../lib/constants';

// 홈 화면 전용 라이트/다크 원탭 토글 — 더보기의 시스템/라이트/다크 3단 선택은 그대로 둔 채,
// 자주 쓰는 라이트↔다크 전환만 홈에서 한 번에 누르도록 분리했다. 알림벨(우상단 고정)과
// 대칭되는 좌상단에 sticky로 띄워 스크롤해도 늘 손이 닿고, height:0 트릭으로 레이아웃은
// 전혀 밀어내지 않는다(예전 FAB이 콘텐츠를 가리던 문제 재발 방지).
export default function ThemeQuickToggle({ effective, setColorMode }) {
  const isDark = effective === 'dark';

  const handleToggle = () => {
    vibrate(10);
    setColorMode(isDark ? 'light' : 'dark');
  };

  return (
    <Box sx={{
      position: 'sticky', top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      height: 0, zIndex: 20,
      display: 'flex', justifyContent: 'flex-start',
      pointerEvents: 'none',
    }}>
      <Box
        onClick={handleToggle}
        sx={{
          pointerEvents: 'auto',
          width: 44, height: 44, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: B.surface,
          border: `1.5px solid ${alpha(B.pants, '22')}`,
          boxShadow: `0 2px 14px ${alpha(B.pants, '33')}`,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          overflow: 'hidden',
          // 터치 기기는 탭 후 hover가 끼어있는 상태가 될 수 있어 포인터가 실제
          // 있는 기기에서만 hover 스타일을 건다.
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { bgcolor: B.lavender },
          },
          '&:active': { transform: 'scale(0.92)' },
          transition: 'transform 0.12s ease',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? 'dark' : 'light'}
            initial={{ opacity: 0, transform: 'rotate(-90deg) scale(0.6)' }}
            animate={{ opacity: 1, transform: 'rotate(0deg) scale(1)' }}
            exit={{ opacity: 0, transform: 'rotate(90deg) scale(0.6)' }}
            transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: 'flex' }}
          >
            {isDark
              ? <DarkModeIcon sx={{ color: B.pants, fontSize: '1.2rem' }} />
              : <LightModeIcon sx={{ color: B.accent, fontSize: '1.2rem' }} />
            }
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
