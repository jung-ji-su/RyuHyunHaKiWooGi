import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, Paper, Button, Chip } from '@mui/material';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { B } from './lib/constants';

const COUPLE_ID = 'jisu_hyunha';
const USERS = ['지수', '현하'];

// [신규] 단계별 사진 경로. 실제 사진 파일은 public/assets 폴더에 넣어두세요.
// (dist 폴더는 빌드 결과물이라 git에 안 잡히고 빌드할 때마다 통째로 새로 생성되니
//  절대 dist에 직접 넣지 마세요. public/assets에 넣으면 빌드 시 dist/assets로 자동 복사됩니다.)
// 파일이 없거나 로드에 실패하면 자동으로 기존 이모지로 대체되니 안전합니다.
const PET_IMAGE_BASE = '/assets/';

const STAGES = [
  { name: '알',       emoji: '🥚', image: null,                          color: '#E8B800', btnLabel: '품어주기',     btnEmoji: '🤗', particles: ['❤️','🌟','✨','💛'] },
  { name: '아기햄찌', emoji: '🐹', image: PET_IMAGE_BASE+'1.hamzzi.png', color: '#FF9A3C', btnLabel: '안아주기',     btnEmoji: '🫂', particles: ['⭐','💫','🌙','⭐'] },
  { name: '햄찌',     emoji: '🐹', image: PET_IMAGE_BASE+'2.hamzzi.png', color: '#7B4FA6', btnLabel: '쓰다듬어주기', btnEmoji: '✋', particles: ['💜','〰️','💜','✨'] },
  { name: '통통햄찌', emoji: '🐹', image: PET_IMAGE_BASE+'3.hamzzi.png', color: '#FF6B9D', btnLabel: '먹이주기',     btnEmoji: '🌰', particles: ['🌰','🥜','😋','🌰'] },
  { name: '왕햄찌',   emoji: '👑', image: PET_IMAGE_BASE+'4.hamzzi.png', color: '#E8A800', btnLabel: '숭배하기',     btnEmoji: '🙏', particles: ['🙏','✨','👑','🙏'] },
  { name: '전설햄찌', emoji: '🌟', image: PET_IMAGE_BASE+'5.hamzzi.png', color: '#00CED1', btnLabel: null,           btnEmoji: null,  particles: ['✨','🌈','💎','🌟'] },
];

// ── 스테이지별 레벨당 XP 배율 ───────────────────────────────────────
// 목표 스케줄: 알→아기 7일 / 아기→햄찌 14일 / 햄찌→통통 30일 / 통통→왕 60일 / 왕→전설 90일
// (하루 접속+상호작용+밥+간식3회+응가 = 약 24XP, 스트릭 배율 4일+×1.5→8일+×2.0→15일+×2.5 가정하고 역산)
// 스테이지별 총 필요 XP: 220 / 770 / 1,815 / 3,575 / 5,390
const STAGE_XP_MULT = [4, 14, 33, 65, 98];
const xpForLevel = (stage, lv) => lv * (STAGE_XP_MULT[stage] ?? 100);

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
function EggWithCracks({ level, isChubby, image }) {
  const numCracks   = Math.max(0, Math.floor((level - 1) / 2)); // Lv1-2:0, Lv3-4:1, ...Lv9-10:4
  const almostHatch = level >= 9;
  const isMax       = level === 10;
  const sz          = isChubby ? 54 : 48;
  const [imgFailed, setImgFailed] = useState(false); // [신규] 사진 로드 실패 시 이모지로 자동 대체

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

      {/* [수정] 계란 사진 (있으면) / 없거나 로드 실패 시 이모지 */}
      {image && !imgFailed ? (
        <Box
          component="img"
          src={image}
          alt="egg"
          onError={() => setImgFailed(true)}
          sx={{ width: sz, height: sz, objectFit: 'contain', display: 'block', userSelect: 'none' }}
        />
      ) : (
        <Box component="span" sx={{ fontSize: `${sz}px`, lineHeight: 1, display: 'block' }}>🥚</Box>
      )}

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

function makeDefault() {
  return {
    stage: 0, level: 1, xp: 0, streak: 0,
    lastVisitDate: null,
    love: 60, hunger: 60, weight: 20, health: 100,
    nextPoopTime: null,
    poopCleaned: true, poopDate: null,
    todayInteracted: null, todayFed: null,
    todaySnack: 0, lastSnackDate: null,   // [수정] 간식 카운트를 날짜 기준으로 리셋하기 위한 필드
    lastCheerSentDate: null,               // [신규] 파트너에게 응원을 보낸 날짜 (하루 1회 제한용)
    isDead: false,                         // [신규] 5일 이상 미접속 시 사망 상태
  };
}

function applyXp(data, base) {
  const gained = Math.round(base * streakMult(data.streak));
  let { xp, level, stage } = data;
  xp += gained;
  let evolved = false;
  while (true) {
    const needed = xpForLevel(stage, level); // [수정] 스테이지별 차등 XP 요구량 적용
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
  if (!raw) return makeDefault();
  let d = { ...raw };
  // 이전 버전 데이터 호환 (필드가 없던 유저 보정)
  if (d.lastSnackDate === undefined) d.lastSnackDate = null;
  if (d.lastCheerSentDate === undefined) d.lastCheerSentDate = null;
  if (d.isDead === undefined) d.isDead = false;

  // [버그 수정] 기존엔 lastEvalDate(누군가 마지막으로 평가를 실행한 날짜)를 기준으로 삼아서,
  // 커플 중 한쪽만 매일 접속해도 두 사람의 lastEvalDate가 함께 갱신되어 버렸음.
  // 그 결과 상대방이 몇 주를 방치해도 "내가" 매일 접속하기만 하면 상대방 쪽 방치 페널티가
  // 전혀 발동하지 않는 문제가 있었음. 개인별 필드인 lastVisitDate 기준으로 변경.
  const lastVisit = d.lastVisitDate ?? today;
  const yesterday = isoAddDays(today, -1);

  // [수정] 장기 육성(최장 90일)에 맞춰 미방문 벌칙을 완화.
  // 기존: 3~4일 미방문 → 레벨 다운, 5일 이상 → 완전 초기화 (너무 가혹함)
  // 변경: 레벨/단계는 절대 깎이지 않고, 오래 방치될수록 스탯/XP 손실만 커짐
  if (lastVisit < yesterday) {
    const missed = daysBetween(lastVisit, yesterday);
    if (missed >= 14) {
      d.xp = Math.max(0, d.xp - Math.round(xpForLevel(d.stage, d.level) * 0.3));
      d.streak = 0;
      d.love = Math.max(0, d.love-25); d.hunger = Math.max(0, d.hunger-35); d.health = Math.max(0, d.health-20);
    } else if (missed >= 7) {
      d.xp = Math.max(0, d.xp-30); d.streak = 0;
      d.love = Math.max(0, d.love-15); d.hunger = Math.max(0, d.hunger-25); d.health = Math.max(0, d.health-10);
    } else if (missed >= 3) {
      d.streak = 0;
      d.love = Math.max(0, d.love-10); d.hunger = Math.max(0, d.hunger-20);
    } else {
      d.hunger = Math.max(0, d.hunger-15);
    }
  }

  // [수정] 응가 방치 벌칙에서 레벨 다운 제거, 건강 감소만 적용
  if (!d.poopCleaned && d.poopDate) {
    const h = (Date.now() - new Date(d.poopDate).getTime()) / 3600000;
    if (h >= 24) { d.health = Math.max(0, d.health-25); }
    else if (h >= 12) { d.health = Math.max(0, d.health-12); }
  }
  if (d.poopCleaned && d.nextPoopTime && Date.now() >= d.nextPoopTime) {
    d.poopCleaned = false; d.poopDate = new Date(d.nextPoopTime).toISOString(); d.nextPoopTime = null;
  }

  // [수정] 체중 100 도달 시 확률적 완전 초기화 제거, 항상 건강 페널티로 대체
  if (d.weight >= 100) {
    d.weight = 80; d.health = Math.max(0, d.health-25);
  }

  // [버그 수정] todaySnack이 날짜와 무관하게 누적되기만 해서, 평생 3번 쓰면
  // 이후 영구적으로 간식을 줄 수 없던 문제. 날짜가 바뀌면 리셋되도록 수정.
  if (d.lastSnackDate !== today) {
    d.todaySnack = 0;
    d.lastSnackDate = today;
  }

  // [신규] 5일 이상 접속하지 않으면 사망 처리. 자동으로 되살아나지 않고
  // "알로 되돌리기" 버튼으로만 다시 시작할 수 있음.
  if (!d.isDead) {
    const missedVisit = daysBetween(lastVisit, today);
    if (missedVisit >= 5) {
      d.isDead = true;
    }
  }
  if (d.isDead) {
    d.health = 0;
  }

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

// ── [신규] 진화 컨페티 조각 ────────────────────────────────────────────
function ConfettiPiece({ x, color, delay, duration, shape }) {
  const spin = (Math.random() > 0.5 ? 1 : -1) * (540 + Math.random() * 360);
  return (
    <motion.div
      initial={{ top: '-6%', opacity: 1, rotate: 0 }}
      animate={{ top: '112%', opacity: [1, 1, 0.9, 0], rotate: spin }}
      transition={{ duration, delay, ease: 'easeIn' }}
      style={{
        position: 'absolute', left: `${x}%`,
        width: shape === 'circle' ? 9 : 6, height: shape === 'circle' ? 9 : 15,
        background: color, borderRadius: shape === 'circle' ? '50%' : '2px',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── [신규] 진화 축하 연출: 전체화면 어둡게 + 방사형 버스트 + 컨페티 비 ──────
function EvolutionCelebration({ stageColor, isLegendary }) {
  const confettiColors = isLegendary
    ? ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#FF6BAF', '#00CED1']
    : [stageColor, '#FFD700', '#FFFFFF'];
  const confettiCount = isLegendary ? 90 : 50;

  const confetti = useMemo(() => Array.from({ length: confettiCount }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: confettiColors[i % confettiColors.length],
    delay: Math.random() * 0.5,
    duration: 2.2 + Math.random() * 1.8,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  })), [isLegendary]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none', overflow: 'hidden',
        background: isLegendary ? 'rgba(10,5,25,0.65)' : 'rgba(0,0,0,0.55)',
      }}
    >
      {/* 방사형 골드/무지개 버스트 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1.1], opacity: [0, 1, 0.65] }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          position: 'absolute', top: '38%', left: '50%', width: 560, height: 560,
          transform: 'translate(-50%,-50%)', borderRadius: '50%',
          background: isLegendary
            ? 'conic-gradient(from 0deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6, #FF6BAF, #FF6B6B)'
            : `radial-gradient(circle, ${stageColor}bb 0%, transparent 70%)`,
          filter: 'blur(32px)',
        }}
      />
      {/* 전설화 전용 이중 링 */}
      {isLegendary && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: 0 }}
          animate={{ scale: [0.4, 1.3, 1], opacity: [0, 0.9, 0.5], rotate: 360 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '38%', left: '50%', width: 420, height: 420,
            transform: 'translate(-50%,-50%)', borderRadius: '50%',
            border: '3px solid #FFD700aa', boxShadow: '0 0 40px 10px #FFD70066',
          }}
        />
      )}
      {confetti.map(c => <ConfettiPiece key={c.id} {...c} />)}
    </motion.div>
  );
}

// ── [신규] 단계별 상시 오라 효과 — 진화할수록 점점 화려해짐 ────────────────
function PetAura({ stageIndex, color }) {
  if (stageIndex < 1) return null; // 알 단계는 EggWithCracks의 자체 크랙/Lv10 글로우로 처리됨

  const tier          = Math.min(stageIndex, 5); // 1(아기)~5(전설)
  const isLegendary   = stageIndex === 5;
  const hasRays       = stageIndex >= 4;          // 왕햄찌 이상
  const ringOpacity   = [0, 0.18, 0.30, 0.42, 0.60, 0.88][tier];
  const ringScale     = [0, 1.15, 1.22, 1.30, 1.42, 1.6][tier];
  const sparkleCount  = [0, 0, 2, 3, 5, 7][tier];
  const sparkleEmojis = isLegendary ? ['✨','🌟','💫','⭐'] : hasRays ? ['✨','👑'] : ['✨','💫'];

  const ringBg = isLegendary
    ? 'conic-gradient(from 0deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6, #FF6BAF, #FF6B6B)'
    : `radial-gradient(circle, ${color}${hasRays ? 'cc' : '88'} 0%, transparent 70%)`;

  return (
    <Box sx={{ position: 'absolute', inset: -18, zIndex: 0, pointerEvents: 'none' }}>
      {/* 은은하게 숨쉬듯 커졌다 작아지는 배경 글로우 (모든 단계 공통, 단계별로 강도만 다름) */}
      <motion.div
        animate={{ scale: [1, ringScale, 1], opacity: [ringOpacity * 0.55, ringOpacity, ringOpacity * 0.55] }}
        transition={{ duration: isLegendary ? 2.1 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: ringBg, filter: 'blur(10px)' }}
      />

      {/* 왕햄찌 이상: 천천히 회전하는 광선 */}
      {hasRays && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: isLegendary ? 6 : 10, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.7,
            background: isLegendary
              ? 'repeating-conic-gradient(from 0deg, #FFD70055 0deg 8deg, transparent 8deg 24deg)'
              : `repeating-conic-gradient(from 0deg, ${color}44 0deg 10deg, transparent 10deg 30deg)`,
          }}
        />
      )}

      {/* 궤도를 도는 반짝이 파티클 — 단계가 높을수록 개수 많고 빠르게 회전 */}
      {sparkleCount > 0 && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: isLegendary ? 5 : 8, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {Array.from({ length: sparkleCount }).map((_, i) => {
            const angle  = (360 / sparkleCount) * i;
            const rad    = (angle * Math.PI) / 180;
            const radius = 34;
            const x = 50 + Math.cos(rad) * radius;
            const y = 50 + Math.sin(rad) * radius;
            return (
              <Box key={i} component="span" sx={{
                position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                fontSize: isLegendary ? '13px' : '10px', lineHeight: 1,
              }}>
                {sparkleEmojis[i % sparkleEmojis.length]}
              </Box>
            );
          })}
        </motion.div>
      )}
    </Box>
  );
}

// ── PetCard ───────────────────────────────────────────────────────────
function PetCard({ user, data, isMe, today, onAction, canCheer, onCheer, otherUser, onResetUser }) {
  const stage = STAGES[Math.min(data.stage, STAGES.length-1)];
  const [particles, setParticles] = useState([]);
  const [bouncing, setBouncing]   = useState(false);

  const xpNeeded   = xpForLevel(data.stage, data.level); // [수정] 스테이지 인자 추가
  const xpPct      = Math.min(100, (data.xp / xpNeeded) * 100);
  const hasPoop    = !data.poopCleaned;
  const mult       = streakMult(data.streak);
  const weightColor = data.weight >= 90 ? '#E53935' : data.weight >= 70 ? '#FF9800' : '#78909C';

  const isDead      = !!data.isDead;
  const canInteract = isMe && !isDead && data.todayInteracted !== today;
  const canFeed     = isMe && !isDead && data.todayFed !== today;
  const snackLeft   = 3 - (data.todaySnack ?? 0);
  const canSnack    = isMe && !isDead && snackLeft > 0;
  const [resetTarget, setResetTarget] = useState(null); // null | 'self' | 'partner'
  const [petImgFailed, setPetImgFailed] = useState(false); // [신규] 사진 로드 실패 시 이모지로 자동 대체
  useEffect(() => { setPetImgFailed(false); }, [data.stage]); // 진화하면 새 사진으로 다시 시도

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

  const handleCheer = () => {
    if (!canCheer) return;
    spawnParticles(['🎉','💖','✨']);
    setBouncing(true); setTimeout(() => setBouncing(false), 550);
    onCheer();
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
        {!isDead && <PetAura stageIndex={data.stage} color={stage.color} />}
        <AnimatePresence>
          {particles.map(p => <FloatingParticle key={p.id} {...p} />)}
        </AnimatePresence>
        <motion.div
          animate={bouncing ? { scale: [1, 1.4, 0.88, 1.12, 1], rotate: [0, 14, -14, 6, 0] } : {}}
          transition={{ duration: 0.5 }}
          style={{ lineHeight: 1, userSelect: 'none', display: 'inline-block', position: 'relative', zIndex: 1 }}
        >
          {data.health <= 0
            ? <Box component="span" sx={{ fontSize: '48px' }}>💀</Box>
            : data.stage === 0
              ? <EggWithCracks level={data.level} isChubby={data.weight >= 70} image={stage.image} />
              : (stage.image && !petImgFailed
                  ? <Box
                      component="img"
                      src={stage.image}
                      alt={stage.name}
                      onError={() => setPetImgFailed(true)}
                      sx={{
                        width: data.weight >= 70 ? 54 : 48,
                        height: data.weight >= 70 ? 54 : 48,
                        objectFit: 'contain', display: 'block', userSelect: 'none',
                      }}
                    />
                  : <Box component="span" sx={{ fontSize: data.weight >= 70 ? '54px' : '48px' }}>{stage.emoji}</Box>
                )
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

      {/* [신규] 사망 안내 문구 (5일 이상 미접속) */}
      {isDead && (
        <Box sx={{ p: '6px 8px', borderRadius: '8px', bgcolor: '#00000008', border: `1px dashed ${B.dark}33`, mb: '8px' }}>
          <Typography sx={{ fontSize: '0.56rem', color: B.dark+'99', fontFamily: "'Noto Sans KR'", fontWeight: 700, lineHeight: 1.5 }}>
            💀 5일 동안 돌봄을 받지 못해 떠났어요.{isMe ? ' 아래 버튼으로 다시 알부터 시작할 수 있어요.' : ''}
          </Typography>
        </Box>
      )}

      {/* 오늘 체크인 표시 (상대방) */}
      {!isMe && !isDead && (
        <Typography sx={{ fontSize: '0.58rem', color: B.dark+'44', fontFamily: "'Noto Sans KR'", mb: '6px' }}>
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

          {hasPoop && !isDead && (
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

          {/* [수정] 알로 되돌리기 — 버튼은 여전히 본인 카드에서만 노출되지만,
              내 펫/상대방 펫 둘 중 하나를 골라 되돌릴 수 있음 */}
          {resetTarget ? (
            <Box sx={{ p: '6px 8px', borderRadius: '8px', bgcolor: '#00000006', border: `1px dashed ${B.dark}44` }}>
              <Typography sx={{ fontSize: '0.54rem', color: B.dark+'aa', fontFamily: "'Noto Sans KR'", fontWeight: 700, mb: '5px' }}>
                정말 {resetTarget === 'self' ? '내' : otherUser} 펫을 처음부터 다시 시작할까요? 지금까지의 진행이 모두 사라져요.
              </Typography>
              <Stack direction="row" gap="5px">
                <Button size="small" onClick={() => setResetTarget(null)}
                  sx={{ flex: 1, borderRadius: 10, fontSize: '0.58rem', py: '4px',
                    bgcolor: B.dark+'0e', color: B.dark+'88', fontFamily: "'Noto Sans KR'", fontWeight: 700 }}>
                  취소
                </Button>
                <Button size="small"
                  onClick={() => { onResetUser(resetTarget === 'self' ? user : otherUser); setResetTarget(null); }}
                  sx={{ flex: 1, borderRadius: 10, fontSize: '0.58rem', py: '4px',
                    bgcolor: '#E5393515', border: '1px solid #E5393555',
                    color: '#C62828', fontFamily: "'Noto Sans KR'", fontWeight: 700 }}>
                  확인
                </Button>
              </Stack>
            </Box>
          ) : (
            <Stack direction="row" gap="5px">
              <Button size="small" onClick={() => setResetTarget('self')}
                sx={{
                  flex: 1, borderRadius: 10, fontSize: '0.56rem', py: '4px',
                  bgcolor: 'transparent', border: `1px dashed ${B.dark}33`,
                  color: B.dark+'66', fontFamily: "'Noto Sans KR'", fontWeight: 700,
                  '&:hover': { bgcolor: B.dark+'08' },
                }}>
                🔄 내 알로
              </Button>
              <Button size="small" onClick={() => setResetTarget('partner')}
                sx={{
                  flex: 1, borderRadius: 10, fontSize: '0.56rem', py: '4px',
                  bgcolor: 'transparent', border: `1px dashed ${B.dark}33`,
                  color: B.dark+'66', fontFamily: "'Noto Sans KR'", fontWeight: 700,
                  '&:hover': { bgcolor: B.dark+'08' },
                }}>
                🔄 {otherUser} 알로
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      {/* [신규] 파트너 펫에게 응원 보내기 — 하루 1회, 상대 애정+XP 즉시 반영 */}
      {!isMe && (
        <Button size="small" onClick={handleCheer} disabled={!canCheer}
          sx={{
            width: '100%', borderRadius: 10, fontSize: '0.62rem', py: '5px',
            bgcolor: canCheer ? '#FFD70020' : 'transparent',
            border: `1.5px solid ${canCheer ? '#FFC107aa' : B.dark+'0e'}`,
            color: canCheer ? '#B8860B' : B.dark+'2a',
            fontFamily: "'Noto Sans KR'", fontWeight: 700,
            '&:hover': { bgcolor: '#FFD70035' },
            '&.Mui-disabled': { color: B.dark+'1a' },
          }}>
          🎉 응원 보내기{isDead ? ' (되돌리기 필요)' : (!canCheer ? ' (완료)' : '')}
        </Button>
      )}
    </Box>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────
export default function CoupleTamagotchi({ currentUser }) {
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evolved, setEvolved] = useState(null); // [수정] { name, color, isLegendary } | null
  const shakeControls = useAnimation(); // [신규] 진화 시 위젯을 흔드는 스크린쉐이크 제어
  const today   = toIso();
  const docRef  = doc(db, 'couple_tamagotchi', COUPLE_ID);
  const otherUser = USERS.find(u => u !== currentUser) ?? '';

  // [신규] 진화 축하 트리거: 배너+오버레이+컨페티 표시 및 스크린쉐이크 실행
  const celebrateEvolution = (stageIndex) => {
    const st = STAGES[stageIndex];
    if (!st) return;
    const isLegendary = stageIndex === STAGES.length - 1;
    setEvolved({ name: st.name, color: st.color, isLegendary });
    shakeControls.start({
      x: [0, -12, 12, -10, 10, -6, 6, -3, 3, 0],
      transition: { duration: isLegendary ? 0.75 : 0.55, ease: 'easeInOut' },
    });
  };

  useEffect(() => {
    if (!evolved) return;
    const t = setTimeout(() => setEvolved(null), evolved.isLegendary ? 6000 : 5000);
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
        if (!me.isDead && me.lastVisitDate !== today) {
          const prevDay   = isoAddDays(today, -1);
          const newStreak = me.lastVisitDate === prevDay ? me.streak + 1 : 1;
          let updated     = { ...me, streak: newStreak, lastVisitDate: today };
          const prevStage = updated.stage;
          updated = applyXp(updated, 10);
          if (updated._evolved && updated.stage > prevStage) celebrateEvolution(updated.stage);
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

    // [신규] 사망 상태에서는 액션 무시 (되돌리기는 handleResetPet이 별도로 처리)
    if (data.isDead) return;

    if (action === 'interact') {
      data = applyXp(data, 5);
      data.love = Math.min(100, data.love+15);
      data.health = Math.min(100, data.health+3); // [추가] 소량 건강 회복
      data.todayInteracted = today;
    } else if (action === 'feed') {
      data.hunger = Math.min(100, data.hunger+30); data.weight = Math.min(100, data.weight+2);
      data.love   = Math.min(100, data.love+5);
      data.health = Math.min(100, data.health+5); // [추가] 소량 건강 회복
      data.todayFed = today;
      data.nextPoopTime = Date.now() + (6 + Math.random()*6) * 3600000;
      data = applyXp(data, 3);
    } else if (action === 'snack') {
      data.hunger = Math.min(100, data.hunger+20); data.weight = Math.min(100, data.weight+10);
      data.love   = Math.min(100, data.love+30);
      data.todaySnack = (data.todaySnack ?? 0) + 1;
      data.lastSnackDate = today; // [버그 수정] 날짜 기록 (자정 지나면 자동 리셋되도록)
      data = applyXp(data, 2);
    } else if (action === 'cleanPoop') {
      data.poopCleaned = true; data.poopDate = null; data.health = Math.min(100, data.health+10);
      data = applyXp(data, 2);
    }

    if (data._evolved && data.stage > prevStage) celebrateEvolution(data.stage);
    delete data._evolved;

    setAllData({ ...allData, [currentUser]: data });
    await setDoc(docRef, { [currentUser]: data, updatedAt: serverTimestamp() }, { merge: true });
  };

  // [신규] 지정한 유저의 펫을 알로 되돌림. 버튼은 본인 카드에서만 노출되지만
  // targetUser로 본인/파트너 어느 쪽이든 초기화할 수 있도록 일반화.
  const handleResetPet = async (targetUser) => {
    if (!allData) return;
    const resetData = makeDefault();
    resetData.lastVisitDate = today; // 되돌린 오늘은 이미 방문한 것으로 처리
    const newAllData = { ...allData, [targetUser]: resetData };
    setAllData(newAllData);
    await setDoc(docRef, { [targetUser]: resetData, updatedAt: serverTimestamp() }, { merge: true });
  };

  // [신규] 파트너에게 응원 보내기: 파트너 애정+XP 즉시 반영, 나는 하루 1회만 가능
  const handleCheer = async () => {
    if (!allData) return;
    const me = allData[currentUser];
    if (me.lastCheerSentDate === today) return;
    if (me.isDead) return; // 내 펫이 사망 상태면 응원도 보낼 수 없음

    let partnerData = { ...allData[otherUser] };
    if (partnerData.isDead) return; // 사망한 파트너 펫에는 응원 불가 (되돌리기 먼저 필요)
    const prevPartnerStage = partnerData.stage;
    partnerData.love = Math.min(100, partnerData.love + 20);
    partnerData.health = Math.min(100, partnerData.health + 5);
    partnerData = applyXp(partnerData, 4);
    if (partnerData._evolved && partnerData.stage > prevPartnerStage) {
      celebrateEvolution(partnerData.stage);
    }
    delete partnerData._evolved;

    const meUpdated = { ...me, lastCheerSentDate: today };

    setAllData({ ...allData, [currentUser]: meUpdated, [otherUser]: partnerData });
    await setDoc(docRef, {
      [currentUser]: meUpdated,
      [otherUser]: partnerData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
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
  const canCheerToday = allData[currentUser].lastCheerSentDate !== today;

  return (
    <>
      {/* [수정] 진화 축하 연출: 전체화면 어둡게+골드/무지개 버스트+컨페티 비 */}
      <AnimatePresence>
        {evolved && <EvolutionCelebration stageColor={evolved.color} isLegendary={evolved.isLegendary} />}
      </AnimatePresence>

      {/* 진화 알림 배너 (강화 버전) */}
      <AnimatePresence>
        {evolved && (
          <motion.div key="evo"
            initial={{ opacity: 0, y: -30, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: [0.6, 1.15, 1] }}
            exit={{ opacity: 0, y: -20, scale: 0.85 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', zIndex: 3100, textAlign: 'center' }}
          >
            <Paper elevation={12} sx={{
              px: evolved.isLegendary ? 4.5 : 3.5, py: evolved.isLegendary ? 2.4 : 1.8, borderRadius: 5, textAlign: 'center',
              bgcolor: evolved.isLegendary ? '#1a1130' : B.cream,
              border: evolved.isLegendary ? '2px solid #FFD700' : `2.5px solid ${evolved.color}`,
              boxShadow: evolved.isLegendary
                ? '0 0 50px 12px #FFD70088, 0 0 90px 25px #9B59B655'
                : `0 0 34px 6px ${evolved.color}66`,
            }}>
              <Typography sx={{
                fontSize: evolved.isLegendary ? '1.6rem' : '1.2rem', mb: '2px',
                filter: evolved.isLegendary ? 'drop-shadow(0 0 8px #FFD700)' : 'none',
              }}>
                {evolved.isLegendary ? '🌈✨👑✨🌈' : '🎉✨🎉'}
              </Typography>
              <Typography sx={{
                fontFamily: "'Jua'", fontSize: evolved.isLegendary ? '1.35rem' : '1.05rem',
                color: evolved.isLegendary ? '#FFD700' : evolved.color,
                lineHeight: 1.4,
              }}>
                {evolved.name}(으)로 진화했어요!
              </Typography>
              {evolved.isLegendary && (
                <Typography sx={{ fontSize: '0.68rem', color: '#E0D0FF', fontFamily: "'Noto Sans KR'", fontWeight: 700, mt: '2px' }}>
                  🏆 마침내 전설이 되었습니다 🏆
                </Typography>
              )}
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* [신규] 진화 시 위젯 전체가 짧게 흔들리는 스크린쉐이크 */}
      <motion.div animate={shakeControls}>
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
            <PetCard
              key={u}
              user={u}
              data={allData[u]}
              isMe={u === currentUser}
              today={today}
              onAction={handleAction}
              canCheer={u !== currentUser ? (canCheerToday && !allData[u].isDead) : false}
              onCheer={u !== currentUser ? handleCheer : undefined}
              otherUser={otherUser}
              onResetUser={handleResetPet}
            />
          ))}
        </Stack>

        {/* 하단 안내 (접혀있게) */}
        <Box sx={{ mt: '10px', p: '8px 10px', borderRadius: '10px', bgcolor: B.pants+'08' }}>
          <Typography sx={{ fontSize: '0.54rem', color: B.dark+'66', fontFamily: "'Noto Sans KR'", lineHeight: 1.8 }}>
            💡 방문 +10 · 상호작용 +5 · 밥 +3 · 간식 +2 · 응원 보내기 +4 XP (×스트릭 배율)<br />
            🔥 4일+ 연속 ×1.5 → 8일+ ×2.0 → 15일+ ×2.5 · 3일 이상 미방문 시 스트릭 리셋<br />
            🥚 알→아기 약 7일 · 아기→햄찌 약 14일 · 햄찌→통통 약 30일 · 통통→왕 약 60일 · 왕→전설 약 90일<br />
            💩 밥 후 6~12시간 뒤 등장 · 방치 시 건강만 감소 (레벨/단계는 유지돼요)
          </Typography>
        </Box>
      </Paper>
      </motion.div>
    </>
  );
}