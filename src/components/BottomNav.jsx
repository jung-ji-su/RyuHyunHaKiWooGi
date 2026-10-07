import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Drawer } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { alpha, B, MENU_ITEMS, BOTTOM_NAV } from '../lib/constants';
import { buri1, buri2, buriCouple, buriFire } from '../lib/buriAssets';
import { createBuriPang, vibrate } from '../touchEffects';
import { UserContext } from '../lib/UserContext';

const MODE_OPTIONS = [
  { value: 'system', label: '시스템', Icon: SettingsBrightnessIcon },
  { value: 'light',  label: '라이트', Icon: LightModeIcon },
  { value: 'dark',   label: '다크',  Icon: DarkModeIcon },
];

export default function BottomNav({ logout, colorMode = 'system', setColorMode }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const { currentUser } = useContext(UserContext);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTab = (path) => {
    if (!path) {
      vibrate([15, 10, 20]);
      setDrawerOpen(true);
      return;
    }
    vibrate(15);
    navigate(path);
  };

  return (
    <>
      {/* ── 사이드 드로어 (더보기) ── */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 290, bgcolor: B.cream,
            backgroundImage: `
              radial-gradient(circle at 90% 0%, ${alpha(B.lavender, '99')} 0%, transparent 45%),
              radial-gradient(circle at 10% 100%, ${alpha(B.peach, '88')} 0%, transparent 40%)
            `,
            borderRight: `2px solid ${alpha(B.pants, '22')}`,
            display: 'flex', flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          },
        }}>

        {/* 드로어 헤더 */}
        <Box sx={{
          px: 2.5, pt: 3, pb: 2,
          borderBottom: `1.5px dashed ${alpha(B.pants, '22')}`,
          animation: 'drawerHeaderIn 0.3s ease both',
          position: 'relative', overflow: 'visible',
        }}>
          <Box component="img" src={buri1} alt="" sx={{
            position: 'absolute', top: -16, right: 14, width: 52,
            animation: 'headBob 2s ease-in-out infinite',
            filter: `drop-shadow(0 2px 10px ${alpha(B.pants, '55')})`,
            pointerEvents: 'none',
          }} />
          <Box component="img" src={buriFire} alt="" sx={{
            position: 'absolute', top: -12, left: 10, width: 34,
            animation: 'headBob 2.4s ease-in-out 0.3s infinite',
            filter: `drop-shadow(0 2px 8px ${alpha(B.accent, '55')})`,
            pointerEvents: 'none',
          }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{
                fontFamily: "'Jua',sans-serif", fontSize: '1.3rem',
                color: B.pants, lineHeight: 1.2,
                textShadow: `1px 1px 0 ${alpha(B.skin, '88')}`,
              }}>
                메뉴 🐷
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: alpha(B.dark, '66'), mt: 0.3 }}>
                부리부리와 함께하는 우리의 공간 💜
              </Typography>
            </Box>
            <Box onClick={() => setDrawerOpen(false)} sx={{
              color: B.pants, cursor: 'pointer', p: 0.5,
              '&:active': { transform: 'scale(0.85)' },
            }}>
              <ChevronLeftIcon />
            </Box>
          </Box>
        </Box>

        {/* 메뉴 그리드 */}
        <Box sx={{ px: 1.5, pt: 2, flex: 1, overflowY: 'auto' }}>
          <Typography sx={{
            fontSize: '0.72rem', fontWeight: 700, color: alpha(B.pants, '88'),
            letterSpacing: '2px', mb: 1, px: 0.5,
            fontFamily: "'Noto Sans KR',sans-serif",
          }}>MENU</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {MENU_ITEMS.map((item, i) => {
              const isActive = pathname === item.path;
              return (
                <Box key={item.path}
                  onClick={() => { vibrate(15); navigate(item.path); setDrawerOpen(false); }}
                  onPointerDown={e => createBuriPang(e)}
                  sx={{
                    bgcolor: isActive ? B.pants : B.surface,
                    borderRadius: '16px',
                    border: `1.5px solid ${isActive ? 'transparent' : alpha(item.color, '33')}`,
                    p: '14px 12px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                    position: 'relative', overflow: 'hidden',
                    animation: `gridCardIn 0.3s ease ${i * 0.04}s both`,
                    transition: 'transform 0.12s, box-shadow 0.12s',
                    boxShadow: isActive ? `0 4px 16px ${alpha(B.pants, '44')}` : 'none',
                    '&:active': { transform: 'scale(0.93)' },
                  }}>
                  <Typography sx={{ fontSize: '22px', lineHeight: 1 }}>{item.emoji}</Typography>
                  <Typography sx={{
                    fontFamily: "'Jua',sans-serif", fontSize: '0.8rem',
                    color: isActive ? 'white' : B.dark, lineHeight: 1.2,
                  }}>{item.name}</Typography>
                  <Typography sx={{
                    fontSize: '0.72rem',
                    color: isActive ? 'rgba(255,255,255,0.7)' : alpha(B.dark, '55'),
                    fontFamily: "'Noto Sans KR',sans-serif",
                  }}>{item.sub}</Typography>
                  {isActive && (
                    <Box sx={{
                      position: 'absolute', top: 8, right: 8,
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: B.surface, opacity: 0.8,
                    }} />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* 홈으로 버튼 */}
          <Box
            onClick={() => { navigate('/'); setDrawerOpen(false); vibrate(15); }}
            onPointerDown={e => createBuriPang(e)}
            sx={{
              mt: 1.5, py: 1, borderRadius: '14px',
              bgcolor: alpha(B.pants, '18'), border: `1.5px solid ${alpha(B.pants, '33')}`,
              textAlign: 'center', cursor: 'pointer',
              transition: 'transform 0.12s',
              '&:active': { transform: 'scale(0.97)' },
              position: 'relative', overflow: 'hidden',
            }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '0.88rem', color: B.pants }}>
              🏠 홈으로 돌아가기
            </Typography>
          </Box>

          {/* 관리자 메뉴 (지수만) */}
          {currentUser === '지수' && (
            <Box
              onClick={() => { navigate('/admin'); setDrawerOpen(false); vibrate(15); }}
              sx={{
                mt: 1, py: 1, borderRadius: '14px',
                bgcolor: '#33333311', border: '1.5px solid #33333322',
                textAlign: 'center', cursor: 'pointer',
                transition: 'transform 0.12s',
                '&:active': { transform: 'scale(0.97)' },
              }}>
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.78rem', color: '#555', fontWeight: 600 }}>
                ⚙️ 관리자 패널
              </Typography>
            </Box>
          )}
        </Box>

        {/* 화면 모드(라이트/다크/시스템) */}
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Typography sx={{
            fontSize: '0.72rem', fontWeight: 700, color: alpha(B.pants, '88'),
            letterSpacing: '2px', mb: 1, px: 0.5,
            fontFamily: "'Noto Sans KR',sans-serif",
          }}>화면 모드</Typography>
          <Box sx={{ display: 'flex', gap: '6px', bgcolor: alpha(B.pants, '12'), borderRadius: '14px', p: '4px' }}>
            {MODE_OPTIONS.map((opt) => {
              const { value, label, Icon } = opt;
              const active = colorMode === value;
              return (
                <Box
                  key={value}
                  onClick={() => { vibrate(10); setColorMode?.(value); }}
                  sx={{
                    flex: 1, py: 1, borderRadius: '11px', textAlign: 'center', cursor: 'pointer',
                    bgcolor: active ? B.surface : 'transparent',
                    boxShadow: active ? `0 2px 8px ${alpha(B.pants, '22')}` : 'none',
                    transition: 'background-color 0.15s, box-shadow 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    minHeight: 44,
                    '&:active': { transform: 'scale(0.95)' },
                  }}
                >
                  <Icon sx={{ fontSize: '1.1rem', color: active ? B.pants : alpha(B.dark, '66') }} />
                  <Typography sx={{
                    fontSize: '0.62rem', fontFamily: "'Noto Sans KR',sans-serif",
                    color: active ? B.pants : alpha(B.dark, '66'), fontWeight: active ? 700 : 400,
                  }}>{label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* 드로어 푸터 */}
        <Box sx={{ p: 2, textAlign: 'center', borderTop: `1px dashed ${alpha(B.pants, '22')}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 1.5, mb: 0.5 }}>
            <Box component="img" src={buri2} alt=""
              sx={{ width: 48, opacity: 0.6, animation: 'buriFloat1 4s ease-in-out infinite' }} />
            <Box component="img" src={buriCouple} alt=""
              sx={{ width: 62, opacity: 0.55, animation: 'buriFloat2 5s ease-in-out 0.5s infinite' }} />
          </Box>
          <Box onClick={logout} sx={{ cursor: 'pointer' }}>
            <Typography sx={{
              fontSize: '0.72rem', color: alpha(B.dark, '44'),
              fontFamily: "'Noto Sans KR',sans-serif",
              '&:hover': { color: B.accent },
            }}>
              사용자 전환 (로그아웃)
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* ── 하단 탭 바 ── */}
      <Box sx={{
        bgcolor: alpha(B.cream, 'f2'), backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderTop: `1.5px solid ${alpha(B.pants, '22')}`,
        display: 'flex', alignItems: 'center',
        boxShadow: `0 -4px 24px ${alpha(B.pants, '14')}`,
        pb: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0,
      }}>
        {BOTTOM_NAV.map(({ emoji, name, path }) => {
          const active = path ? pathname === path : false;
          return (
            // 바텀탭은 하루 수십 번 눌리는 고빈도 액션이라(animate 스킬 Gate 1)
            // 파티클 버스트(createBuriPang) 없이 진동 피드백만 남긴다 — 더보기
            // 드로어의 메뉴 그리드(아래, line 108)는 상대적으로 가끔 쓰는
            // 의도적 선택이라 거기엔 그대로 유지.
            <Box key={name}
              onClick={(e) => handleTab(path, e)}
              sx={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                py: '10px', gap: '3px', cursor: 'pointer',
                transition: 'transform 0.12s',
                '&:active': { transform: 'scale(0.86)' },
              }}>
              {emoji === '🐹' ? (
                <Box component="span" sx={{
                  display: 'inline-block', fontSize: '22px', lineHeight: 1,
                  transform: active ? 'scale(1.10) translateY(-1px)' : 'scale(1)',
                  transition: 'transform 0.22s cubic-bezier(.34,1.56,.64,1)',
                  filter: active ? `drop-shadow(0 2px 8px ${alpha(B.pants, '99')})` : 'none',
                }}>
                  <span className={active ? 'hamster-active' : 'hamster-idle'}>🐹</span>
                </Box>
              ) : (
                <Typography sx={{
                  fontSize: '22px', lineHeight: 1,
                  filter: active ? `drop-shadow(0 2px 8px ${alpha(B.pants, '99')})` : 'none',
                  transform: active ? 'scale(1.08) translateY(-1px)' : 'scale(1)',
                  transition: 'transform 0.22s cubic-bezier(.34,1.56,.64,1), filter 0.2s',
                }}>
                  {emoji}
                </Typography>
              )}
              <Typography sx={{
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 400,
                fontFamily: "'Noto Sans KR',sans-serif",
                color: active ? B.pants : alpha(B.dark, '66'),
                transition: 'color 0.2s',
              }}>
                {name}
              </Typography>
              {active && (
                <Box sx={{
                  width: 4, height: 4, borderRadius: '50%', bgcolor: B.pants,
                  mt: '1px', animation: 'fadeInUp 0.2s ease',
                }} />
              )}
            </Box>
          );
        })}
      </Box>

    </>
  );
}
