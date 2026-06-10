import React, { useState, useContext } from 'react';
import { Box, Typography } from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../lib/UserContext';
import { B } from '../lib/constants';

const OTHER = { '지수': '현하', '현하': '지수' };

const QUICK = [
  {
    emoji: '🤔',
    label: '',
    particles: ['🤔', '❓', '💭', '🧐', '💬', '💡'],
    glow: 'rgba(232,99,10,0.22)',
    msg: (me) => `${me}: 뭐하시소?? 🙋❓🙋‍♀️🤨🤔⁉️💭🧐💬❔💡🧏‍♀️👼🗯️🦹‍♀️🤟👹`,
  },
  {
    emoji: '🏃',
    label: '',
    particles: ['🏃', '💨', '🥷', '🌪️', '👀', '🍃'],
    glow: 'rgba(123,79,166,0.22)',
    msg: (me) => `${me}: 뿡다닥 🏃🥷💨🤸🍃🏃🌪️🏃‍♀️🌬️🏃‍♂️😷👀👮🧚‍♀️🧎🦅👮‍♂️🚔`,
  },
];

// 6개 파티클 위치 설정 (x오프셋, y최종, 회전, 딜레이, 크기)
const PARTICLES = [
  { anim: 'qp0', delay: '0s',     size: '1.2rem' },
  { anim: 'qp1', delay: '0.05s',  size: '1.4rem' },
  { anim: 'qp2', delay: '0.08s',  size: '1.1rem' },
  { anim: 'qp3', delay: '0.13s',  size: '1.0rem' },
  { anim: 'qp4', delay: '0.04s',  size: '1.3rem' },
  { anim: 'qp5', delay: '0.10s',  size: '0.95rem' },
];

// 정적 CSS keyframes — GPU 가속, 과부하 없음
const KEYFRAMES = `
@keyframes qp0 {
  0%   { transform: translate(-26px, 0px)  scale(0.3); opacity: 0; }
  12%  { transform: translate(-26px, -6px) scale(1.0); opacity: 1; }
  100% { transform: translate(-40px, -64px) rotate(-18deg) scale(0.4); opacity: 0; }
}
@keyframes qp1 {
  0%   { transform: translate(2px, 0px)   scale(0.3); opacity: 0; }
  12%  { transform: translate(2px, -7px)  scale(1.1); opacity: 1; }
  100% { transform: translate(4px, -76px) rotate(4deg) scale(0.45); opacity: 0; }
}
@keyframes qp2 {
  0%   { transform: translate(24px, 0px)   scale(0.3); opacity: 0; }
  12%  { transform: translate(24px, -6px)  scale(1.0); opacity: 1; }
  100% { transform: translate(37px, -61px) rotate(16deg) scale(0.4); opacity: 0; }
}
@keyframes qp3 {
  0%   { transform: translate(-13px, 0px)   scale(0.3); opacity: 0; }
  12%  { transform: translate(-13px, -8px)  scale(0.9); opacity: 1; }
  100% { transform: translate(-20px, -82px) rotate(-12deg) scale(0.35); opacity: 0; }
}
@keyframes qp4 {
  0%   { transform: translate(17px, 0px)   scale(0.3); opacity: 0; }
  12%  { transform: translate(17px, -5px)  scale(1.1); opacity: 1; }
  100% { transform: translate(26px, -70px) rotate(22deg) scale(0.45); opacity: 0; }
}
@keyframes qp5 {
  0%   { transform: translate(7px, 0px)   scale(0.3); opacity: 0; }
  12%  { transform: translate(7px, -5px)  scale(0.85); opacity: 1; }
  100% { transform: translate(10px, -56px) rotate(-7deg) scale(0.35); opacity: 0; }
}
`;

export default function QuickNotif() {
  const { currentUser } = useContext(UserContext);
  const [cooldown, setCooldown] = useState(null);
  // animKey 변경 시 파티클 컨테이너 remount → 애니메이션 재시작
  const [animKey, setAnimKey] = useState({});

  const send = (item) => {
    if (!currentUser || cooldown === item.emoji) return;
    const other = OTHER[currentUser];
    if (!other) return;

    setCooldown(item.emoji);
    setTimeout(() => setCooldown(null), 3000);

    // 파티클 트리거
    setAnimKey(prev => ({ ...prev, [item.emoji]: Date.now() }));

    // 알림 전송 (fire-and-forget, 팝업 없음)
    addDoc(collection(db, 'notifications'), {
      type: 'jilta',
      target: other,
      content: item.msg(currentUser, other),
      createdAt: serverTimestamp(),
      isRead: false,
    }).catch(() => {});
  };

  if (!currentUser) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <Box sx={{ display: 'flex', gap: 1.8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {QUICK.map(item => {
          const isCool = cooldown === item.emoji;
          const ak = animKey[item.emoji];

          return (
            <Box
              key={item.emoji}
              onClick={() => send(item)}
              sx={{
                position: 'relative',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                px: 3,
                py: 1.8,
                borderRadius: '24px',
                cursor: isCool ? 'default' : 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',

                // ── Liquid Glass 레이어드 배경 ──────────────────
                background: isCool
                  ? 'linear-gradient(160deg, rgba(237,224,245,0.48) 0%, rgba(237,224,245,0.14) 100%)'
                  : 'linear-gradient(158deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.30) 42%, rgba(237,224,245,0.20) 68%, rgba(255,255,255,0.07) 100%)',

                backdropFilter: 'blur(22px) saturate(200%)',
                WebkitBackdropFilter: 'blur(22px) saturate(200%)',

                // 테두리: 상단 밝고 하단 약하게 → 유리 느낌
                border: '1px solid rgba(255,255,255,0.55)',

                // ── 다층 그림자: 뎁스 + 스페큘러 하이라이트 ───
                boxShadow: isCool
                  ? [
                      `0 2px 10px ${item.glow}`,
                      'inset 0 1px 0 rgba(255,255,255,0.65)',
                      'inset 0 2px 6px rgba(123,79,166,0.06)',
                    ].join(', ')
                  : [
                      `0 10px 32px ${item.glow}`,
                      '0 2px 8px rgba(0,0,0,0.07)',
                      'inset 0 1.5px 0 rgba(255,255,255,0.96)',   // 상단 스페큘러
                      'inset 0 -1px 0 rgba(123,79,166,0.08)',     // 하단 미묘한 그림자
                      'inset 1.5px 0 0 rgba(255,255,255,0.65)',   // 좌측 하이라이트
                      'inset -1px 0 0 rgba(255,255,255,0.28)',    // 우측 약한 반사
                    ].join(', '),

                opacity: isCool ? 0.68 : 1,
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',

                '&:active': isCool ? {} : {
                  transform: 'scale(0.90)',
                  boxShadow: [
                    `0 4px 16px ${item.glow}`,
                    'inset 0 1px 0 rgba(255,255,255,0.88)',
                    'inset 0 3px 12px rgba(123,79,166,0.10)',
                  ].join(', '),
                },
              }}
            >
              {/* ── 상단 스페큘러 하이라이트 오버레이 ─────────── */}
              <Box sx={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '55%',
                borderRadius: '24px 24px 60% 60% / 24px 24px 40% 40%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.38) 0%, transparent 100%)',
                pointerEvents: 'none',
              }} />

              {/* ── 이모지 ──────────────────────────────────────── */}
              <Typography sx={{
                fontSize: '1.65rem',
                lineHeight: 1,
                position: 'relative',
                zIndex: 1,
                filter: isCool ? 'grayscale(30%)' : 'none',
                transition: 'filter 0.2s',
              }}>
                {item.emoji}
              </Typography>

              {/* ── 라벨 ────────────────────────────────────────── */}
              <Typography sx={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: isCool ? B.pants + '80' : B.dark + 'cc',
                fontFamily: "'Noto Sans KR', sans-serif",
                whiteSpace: 'nowrap',
                position: 'relative',
                zIndex: 1,
                letterSpacing: '0.025em',
                transition: 'color 0.2s',
              }}>
                {item.label}
              </Typography>

              {/* ── 파티클 버스트 (클릭 시 remount로 애니 재시작) ── */}
              {ak && PARTICLES.map((p, i) => (
                <Box
                  key={`${ak}-${i}`}
                  component="span"
                  sx={{
                    position: 'absolute',
                    bottom: '58%',
                    left: '50%',
                    fontSize: p.size,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    zIndex: 30,
                    willChange: 'transform, opacity',
                    animation: `${p.anim} 0.95s cubic-bezier(0.2, 0.8, 0.3, 1) ${p.delay} both`,
                  }}
                >
                  {item.particles[i]}
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </>
  );
}
