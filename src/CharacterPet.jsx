import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Stack, Paper, Button, Drawer, TextField, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { db } from './firebase';
import {
  doc, getDoc, setDoc, runTransaction,
  addDoc, collection, serverTimestamp,
} from 'firebase/firestore';

// 6단계 고양이 이미지 (HP 높음 → 낮음)
import catFat from './assets/KakaoTalk_20260518_144322853.png'; // 뚱뚱    (80-100)
import catSmile from './assets/KakaoTalk_20260518_144429661.png'; // 통통    (60-79)
import catTongue from './assets/KakaoTalk_20260518_145359042.png'; // 보통    (45-59)
import catGrumpy from './assets/KakaoTalk_20260518_144400884.png'; // 마른    (30-44)
import catScruff from './assets/KakaoTalk_20260518_145513803.png'; // 해골직전 (15-29)
import catStatue from './assets/KakaoTalk_20260518_145131598.png'; // 해골    (0-14)

const B = {
  pants: '#7B4FA6', skin: '#F5B8A0', cream: '#FFF8F2',
  peach: '#FFE4D4', lavender: '#EDE0F5', accent: '#E8630A', dark: '#3D1F00',
};

const COUPLE_ID = 'jisu_hyunha';
const USERS = ['지수', '현하'];
const ADMIN_USER = '지수';

// ── 말풍선 문구 목록 ─────────────────────────────────────────────
// 자유롭게 추가·삭제 가능 (10~15자 권장)
const SPEECH_BUBBLES = [
  '사랑해 💜',
  '보고싶으소 🥺',
  '최고야 최고야 💜',
  '빨리 보고 싶으시세소😍',
  '칭찬해주세요 🙏',
  '뽀뽀해주시소 😚',
  '오늘 하루 어땠으여???',
  '기록 해주세여 제발 ',
  '오늘도 화이팅 하시소!! ✨',
  '나는감정없는사이코라그런가이런거보면미동도안함',
  '류덩이폼미쳤다;;',
  '무능무능',
  '류덩이를 변기에 넣고 돌려',
  '좋은일생기는 따봉냥이에 당첨됨',
  '현하가글써줄때까지숨참음',
  '현하의 수박🍉가슴',
  '왕 자지🍆 수👑 공주현하👸',
  '통뼈GOAT현하',
  '크리스티아누 류현하',
  '남들이 탐욕스러울 때 두려워하고, 남들이 두려워할 때 탐욕스러워라. — Warren Buffett',
  '손실을 피하는 것이 수익을 쫓는 것보다 중요하다. — Paul Tudor Jones',
  '시장은 당신이 버틸 수 있는 시간보다 더 오래 비합리적일 수 있다. — John Maynard Keynes',
  '시장은 인내심 없는 사람의 돈이, 인내심 있는 사람에게 이동하는 곳이다. — Warren Buffett',
  '카카오 사지마라 - 정지수',
  '불가능은 시도하지 않은 사람들의 변명이다. — Muhammad Ali',
  '위대한 일은 힘이 아니라 꾸준함으로 이루어진다. — Samuel Johnson',
  '잘떄 코좀 골지마라 - 류머니',
  '웅냥냥 - 지하니',
  '과자는 인류가 만들어낸 최고의 완전식품이다 - 현덩이',
  '벤앤제리스통온다;;',
  '오래오래 행복하게 지내자❤️',
  '🍆💦🌶️🍑🥵',
  '빨고싶게생겼다🥵(실제로한말) - 현하'
];

const CAT_IMAGES = [catFat, catSmile, catTongue, catGrumpy, catScruff, catStatue];

// HP 단계 경계: 0, 15, 30, 45, 60, 80, 100
const STAGES = [
  { min: 80, label: '뚱냥이', img: catFat, color: '#7B4FA6', emoji: '😸', desc: '행복 만땅! 통통하게 잘 살아요' },
  { min: 60, label: '통통냥이', img: catSmile, color: '#43A047', emoji: '😊', desc: '건강하게 잘 지내고 있어요' },
  { min: 45, label: '보통냥이', img: catTongue, color: '#EF9F27', emoji: '😛', desc: '평범하게 지내고 있어요' },
  { min: 30, label: '시무룩냥이', img: catGrumpy, color: '#E8630A', emoji: '😒', desc: '기록이 줄었어요. 힘내봐요!' },
  { min: 15, label: '뼈냥이', img: catScruff, color: '#E53935', emoji: '😰', desc: '위험해요! 빨리 기록해요!' },
  { min: 0, label: '해골냥이', img: catStatue, color: '#757575', emoji: '💀', desc: '쓰러졌어요... 기록하면 부활해요!' },
];

const MISSIONS = [
  { id: 'promise', emoji: '💌', label: '우리 처음의 약속', detail: '일기에 서로에 대한 약속을 30자 이상 적어주세요' },
  { id: 'past_diary', emoji: '📅', label: '과거 일기에 댓글', detail: '3일 이전 일기에 각자 댓글을 20자 이상 달아주세요' },
  { id: 'sync_temp', emoji: '🌡️', label: '같은 날 같은 시간', detail: '1시간 이내에 두 사람 모두 감정온도를 기록해주세요' },
  { id: 'date_plan', emoji: '🗓️', label: '이번 달 데이트 계획', detail: '캘린더에 이번 달 데이트 일정을 각자 하나씩 추가해주세요' },
  { id: 'capsule', emoji: '💬', label: '미래의 우리에게', detail: '내일 날짜로 타임캡슐을 각자 20자 이상 작성해주세요' },
];

const HP_GAIN = 15; // 체크인 성공 시
const HP_LOSS = 15; // 미기록 패널티

function getStage(hp) {
  return STAGES.find(s => hp >= s.min) ?? STAGES[STAGES.length - 1];
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

// ── 개인 HP 누락일 패널티 평가 ─────────────────────────────────────
async function evaluateUserPenalties(user, userData) {
  const today = toIso(new Date());
  const lastEval = userData.lastEvalDate ?? today;
  const yesterday = addDays(today, -1);

  if (lastEval >= yesterday) return userData;

  let hp = userData.hp ?? 60;
  let revivalMission = userData.revivalMission ?? null;
  let cursor = addDays(lastEval, 1);

  while (cursor <= yesterday) {
    const snap = await getDoc(doc(db, 'daily_checkins', `${COUPLE_ID}_${cursor}`));
    const checkedIn = snap.exists() ? (snap.data().checkedIn ?? []) : [];
    if (!checkedIn.includes(user)) hp = Math.max(0, hp - HP_LOSS);

    // 해골 단계 진입 시 부활 미션 배정
    if (hp < 15 && !revivalMission) {
      revivalMission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)].id;
    }
    cursor = addDays(cursor, 1);
  }

  const updated = { ...userData, hp, lastEvalDate: yesterday, revivalMission };
  await setDoc(doc(db, 'couple_character', COUPLE_ID), { [user]: updated }, { merge: true });
  return updated;
}

// ── 체크인 기록 (EmotionThermometer, DiaryWrite에서 import) ──────
export async function recordCheckin(user) {
  const today = toIso(new Date());
  const checkinId = `${COUPLE_ID}_${today}`;
  const charRef = doc(db, 'couple_character', COUPLE_ID);
  const checkinRef = doc(db, 'daily_checkins', checkinId);

  try {
    await runTransaction(db, async (tx) => {
      const charSnap = await tx.get(charRef);
      const checkinSnap = await tx.get(checkinRef);

      const charData = charSnap.exists() ? charSnap.data() : {};
      const checkedIn = checkinSnap.exists() ? (checkinSnap.data().checkedIn ?? []) : [];

      if (checkedIn.includes(user)) return;

      const userData = charData[user] ?? { hp: 60, lastEvalDate: today, revivalMission: null };

      // 해골 단계(0-14)면 기록 시 해골직전(15)으로 복구, 아니면 +15
      const newHp = userData.hp < 15
        ? 15
        : Math.min(100, userData.hp + HP_GAIN);

      const userUpdate = { ...userData, hp: newHp, revivalMission: newHp >= 15 ? null : userData.revivalMission };
      const newCheckedIn = [...checkedIn, user];

      if (charSnap.exists()) {
        tx.update(charRef, { [user]: userUpdate, updatedAt: serverTimestamp() });
      } else {
        tx.set(charRef, { [user]: userUpdate, updatedAt: serverTimestamp() });
      }

      const checkinPayload = {
        coupleId: COUPLE_ID, date: today,
        checkedIn: newCheckedIn,
        [`times_${user}`]: new Date().toISOString(),
      };
      if (checkinSnap.exists()) {
        tx.update(checkinRef, checkinPayload);
      } else {
        tx.set(checkinRef, checkinPayload);
      }
    });
  } catch (e) {
    console.error('체크인 기록 실패:', e);
  }
}

// ── 개별 캐릭터 카드 ──────────────────────────────────────────────
function UserCard({ user, hp, isCurrentUser, checkedIn, side, bubbles }) {
  const stage = getStage(hp);
  const isSkull = hp < 15;
  const isLeft = side === 'left';

  const [bubble, setBubble] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const timerRef = useRef(null);

  const handleCatClick = () => {
    clearTimeout(timerRef.current);
    const list = bubbles?.length ? bubbles : SPEECH_BUBBLES;
    const text = list[Math.floor(Math.random() * list.length)];
    const catImg = CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)];
    setBubble({ text, catImg, key: Date.now() });
    setClickCount(c => c + 1);
    timerRef.current = setTimeout(() => setBubble(null), 2800);
  };

  useEffect(() => {
    const hintId = setTimeout(() => {
      const catImg = CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)];
      setBubble({ text: '나를 클릭해보시소! 👆', catImg, key: Date.now() });
      timerRef.current = setTimeout(() => setBubble(null), 3000);
    }, 700);
    return () => { clearTimeout(hintId); clearTimeout(timerRef.current); };
  }, []);

  return (
    <Box sx={{
      flex: 1, borderRadius: 3, p: '12px 10px', textAlign: 'center',
      bgcolor: isCurrentUser ? `${stage.color}0d` : 'white',
      border: `1.5px solid ${isCurrentUser ? stage.color + '44' : B.dark + '0e'}`,
      position: 'relative', transition: 'all 0.3s',
    }}>
      {/* 내 카드 뱃지 */}
      {isCurrentUser && (
        <Box sx={{
          position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
          px: 1.2, py: 0.1, borderRadius: 10, bgcolor: stage.color,
        }}>
          <Typography sx={{ fontSize: '0.52rem', color: 'white', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, whiteSpace: 'nowrap' }}>
            나
          </Typography>
        </Box>
      )}

      {/* ── 캐릭터 이미지 + 말풍선 ──────────────────────────────── */}
      <Box
        onClick={handleCatClick}
        sx={{
          position: 'relative',
          cursor: 'pointer',
          display: 'inline-block',
          margin: '4px auto 6px',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {/* 말풍선 */}
        <AnimatePresence>
          {bubble && (
            <motion.div
              key={bubble.key}
              initial={{ opacity: 0, scale: 0.6, y: 8, x: isLeft ? '-50%' : '0%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: isLeft ? '-50%' : '0%' }}
              exit={{ opacity: 0, scale: 0.88, y: -6, x: isLeft ? '-50%' : '0%', transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                zIndex: 100,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
                WebkitBackfaceVisibility: 'hidden',
                ...(isLeft ? { left: '50%' } : { right: 0 }),
              }}
            >
              {/* 말풍선 본체 */}
              <Box sx={{
                position: 'relative',
                bgcolor: '#ffffff',
                border: `2px solid ${stage.color}70`,
                borderRadius: '18px',
                px: 1.5, py: 1,
                boxShadow: `
                  0 6px 22px ${stage.color}33,
                  0 2px 8px rgba(0,0,0,0.12),
                  inset 0 1px 0 rgba(255,255,255,1)
                `,
                width: 118,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
              }}>
                {/* 반짝 하이라이트 */}
                <Box sx={{
                  position: 'absolute', top: 4, left: 8,
                  width: 18, height: 4, borderRadius: 10,
                  bgcolor: 'rgba(255,255,255,0.7)',
                  pointerEvents: 'none',
                }} />
                {/* 랜덤 고양이 이미지 */}
                <Box component="img" src={bubble.catImg} alt=""
                  sx={{ width: 46, height: 46, objectFit: 'contain', mt: 0.3 }} />
                <Typography sx={{
                  fontFamily: "'Jua', sans-serif",
                  fontSize: '0.74rem',
                  color: stage.color,
                  lineHeight: 1.35,
                  letterSpacing: 0.2,
                  textShadow: `0 1px 2px ${stage.color}18`,
                  textAlign: 'center',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                }}>
                  {bubble.text}
                </Typography>
                {/* 꼬리 (테두리) */}
                <Box sx={{
                  position: 'absolute',
                  bottom: -8,
                  left: isLeft ? '50%' : '68%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: 12, height: 12,
                  bgcolor: `${stage.color}0c`,
                  background: `linear-gradient(135deg, transparent 40%, ${stage.color}0c 100%)`,
                  borderRight: `2px solid ${stage.color}70`,
                  borderBottom: `2px solid ${stage.color}70`,
                }} />
                {/* 꼬리 (채움 - 경계선 위에 덮기) */}
                <Box sx={{
                  position: 'absolute',
                  bottom: -6,
                  left: isLeft ? '50%' : '68%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: 10, height: 10,
                  bgcolor: 'white',
                }} />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 고양이 이미지 */}
        <motion.img
          src={stage.img}
          alt={stage.label}
          key={`${stage.label}-${clickCount}`}
          initial={clickCount > 0
            ? { scale: 1.18, rotate: clickCount % 2 === 0 ? 8 : -8 }
            : { scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: 72, height: 72, objectFit: 'contain',
            display: 'block',
            willChange: 'transform',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            filter: isSkull ? 'grayscale(0.85) brightness(0.72)' : 'none',
          }}
        />
      </Box>

      {/* 이름 */}
      <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '0.85rem', color: stage.color, lineHeight: 1 }}>
        {user}
      </Typography>

      {/* 단계 칩 */}
      <Box sx={{ display: 'inline-block', px: 0.8, py: 0.2, borderRadius: 10, mt: 0.4, mb: 0.8, bgcolor: `${stage.color}18` }}>
        <Typography sx={{ fontSize: '0.58rem', color: stage.color, fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}>
          {stage.emoji} {stage.label}
        </Typography>
      </Box>

      {/* HP 바 */}
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
        <Typography sx={{ fontSize: '0.56rem', color: B.dark + '66', fontFamily: "'Noto Sans KR',sans-serif" }}>HP</Typography>
        <Typography sx={{ fontSize: '0.6rem', fontFamily: "'Jua',sans-serif", color: stage.color }}>{hp}</Typography>
      </Stack>
      <Box sx={{ height: 7, borderRadius: 4, bgcolor: `${stage.color}1a`, overflow: 'hidden', mb: 0.8 }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: hp / 100 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          style={{
            height: '100%',
            width: '100%',
            transformOrigin: 'left center',
            willChange: 'transform',
            background: isSkull
              ? '#BDBDBD'
              : `linear-gradient(to right, ${stage.color}88, ${stage.color})`,
            borderRadius: 4,
          }}
        />
      </Box>

      {/* 오늘 체크인 */}
      <Typography sx={{ fontSize: '0.68rem', lineHeight: 1 }}>
        {checkedIn ? '✅' : '⬜'}
      </Typography>
      <Typography sx={{
        fontSize: '0.56rem', mt: 0.2,
        color: checkedIn ? '#43A047' : B.dark + '44',
        fontFamily: "'Noto Sans KR',sans-serif",
        fontWeight: checkedIn ? 700 : 400,
      }}>
        {checkedIn ? '기록 완료' : '미기록'}
      </Typography>
    </Box>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function CharacterPet({ currentUser }) {
  const [allData, setAllData] = useState(null);
  const [todayCheckin, setTodayCheckin] = useState({ checkedIn: [] });
  const [loading, setLoading] = useState(true);
  const [jiltaSent, setJiltaSent] = useState(false);

  // 말풍선 관리
  const [bubbles, setBubbles] = useState(SPEECH_BUBBLES);
  const [manageOpen, setManageOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const [saving, setSaving] = useState(false);

  const today = toIso(new Date());
  const otherUser = USERS.find(u => u !== currentUser) ?? '';
  const configRef = doc(db, 'couple_config', COUPLE_ID);

  useEffect(() => {
    const init = async () => {
      try {
        const [charSnap, configSnap] = await Promise.all([
          getDoc(doc(db, 'couple_character', COUPLE_ID)),
          getDoc(configRef),
        ]);

        // 말풍선 로드
        if (configSnap.exists() && configSnap.data().speechBubbles?.length) {
          setBubbles(configSnap.data().speechBubbles);
        } else {
          await setDoc(configRef, { speechBubbles: SPEECH_BUBBLES }, { merge: true });
        }

        const rawData = charSnap.exists() ? charSnap.data() : {};
        const defaults = { hp: 60, lastEvalDate: today, revivalMission: null };
        const updatedData = {};
        for (const user of USERS) {
          updatedData[user] = await evaluateUserPenalties(user, rawData[user] ?? { ...defaults });
        }
        if (!charSnap.exists()) {
          await setDoc(doc(db, 'couple_character', COUPLE_ID), { ...updatedData, updatedAt: serverTimestamp() });
        }
        setAllData(updatedData);

        const checkinSnap = await getDoc(doc(db, 'daily_checkins', `${COUPLE_ID}_${today}`));
        setTodayCheckin(checkinSnap.exists() ? checkinSnap.data() : { checkedIn: [] });
      } catch (e) {
        console.error('CharacterPet 초기화 오류:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const saveBubbles = async (list) => {
    await setDoc(configRef, { speechBubbles: list }, { merge: true });
    setBubbles(list);
  };

  const handleAddPhrase = async (onSuccess) => {
    const trimmed = newPhrase.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await saveBubbles([...bubbles, trimmed]);
      setNewPhrase('');
      onSuccess?.();
    } finally { setSaving(false); }
  };

  const handleDeletePhrase = async (idx) => {
    await saveBubbles(bubbles.filter((_, i) => i !== idx));
  };

  const sendJilta = async () => {
    if (jiltaSent) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        writer: currentUser, type: 'jilta',
        content: `😤 ${currentUser}가 질타를 보냈어요! 얼른 기록해요!`,
        target: otherUser,
        createdAt: serverTimestamp(), isRead: false,
      });
      setJiltaSent(true);
    } catch (e) {
      console.error('질타 전송 실패:', e);
    }
  };

  if (loading || !allData) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, opacity: 0.5 }}>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants }}>고양이 깨우는 중... 🐱</Typography>
      </Box>
    );
  }

  const checkedIn = todayCheckin.checkedIn ?? [];
  const bothCheckedIn = USERS.every(u => checkedIn.includes(u));
  const myData = allData[currentUser] ?? { hp: 60 };
  const otherData = allData[otherUser] ?? { hp: 60 };
  const isOtherSkull = (otherData.hp ?? 60) < 15;
  const otherCheckedIn = checkedIn.includes(otherUser);
  const mySkull = (myData.hp ?? 60) < 15;
  const myMission = mySkull
    ? MISSIONS.find(m => m.id === myData.revivalMission) ?? null
    : null;

  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 4, overflow: 'visible',
      bgcolor: B.cream,
      border: `1.5px solid ${B.pants}18`,
      backgroundImage: `radial-gradient(circle at 90% 5%, ${B.lavender}55 0%, transparent 40%)`,
    }}>

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <Box sx={{ mb: 1.8 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: '0.92rem' }}>
            😸 고먐미 건강 상태
          </Typography>
          <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <Button
              size="small"
              startIcon={
                currentUser === ADMIN_USER
                  ? <EditNoteIcon sx={{ fontSize: '0.85rem !important' }} />
                  : <AddCircleOutlineIcon sx={{ fontSize: '0.85rem !important' }} />
              }
              onClick={() => currentUser === ADMIN_USER ? setManageOpen(true) : setAddOpen(true)}
              sx={{
                borderRadius: 10,
                bgcolor: B.pants,
                color: 'white',
                fontSize: '0.62rem',
                fontFamily: "'Noto Sans KR',sans-serif",
                fontWeight: 700,
                px: 1.2, py: 0.35,
                minHeight: 0,
                boxShadow: `0 2px 10px ${B.pants}55`,
                animation: 'hamPulse 2.5s ease-in-out infinite',
                '&:hover': { bgcolor: '#6A3D96', boxShadow: `0 3px 14px ${B.pants}77` },
                '&:active': { transform: 'scale(0.92)' },
              }}
            >
              {currentUser === ADMIN_USER ? '문구 관리' : '문구 추가'}
            </Button>
            <Box sx={{
              position: 'absolute', top: -5, right: -6,
              bgcolor: '#FF4444', borderRadius: 10,
              px: '4px', py: '1px',
              border: '1.5px solid white',
              pointerEvents: 'none',
            }}>
              <Typography sx={{ fontSize: '0.42rem', color: 'white', fontWeight: 900, lineHeight: 1, letterSpacing: 0.5 }}>
                NEW
              </Typography>
            </Box>
          </Box>
        </Stack>

        {/* 둘 다 완료 칩 — 별도 줄 */}
        {bothCheckedIn && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.9 }}>
            <Box sx={{
              px: 1.6, py: 0.35, borderRadius: 10,
              bgcolor: '#E8F5E9', border: '1px solid #A5D6A7',
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
            }}>
              <Typography sx={{ fontSize: '0.68rem', color: '#2E7D32', fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700 }}>
                💑 오늘 둘 다 기록 완료!
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── 캐릭터 카드 2장 ──────────────────────────────────── */}
      <Stack direction="row" gap={1.5} sx={{ mb: 1.5 }}>
        {USERS.map((user, idx) => (
          <UserCard
            key={user}
            user={user}
            hp={allData[user]?.hp ?? 60}
            isCurrentUser={user === currentUser}
            checkedIn={checkedIn.includes(user)}
            side={idx === 0 ? 'left' : 'right'}
            bubbles={bubbles}
          />
        ))}
      </Stack>

      {/* ── 질타 버튼 (상대방 미기록 시) ────────────────────── */}
      {!otherCheckedIn && (
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Button
            size="small"
            variant={jiltaSent ? 'text' : 'outlined'}
            disabled={jiltaSent}
            onClick={sendJilta}
            sx={{
              borderRadius: 10, fontSize: '0.7rem', px: 1.8, py: 0.5,
              fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700,
              borderColor: jiltaSent ? 'transparent' : B.accent + '66',
              color: jiltaSent ? B.dark + '55' : B.accent,
              '&:hover': { bgcolor: B.peach, borderColor: B.accent },
              '&.Mui-disabled': { color: B.dark + '44' },
            }}
          >
            {jiltaSent ? `✓ ${otherUser}한테 질타 완료` : `😤 ${otherUser}한테 질타 보내기`}
          </Button>
        </Box>
      )}

      {/* ── 상대방 해골 경고 ─────────────────────────────────── */}
      {isOtherSkull && (
        <Box sx={{
          p: 1.2, borderRadius: 2.5, mb: 1,
          bgcolor: '#FFF3E0', border: '1.5px dashed #FF9800',
          textAlign: 'center',
        }}>
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.7rem', color: '#E65100' }}>
            💀 {otherUser}가 해골이에요! 얼른 기록하라고 알려줘요! 📣
          </Typography>
        </Box>
      )}

      {/* ── 내 부활 미션 카드 ────────────────────────────────── */}
      {mySkull && myMission && (
        <Box sx={{
          p: 1.5, borderRadius: 3,
          bgcolor: '#FFF8E1', border: '1.5px solid #FFB300',
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: '#FF9800' }} />
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '0.88rem', color: '#E65100', mb: 0.5 }}>
            {myMission.emoji} 부활 미션 — {myMission.label}
          </Typography>
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.68rem', color: '#795548', lineHeight: 1.5 }}>
            {myMission.detail}
          </Typography>
          <Typography sx={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: '0.65rem', color: B.accent, mt: 0.8, fontWeight: 600 }}>
            ✨ 기록하면 해골직전으로 부활해요!
          </Typography>
        </Box>
      )}

      {/* ── 말풍선 관리 Drawer ─────────────────────────────── */}
      <Drawer
        anchor="bottom"
        open={manageOpen}
        onClose={() => { setManageOpen(false); setNewPhrase(''); }}
        PaperProps={{
          sx: {
            borderRadius: '22px 22px 0 0',
            maxHeight: '80vh',
            bgcolor: B.cream,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* 핸들 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.4, pb: 0.5, flexShrink: 0 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: B.pants + '33' }} />
        </Box>

        {/* 헤더 */}
        <Box sx={{ px: 2.5, pt: 0.5, pb: 1.4, borderBottom: `1px solid ${B.pants}14`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: B.pants }}>
            💬 말풍선 문구 관리
          </Typography>
          <Typography sx={{ fontSize: '0.66rem', color: '#bbb', mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
            고양이 클릭 시 여기서 랜덤하게 나와요 · 두 사람이 함께 공유해요
          </Typography>
        </Box>

        {/* 문구 목록 */}
        <Box sx={{ overflowY: 'auto', flex: 1, px: 2, py: 1.5 }}>
          {bubbles.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: '#ccc' }}>
              <Typography sx={{ fontSize: '0.8rem', fontFamily: "'Noto Sans KR',sans-serif" }}>
                문구가 없어요. 아래에서 추가해보세요!
              </Typography>
            </Box>
          )}
          {bubbles.map((phrase, idx) => (
            <Box key={idx} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: 'white', borderRadius: 2.5, px: 1.5, py: 1, mb: 0.8,
              border: `1.5px solid ${B.pants}0e`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <Typography sx={{
                flex: 1, fontSize: '0.82rem',
                fontFamily: "'Noto Sans KR',sans-serif", color: B.dark,
                wordBreak: 'break-all',
              }}>
                {phrase}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleDeletePhrase(idx)}
                sx={{
                  color: '#ddd', p: 0.5, flexShrink: 0,
                  '&:hover': { color: '#ff6b6b', bgcolor: '#fff0f0' },
                  '&:active': { transform: 'scale(0.85)' },
                }}
              >
                <DeleteIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ height: 8 }} />
        </Box>

        {/* 추가 입력 */}
        <Box sx={{
          px: 2, pb: 3, pt: 1.2, flexShrink: 0,
          borderTop: `1px solid ${B.pants}0e`,
          bgcolor: B.cream,
        }}>
          <Stack direction="row" gap={1} alignItems="center">
            <TextField
              placeholder="새 문구 입력 (최대 30자)"
              value={newPhrase}
              onChange={e => setNewPhrase(e.target.value.slice(0, 30))}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPhrase(); }}
              size="small"
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5, fontSize: '0.85rem', bgcolor: 'white',
                  '& fieldset': { borderColor: `${B.pants}28` },
                  '&:hover fieldset': { borderColor: `${B.pants}66` },
                  '&.Mui-focused fieldset': { borderColor: B.pants },
                },
              }}
              InputProps={{
                endAdornment: (
                  <Typography sx={{ fontSize: '0.58rem', color: '#ccc', whiteSpace: 'nowrap', pl: 0.5 }}>
                    {newPhrase.length}/30
                  </Typography>
                ),
              }}
            />
            <IconButton
              onClick={handleAddPhrase}
              disabled={!newPhrase.trim() || saving}
              sx={{
                bgcolor: B.pants, color: 'white',
                borderRadius: 2.5, width: 42, height: 42, flexShrink: 0,
                '&:hover': { bgcolor: '#6A3D96' },
                '&:active': { transform: 'scale(0.9)' },
                '&.Mui-disabled': { bgcolor: '#e8e8e8', color: '#bbb' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Stack>
        </Box>
      </Drawer>
      {/* ── 추가 전용 Drawer (비관리자용) ──────────────────── */}
      <Drawer
        anchor="bottom"
        open={addOpen}
        onClose={() => { setAddOpen(false); setNewPhrase(''); }}
        PaperProps={{
          sx: {
            borderRadius: '22px 22px 0 0',
            bgcolor: B.cream,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.4, pb: 0.5, flexShrink: 0 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: B.pants + '33' }} />
        </Box>
        <Box sx={{ px: 2.5, pt: 0.5, pb: 1.4, borderBottom: `1px solid ${B.pants}14`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: '1rem', color: B.pants }}>
            💬 말풍선 문구 추가
          </Typography>
          <Typography sx={{ fontSize: '0.66rem', color: '#bbb', mt: 0.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
            새 문구를 추가하면 두 사람 모두에게 공유돼요
          </Typography>
        </Box>
        <Box sx={{ px: 2, pb: 3, pt: 1.5, bgcolor: B.cream, flexShrink: 0 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <TextField
              placeholder="새 문구 입력 (최대 30자)"
              value={newPhrase}
              onChange={e => setNewPhrase(e.target.value.slice(0, 30))}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPhrase(() => setAddOpen(false)); }}
              size="small"
              autoFocus
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5, fontSize: '0.85rem', bgcolor: 'white',
                  '& fieldset': { borderColor: `${B.pants}28` },
                  '&:hover fieldset': { borderColor: `${B.pants}66` },
                  '&.Mui-focused fieldset': { borderColor: B.pants },
                },
              }}
              InputProps={{
                endAdornment: (
                  <Typography sx={{ fontSize: '0.58rem', color: '#ccc', whiteSpace: 'nowrap', pl: 0.5 }}>
                    {newPhrase.length}/30
                  </Typography>
                ),
              }}
            />
            <IconButton
              onClick={() => handleAddPhrase(() => setAddOpen(false))}
              disabled={!newPhrase.trim() || saving}
              sx={{
                bgcolor: B.pants, color: 'white',
                borderRadius: 2.5, width: 42, height: 42, flexShrink: 0,
                '&:hover': { bgcolor: '#6A3D96' },
                '&:active': { transform: 'scale(0.9)' },
                '&.Mui-disabled': { bgcolor: '#e8e8e8', color: '#bbb' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Stack>
        </Box>
      </Drawer>
    </Paper>
  );
}
