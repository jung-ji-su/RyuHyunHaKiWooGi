import { useState, useContext, useSyncExternalStore } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Drawer } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { alpha, B, MENU_ITEMS, BOTTOM_NAV } from '../lib/constants';
import { buri1, buri2, buriCouple } from '../lib/buriAssets';
import { createBuriPang, vibrate } from '../touchEffects';
import { UserContext } from '../lib/UserContext';
import { getSensorState, subscribeSensor, enableSensor, disableSensor } from '../lib/shakeSensor';

const MODE_OPTIONS = [
  { value: 'system', label: '시스템', Icon: SettingsBrightnessIcon },
  { value: 'light',  label: '라이트', Icon: LightModeIcon },
  { value: 'dark',   label: '다크',  Icon: DarkModeIcon },
];

// 시즌 테마는 라이트/다크와 별개 — 크리스마스를 켜도 낮/밤(위 화면 모드)은 그대로 고를 수 있다.
const SEASON_OPTIONS = [
  { value: 'none',      label: '기본',     Icon: PaletteOutlinedIcon },
  { value: 'christmas', label: '크리스마스', Icon: AcUnitIcon },
];

// 크리스마스 눈 "흔들기" 칩 — 권한을 묻는 유일한 곳(맥락: 시즌 테마 설정 바로 아래, 기존 UI를 가리지 않음).
// 로드 직후엔 묻지 않고 "켜기"를 누른 순간에만 iOS 권한창을 띄운다. 거부하면 다시 묻지 않고 설정에서 켜는 법만 안내한다.
function ShakeRow() {
  const state = useSyncExternalStore(subscribeSensor, getSensorState, () => 'idle');
  if (state === 'idle' || state === 'unsupported' || state === 'nosensor') return null;   // 쓸 수 없는 환경(데스크톱 등)에선 숨김
  const canToggle = state !== 'denied';
  const on = state === 'listening';
  const text = on ? '📳 흔들기 켜짐 — 폰을 흔들어 보세요'
    : state === 'denied' ? '📳 흔들기가 꺼져 있어요 — 설정 › Safari › 동작 및 방향 접근에서 허용하면 쓸 수 있어요'
    : '📳 폰을 흔들면 눈이 날려요';
  return (
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
      <Typography sx={{ flex: 1, fontSize: '0.72rem', lineHeight: 1.4, fontFamily: "'Noto Sans KR',sans-serif", color: on ? B.pants : alpha(B.dark, '88'), fontWeight: on ? 700 : 400 }}>
        {text}
      </Typography>
      {canToggle && (
        <Box onClick={() => { vibrate(10); if (on) disableSensor(); else enableSensor(); }}
          sx={{
            px: 1.5, py: '6px', borderRadius: '999px', cursor: 'pointer', flexShrink: 0, minHeight: 32, display: 'flex', alignItems: 'center',
            fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Noto Sans KR',sans-serif",
            bgcolor: on ? alpha(B.pants, '14') : B.pants, color: on ? B.pants : '#fff',
            border: `1px solid ${alpha(B.pants, '44')}`, '&:active': { transform: 'scale(0.95)' },
          }}>
          {on ? '끄기' : '켜기'}
        </Box>
      )}
    </Box>
  );
}

// 설정 패널의 세그먼트 선택(화면 모드/시즌 테마 공용). 터치 타겟 44px 이상.
function SegRow({ label, options, value, onChange }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: alpha(B.dark, 'b8'), mb: 0.8, px: 0.5, fontFamily: "'Noto Sans KR',sans-serif" }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: '6px', bgcolor: alpha(B.pants, '12'), borderRadius: '14px', p: '4px' }}>
        {options.map(({ value: v, label: l, Icon }) => {
          const active = value === v;
          return (
            <Box key={v} onClick={() => { vibrate(10); onChange?.(v); }}
              sx={{
                flex: 1, py: 1, borderRadius: '11px', textAlign: 'center', cursor: 'pointer',
                bgcolor: active ? B.surface : 'transparent',
                boxShadow: active ? `0 2px 8px ${alpha(B.pants, '22')}` : 'none',
                transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.12s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minHeight: 44,
                '&:active': { transform: 'scale(0.95)' },
              }}>
              <Icon sx={{ fontSize: '1.1rem', color: active ? B.pants : alpha(B.dark, '99') }} />
              <Typography sx={{ fontSize: '0.68rem', fontFamily: "'Noto Sans KR',sans-serif", color: active ? B.pants : alpha(B.dark, 'a0'), fontWeight: active ? 700 : 400 }}>{l}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function BottomNav({ logout, colorMode = 'system', setColorMode, season = 'none', setSeason }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const { currentUser } = useContext(UserContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 하단 탭에 이미 있는 메뉴는 드로어에서 뺀다 — 탭 구성이 바뀌어도 자동으로 맞는다
  const tabPaths = new Set(BOTTOM_NAV.map((n) => n.path).filter(Boolean));
  const drawerItems = MENU_ITEMS.filter((item) => !tabPaths.has(item.path));
  const xmas = season === 'christmas';
  const itemAnim = (i) => ({ animation: `drawerItemIn 0.26s cubic-bezier(0.23, 1, 0.32, 1) ${0.05 + i * 0.05}s both`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } });

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
            width: 300, maxWidth: '86vw', bgcolor: B.cream,
            backgroundImage: xmas
              ? `radial-gradient(circle at 90% 0%, ${alpha('#C62828', '14')} 0%, transparent 45%), radial-gradient(circle at 10% 100%, ${alpha('#2E7D32', '18')} 0%, transparent 42%)`
              : `radial-gradient(circle at 90% 0%, ${alpha(B.lavender, '99')} 0%, transparent 45%), radial-gradient(circle at 10% 100%, ${alpha(B.peach, '88')} 0%, transparent 40%)`,
            borderRight: `2px solid ${alpha(B.pants, '22')}`,
            // 내용이 길어도 전부 보이게: 패널 전체가 스크롤된다(예전엔 메뉴 영역만 flex로 줄어들어 카드가 잘렸다)
            display: 'flex', flexDirection: 'column', overflowY: 'auto', overscrollBehavior: 'contain',
            paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          },
        }}>

        {/* 크리스마스: 맨 위 캔디케인 띠(과하지 않게 4px) */}
        {xmas && <Box sx={{ height: 4, flexShrink: 0, background: 'repeating-linear-gradient(135deg, #C62828 0 8px, #FFF8EC 8px 16px)', opacity: 0.85 }} />}

        {/* 헤더: 캐릭터는 글자 옆에 나란히(겹치지 않게) */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, animation: 'drawerHeaderIn 0.26s cubic-bezier(0.23, 1, 0.32, 1) both', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
          <Box component="img" src={buri1} alt="" sx={{ width: 46, height: 46, objectFit: 'contain', flexShrink: 0, filter: `drop-shadow(0 2px 8px ${alpha(B.pants, '44')})`, pointerEvents: 'none' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1.35rem', color: B.pants, lineHeight: 1.2 }}>
              메뉴 {xmas ? '🎄' : ''}
            </Typography>
            <Typography sx={{ fontSize: '0.76rem', color: alpha(B.dark, 'b8'), mt: 0.3, fontFamily: "'Noto Sans KR',sans-serif" }}>
              {xmas ? '메리 크리스마스, 부리부리와 함께 💜' : '부리부리와 함께하는 우리의 공간 💜'}
            </Typography>
          </Box>
          <Box onClick={() => setDrawerOpen(false)} role="button" aria-label="메뉴 닫기" sx={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            color: B.pants, cursor: 'pointer', transition: 'transform 0.12s, background-color 0.12s',
            '&:active': { transform: 'scale(0.9)', bgcolor: alpha(B.pants, '14') },
          }}>
            <ChevronLeftIcon />
          </Box>
        </Box>

        {/* ── 메뉴: 하단 탭에 없는 것만 ── */}
        <Box component="nav" sx={{ px: 1.75, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: alpha(B.pants, 'cc'), letterSpacing: '2px', mb: 1, px: 0.5, fontFamily: "'Noto Sans KR',sans-serif" }}>바로가기</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {drawerItems.map((item, idx) => {
              const isActive = pathname === item.path;
              return (
                <Box key={item.path}
                  onClick={() => { vibrate(15); navigate(item.path); setDrawerOpen(false); }}
                  onPointerDown={(e) => createBuriPang(e)}
                  sx={{
                    ...itemAnim(idx),
                    display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64, px: 1.5, py: 1,
                    borderRadius: '18px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    bgcolor: isActive ? B.pants : B.surface,
                    border: `1.5px solid ${isActive ? 'transparent' : alpha(item.color, '44')}`,
                    boxShadow: isActive ? `0 4px 16px ${alpha(B.pants, '44')}` : `0 1px 6px ${alpha(B.pants, '12')}`,
                    transition: 'transform 0.12s ease-out, box-shadow 0.12s ease-out',
                    '&:active': { transform: 'scale(0.97)' },
                  }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '14px', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: '24px', bgcolor: isActive ? 'rgba(255,255,255,0.2)' : alpha(item.color, '1f') }}>{item.emoji}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1rem', lineHeight: 1.25, color: isActive ? '#fff' : B.dark }}>{item.name}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.35, mt: '2px', fontFamily: "'Noto Sans KR',sans-serif", color: isActive ? 'rgba(255,255,255,0.88)' : alpha(B.dark, 'b8') }}>{item.sub}</Typography>
                  </Box>
                  <ChevronRightIcon sx={{ fontSize: '1.3rem', color: isActive ? 'rgba(255,255,255,0.85)' : alpha(B.pants, '99') }} />
                </Box>
              );
            })}
          </Box>

          {/* 관리자 메뉴 (지수만) */}
          {currentUser === '지수' && (
            <Box onClick={() => { navigate('/admin'); setDrawerOpen(false); vibrate(15); }}
              sx={{ ...itemAnim(drawerItems.length), mt: 1, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', cursor: 'pointer', bgcolor: alpha(B.dark, '0d'), border: `1.5px solid ${alpha(B.dark, '22')}`, transition: 'transform 0.12s ease-out', '&:active': { transform: 'scale(0.97)' } }}>
              <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.8rem', color: alpha(B.dark, 'cc'), fontWeight: 600 }}>⚙️ 관리자 패널</Typography>
            </Box>
          )}
        </Box>

        {/* ── 설정: 메뉴와 확실히 분리된 패널 ── */}
        <Box component="section" aria-label="설정" sx={{ mx: 1.75, mt: 2.5, flexShrink: 0, ...itemAnim(drawerItems.length + 1) }}>
          <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: alpha(B.pants, 'cc'), letterSpacing: '2px', mb: 1, px: 0.5, fontFamily: "'Noto Sans KR',sans-serif" }}>설정</Typography>
          <Box sx={{ borderRadius: '20px', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.75, bgcolor: alpha(B.pants, '0d'), border: `1.5px solid ${alpha(B.pants, '22')}` }}>
            <SegRow label="화면 모드" options={MODE_OPTIONS} value={colorMode} onChange={setColorMode} />
            {setSeason && (
              <Box>
                <SegRow label="시즌 테마" options={SEASON_OPTIONS} value={season} onChange={setSeason} />
                {season === 'christmas' && <ShakeRow />}
              </Box>
            )}
            <Box sx={{ height: '1px', bgcolor: alpha(B.pants, '22') }} />
            <Box onClick={logout} role="button"
              sx={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, borderRadius: '12px', cursor: 'pointer', transition: 'transform 0.12s, background-color 0.12s', '&:active': { transform: 'scale(0.97)', bgcolor: alpha(B.accent, '14') } }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: alpha(B.dark, 'cc'), fontFamily: "'Noto Sans KR',sans-serif" }}>🔄 사용자 전환 (로그아웃)</Typography>
            </Box>
          </Box>
        </Box>

        {/* 푸터 장식(아래로 밀어 두고, 레이아웃에는 영향 없음) */}
        <Box sx={{ mt: 'auto', pt: 2.5, pb: 2, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 1.5, flexShrink: 0, pointerEvents: 'none' }}>
          <Box component="img" src={buri2} alt="" sx={{ width: 44, opacity: 0.6, '@media (prefers-reduced-motion: no-preference)': { animation: 'buriFloat1 4s ease-in-out infinite' } }} />
          <Box component="img" src={buriCouple} alt="" sx={{ width: 58, opacity: 0.55, '@media (prefers-reduced-motion: no-preference)': { animation: 'buriFloat2 5s ease-in-out 0.5s infinite' } }} />
        </Box>
      </Drawer>

      {/* ── 하단 탭 바 ── */}
      <Box data-bottom-nav sx={{
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
