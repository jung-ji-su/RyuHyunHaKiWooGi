import { Box, Typography } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { B } from '../lib/constants';

export default function SectionCard({ icon, title, sub, buriImg, bgColor, borderColor, onMore, children }) {
  return (
    <Box sx={{
      bgcolor: bgColor || B.cream, borderRadius: 4,
      border: `1.5px solid ${borderColor || B.pants}33`,
      position: 'relative', overflow: 'visible',
      animation: 'fadeInUp 0.4s ease both',
    }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.2,
        borderBottom: `1px dashed ${borderColor || B.pants}22`,
        position: 'relative',
      }}>
        {buriImg && (
          <Box component="img" src={buriImg} alt=""
            sx={{
              position: 'absolute', top: -18, left: 10, width: 38,
              objectFit: 'contain', pointerEvents: 'none',
              filter: `drop-shadow(0 2px 6px ${borderColor || B.pants}44)`,
              animation: 'headBob 2.5s ease-in-out infinite',
            }}
          />
        )}
        <Box sx={{ pl: buriImg ? 5.5 : 0 }}>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: '0.95rem',
            color: borderColor || B.pants, lineHeight: 1.2,
          }}>
            {icon} {title}
          </Typography>
          {sub && (
            <Typography sx={{ fontSize: '0.68rem', color: B.dark + '66' }}>{sub}</Typography>
          )}
        </Box>
        {onMore && (
          <Box onClick={onMore} sx={{
            display: 'flex', alignItems: 'center', gap: 0.4,
            px: 1.2, py: '3px', borderRadius: '20px',
            bgcolor: (borderColor || B.pants) + '18',
            color: borderColor || B.pants,
            fontSize: '0.68rem', fontWeight: 700,
            fontFamily: "'Noto Sans KR',sans-serif",
            cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.15s',
            '&:active': { transform: 'scale(0.93)' },
          }}>
            전체보기 <ArrowForwardIosIcon sx={{ fontSize: 10 }} />
          </Box>
        )}
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}
