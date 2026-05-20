import { useState, useEffect } from 'react';
import { Box, Typography, Stack, Paper, Button, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { B } from './lib/constants';

const COUPLE_ID = 'jisu_hyunha';
const USERS = ['지수', '현하'];

const STAGES = [
  { name: '알',       emoji: '🥚', color: '#E8B800', btnLabel: '품어주기',     btnEmoji: '🤗', particles: ['❤️','🌟','✨','💛'] },
  { name: '아기햄찌', emoji: '🐹', color: '#FF9A3C', btnLabel: '안아주기',     btnEmoji: '🫂', particles: ['⭐','💫','🌙','⭐'] },
  { name: '햄찌',     emoji: '🐹', color: '#7B4FA6', btnLabel: '쓰다듬어주기', btnEmoji: '✋', particles: ['💜','〰️','💜','✨'] },
  { name: '통통햄찌', emoji: '🐹', color: '#FF6B9D', btnLabel: '먹이주기',     btnEmoji: '🌰', particles: ['🌰','🥜','😋','🌰'] },
  { name: '왕햄찌',   emoji: '👑', color: '#E8A800', btnLabel: '숭배하기',     btnEmoji: '🙏', particles: ['🙏','✨','👑','🙏'] },
  { name: '전설햄찌', emoji: '🌟', color: '#00CED1', btnLabel: null,           btnEmoji: null,  particles: ['✨','🌈','💎','🌟'] },
];

const xpForLevel = (lv) => lv * 100;
const streakMult = (s) => s >= 15 ? 2.5 : s >= 8 ? 2.0 : s >= 4 ? 1.5 : 1.0;

// ── 계란 금 정의 (SVG path, viewBox 0 0 48 48) ───────────────────────
const EGG_CRACKS = [
  { d: 'M23,10 L19,18 L25,22 L20,32',   stroke: '#7B4F2A', w: 2   }, // 중앙 메인 크랙
  { d: 'M30,14 L26,23 L32,28',          stroke: '#7B4F2A', w: 1.5 }, // 오른쪽 위
  { d: 'M16,21 L12,29 L18,34',          stroke: '#8B5E34', w: 1.5 }, // 왼쪽 중간
  { d: 'M22,30 L18,37 L25,41',          stroke: '#7B4F2A', w: 1.5 }, // 아래
  { d: 'M27,22 L35,27 L30,37',          stroke: '#8B5E34', w: 1.5 }, // 오른쪽 아래 퍼짐
];

// ── 알 + 금 컴포넌트 ─────────────────────────────────────────────────
function EggWithCracks({ level, isChubby }) {
  const numCracks   = Math.max(0, Math.floor((level - 1) / 2)); // Lv1-2:0, Lv3-4:1, ...Lv9-10:4
  const almostHatch = level >= 9;
  const isMax       = level === 10;
  const sz          = isChubby ? 54 : 48;

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: sz, height: sz }}>
      {/* 황금 글로우 (Lv10) */}
      {isMax && (
        <Box sx={{
          position: 'absolute', inset: -5, borderRadius: '50%',
          boxShadow: '0 0 14px 5px #FFD70099',
          animation: 'hamPulse 1.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* 계란 이모지 */}
      <Box component="span" sx={{ fontSize: `${sz}px`, lineHeight: 1, display: 'block' }}>🥚</Box>

      {/* SVG 크랙 오버레이 */}
      {numCracks > 0 && (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" overflow="visible">
            {EGG_CRACKS.slice(0, numCracks).map((c, i) => (
              <motion.path
                key={i}
                d={c.d}
                stroke={c.stroke}
                strokeWidth={c.w}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              />
            ))}
          </svg>
        </Box>
      )}

      {/* Lv9~10: 눈알이 삐져나옴 */}
      {almostHatch && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: [4, 0, 4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', bottom: -6, fontSize: isMax ? '16px' : '13px', pointerEvents: 'none' }}
        >
          👀
        </motion.div>
      )}
    </Box>
  );
}

function toIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoAddDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}
function daysBetween(iso1, iso2) {
  return Math.round((new Date(iso2+'T00:00:00') - new Date(iso1+'T00:00:00')) / 86400000);
}

function makeDefault(today) {
  return {
    stage: 0, level: 1, xp: 0, streak: 0,
    lastVisitDate: null, lastEvalDate: today,
    love: 60, hunger: 60, weight: 20, health: 100,
    lastFedDate: null, nextPoopTime: null,
    poopCleaned: true, poopDate: null,
    todayInteracted: null, todayFed: null, todaySnack: 0,
  };
}

function applyXp(data, base) {
  const gained = Math.round(base * streakMult(data.streak));
  let { xp, level, stage } = data;
  xp += gained;
  let evolved = false;
  while (true) {
    const needed = xpForLevel(level);
    if (xp < needed) break;
    if (level < 10) { xp -= needed; level++; }
    else {
      if (stage < STAGES.length - 1) { stage++; level = 1; xp = 0; evolved = true; }
      break;
    }
  }
  return { ...data, xp, level, stage, _evolved: evolved };
}

function evaluateOnLoad(raw, today) {
  if (!raw) return makeDefault(today);
  let d = { ...raw };
  const lastEval  = d.lastEvalDate ?? today;
  const yesterday = isoAddDays(today, -1);

  if (lastEval < yesterday) {
    const missed = daysBetween(lastEval, yesterday);
    if (missed >= 5) return makeDefault(today);
    if (missed >= 3) {
      d.level = Math.max(1, d.level-1); d.xp = 0; d.streak = 0;
      d.love = Math.max(0, d.love-20); d.hunger = Math.max(0, d.hunger-30); d.health = Math.max(0, d.health-15);
    } else if (missed >= 2) {
      d.xp = Math.max(0, d.xp-20); d.streak = 0;
      d.love = Math.max(0, d.love-10); d.hunger = Math.max(0, d.hunger-20);
    } else {
      d.hunger = Math.max(0, d.hunger-15);
    }
  }

  if (!d.poopCleaned && d.poopDate) {
    const h = (Date.now() - new Date(d.poopDate).getTime()) / 3600000;
    if (h >= 24) { d.level = Math.max(1, d.level-1); d.xp = 0; d.health = Math.max(0, d.health-30); }
    else if (h >= 12) { d.health = Math.max(0, d.health-15); }
  }
  if (d.poopCleaned && d.nextPoopTime && Date.now() >= d.nextPoopTime) {
    d.poopCleaned = false; d.poopDate = new Date(d.nextPoopTime).toISOString(); d.nextPoopTime = null;
  }
  if (d.weight >= 100) {
    if (Math.random() < 0.3) return makeDefault(today);
    d.weight = 85; d.health = Math.max(0, d.health-20);
  }
  d.lastEvalDate = today;
  return d;
}

// ── 미니 스탯 바 (2x2 그리드용) ─────────────────────────────────────
function MiniStat({ emoji, label, value, color }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '2px' }}>
        <Typography sx={{ fontSize: '0.54rem', color: B.dark+'88', fontFamily: "'Noto Sans KR'", lineHeight: 1 }}>
          {emoji} {label}
        </Typography>
        <Typography sx={{ fontSize: '0.56rem', fontFamily: "'Jua'", color, lineHeight: 1 }}>
          {Math.round(value)}
        </Typography>
      </Stack>
      <Box sx={{ height: 4, borderRadius: 2, bgcolor: color+'22', overflow: 'hidden' }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.min(value, 100) / 100 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', width: '100%', transformOrigin: 'left', background: color, borderRadius: 2 }}
        />
      </Box>
    </Box>
  );
}

// ── 파티클 ────────────────────────────────────────────────────────────
function FloatingParticle({ emoji, offsetX, delay }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: offsetX, scale: 1 }}
      animate={{ opacity: 0, y: -65, x: offsetX + (Math.random()-0.5)*30, scale: 1.4 }}
      transition={{ duration: 0.85, delay, ease: 'easeOut' }}
      style={{ position: 'absolute', bottom: '100%', left: '50%', fontSize: '16px', pointerEvents: 'none', zIndex: 200 }}
    >
      {emoji}
    </motion.div>
  );
}

// ── PetCard ───────────────────────────────────────────────────────────
function PetCard({ user, data, isMe, today, onAction }) {
  const stage = STAGES[Math.min(data.stage, STAGES.length-1)];
  const [particles, setParticles] = useState([]);
  const [bouncing, setBouncing]   = useState(false);

  const xpNeeded   = xpForLevel(data.level);
  const xpPct      = Math.min(100, (data.xp / xpNeeded) * 100);
  const hasPoop    = !data.poopCleaned;
  const mult       = streakMult(data.streak);
  const weightColor = data.weight >= 90 ? '#E53935' : data.weight >= 70 ? '#FF9800' : '#78909C';

  const canInteract = isMe && data.todayInteracted !== today;
  const canFeed     = isMe && data.todayFed !== today;
  const snackLeft   = 3 - (data.todaySnack ?? 0);
  const canSnack    = isMe && snackLeft > 0;

  const spawnParticles = (list) => {
    setParticles(list.map((emoji, i) => ({ id: Date.now()+i, emoji, offsetX: (i - (list.length-1)/2)*22, delay: i*0.08 })));
    setTimeout(() => setParticles([]), 1000);
  };

  const handleInteract = () => {
    if (!canInteract) return;
    spawnParticles(stage.particles);
    setBouncing(true); setTimeout(() => setBouncing(false), 550);
    onAction('interact');
  };

  return (
    <Box sx={{
      flex: 1, minWidth: 0, borderRadius: '14px', p: '10px 8px', textAlign: 'center',
      bgcolor: isMe ? `${stage.color}12` : 'white',
      border: `1.5px solid ${isMe ? stage.color+'44' : B.dark+'0d'}`,
      position: 'relative',
    }}>
      {/* 내 뱃지 */}
      {isMe && (
        <Box sx={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', px: 1, py: '1px', borderRadius: 10, bgcolor: stage.color }}>
          <Typography sx={{ fontSize: '0.48rem', color: 'white', fontFamily: "'Noto Sans KR'", fontWeight: 700 }}>나</Typography>
        </Box>
      )}

      {/* 펫 이모지 */}
      <Box onClick={isMe ? handleInteract : undefined}
        sx={{ position: 'relative', display: 'inline-block', cursor: isMe ? 'pointer' : 'default', mb: '4px' }}>
        <AnimatePresence>
          {particles.map(p => <FloatingParticle key={p.id} {...p} />)}
        </AnimatePresence>
        <motion.div
          animate={bouncing ? { scale: [1, 1.4, 0.88, 1.12, 1], rotate: [0, 14, -14, 6, 0] } : {}}
          transition={{ duration: 0.5 }}
          style={{ lineHeight: 1, userSelect: 'none', display: 'inline-block' }}
        >
          {data.health <= 0
            ? <Box component="span" sx={{ fontSize: '48px' }}>💀</Box>
            : data.stage === 0
              ? <EggWithCracks level={data.level} isChubby={data.weight >= 70} />
              : <Box component="span" sx={{ fontSize: data.weight >= 70 ? '54px' : '48px' }}>{stage.emoji}</Box>
          }
        </motion.div>
        {hasPoop && (
          <Box sx={{ position: 'absolute', bottom: -2, right: -8, fontSize: '14px', animation: 'bellShake 1.2s ease-in-out infinite' }}>💩</Box>
        )}
      </Box>

      {/* 이름 + 단계 뱃지 한 줄 */}
      <Stack direction="row" justifyContent="center" alignItems="center" gap={0.5} sx={{ mb: '3px' }}>
        <Typography sx={{ fontFamily: "'Jua'", fontSize: '0.82rem', color: stage.color, lineHeight: 1 }}>
          {user}
        </Typography>
        <Box sx={{ px: '5px', py: '1px', borderRadius: 10, bgcolor: `${stage.color}20` }}>
          <Typography sx={{ fontSize: '0.52rem', color: stage.color, fontFamily: "'Noto Sans KR'", fontWeight: 700, lineHeight: 1 }}>
            Lv.{data.level}
          </Typography>
        </Box>
      </Stack>

      {/* 단계명 */}
      <Typography sx={{ fontSize: '0.58rem', color: stage.color, fontFamily: "'Noto Sans KR'", fontWeight: 700, mb: '5px', opacity: 0.8 }}>
        {stage.name}
      </Typography>

      {/* XP 바 */}
      <Stack direction="row" justifyContent="space-between" sx={{ mb: '2px' }}>
        <Typography sx={{ fontSize: '0.5rem', color: B.dark+'66', fontFamily: "'Noto Sans KR'" }}>XP</Typography>
        <Typography sx={{ fontSize: '0.5rem', color: stage.color, fontFamily: "'Jua'" }}>{data.xp}/{xpNeeded}</Typography>
      </Stack>
      <Box sx={{ height: 5, borderRadius: 3, bgcolor: `${stage.color}22`, overflow: 'hidden', mb: '8px' }}>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: xpPct/100 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          style={{ height: '100%', width: '100%', transformOrigin: 'left',
            background: `linear-gradient(to right, ${stage.color}88, ${stage.color})`, borderRadius: 3 }}
        />
      </Box>

      {/* 스탯 2×2 그리드 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 6px', mb: '7px' }}>
        <MiniStat emoji="❤️" label="애정"   value={data.love}   color="#FF6B9D" />
        <MiniStat emoji="🍔" label="배고픔" value={data.hunger} color="#FF9A3C" />
        <MiniStat emoji="💚" label="건강"   value={data.health} color="#43A047" />
        <MiniStat emoji="⚖️" label="체중"   value={data.weight} color={weightColor} />
      </Box>

      {/* 스트릭 */}
      <Typography sx={{
        fontSize: '0.58rem', mb: '8px', fontFamily: "'Noto Sans KR'",
        fontWeight: mult > 1 ? 700 : 400,
        color: mult > 1 ? '#FF6B35' : B.dark+'44',
      }}>
        🔥 {data.streak}일 연속{mult > 1 ? ` ×${mult}` : ''}
      </Typography>

      {/* 오늘 체크인 표시 (상대방) */}
      {!isMe && (
        <Typography sx={{ fontSize: '0.58rem', color: B.dark+'44', fontFamily: "'Noto Sans KR'" }}>
          {hasPoop ? <span style={{ color:'#E65100', fontWeight:700 }}>💩 치워야 해요!</span> : (data.todayFed === today ? '✅ 오늘 돌봄 완료' : '⬜ 아직 안 돌봄')}
        </Typography>
      )}

      {/* 내 액션 버튼 */}
      {isMe && (
        <Stack gap="5px">
          {stage.btnLabel && (
            <Button size="small" onClick={handleInteract} disabled={!canInteract}
              sx={{
                borderRadius: 10, fontSize: '0.64rem', py: '5px',
                bgcolor: canInteract ? stage.color : B.dark+'0e',
                color: canInteract ? 'white' : B.dark+'33',
                fontFamily: "'Noto Sans KR'", fontWeight: 700,
                boxShadow: canInteract ? `0 2px 8px ${stage.color}44` : 'none',
                '&:hover': { bgcolor: canInteract ? stage.color+'dd' : undefined },
                '&:active': { transform: 'scale(0.93)' },
                '&.Mui-disabled': { bgcolor: B.dark+'0e', color: B.dark+'2a' },
              }}>
              {stage.btnEmoji} {stage.btnLabel}
              {!canInteract && <Typography component="span" sx={{ fontSize: '0.48rem', ml: 0.4, opacity: 0.5 }}>완료</Typography>}
            </Button>
          )}

          <Stack direction="row" gap="5px">
            <Button size="small" onClick={() => { spawnParticles(['🍖','😊','✨']); onAction('feed'); }} disabled={!canFeed}
              sx={{
                flex: 1, borderRadius: 10, fontSize: '0.6rem', py: '4px',
                bgcolor: canFeed ? '#FF9A3C15' : 'transparent',
                border: `1px solid ${canFeed ? '#FF9A3C55' : B.dark+'0e'}`,
                color: canFeed ? '#FF9A3C' : B.dark+'2a',
                fontFamily: "'Noto Sans KR'", fontWeight: 700,
                '&:hover': { bgcolor: '#FF9A3C25' },
                '&.Mui-disabled': { color: B.dark+'1a' },
              }}>
              🍖 밥
            </Button>
            <Button size="small" onClick={() => { spawnParticles(['🌰','😋','💕','⚠️']); onAction('snack'); }} disabled={!canSnack}
              sx={{
                flex: 1, borderRadius: 10, fontSize: '0.6rem', py: '4px',
                bgcolor: canSnack ? '#FF6B9D15' : 'transparent',
                border: `1px solid ${canSnack ? '#FF6B9D55' : B.dark+'0e'}`,
                color: canSnack ? '#FF6B9D' : B.dark+'2a',
                fontFamily: "'Noto Sans KR'", fontWeight: 700,
                '&:hover': { bgcolor: '#FF6B9D25' },
                '&.Mui-disabled': { color: B.dark+'1a' },
              }}>
              🍪 간식{canSnack ? `(${snackLeft})` : '✕'}
            </Button>
          </Stack>

          {hasPoop && (
            <Button size="small"
              onClick={() => { spawnParticles(['🧹','💨','✨','😌']); onAction('cleanPoop'); }}
              sx={{
                borderRadius: 10, fontSize: '0.62rem', py: '4px',
                bgcolor: '#FF930015', border: '1.5px solid #FF930055',
                color: '#E65100', fontFamily: "'Noto Sans KR'", fontWeight: 700,
                animation: 'bellShake 1.2s ease-in-out infinite',
                '&:hover': { bgcolor: '#FF930025' },
              }}>
              💩 치우기 (빨리!)
            </Button>
          )}

          {data.weight >= 90 && (
            <Box sx={{ p: '5px 8px', borderRadius: '8px', bgcolor: '#FFF3E015', border: '1px dashed #FF9800' }}>
              <Typography sx={{ fontSize: '0.52rem', color: '#E65100', fontFamily: "'Noto Sans KR'", fontWeight: 700, lineHeight: 1.4 }}>
                🚨 비만 위험! 간식 그만 줘요
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────
export default function CoupleTamagotchi({ currentUser }) {
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evolved, setEvolved] = useState(null);
  const today   = toIso();
  const docRef  = doc(db, 'couple_tamagotchi', COUPLE_ID);
  const otherUser = USERS.find(u => u !== currentUser) ?? '';

  useEffect(() => {
    if (!evolved) return;
    const t = setTimeout(() => setEvolved(null), 3500);
    return () => clearTimeout(t);
  }, [evolved]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(docRef);
        const raw  = snap.exists() ? snap.data() : {};
        const evaluated = {};
        for (const u of USERS) evaluated[u] = evaluateOnLoad(raw[u] ?? null, today);

        const me = evaluated[currentUser];
        if (me.lastVisitDate !== today) {
          const prevDay   = isoAddDays(today, -1);
          const newStreak = me.lastVisitDate === prevDay ? me.streak + 1 : 1;
          let updated     = { ...me, streak: newStreak, lastVisitDate: today };
          const prevStage = updated.stage;
          updated = applyXp(updated, 10);
          if (updated._evolved && updated.stage > prevStage) setEvolved(STAGES[updated.stage]?.name);
          delete updated._evolved;
          evaluated[currentUser] = updated;
        }

        setAllData(evaluated);
        const payload = {};
        for (const u of USERS) payload[u] = evaluated[u];
        await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.error('타마고치 로드 오류:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAction = async (action) => {
    if (!allData) return;
    let data = { ...allData[currentUser] };
    const prevStage = data.stage;

    if (action === 'interact') {
      data = applyXp(data, 5); data.love = Math.min(100, data.love+15); data.todayInteracted = today;
    } else if (action === 'feed') {
      data.hunger = Math.min(100, data.hunger+30); data.weight = Math.min(100, data.weight+2);
      data.love   = Math.min(100, data.love+5);   data.todayFed = today;
      data.nextPoopTime = Date.now() + (6 + Math.random()*6) * 3600000;
      data = applyXp(data, 3);
    } else if (action === 'snack') {
      data.hunger = Math.min(100, data.hunger+20); data.weight = Math.min(100, data.weight+10);
      data.love   = Math.min(100, data.love+30);   data.todaySnack = (data.todaySnack ?? 0) + 1;
      data = applyXp(data, 2);
    } else if (action === 'cleanPoop') {
      data.poopCleaned = true; data.poopDate = null; data.health = Math.min(100, data.health+10);
      data = applyXp(data, 2);
    }

    if (data._evolved && data.stage > prevStage) setEvolved(STAGES[data.stage]?.name);
    delete data._evolved;

    setAllData({ ...allData, [currentUser]: data });
    await setDoc(docRef, { [currentUser]: data, updatedAt: serverTimestamp() }, { merge: true });
  };

  if (loading || !allData) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontFamily: "'Jua'", color: B.pants }}>🐹 햄찌 깨우는 중...</Typography>
      </Box>
    );
  }

  const myScore    = allData[currentUser].stage * 10 + allData[currentUser].level;
  const otherScore = allData[otherUser].stage * 10 + allData[otherUser].level;
  const iWin = myScore > otherScore;
  const isTie = myScore === otherScore;

  return (
    <>
      {/* 진화 알림 */}
      <AnimatePresence>
        {evolved && (
          <motion.div key="evo"
            initial={{ opacity: 0, y: -20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 2000 }}
          >
            <Paper elevation={6} sx={{ px: 3, py: 1.2, borderRadius: 4, textAlign: 'center', bgcolor: B.cream, border: `2px solid ${B.pants}44` }}>
              <Typography sx={{ fontFamily: "'Jua'", fontSize: '1rem', color: B.pants }}>
                🎉 {evolved}(으)로 진화했어요!
              </Typography>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      <Paper elevation={0} sx={{
        p: '12px 10px', borderRadius: '16px',
        bgcolor: B.cream, border: `1.5px solid ${B.pants}18`,
        backgroundImage: `radial-gradient(circle at 85% 5%, ${B.lavender}55 0%, transparent 38%)`,
      }}>
        {/* 헤더 */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: '12px' }}>
          <Typography sx={{ fontFamily: "'Jua'", color: B.pants, fontSize: '0.9rem' }}>
            🐾 커플 다마고치
          </Typography>
          <Chip
            label={isTie ? '🤝 동률' : iWin ? '👑 내가 앞서는 중' : `👑 ${otherUser}가 앞서는 중`}
            size="small"
            sx={{
              fontFamily: "'Noto Sans KR'", fontWeight: 700, fontSize: '0.58rem', height: 22,
              bgcolor: isTie ? B.dark+'15' : iWin ? B.pants : '#FF6B9D',
              color: isTie ? B.dark+'aa' : 'white',
            }}
          />
        </Stack>

        {/* 두 펫 카드 */}
        <Stack direction="row" gap="10px">
          {USERS.map(u => (
            <PetCard key={u} user={u} data={allData[u]} isMe={u === currentUser} today={today} onAction={handleAction} />
          ))}
        </Stack>

        {/* 하단 안내 (접혀있게) */}
        <Box sx={{ mt: '10px', p: '8px 10px', borderRadius: '10px', bgcolor: B.pants+'08' }}>
          <Typography sx={{ fontSize: '0.54rem', color: B.dark+'66', fontFamily: "'Noto Sans KR'", lineHeight: 1.8 }}>
            💡 방문 +10 · 상호작용 +5 · 밥 +3 · 간식 +2 XP (×스트릭 배율)<br />
            🔥 4일+ 연속 ×1.5 → 8일+ ×2.0 → 15일+ ×2.5 · 2일 미방문 시 스트릭 리셋<br />
            💩 밥 후 6~12시간 뒤 등장 · 12h 방치 건강↓ · 체중 100 = 돌연사 확률 있음!
          </Typography>
        </Box>
      </Paper>
    </>
  );
}
