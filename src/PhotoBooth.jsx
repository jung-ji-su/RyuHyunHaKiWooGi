import { useState, useEffect, useRef, useCallback } from 'react';
import { db, storage } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, deleteDoc, runTransaction, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Box, Typography, Button, Dialog, CircularProgress } from '@mui/material';
import { alpha, B } from './lib/constants';
import { vibrate } from './touchEffects';
import { FRAMES, LAYOUTS, getLayout } from './lib/photoFrames';
import { captureCut, composeStrip, canvasToBlob } from './lib/photoCompose';

const COLL = 'photobooth';
const GALLERY_LIMIT = 40;          // 갤러리 한 번에 읽는 최대 장수(무제한 쿼리 금지)
const COUNT_FROM = 3, GAP_MS = 1400;
const PEND = 'photoboothPending';  // 둘이 찍기 진행 문서 1개('active')만 존재 — 합성 전 컷은 Storage가 아니라 이 문서에 임시로만 둔다
const EXPIRE_MS = 48 * 3600 * 1000; // 상대가 48시간 안에 안 찍으면 만료(다음에 누가 열 때 자동 삭제)
const USERS = ['지수', '현하'];
const cutToData = (c) => { const w = c.toDataURL('image/webp', 0.72); return w.startsWith('data:image/webp') ? w : c.toDataURL('image/jpeg', 0.72); };
const decode = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
const leftText = (ms) => { const h = Math.max(1, Math.ceil(ms / 3600000)); return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : `${h}시간`; };
const NAMES = '지수 ♥ 현하';
const todayText = () => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const font = "'Noto Sans KR',sans-serif";

const btn = (primary) => ({
  borderRadius: '999px', fontFamily: "'Jua',sans-serif", fontSize: '1rem', px: 3, py: 1.1, minHeight: 46, boxShadow: 'none',
  ...(primary ? { bgcolor: B.pants, color: '#fff', '&:hover': { bgcolor: B.pants } } : { color: B.pants, border: `1.5px solid ${alpha(B.pants, '55')}`, bgcolor: 'transparent' }),
});

export default function PhotoBooth({ currentUser }) {
  const [view, setView] = useState('gallery');            // gallery | setup | shoot | result
  const [items, setItems] = useState(null);                // null=로딩
  const [frameId, setFrameId] = useState(FRAMES[0].id);
  const [layoutId, setLayoutId] = useState(LAYOUTS[0].id);
  const [facing, setFacing] = useState('user');
  const [camErr, setCamErr] = useState('');
  const [camReady, setCamReady] = useState(false);
  const [count, setCount] = useState(0);                   // 0이면 카운트다운 없음
  const [flash, setFlash] = useState(false);
  const [cuts, setCuts] = useState([]);                    // 촬영된 컷 canvas
  const [shooting, setShooting] = useState(false);
  const [result, setResult] = useState(null);              // { canvas, url }
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');
  const [mode, setMode] = useState('solo');                 // solo | duo
  const [pending, setPending] = useState(undefined);         // undefined=로딩, null=없음
  const [cfg, setCfg] = useState({ need: 4, role: 'solo' }); // role: solo | starter | finisher(starterCuts: 먼저 보낸 사람 컷)
  const partner = USERS.find((u) => u !== currentUser);
  const videoRef = useRef(null), streamRef = useRef(null), tokenRef = useRef(0);

  const layout = getLayout(layoutId);

  // 갤러리 구독(최신 순 40장)
  useEffect(() => {
    const q = query(collection(db, COLL), orderBy('createdAt', 'desc'), limit(GALLERY_LIMIT));
    return onSnapshot(q, (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setItems([]));
  }, []);

  // 둘이 찍기 진행 상태 구독(문서 1개). 만료됐으면 지운다.
  useEffect(() => onSnapshot(doc(db, PEND, 'active'), (sn) => {
    const d = sn.exists() ? sn.data() : null;
    if (d && d.expiresAt < Date.now()) { deleteDoc(sn.ref).catch(() => {}); setPending(null); return; }
    setPending(d);
  }, () => setPending(null)), []);

  const stopCam = useCallback(() => {
    tokenRef.current++;                                    // 진행 중 촬영 루프 취소
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    setCamReady(false); setCount(0); setShooting(false);
  }, []);

  // 촬영 화면에서만 카메라를 켠다. 나가면 반드시 끈다.
  useEffect(() => {
    if (view !== 'shoot') return undefined;
    let dead = false;
    setCamErr(''); setCamReady(false);
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setCamErr('이 브라우저에서는 카메라를 쓸 수 없어요.'); return; }
      try {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        if (dead) { st.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = st;
        const v = videoRef.current; if (!v) return;
        v.srcObject = st; await v.play().catch(() => {});
        setCamReady(true);
      } catch (e) {
        setCamErr(e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
          ? '카메라 권한이 꺼져 있어요. 브라우저/폰 설정에서 이 앱의 카메라를 허용한 뒤 다시 열어 주세요.'
          : '카메라를 열 수 없어요. 다른 앱이 쓰고 있는지 확인해 주세요.');
      }
    })();
    return () => { dead = true; stopCam(); };
  }, [view, facing, stopCam]);

  const startShooting = async () => {
    if (shooting || !camReady) return;
    const need = cfg.need;
    const my = ++tokenRef.current; setShooting(true); setCuts([]);
    const got = [];
    for (let i = 0; i < need; i++) {
      for (let n = COUNT_FROM; n >= 1; n--) { if (tokenRef.current !== my) return; setCount(n); vibrate(8); await sleep(1000); }
      if (tokenRef.current !== my) return;
      setCount(0); setFlash(true); vibrate(30);
      const v = videoRef.current;
      if (!v || !v.videoWidth) { setShooting(false); setCamErr('카메라 화면을 읽지 못했어요. 다시 시도해 주세요.'); return; }
      got.push(captureCut(v, layout.cw, layout.ch, facing === 'user'));
      setCuts([...got]);
      setTimeout(() => setFlash(false), 140);
      if (i < need - 1) await sleep(GAP_MS);
    }
    if (tokenRef.current !== my) return;
    setShooting(false); stopCam();
    if (cfg.role === 'starter') { setResult({ mine: got, thumbs: got.map((c) => c.toDataURL('image/jpeg', 0.7)) }); setView('review'); return; }   // 내 2컷만 확인 후 전송(합성 안 함)
    const all = cfg.role === 'finisher' ? [...cfg.starterCuts, ...got] : got;
    const canvas = await composeStrip({ cuts: all, frameId, layoutId, names: NAMES, dateText: todayText() });
    setResult({ canvas, url: canvas.toDataURL('image/webp', 0.8) }); setView('result');
  };

  const retake = () => { setResult(null); setCuts([]); setView('shoot'); };
  const leave = () => { stopCam(); setResult(null); setCuts([]); setView('gallery'); };

  // 내 2컷을 상대에게 보낸다: 임시 문서에 저장(진행 중인 게 이미 있으면 거부) + 알림
  const sendDuo = async () => {
    if (!result?.mine || saving) return;
    setSaving(true);
    try {
      const data = result.mine.map(cutToData);
      await runTransaction(db, async (tx) => {
        const r = doc(db, PEND, 'active'), sn = await tx.get(r);
        if (sn.exists() && sn.data().expiresAt > Date.now()) throw new Error('busy');
        tx.set(r, { starter: currentUser, partner, frame: frameId, layout: layoutId, cuts: data, createdAt: serverTimestamp(), expiresAt: Date.now() + EXPIRE_MS });
      });
      await addDoc(collection(db, 'notifications'), { writer: currentUser, type: 'photo', content: `${currentUser}가 네컷 2컷을 보냈어요 📸 이어서 2컷을 찍어 주세요!`, createdAt: serverTimestamp(), isRead: false });
      setToast(`${partner}에게 보냈어요! 컷은 완성될 때까지 비밀 🤫`); leave();
    } catch (e) { setToast(e?.message === 'busy' ? '이미 진행 중인 둘이 찍기가 있어요' : '보내지 못했어요. 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };

  // 상대가 보낸 걸 이어서 찍기: 프레임·레이아웃은 먼저 시작한 사람 것을 따른다
  const beginFinish = async () => {
    if (!pending) return;
    try {
      const starterCuts = await Promise.all(pending.cuts.map(decode));
      setFrameId(pending.frame); setLayoutId(pending.layout); setCfg({ need: 2, role: 'finisher', starterCuts }); setView('shoot');
    } catch { setToast('컷을 불러오지 못했어요. 다시 시도해 주세요.'); }
  };
  const dropPending = async () => {
    if (!window.confirm(pending?.starter === currentUser ? '보낸 2컷을 취소할까요? 컷은 삭제돼요.' : '이 요청을 거절할까요? 보낸 컷은 삭제돼요.')) return;
    try { await deleteDoc(doc(db, PEND, 'active')); setToast('취소했어요'); } catch { setToast('취소하지 못했어요. 다시 시도해 주세요.'); }
  };

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    if (cfg.role === 'finisher') {
      const ps = await getDoc(doc(db, PEND, 'active')).catch(() => null);
      if (!ps?.exists()) { setSaving(false); setToast('상대가 이미 취소했어요'); return; }
    }
    const id = doc(collection(db, COLL)).id;
    let path = '';
    try {
      const { blob, ext } = await canvasToBlob(result.canvas);
      path = `${COLL}/${id}.${ext}`;
      await uploadBytes(sRef(storage, path), blob, { contentType: blob.type });
      const url = await getDownloadURL(sRef(storage, path));
      try {
        await setDoc(doc(db, COLL, id), { url, path, layout: layoutId, frame: frameId, createdBy: currentUser, createdAt: serverTimestamp(), size: blob.size, ...(cfg.role === 'finisher' ? { duo: true, with: pending?.starter ?? null } : {}) });
      } catch (e) {
        await deleteObject(sRef(storage, path)).catch(() => {});   // 문서 저장 실패 시 방금 올린 파일을 남기지 않는다
        throw e;
      }
      if (cfg.role === 'finisher') {
        await deleteDoc(doc(db, PEND, 'active')).catch(() => {});
        await addDoc(collection(db, 'notifications'), { writer: currentUser, type: 'photo_done', content: `${currentUser}와 함께 찍은 네컷이 완성됐어요 🎞️ 갤러리에서 확인해 보세요!`, createdAt: serverTimestamp(), isRead: false }).catch(() => {});
      }
      setToast('갤러리에 저장했어요 📸'); leave();
    } catch {
      setToast('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setSaving(false); }
  };

  const remove = async (it) => {
    if (!window.confirm('이 사진을 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      if (it.path) await deleteObject(sRef(storage, it.path)).catch((e) => { if (e?.code !== 'storage/object-not-found') throw e; });
      await deleteDoc(doc(db, COLL, it.id));
      setDetail(null); setToast('삭제했어요');
    } catch { setToast('삭제에 실패했어요. 다시 시도해 주세요.'); }
  };

  const fetchBlob = async (it) => (await fetch(it.url)).blob();
  const download = async (it) => {
    try {
      const b = await fetchBlob(it), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = `네컷_${it.id}.${it.path?.endsWith('jpg') ? 'jpg' : 'webp'}`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { window.open(it.url, '_blank'); }
  };
  const share = async (it) => {
    try {
      const b = await fetchBlob(it), file = new File([b], `네컷.${it.path?.endsWith('jpg') ? 'jpg' : 'webp'}`, { type: b.type });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: '우리 네컷' });
      else if (navigator.share) await navigator.share({ url: it.url, title: '우리 네컷' });
      else await download(it);
    } catch (e) { if (e?.name !== 'AbortError') download(it); }
  };

  /* ───────── 화면들 ───────── */
  const aspect = `${layout.cw} / ${layout.ch}`;

  if (view === 'shoot') return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      {camErr ? (
        <Box sx={{ p: 3, textAlign: 'center', borderRadius: '20px', bgcolor: alpha(B.pants, '12'), border: `1.5px dashed ${alpha(B.pants, '55')}` }}>
          <Typography sx={{ fontSize: '2rem' }}>📷</Typography>
          <Typography sx={{ fontFamily: font, fontSize: '0.85rem', color: B.dark, mt: 1, lineHeight: 1.6 }}>{camErr}</Typography>
          <Button sx={{ ...btn(false), mt: 2 }} onClick={leave}>돌아가기</Button>
        </Box>
      ) : (<>
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: aspect, borderRadius: '18px', overflow: 'hidden', bgcolor: '#000', border: `3px solid ${alpha(B.pants, '66')}` }}>
          <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
          {!camReady && <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><CircularProgress size={28} sx={{ color: '#fff' }} /></Box>}
          {count > 0 && <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <Typography key={count} sx={{ fontFamily: "'Jua',sans-serif", fontSize: '6rem', color: '#fff', textShadow: '0 2px 16px rgba(0,0,0,.55)' }}>{count}</Typography></Box>}
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#fff', opacity: flash ? 0.9 : 0, transition: 'opacity .14s', pointerEvents: 'none' }} />
          <Typography sx={{ position: 'absolute', top: 8, left: 12, fontFamily: font, fontSize: '0.8rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>{Math.min(cuts.length + (shooting ? 1 : 0), cfg.need)} / {cfg.need}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.8 }}>
          {Array.from({ length: cfg.need }, (_, i) => <Box key={i} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: i < cuts.length ? B.pants : alpha(B.pants, '33') }} />)}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button sx={btn(true)} disabled={!camReady || shooting} onClick={startShooting}>{shooting ? '촬영 중…' : '📸 촬영 시작'}</Button>
          <Button sx={btn(false)} disabled={shooting} onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}>🔄 전·후면</Button>
          <Button sx={btn(false)} onClick={leave}>취소</Button>
        </Box>
      </>)}
    </Box>
  );

  if (view === 'review' && result?.thumbs) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Typography sx={{ fontFamily: font, fontSize: '0.85rem', color: B.dark }}>내 2컷이에요. {partner}가 나머지 2컷을 찍어야 완성돼요.</Typography>
      <Box sx={{ display: 'flex', gap: 1, width: '100%', maxWidth: 360 }}>
        {result.thumbs.map((u, i) => <Box key={i} component="img" src={u} alt="" sx={{ flex: 1, minWidth: 0, borderRadius: '10px', aspectRatio: aspect, objectFit: 'cover' }} />)}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button sx={btn(true)} disabled={saving} onClick={sendDuo}>{saving ? '보내는 중…' : `💌 ${partner}에게 보내기`}</Button>
        <Button sx={btn(false)} disabled={saving} onClick={retake}>🔁 다시 찍기</Button>
        <Button sx={btn(false)} disabled={saving} onClick={leave}>취소</Button>
      </Box>
      {toast && <ToastBar text={toast} onDone={() => setToast('')} />}
    </Box>
  );

  if (view === 'result' && result) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box component="img" src={result.url} alt="네컷 미리보기" sx={{ width: '100%', maxWidth: layoutId === 'strip' ? 260 : 340, borderRadius: '10px', boxShadow: `0 6px 24px ${alpha(B.pants, '33')}` }} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button sx={btn(true)} disabled={saving} onClick={save}>{saving ? '저장 중…' : '💾 저장'}</Button>
        <Button sx={btn(false)} disabled={saving} onClick={retake}>🔁 다시 찍기</Button>
        <Button sx={btn(false)} disabled={saving} onClick={leave}>버리기</Button>
      </Box>
      <Typography sx={{ fontFamily: font, fontSize: '0.72rem', color: alpha(B.dark, '88') }}>원본 컷은 저장하지 않고 이 합성본만 저장돼요.</Typography>
      {toast && <ToastBar text={toast} onDone={() => setToast('')} />}
    </Box>
  );

  if (view === 'setup') return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, mb: 1 }}>모드</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[['solo', '🙋 혼자 4컷'], ['duo', `👫 둘이 2컷씩`]].map(([m, label]) => {
            const dis = m === 'duo' && !!pending;
            return <Box key={m} onClick={() => !dis && setMode(m)} sx={{ flex: 1, py: 1.2, textAlign: 'center', borderRadius: '14px', cursor: dis ? 'default' : 'pointer', opacity: dis ? 0.45 : 1, fontFamily: font, fontWeight: 700, fontSize: '0.85rem', border: `2px solid ${mode === m ? B.pants : alpha(B.pants, '33')}`, bgcolor: mode === m ? alpha(B.pants, '14') : 'transparent', color: B.pants }}>{label}</Box>;
          })}
        </Box>
        {pending && <Typography sx={{ fontFamily: font, fontSize: '0.7rem', color: alpha(B.dark, '88'), mt: 0.8 }}>진행 중인 둘이 찍기가 있어서 지금은 혼자 찍기만 가능해요.</Typography>}
        {mode === 'duo' && !pending && <Typography sx={{ fontFamily: font, fontSize: '0.7rem', color: alpha(B.dark, '88'), mt: 0.8, lineHeight: 1.5 }}>내가 2컷을 찍어 보내면 {partner}가 나머지 2컷을 찍어요. 서로의 컷은 완성될 때까지 보이지 않아요. 프레임은 내가 고른 걸로 정해져요.</Typography>}
      </Box>
      <Box>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, mb: 1 }}>레이아웃</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {LAYOUTS.map((l) => (
            <Box key={l.id} onClick={() => setLayoutId(l.id)} sx={{ flex: 1, py: 1.2, textAlign: 'center', borderRadius: '14px', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: '0.85rem', border: `2px solid ${layoutId === l.id ? B.pants : alpha(B.pants, '33')}`, bgcolor: layoutId === l.id ? alpha(B.pants, '14') : 'transparent', color: B.pants }}>{l.id === 'strip' ? '▯ ' : '▦ '}{l.name}</Box>
          ))}
        </Box>
      </Box>
      <Box>
        <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, mb: 1 }}>프레임</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1 }}>
          {FRAMES.map((f) => (
            <Box key={f.id} onClick={() => setFrameId(f.id)} sx={{ cursor: 'pointer', textAlign: 'center' }}>
              <Box sx={{ height: 64, borderRadius: '10px', background: f.bg.length > 1 ? `linear-gradient(${f.bg.join(',')})` : f.bg[0], border: `3px solid ${frameId === f.id ? B.pants : 'transparent'}`, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: '60%', height: '55%', bgcolor: alpha(f.ink, '33'), border: `3px solid ${f.edge}`, borderRadius: '4px' }} />
              </Box>
              <Typography sx={{ fontFamily: font, fontSize: '0.7rem', mt: 0.4, color: B.dark, fontWeight: frameId === f.id ? 700 : 400 }}>{f.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Typography sx={{ fontFamily: font, fontSize: '0.75rem', color: alpha(B.dark, '99'), lineHeight: 1.6 }}>시작을 누르면 카메라가 켜지고, 3-2-1 뒤에 한 컷씩 모두 4컷을 찍어요.</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button sx={{ ...btn(true), flex: 1 }} onClick={() => { const duo = mode === 'duo' && !pending; setCfg(duo ? { need: 2, role: 'starter' } : { need: 4, role: 'solo' }); setResult(null); setView('shoot'); }}>시작</Button>
        <Button sx={btn(false)} onClick={() => setView('gallery')}>취소</Button>
      </Box>
    </Box>
  );

  // gallery
  return (
    <Box>
      {pending && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: '16px', bgcolor: alpha(B.pants, '12'), border: `1.5px dashed ${alpha(B.pants, '55')}` }}>
          <Typography sx={{ fontFamily: font, fontSize: '0.85rem', color: B.dark, lineHeight: 1.5 }}>
            {pending.starter === currentUser
              ? `💌 ${pending.partner}가 2컷을 찍어 주길 기다리는 중이에요 (남은 시간 ${leftText(pending.expiresAt - Date.now())})`
              : `💌 ${pending.starter}가 2컷을 보냈어요! 이어서 내 2컷을 찍어 완성해 보세요 (남은 시간 ${leftText(pending.expiresAt - Date.now())})`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {pending.starter !== currentUser && <Button sx={btn(true)} onClick={beginFinish}>📸 내 2컷 찍기</Button>}
            <Button sx={btn(false)} onClick={dropPending}>{pending.starter === currentUser ? '보낸 컷 취소' : '거절'}</Button>
          </Box>
        </Box>
      )}
      <Button sx={{ ...btn(true), width: '100%', mb: 2 }} onClick={() => { vibrate(15); setMode('solo'); setView('setup'); }}>📸 새로 찍기</Button>
      {items === null ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={26} sx={{ color: B.pants }} /></Box>
        : items.length === 0 ? <Box sx={{ textAlign: 'center', py: 6 }}><Typography sx={{ fontSize: '2.2rem' }}>🎞️</Typography><Typography sx={{ fontFamily: font, fontSize: '0.85rem', color: alpha(B.dark, '88'), mt: 1 }}>아직 사진이 없어요. 첫 네컷을 찍어 볼까요?</Typography></Box>
        : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1.2 }}>
          {items.map((it) => (
            <Box key={it.id} onClick={() => setDetail(it)} sx={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', bgcolor: alpha(B.pants, '10'), boxShadow: `0 2px 10px ${alpha(B.pants, '22')}`, '&:active': { transform: 'scale(.97)' } }}>
              <Box component="img" src={it.url} alt="네컷" loading="lazy" sx={{ width: '100%', display: 'block', aspectRatio: it.layout === 'grid' ? '1064 / 1504' : '720 / 2190', objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>}
      {items && items.length >= GALLERY_LIMIT && <Typography sx={{ textAlign: 'center', fontFamily: font, fontSize: '0.7rem', color: alpha(B.dark, '77'), mt: 2 }}>최근 {GALLERY_LIMIT}장까지 보여줘요</Typography>}

      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: B.cream, borderRadius: '18px', m: 1.5, maxHeight: 'calc(100% - 24px)' } }}>
        {detail && <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2, overflowY: 'auto' }}>
          <Box component="img" src={detail.url} alt="네컷 상세" sx={{ width: '100%', borderRadius: '8px', display: 'block' }} />
          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button sx={btn(true)} onClick={() => download(detail)}>⬇ 다운로드</Button>
            <Button sx={btn(false)} onClick={() => share(detail)}>📤 공유</Button>
            <Button sx={{ ...btn(false), color: '#C0392B', borderColor: '#C0392B66' }} onClick={() => remove(detail)}>🗑 삭제</Button>
          </Box>
        </Box>}
      </Dialog>
      {toast && <ToastBar text={toast} onDone={() => setToast('')} />}
    </Box>
  );
}

function ToastBar({ text, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [text, onDone]);
  return <Box sx={{ position: 'fixed', left: '50%', bottom: 90, transform: 'translateX(-50%)', zIndex: 2000, px: 2, py: 1, borderRadius: '999px', bgcolor: alpha(B.dark, 'E6'), color: '#fff', fontFamily: font, fontSize: '0.8rem', maxWidth: '88vw', textAlign: 'center' }}>{text}</Box>;
}
