import { useState, useCallback } from 'react';
import { Box, Typography, Stack, LinearProgress } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { B } from './lib/constants';
import { THEMES, calcBracketSize, shuffle, getRoundName } from './worldcupData';
import { vibrate } from './touchEffects';

// ── 상수 ────────────────────────────────────────────────────────────
const SIZES = [128, 64, 32, 16];

// ── 헬퍼: 배열을 2개씩 묶어 matchup 쌍으로 변환 ─────────────────────
function makePairs(arr) {
  const pairs = [];
  for (let i = 0; i < arr.length; i += 2) pairs.push([arr[i], arr[i + 1]]);
  return pairs;
}

// ── 라운드 전환 오버레이 ─────────────────────────────────────────────
function RoundBanner({ roundName, onDone }) {
  return (
    <motion.div
      key="banner"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.35, ease: 'backOut' }}
      onAnimationComplete={() => setTimeout(onDone, 900)}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${B.pants}f0 0%, #3A0080f0 100%)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4, ease: 'backOut' }}
      >
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.7)',
          textAlign: 'center', letterSpacing: 6, mb: 1,
        }}>
          다음 라운드
        </Typography>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: '3.5rem', color: 'white',
          textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,0.4)',
          letterSpacing: 4,
        }}>
          {roundName}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
          {['🏆', '⚔️', '🔥'].map((e, i) => (
            <motion.span key={i} style={{ fontSize: '1.8rem' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity, repeatDelay: 1 }}>
              {e}
            </motion.span>
          ))}
        </Box>
      </motion.div>
    </motion.div>
  );
}

// ── 우승자 화면 ──────────────────────────────────────────────────────
function WinnerScreen({ winner, theme, onRestart }) {
  return (
    <Box sx={{
      minHeight: '80vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', px: 3, py: 6,
    }}>
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        style={{ textAlign: 'center' }}
      >
        <Typography sx={{ fontSize: '4rem', mb: 1 }}>🏆</Typography>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: B.pants + 'aa',
          letterSpacing: 4, mb: 2,
        }}>
          최종 우승
        </Typography>

        {/* 우승 카드 */}
        <Box sx={{
          borderRadius: '24px', overflow: 'hidden',
          boxShadow: `0 12px 60px ${theme.color}44`,
          border: `3px solid ${theme.color}66`,
          maxWidth: 320, mx: 'auto', mb: 3,
        }}>
          <Box
            component="img"
            src={winner.image}
            alt={winner.name}
            sx={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
          />
          <Box sx={{
            py: 2.5, px: 2,
            background: `linear-gradient(135deg, ${theme.color}18, ${theme.color}08)`,
          }}>
            <Typography sx={{
              fontSize: '2.5rem', mb: 0.5, display: 'block',
            }}>
              {winner.emoji}
            </Typography>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: '1.8rem', color: B.dark,
            }}>
              {winner.name}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{
          fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.9rem',
          color: B.dark + '77', mb: 3,
        }}>
          {theme.emoji} {theme.name} 월드컵 최종 우승!
        </Typography>

        <Stack direction="row" gap={1.5} justifyContent="center" flexWrap="wrap">
          <Box onClick={onRestart} sx={{
            px: 3, py: 1.4, borderRadius: 10,
            background: `linear-gradient(135deg, ${B.pants}, #5A2080)`,
            color: 'white', fontFamily: "'Jua',sans-serif", fontSize: '0.95rem',
            cursor: 'pointer', boxShadow: `0 4px 16px ${B.pants}44`,
            '&:active': { transform: 'scale(0.95)' },
          }}>
            🔄 다시 하기
          </Box>
        </Stack>
      </motion.div>
    </Box>
  );
}

// ── 카드 컴포넌트 ────────────────────────────────────────────────────
function MatchCard({ item, onClick, side, disabled }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={
        disabled
          ? { opacity: 0, scale: 0.7, filter: 'blur(4px)' }
          : { opacity: 0, scale: 1.06, filter: 'blur(2px)' }
      }
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ flex: 1, cursor: 'pointer', borderRadius: 20, overflow: 'hidden' }}
      onClick={() => !disabled && onClick(item)}
    >
      <Box sx={{
        borderRadius: '20px', overflow: 'hidden',
        border: `2px solid rgba(255,255,255,0.3)`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        background: 'white',
        userSelect: 'none',
        height: '100%',
      }}>
        <Box
          component="img"
          src={item.image}
          alt={item.name}
          sx={{
            width: '100%', height: { xs: 150, sm: 200 },
            objectFit: 'cover', display: 'block', pointerEvents: 'none',
          }}
        />
        <Box sx={{ py: 1.8, px: 1.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.6rem', mb: 0.4, display: 'block' }}>
            {item.emoji}
          </Typography>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", fontSize: '1rem',
            color: B.dark, lineHeight: 1.3,
          }}>
            {item.name}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function WorldCup({ currentUser }) {
  const [phase, setPhase] = useState('theme');        // theme | size | playing | result
  const [theme, setTheme] = useState(null);
  const [bracketSize, setBracketSize] = useState(null);
  const [pairs, setPairs] = useState([]);             // 현재 라운드 대진 목록
  const [pairIndex, setPairIndex] = useState(0);      // 현재 매치 인덱스
  const [winners, setWinners] = useState([]);         // 이번 라운드 승자 누적
  const [winner, setWinner] = useState(null);         // 최종 우승자
  const [showBanner, setShowBanner] = useState(false);
  const [bannerName, setBannerName] = useState('');
  const [animKey, setAnimKey] = useState(0);          // 카드 애니메이션 재트리거
  const [selected, setSelected] = useState(null);     // 선택된 카드 (애니메이션용)

  // 테마 선택
  const handleThemeSelect = useCallback((t) => {
    vibrate(15);
    setTheme(t);
    setPhase('size');
  }, []);

  // 대진 크기 선택 후 게임 시작
  const handleSizeSelect = useCallback((size) => {
    vibrate(15);
    const actual = calcBracketSize(theme.items.length, size);
    const shuffled = shuffle(theme.items).slice(0, actual);
    const initialPairs = makePairs(shuffled);
    setBracketSize(actual);
    setPairs(initialPairs);
    setPairIndex(0);
    setWinners([]);
    setWinner(null);
    setSelected(null);
    setAnimKey(k => k + 1);
    setPhase('playing');

    // 첫 라운드 배너
    setBannerName(getRoundName(actual));
    setShowBanner(true);
  }, [theme]);

  // 카드 선택
  const handlePick = useCallback((pickedItem) => {
    if (selected) return;
    vibrate([10, 30, 10]);
    setSelected(pickedItem.id);

    setTimeout(() => {
      const newWinners = [...winners, pickedItem];
      const nextIndex  = pairIndex + 1;

      if (nextIndex < pairs.length) {
        // 같은 라운드 다음 매치
        setWinners(newWinners);
        setPairIndex(nextIndex);
        setSelected(null);
        setAnimKey(k => k + 1);
      } else {
        // 라운드 종료
        if (newWinners.length === 1) {
          // 우승자 결정
          setWinner(newWinners[0]);
          setSelected(null);
          setPhase('result');
        } else {
          // 다음 라운드 시작
          const nextPairs = makePairs(newWinners);
          setBannerName(getRoundName(newWinners.length));
          setPairs(nextPairs);
          setPairIndex(0);
          setWinners([]);
          setSelected(null);
          setAnimKey(k => k + 1);
          setShowBanner(true);
        }
      }
    }, 480);
  }, [selected, winners, pairIndex, pairs]);

  // 다시 하기
  const handleRestart = useCallback(() => {
    setPhase('theme');
    setTheme(null);
    setBracketSize(null);
    setPairs([]);
    setPairIndex(0);
    setWinners([]);
    setWinner(null);
    setSelected(null);
  }, []);

  // ── Phase: 테마 선택 ───────────────────────────────────────────
  if (phase === 'theme') {
    return (
      <Box sx={{ px: 1.5, py: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography sx={{ fontSize: '2.5rem', mb: 0.5 }}>⚔️</Typography>
          <Typography sx={{
            fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: '1.4rem',
          }}>
            이상형 월드컵
          </Typography>
          <Typography sx={{
            fontFamily: "'Noto Sans KR',sans-serif",
            color: B.dark + '77', fontSize: '0.8rem', mt: 0.5,
          }}>
            테마를 선택하고 최애를 뽑아봐요!
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2 }}>
          {THEMES.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.3, ease: 'backOut' }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleThemeSelect(t)}
              style={{ cursor: 'pointer', borderRadius: 18, overflow: 'hidden' }}
            >
              <Box sx={{
                borderRadius: '18px',
                background: `linear-gradient(135deg, ${t.color}22, ${t.color}10)`,
                border: `2px solid ${t.color}33`,
                p: 2.2, textAlign: 'center',
                boxShadow: `0 4px 16px ${t.color}18`,
                transition: 'box-shadow 0.2s',
              }}>
                <Typography sx={{ fontSize: '2.2rem', mb: 0.8 }}>{t.emoji}</Typography>
                <Typography sx={{
                  fontFamily: "'Jua',sans-serif", fontSize: '1rem',
                  color: B.dark, lineHeight: 1.2,
                }}>
                  {t.name}
                </Typography>
                <Typography sx={{
                  fontSize: '0.65rem', color: B.dark + '66',
                  fontFamily: "'Noto Sans KR',sans-serif", mt: 0.4,
                }}>
                  {t.description}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Box>
      </Box>
    );
  }

  // ── Phase: 대진 크기 선택 ──────────────────────────────────────
  if (phase === 'size') {
    const maxSize = calcBracketSize(theme.items.length, null);
    return (
      <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>{theme.emoji}</Typography>
        <Typography sx={{
          fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: '1.3rem', mb: 0.5,
        }}>
          {theme.name} 월드컵
        </Typography>
        <Typography sx={{
          fontFamily: "'Noto Sans KR',sans-serif", color: B.dark + '77',
          fontSize: '0.82rem', mb: 4,
        }}>
          대진 규모를 선택해주세요
        </Typography>

        <Stack spacing={1.5}>
          {SIZES.filter(s => s <= maxSize).map(s => (
            <motion.div key={s} whileTap={{ scale: 0.96 }}>
              <Box onClick={() => handleSizeSelect(s)} sx={{
                py: 2, px: 3, borderRadius: '16px',
                background: `linear-gradient(135deg, ${theme.color}22, ${theme.color}0a)`,
                border: `2px solid ${theme.color}44`,
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${theme.color}18`,
              }}>
                <Typography sx={{
                  fontFamily: "'Jua',sans-serif", fontSize: '1.5rem',
                  color: theme.color,
                }}>
                  {s}강
                </Typography>
                <Typography sx={{
                  fontSize: '0.72rem', color: B.dark + '66',
                  fontFamily: "'Noto Sans KR',sans-serif", mt: 0.3,
                }}>
                  {Math.log2(s)}라운드 · {s}개 중 최강자 선발
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Stack>

        <Box onClick={() => setPhase('theme')} sx={{
          mt: 3, cursor: 'pointer', color: B.dark + '55',
          fontSize: '0.8rem', fontFamily: "'Noto Sans KR',sans-serif",
          '&:active': { opacity: 0.6 },
        }}>
          ← 테마 다시 선택
        </Box>
      </Box>
    );
  }

  // ── Phase: 게임 진행 ───────────────────────────────────────────
  if (phase === 'playing') {
    const currentPair = pairs[pairIndex];
    if (!currentPair) return null;

    const totalMatches  = pairs.length;
    const doneMatches   = pairIndex;
    // 전체 진행률: 현재 라운드 이전 매치 수 포함
    const roundSize     = pairs.length * 2;
    const totalItems    = bracketSize;
    const progress      = ((totalItems - roundSize + doneMatches * 2) / (totalItems - 1)) * 100;
    const roundName     = getRoundName(roundSize);

    return (
      <>
        {/* 라운드 전환 배너 */}
        <AnimatePresence>
          {showBanner && (
            <RoundBanner
              roundName={bannerName}
              onDone={() => setShowBanner(false)}
            />
          )}
        </AnimatePresence>

        <Box sx={{ px: 1.5, py: 2 }}>
          {/* 헤더 */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography sx={{
              fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: theme.color,
              mb: 0.3,
            }}>
              {theme.emoji} {roundName}
            </Typography>
            <Typography sx={{
              fontFamily: "'Noto Sans KR',sans-serif", color: B.dark + '55', fontSize: '0.72rem',
            }}>
              {doneMatches + 1} / {totalMatches} 매치
            </Typography>
          </Box>

          {/* 진행 바 */}
          <Box sx={{ mb: 2.5, px: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              sx={{
                height: 6, borderRadius: 4,
                bgcolor: `${theme.color}18`,
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${theme.color}, ${theme.color}cc)`,
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {/* VS 카드 영역 */}
          <AnimatePresence mode="wait">
            <motion.div key={`${animKey}-${pairIndex}`} style={{ width: '100%' }}>
              <Stack
                direction="row"
                spacing={1.2}
                alignItems="stretch"
                sx={{ minHeight: 280 }}
              >
                <AnimatePresence mode="sync">
                  {!selected || selected === currentPair[0].id ? (
                    <MatchCard
                      key={`left-${currentPair[0].id}`}
                      item={currentPair[0]}
                      side="left"
                      onClick={handlePick}
                      disabled={!!selected && selected !== currentPair[0].id}
                    />
                  ) : null}
                </AnimatePresence>

                {/* VS 배지 */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', flexShrink: 0,
                  zIndex: 2,
                }}>
                  <Box sx={{
                    bgcolor: B.dark, color: 'white',
                    borderRadius: '50%', width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Jua',sans-serif", fontSize: '0.78rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}>
                    VS
                  </Box>
                </Box>

                <AnimatePresence mode="sync">
                  {!selected || selected === currentPair[1].id ? (
                    <MatchCard
                      key={`right-${currentPair[1].id}`}
                      item={currentPair[1]}
                      side="right"
                      onClick={handlePick}
                      disabled={!!selected && selected !== currentPair[1].id}
                    />
                  ) : null}
                </AnimatePresence>
              </Stack>
            </motion.div>
          </AnimatePresence>

          <Typography sx={{
            textAlign: 'center', mt: 2.5,
            fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.78rem',
            color: B.dark + '55',
          }}>
            원하는 쪽을 탭해서 선택하세요!
          </Typography>
        </Box>
      </>
    );
  }

  // ── Phase: 결과 ────────────────────────────────────────────────
  if (phase === 'result' && winner) {
    return <WinnerScreen winner={winner} theme={theme} onRestart={handleRestart} />;
  }

  return null;
}
