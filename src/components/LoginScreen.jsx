import { Box, Typography, Stack } from '@mui/material';
import { B } from '../lib/constants';
import {
  buri1, buri2, buri3, buri4, buri5, buri6, buri7, buri8, buri9,
  buriPig, buriGirl, buriTired, buriSmile, buriTongue, buriClover,
  buriHeart, buriShocked, buriFire, buriFlower, buriCry, buriBeard,
  buriCouple, meImg, gfImg,
} from '../lib/buriAssets';
import { createBuriPang, vibrate } from '../touchEffects';

const topBuris = [
  { img: buriSmile,   w: 38, d: '2.0s', dl: '0s'   },
  { img: buri3,       w: 46, d: '2.2s', dl: '0.15s' },
  { img: buriTongue,  w: 66, d: '2.6s', dl: '0.3s'  },
  { img: buri6,       w: 46, d: '2.4s', dl: '0.45s' },
  { img: buri2,       w: 38, d: '2.1s', dl: '0.6s'  },
  { img: buriShocked, w: 34, d: '1.9s', dl: '0.75s' },
  { img: buriFire,    w: 34, d: '2.3s', dl: '0.9s'  },
];
const bottomBuris = [buriPig, buri5, buri8, buriGirl, buri4, buriTired, buri9, buriFlower, buriCry, buriBeard, buriCouple];
const floatEmojis  = ['🐷','💜','✨','🎉','⭐','💕','🎊','🐷','💜','✨'];

export default function LoginScreen({ onLogin }) {
  const handleSelect = (role, e) => {
    createBuriPang(e);
    vibrate([30, 15, 30, 15, 60]);
    setTimeout(() => onLogin(role), 200);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${B.cream} 0%, ${B.lavender} 45%, ${B.peach} 100%)`,
      backgroundSize: '300% 300%', animation: 'loginBgShift 8s ease infinite',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      px: 3, py: 4, position: 'relative', overflow: 'hidden',
    }}>
      {/* 반짝이 도트 */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Box key={i} sx={{
          position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
          width: `${4 + (i % 5) * 1.5}px`, height: `${4 + (i % 5) * 1.5}px`,
          left: `${(i * 5.1) % 100}%`, top: `${(i * 7.3) % 100}%`,
          bgcolor: [B.pants, B.skin, B.accent, B.lavender][i % 4] + '88',
          animation: `twinkleDot ${1.5 + (i % 3) * 0.7}s ease-in-out infinite`,
          animationDelay: `${(i * 0.17).toFixed(1)}s`,
        }} />
      ))}

      {/* 떠다니는 이모지 */}
      {floatEmojis.map((emoji, i) => (
        <Box key={i} sx={{
          position: 'absolute', bottom: '-20px', left: `${8 + i * 9}%`,
          fontSize: '20px', lineHeight: 1,
          animation: `floatEmoji ${5 + (i % 4)}s ease-in-out infinite`,
          animationDelay: `${(i * 0.65).toFixed(1)}s`,
          pointerEvents: 'none', userSelect: 'none',
        }}>{emoji}</Box>
      ))}

      {/* 상단 부리 5인방 */}
      <Stack direction="row" justifyContent="center" alignItems="flex-end"
        gap={1} sx={{ mb: 1, position: 'relative', zIndex: 2 }}>
        {topBuris.map(({ img, w, d, dl }, i) => (
          <Box key={i} component="img" src={img} alt="" sx={{
            width: w, objectFit: 'contain',
            filter: `drop-shadow(0 4px 14px ${B.pants}55)`,
            animation: `loginBuriFloat ${d} ease-in-out infinite`,
            animationDelay: dl,
          }} />
        ))}
      </Stack>

      {/* 타이틀 */}
      <Box sx={{ textAlign: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
        <Typography sx={{
          fontFamily: "'Jua', sans-serif", fontSize: '2.2rem', color: B.pants,
          textShadow: `3px 3px 0 ${B.skin}88, 0 0 30px ${B.pants}33`,
          animation: 'titleDrop 0.65s ease both', lineHeight: 1.2,
        }}>Who are you? 🕵️</Typography>
        <Typography sx={{
          fontSize: '0.82rem', color: B.dark + '88', mt: 0.8,
          fontFamily: "'Noto Sans KR', sans-serif",
          animation: 'fadeInUp 0.5s ease 0.3s both',
        }}>부리부리가 기다리고 있어요 🐷</Typography>
      </Box>

      {/* 로그인 카드 */}
      <Stack direction="row" spacing={2.5} sx={{ position: 'relative', zIndex: 2, mb: 3 }}>
        {/* 지수 카드 */}
        <Box component="button" onPointerDown={e => handleSelect('지수', e)}
          sx={{
            width: 148, background: 'white', borderRadius: '28px',
            p: '22px 16px 18px', textAlign: 'center', cursor: 'pointer',
            border: `2.5px solid ${B.pants}55`, boxShadow: `0 8px 28px ${B.pants}22`,
            position: 'relative', overflow: 'visible',
            animation: 'cardSlideUp 0.55s ease 0.15s both',
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:active': { transform: 'scale(0.91)' }, outline: 'none',
          }}>
          <Box sx={{
            position: 'absolute', top: 0, left: '-70%', width: '40%', height: '100%',
            borderRadius: '28px', pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
            animation: 'shineSlide 3.5s ease-in-out infinite',
          }} />
          <Box sx={{
            width: 88, height: 88, borderRadius: '50%', border: `3.5px solid ${B.pants}`,
            overflow: 'hidden', mx: 'auto', mb: 1.5, animation: 'avatarPulseA 2.5s ease-in-out infinite',
          }}>
            <Box component="img" src={meImg} alt="지수" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', color: B.dark, mb: 0.6 }}>지수</Typography>
          <Box sx={{
            display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
            px: 1.5, py: '3px', borderRadius: '20px',
            bgcolor: B.lavender, color: B.pants, fontFamily: "'Noto Sans KR',sans-serif",
          }}>💜 나야나</Box>
          <Box component="img" src={buri1} alt="" sx={{
            position: 'absolute', top: -22, right: -14, width: 46,
            objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 2px 8px ${B.pants}55)`,
            animation: 'buriWiggle 2.2s ease-in-out infinite',
          }} />
          <Box component="img" src={buriClover} alt="" sx={{
            position: 'absolute', bottom: -16, left: -12, width: 36,
            objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 2px 6px ${B.pants}44)`,
            animation: 'buriWiggle 2.8s ease-in-out 0.5s infinite',
          }} />
        </Box>

        {/* 현하 카드 */}
        <Box component="button" onPointerDown={e => handleSelect('현하', e)}
          sx={{
            width: 148, background: 'white', borderRadius: '28px',
            p: '22px 16px 18px', textAlign: 'center', cursor: 'pointer',
            border: `2.5px solid ${B.skin}`, boxShadow: `0 8px 28px ${B.skin}44`,
            position: 'relative', overflow: 'visible',
            animation: 'cardSlideUp 0.55s ease 0.3s both',
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:active': { transform: 'scale(0.91)' }, outline: 'none',
          }}>
          <Box sx={{
            position: 'absolute', top: 0, left: '-70%', width: '40%', height: '100%',
            borderRadius: '28px', pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
            animation: 'shineSlide 3.5s ease-in-out 1.2s infinite',
          }} />
          <Box sx={{
            width: 88, height: 88, borderRadius: '50%', border: `3.5px solid ${B.skin}`,
            overflow: 'hidden', mx: 'auto', mb: 1.5, animation: 'avatarPulseB 2.8s ease-in-out infinite',
          }}>
            <Box component="img" src={gfImg} alt="현하" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.15rem', color: B.dark, mb: 0.6 }}>현하</Typography>
          <Box sx={{
            display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
            px: 1.5, py: '3px', borderRadius: '20px',
            bgcolor: B.peach, color: B.accent, fontFamily: "'Noto Sans KR',sans-serif",
          }}>🧡 나야나</Box>
          <Box component="img" src={buri7} alt="" sx={{
            position: 'absolute', top: -22, right: -14, width: 46,
            objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 2px 8px ${B.skin}88)`,
            animation: 'buriWiggle 2.6s ease-in-out infinite',
            animationDelay: '0.4s',
          }} />
          <Box component="img" src={buriHeart} alt="" sx={{
            position: 'absolute', bottom: -16, left: -12, width: 36,
            objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 2px 6px ${B.skin}88)`,
            animation: 'buriWiggle 3s ease-in-out 0.8s infinite',
          }} />
        </Box>
      </Stack>

      <Typography sx={{
        fontFamily: "'Jua',sans-serif", fontSize: '0.72rem', color: B.dark + '66',
        animation: 'hintPulse 2.5s ease-in-out infinite',
        position: 'relative', zIndex: 2, mb: 2.5,
      }}>✨ 나를 선택해서 입장하기 ✨</Typography>

      {/* 하단 부리 행 */}
      <Stack direction="row" gap={1.5} justifyContent="center"
        sx={{ position: 'relative', zIndex: 2, opacity: 0.65, flexWrap: 'wrap' }}>
        {bottomBuris.map((img, i) => (
          <Box key={i} component="img" src={img} alt="" sx={{
            width: 30, objectFit: 'contain',
            animation: `buriWiggle ${2 + i * 0.25}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
            filter: `drop-shadow(0 2px 6px ${B.pants}33)`,
          }} />
        ))}
      </Stack>
    </Box>
  );
}
