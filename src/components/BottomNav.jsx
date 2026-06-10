import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Drawer } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { B, MENU_ITEMS, BOTTOM_NAV } from '../lib/constants';
import { buri1, buri2, buriCouple, buriFire } from '../lib/buriAssets';
import { createBuriPang, vibrate } from '../touchEffects';
import { UserContext } from '../lib/UserContext';

export default function BottomNav({ logout }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const { currentUser } = useContext(UserContext);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTab = (path, e) => {
    if (!path) {
      vibrate([15, 10, 20]);
      setDrawerOpen(true);
      return;
    }
    if (e) createBuriPang(e);
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
              radial-gradient(circle at 90% 0%, ${B.lavender}99 0%, transparent 45%),
              radial-gradient(circle at 10% 100%, ${B.peach}88 0%, transparent 40%)
            `,
            borderRight: `2px solid ${B.pants}22`,
            display: 'flex', flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          },
        }}>

        {/* 드로어 헤더 */}
        <Box sx={{
          px: 2.5, pt: 3, pb: 2,
          borderBottom: `1.5px dashed ${B.pants}22`,
          animation: 'drawerHeaderIn 0.3s ease both',
          position: 'relative', overflow: 'visible',
        }}>
          <Box component="img" src={buri1} alt="" sx={{
            position: 'absolute', top: -16, right: 14, width: 52,
            animation: 'headBob 2s ease-in-out infinite',
            filter: `drop-shadow(0 2px 10px ${B.pants}55)`,
            pointerEvents: 'none',
          }} />
          <Box component="img" src={buriFire} alt="" sx={{
            position: 'absolute', top: -12, left: 10, width: 34,
            animation: 'headBob 2.4s ease-in-out 0.3s infinite',
            filter: `drop-shadow(0 2px 8px ${B.accent}55)`,
            pointerEvents: 'none',
          }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{
                fontFamily: "'Jua',sans-serif", fontSize: '1.3rem',
                color: B.pants, lineHeight: 1.2,
                textShadow: `1px 1px 0 ${B.skin}88`,
              }}>
                메뉴 🐷
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: B.dark + '66', mt: 0.3 }}>
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
        <Box sx={{ px: 1.6, pt: 2, flex: 1, overflowY: 'auto' }}>
          <Typography sx={{
            fontSize: '0.6rem', fontWeight: 700, color: B.pants + '88',
            letterSpacing: '2px', mb: 1.2, px: 0.5,
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
                    bgcolor: isActive ? B.pants : 'white',
                    borderRadius: '16px',
                    border: `1.5px solid ${isActive ? 'transparent' : item.color + '33'}`,
                    p: '14px 12px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                    position: 'relative', overflow: 'hidden',
                    animation: `gridCardIn 0.3s ease ${i * 0.04}s both`,
                    transition: 'transform 0.12s, box-shadow 0.12s',
                    boxShadow: isActive ? `0 4px 16px ${B.pants}44` : 'none',
                    '&:active': { transform: 'scale(0.93)' },
                  }}>
                  <Typography sx={{ fontSize: '22px', lineHeight: 1 }}>{item.emoji}</Typography>
                  <Typography sx={{
                    fontFamily: "'Jua',sans-serif", fontSize: '0.8rem',
                    color: isActive ? 'white' : B.dark, lineHeight: 1.2,
                  }}>{item.name}</Typography>
                  <Typography sx={{
                    fontSize: '0.6rem',
                    color: isActive ? 'rgba(255,255,255,0.7)' : B.dark + '55',
                    fontFamily: "'Noto Sans KR',sans-serif",
                  }}>{item.sub}</Typography>
                  {isActive && (
                    <Box sx={{
                      position: 'absolute', top: 8, right: 8,
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: 'white', opacity: 0.8,
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
              mt: 1.5, py: 1.2, borderRadius: '14px',
              bgcolor: B.pants + '18', border: `1.5px solid ${B.pants}33`,
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

        {/* 드로어 푸터 */}
        <Box sx={{ p: 2, textAlign: 'center', borderTop: `1px dashed ${B.pants}22` }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 1.5, mb: 0.5 }}>
            <Box component="img" src={buri2} alt=""
              sx={{ width: 48, opacity: 0.6, animation: 'buriFloat1 4s ease-in-out infinite' }} />
            <Box component="img" src={buriCouple} alt=""
              sx={{ width: 62, opacity: 0.55, animation: 'buriFloat2 5s ease-in-out 0.5s infinite' }} />
          </Box>
          <Box onClick={logout} sx={{ cursor: 'pointer' }}>
            <Typography sx={{
              fontSize: '0.65rem', color: B.dark + '44',
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
        bgcolor: B.cream + 'f2', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderTop: `1.5px solid ${B.pants}22`,
        display: 'flex', alignItems: 'center',
        boxShadow: `0 -4px 24px ${B.pants}14`,
        pb: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0,
      }}>
        {BOTTOM_NAV.map(({ emoji, name, path }) => {
          const active = path ? pathname === path : false;
          return (
            <Box key={name}
              onClick={(e) => handleTab(path, e)}
              onPointerDown={e => createBuriPang(e)}
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
                  filter: active ? `drop-shadow(0 2px 8px ${B.pants}99)` : 'none',
                }}>
                  <span className={active ? 'hamster-active' : 'hamster-idle'}>🐹</span>
                </Box>
              ) : (
                <Typography sx={{
                  fontSize: '22px', lineHeight: 1,
                  filter: active ? `drop-shadow(0 2px 8px ${B.pants}99)` : 'none',
                  transform: active ? 'scale(1.08) translateY(-1px)' : 'scale(1)',
                  transition: 'transform 0.22s cubic-bezier(.34,1.56,.64,1), filter 0.2s',
                }}>
                  {emoji}
                </Typography>
              )}
              <Typography sx={{
                fontSize: '0.62rem',
                fontWeight: active ? 700 : 400,
                fontFamily: "'Noto Sans KR',sans-serif",
                color: active ? B.pants : B.dark + '66',
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
