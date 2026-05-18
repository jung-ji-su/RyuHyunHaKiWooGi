import { Box, CircularProgress, Typography } from '@mui/material';
import { B } from '../lib/constants';
import {
  buri1, buri2, buri3, buri4, buri5, buri6, buri7, buri8, buri9,
  buriPig, buriGirl, buriTired, buriShocked, buriFire, buriHeart,
  buriFlower, buriSmile, buriCry, buriClover, buriBeard, buriTongue,
  buriCouple,
} from '../lib/buriAssets';

// 모든 부리 이미지 — 각기 다른 크기·속도·지연으로 페이드인 후 바운스
const ALL_BURIS = [
  { img: buri1,       w: 34, d: '1.1s', dl: '0.00s' },
  { img: buri2,       w: 32, d: '1.2s', dl: '0.08s' },
  { img: buri3,       w: 40, d: '0.9s', dl: '0.16s' },
  { img: buri4,       w: 42, d: '1.0s', dl: '0.24s' },
  { img: buri5,       w: 38, d: '1.3s', dl: '0.32s' },
  { img: buri6,       w: 36, d: '1.1s', dl: '0.40s' },
  { img: buri7,       w: 36, d: '0.8s', dl: '0.48s' },
  { img: buri8,       w: 40, d: '1.2s', dl: '0.56s' },
  { img: buri9,       w: 38, d: '1.0s', dl: '0.64s' },
  { img: buriSmile,   w: 36, d: '1.4s', dl: '0.72s' },
  { img: buriHeart,   w: 34, d: '1.1s', dl: '0.80s' },
  { img: buriFlower,  w: 38, d: '0.9s', dl: '0.00s' },
  { img: buriClover,  w: 34, d: '1.3s', dl: '0.10s' },
  { img: buriTongue,  w: 32, d: '1.1s', dl: '0.20s' },
  { img: buriBeard,   w: 36, d: '1.4s', dl: '0.30s' },
  { img: buriPig,     w: 38, d: '1.0s', dl: '0.40s' },
  { img: buriGirl,    w: 34, d: '1.2s', dl: '0.50s' },
  { img: buriTired,   w: 36, d: '0.9s', dl: '0.60s' },
  { img: buriShocked, w: 38, d: '1.3s', dl: '0.70s' },
  { img: buriFire,    w: 36, d: '1.1s', dl: '0.80s' },
  { img: buriCry,     w: 34, d: '0.8s', dl: '0.16s' },
  { img: buriCouple,  w: 48, d: '1.4s', dl: '0.32s' },
];

export default function LoadingScreen() {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      height: '100vh', gap: 2, px: 2,
      background: `linear-gradient(160deg, ${B.cream} 0%, ${B.lavender} 50%, ${B.peach} 100%)`,
    }}>
      {/* 타이틀 */}
      <Typography sx={{
        fontFamily: "'Jua', sans-serif", fontSize: '1.15rem',
        color: B.pants, letterSpacing: 2,
        textShadow: `2px 2px 0 ${B.skin}88`,
        animation: 'fadeInUp 0.5s ease both',
      }}>
        🐷 부리부리 미니홈피 🐷
      </Typography>

      {/* 전체 부리 파레이드 */}
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: '6px', maxWidth: 360,
      }}>
        {ALL_BURIS.map(({ img, w, d, dl }, i) => {
          const bounceDl = (parseFloat(dl) + 0.35).toFixed(2) + 's';
          return (
            <Box key={i} component="img" src={img} alt="" sx={{
              width: w, objectFit: 'contain',
              animation: `fadeInUp 0.35s ease ${dl} both, headBob ${d} ease-in-out ${bounceDl} infinite`,
              filter: `drop-shadow(0 3px 8px ${B.pants}33)`,
            }} />
          );
        })}
      </Box>

      {/* 스피너 + 텍스트 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, animation: 'fadeInUp 0.5s ease 0.5s both' }}>
        <CircularProgress sx={{ color: B.pants }} size={28} />
        <Typography sx={{ color: B.pants, fontFamily: "'Jua',sans-serif", fontSize: '0.9rem' }}>
          부리부리 로딩중...
        </Typography>
      </Box>
    </Box>
  );
}
