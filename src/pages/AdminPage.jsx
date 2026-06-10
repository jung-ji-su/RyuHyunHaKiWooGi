import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, getDocs, deleteDoc, doc, query,
  orderBy, limit, getDoc, addDoc, serverTimestamp, writeBatch, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../lib/UserContext';

const USERS = ['지수', '현하'];

const WMO = {
  0:'맑음☀️',1:'대체로맑음🌤️',2:'구름조금⛅',3:'흐림☁️',
  45:'안개🌫️',48:'안개🌫️',
  51:'이슬비🌦️',53:'이슬비🌦️',55:'이슬비🌦️',
  61:'비🌧️',63:'비🌧️',65:'폭우🌧️',
  71:'눈🌨️',73:'눈🌨️',75:'폭설❄️',
  80:'소나기🌦️',81:'소나기🌦️',82:'강한소나기🌧️',
  95:'뇌우⛈️',96:'뇌우⛈️',99:'뇌우⛈️',
};
const LOCS = [
  { name:'동탄', lat:37.2015, lon:127.0726 },
  { name:'서울', lat:37.5665, lon:126.9780 },
];

const COUPON_CAT = {
  food:  { label: '밥',    emoji: '🍜' },
  date:  { label: '데이트', emoji: '🎬' },
  chore: { label: '집안일', emoji: '🧹' },
  hug:   { label: '스킨십', emoji: '🐷' },
  wish:  { label: '소원',  emoji: '⭐' },
  etc:   { label: '기타',  emoji: '🎁' },
};

const EXPIRY_DAYS = 14;

function couponDaysLeft(createdAt) {
  if (!createdAt?.seconds) return EXPIRY_DAYS;
  const created = new Date(createdAt.seconds * 1000);
  const diff = EXPIRY_DAYS - Math.floor((Date.now() - created) / 86400000);
  return Math.max(0, diff);
}

function dDayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

// ── plain styles ─────────────────────────────────────────────────
const S = {
  page:  { minHeight: '100vh', background: '#f0f2f5', padding: '16px 14px', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  card:  { background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  h:     { margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#222', display: 'flex', alignItems: 'center', gap: 6 },
  row:   { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  tag:   (color = '#888') => ({ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: color + '22', color, fontWeight: 600 }),
  item:  { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 9, marginBottom: 5 },
};
const btn = (bg = '#555', sm = false, disabled = false) => ({
  padding: sm ? '4px 10px' : '8px 16px',
  borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: sm ? 12 : 13, fontWeight: 600,
  background: disabled ? '#ccc' : bg, color: 'white', whiteSpace: 'nowrap',
  opacity: disabled ? 0.7 : 1, transition: 'opacity .15s',
});

const TYPE_COLOR = {
  jilta: '#7B4FA6', schedule: '#1D9E75', diary: '#3A86FF',
  bucket: '#E8630A', letter: '#FF8FAB', thermo: '#E91E8C',
  coupon: '#FFB300', comment: '#3A86FF', like: '#FF4444', admin: '#555',
};

export default function AdminPage() {
  const { currentUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser !== '지수') navigate('/');
  }, [currentUser, navigate]);

  const [tokens, setTokens]               = useState({ 지수: null, 현하: null });
  const [notifs, setNotifs]               = useState([]);
  const [version, setVersion]             = useState('...');
  const [changelog, setChangelog]         = useState([]);
  const [log, setLog]                     = useState([]);
  const [loading, setLoading]             = useState({});

  // new state
  const [stats, setStats]                         = useState(null);
  const [importantScheds, setImportantScheds]     = useState([]);
  const [coupons, setCoupons]                     = useState([]);

  const addLog  = (text) => setLog(p => [`${new Date().toLocaleTimeString('ko-KR')} ${text}`, ...p.slice(0, 29)]);
  const setLoad = (key, v) => setLoading(p => ({ ...p, [key]: v }));

  // ── loaders ───────────────────────────────────────────────────
  const loadTokens = async () => {
    const res = {};
    for (const u of USERS) {
      const snap = await getDoc(doc(db, 'fcmTokens', u));
      res[u] = snap.exists() ? (snap.data().token ?? null) : null;
    }
    setTokens(res);
  };

  const loadNotifs = async () => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30));
    const snap = await getDocs(q);
    setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadVersion = async () => {
    try {
      const { version: v } = await fetch(`/version.json?v=${Date.now()}`).then(r => r.json());
      setVersion(v);
    } catch { setVersion('알 수 없음'); }
  };

  const loadChangelog = async () => {
    try {
      const data = await fetch(`/changelog.json?v=${Date.now()}`).then(r => r.json());
      setChangelog(data);
    } catch {}
  };

  const loadStats = async () => {
    try {
      const [diaries, schedules, buckets, couponsSnap, temps, notifSnap] = await Promise.all([
        getDocs(collection(db, 'diaries')),
        getDocs(collection(db, 'schedules')),
        getDocs(collection(db, 'buckets')),
        getDocs(collection(db, 'coupons')),
        getDocs(collection(db, 'temperatures')),
        getDocs(collection(db, 'notifications')),
      ]);
      const bucketDocs = buckets.docs.map(d => d.data());
      const couponDocs = couponsSnap.docs.map(d => d.data());
      const importantCount = schedules.docs.filter(d => d.data().isImportant).length;
      const availableCoupons = couponDocs.filter(c => c.status === 'available');
      const usedCoupons      = couponDocs.filter(c => c.status === 'used');
      setStats({
        diaries: diaries.size,
        schedules: schedules.size,
        importantSchedules: importantCount,
        buckets: { total: buckets.size, done: bucketDocs.filter(b => b.isDone).length },
        coupons: { total: couponsSnap.size, available: availableCoupons.length, used: usedCoupons.length },
        temperatures: temps.size,
        notifications: notifSnap.size,
      });
    } catch (e) { addLog(`❌ 통계 로드 오류: ${e.message}`); }
  };

  const loadImportantScheds = async () => {
    try {
      const q = query(collection(db, 'schedules'), where('isImportant', '==', true), orderBy('date'));
      const snap = await getDocs(q);
      setImportantScheds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { addLog(`❌ 기념일 로드 오류: ${e.message}`); }
  };

  const loadCoupons = async () => {
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { addLog(`❌ 쿠폰 로드 오류: ${e.message}`); }
  };

  useEffect(() => {
    if (currentUser === '지수') {
      loadTokens(); loadNotifs(); loadVersion(); loadChangelog();
      loadStats(); loadImportantScheds(); loadCoupons();
    }
  }, [currentUser]);

  // ── 테스트 push ──────────────────────────────────────────────
  const sendTest = async (user) => {
    const key = 'test_' + user;
    setLoad(key, true);
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'jilta', target: user,
        content: `🐷 테스트 알림이에요! 앱 정상 작동 중 ✅ (${new Date().toLocaleTimeString('ko-KR')})`,
        createdAt: serverTimestamp(), isRead: false,
      });
      addLog(`✅ ${user}에게 테스트 알림 전송 완료`);
      await loadNotifs();
    } catch (e) { addLog(`❌ 오류: ${e.message}`); }
    setLoad(key, false);
  };

  // ── 날씨 알림 즉시 테스트 ────────────────────────────────────
  const sendWeather = async () => {
    setLoad('weather', true);
    try {
      for (const loc of LOCS) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}`
          + `&hourly=weather_code,temperature_2m`
          + `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max`
          + `&timezone=Asia%2FSeoul&forecast_days=1`;
        const data = await fetch(url).then(r => r.json());
        const times = data.hourly.time;
        const codes = data.hourly.weather_code;
        const temps = data.hourly.temperature_2m;
        const at = (h) => {
          const i = times.findIndex(t => t.endsWith(`T${String(h).padStart(2,'0')}:00`));
          return i >= 0 ? `${WMO[codes[i]] ?? '?'} ${Math.round(temps[i])}°` : null;
        };
        const maxT = Math.round(data.daily.temperature_2m_max[0]);
        const minT = Math.round(data.daily.temperature_2m_min[0]);
        const rain = data.daily.precipitation_probability_max[0];
        const content = [
          `📍 ${loc.name} 오늘 날씨 [테스트]`,
          at(9)  && `🌅 아침  ${at(9)}`,
          at(14) && `☀️ 점심  ${at(14)}`,
          at(19) && `🌙 저녁  ${at(19)}`,
          `📊 최고 ${maxT}° / 최저 ${minT}° · 강수 ${rain}%💧`,
        ].filter(Boolean).join('\n');
        await addDoc(collection(db, 'notifications'), {
          type: 'admin', target: '지수', content,
          createdAt: serverTimestamp(), isRead: false,
        });
      }
      addLog('✅ 날씨 알림 테스트 전송 완료 (동탄+서울 → 지수)');
      await loadNotifs();
    } catch (e) { addLog(`❌ 오류: ${e.message}`); }
    setLoad('weather', false);
  };

  // ── FCM 토큰 삭제 ────────────────────────────────────────────
  const deleteToken = async (user) => {
    await deleteDoc(doc(db, 'fcmTokens', user));
    addLog(`🗑️ ${user} FCM 토큰 삭제`);
    await loadTokens();
  };

  // ── 알림 단건 삭제 ───────────────────────────────────────────
  const deleteNotif = async (id) => {
    await deleteDoc(doc(db, 'notifications', id));
    setNotifs(p => p.filter(n => n.id !== id));
  };

  // ── 읽은 알림 일괄 삭제 ──────────────────────────────────────
  const deleteRead = async () => {
    const targets = notifs.filter(n => n.isRead);
    if (!targets.length) { addLog('삭제할 읽은 알림 없음'); return; }
    const batch = writeBatch(db);
    targets.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
    await batch.commit();
    addLog(`🗑️ 읽은 알림 ${targets.length}개 삭제`);
    await loadNotifs();
  };

  // ── 전체 알림 삭제 ───────────────────────────────────────────
  const deleteAll = async () => {
    const batch = writeBatch(db);
    notifs.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
    await batch.commit();
    addLog(`🗑️ 알림 전체 삭제`);
    setNotifs([]);
  };

  // ── 기념일 삭제 ──────────────────────────────────────────────
  const deleteImportantSched = async (id, title) => {
    await deleteDoc(doc(db, 'schedules', id));
    addLog(`🗑️ 기념일 삭제: ${title}`);
    setImportantScheds(p => p.filter(s => s.id !== id));
    setStats(p => p ? { ...p, importantSchedules: p.importantSchedules - 1, schedules: p.schedules - 1 } : p);
  };

  // ── 쿠폰 삭제 ────────────────────────────────────────────────
  const deleteCoupon = async (id, title) => {
    await deleteDoc(doc(db, 'coupons', id));
    addLog(`🗑️ 쿠폰 삭제: ${title}`);
    setCoupons(p => p.filter(c => c.id !== id));
  };

  // ── 만료 쿠폰 일괄 삭제 ──────────────────────────────────────
  const deleteExpiredCoupons = async () => {
    const expired = coupons.filter(c => c.status === 'available' && couponDaysLeft(c.createdAt) === 0);
    if (!expired.length) { addLog('만료된 쿠폰 없음'); return; }
    const batch = writeBatch(db);
    expired.forEach(c => batch.delete(doc(db, 'coupons', c.id)));
    await batch.commit();
    addLog(`🗑️ 만료 쿠폰 ${expired.length}개 삭제`);
    setCoupons(p => p.filter(c => !(c.status === 'available' && couponDaysLeft(c.createdAt) === 0)));
  };

  if (!currentUser || currentUser !== '지수') return null;

  const unreadCount = notifs.filter(n => !n.isRead).length;
  const availableCoupons = coupons.filter(c => c.status === 'available');
  const usedCoupons      = coupons.filter(c => c.status === 'used');
  const expiredCoupons   = availableCoupons.filter(c => couponDaysLeft(c.createdAt) === 0);

  const KO_DAYS = ['일','월','화','수','목','금','토'];
  const fmtDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth()+1}/${d.getDate()}(${KO_DAYS[d.getDay()]})`;
  };

  return (
    <div style={S.page}>

      {/* ── 헤더 ── */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={btn('#888', true)} onClick={() => navigate('/')}>← 홈</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>⚙️ 관리자 패널</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>지수 전용 · v{version}</div>
        </div>
      </div>

      {/* ── 앱 통계 ── */}
      <div style={S.card}>
        <div style={{ ...S.h, justifyContent: 'space-between' }}>
          <span>📊 앱 통계</span>
          <button style={btn('#555', true)} onClick={loadStats}>새로고침</button>
        </div>
        {stats === null ? (
          <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '8px 0' }}>로딩 중...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: '일기', value: stats.diaries, emoji: '📔', color: '#3A86FF' },
              { label: '일정', value: stats.schedules, emoji: '📅', color: '#1D9E75', sub: `기념일 ${stats.importantSchedules}개` },
              { label: '버킷', value: stats.buckets.total, emoji: '🎯', color: '#E8630A', sub: `완료 ${stats.buckets.done}개` },
              { label: '쿠폰', value: stats.coupons.total, emoji: '🎟️', color: '#FFB300', sub: `사용가능 ${stats.coupons.available}개` },
              { label: '감정온도', value: stats.temperatures, emoji: '🌡️', color: '#E91E8C' },
              { label: '알림', value: stats.notifications, emoji: '🔔', color: '#7B4FA6', sub: `미읽음 ${unreadCount}개` },
            ].map(item => (
              <div key={item.label} style={{
                background: item.color + '11', borderRadius: 10,
                padding: '10px 8px', textAlign: 'center',
                border: `1px solid ${item.color}22`,
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{item.emoji}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>{item.sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 알림 테스트 ── */}
      <div style={S.card}>
        <div style={S.h}>📢 알림 테스트</div>
        <div style={S.row}>
          <button
            style={btn('#7B4FA6', false, loading['test_지수'])}
            onClick={() => sendTest('지수')} disabled={loading['test_지수']}
          >
            {loading['test_지수'] ? '전송중...' : '나(지수)에게 테스트'}
          </button>
          <button
            style={btn('#E8630A', false, loading['test_현하'])}
            onClick={() => sendTest('현하')} disabled={loading['test_현하']}
          >
            {loading['test_현하'] ? '전송중...' : '현하에게 테스트'}
          </button>
        </div>
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>날씨 알림</div>
          <button
            style={btn('#3A86FF', false, loading.weather)}
            onClick={sendWeather} disabled={loading.weather}
          >
            {loading.weather ? '전송중...' : '🌤️ 날씨 알림 즉시 발송 (동탄+서울)'}
          </button>
        </div>
      </div>

      {/* ── 실행 로그 ── */}
      {log.length > 0 && (
        <div style={{ ...S.card, background: '#1a1a1a' }}>
          <div style={{ ...S.h, color: '#888', justifyContent: 'space-between' }}>
            <span>📋 실행 로그</span>
            <button
              style={{ background: 'none', border: '1px solid #444', color: '#666', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setLog([])}
            >지우기</button>
          </div>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: '#0f0', fontFamily: 'monospace', marginBottom: 2, opacity: i === 0 ? 1 : 0.65 }}>{l}</div>
          ))}
        </div>
      )}

      {/* ── 기념일 관리 (D-day 알림 대상) ── */}
      <div style={S.card}>
        <div style={{ ...S.h, justifyContent: 'space-between' }}>
          <span>🎉 기념일 관리 <span style={{ fontWeight: 400, fontSize: 12, color: '#888' }}>(D-day 알림 대상 · {importantScheds.length}개)</span></span>
          <button style={btn('#555', true)} onClick={loadImportantScheds}>새로고침</button>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10, lineHeight: 1.5 }}>
          ⚡ D-1, D-2, D-3, D-7, D-30, D-60, D-90 당일 자동 알림 발송
        </div>
        {importantScheds.length === 0 ? (
          <p style={{ fontSize: 13, color: '#bbb', margin: 0, textAlign: 'center', padding: '8px 0' }}>등록된 기념일 없음</p>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {importantScheds.map(s => {
              const dday = dDayLabel(s.date);
              const isPast = dday.startsWith('D+');
              const isToday = dday === 'D-Day';
              const ddayColor = isPast ? '#bbb' : isToday ? '#E8630A' : '#7B4FA6';
              return (
                <div key={s.id} style={{
                  ...S.item,
                  background: isPast ? '#fafafa' : '#faf6ff',
                  border: `1px solid ${isPast ? '#eee' : '#e0d0f5'}`,
                  opacity: isPast ? 0.7 : 1,
                }}>
                  <div style={{
                    minWidth: 48, fontWeight: 800, fontSize: 12,
                    color: ddayColor, fontFamily: 'monospace',
                  }}>{dday}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{fmtDate(s.date)}</div>
                  </div>
                  <button
                    onClick={() => deleteImportantSched(s.id, s.title)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#ccc', marginTop: 8 }}>
          * 일정 페이지에서 ⭐ 표시된 항목이 이 목록에 포함됩니다
        </div>
      </div>

      {/* ── 쿠폰 현황 ── */}
      <div style={S.card}>
        <div style={{ ...S.h, justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span>
            🎟️ 쿠폰 현황
            <span style={{ fontWeight: 400, fontSize: 12, color: '#888' }}>
              {' '}(사용가능 {availableCoupons.length} · 사용됨 {usedCoupons.length}
              {expiredCoupons.length > 0 && <span style={{ color: '#e74c3c' }}> · 만료 {expiredCoupons.length}</span>})
            </span>
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btn('#555', true)} onClick={loadCoupons}>새로고침</button>
            {expiredCoupons.length > 0 && (
              <button style={btn('#e74c3c', true)} onClick={deleteExpiredCoupons}>만료 삭제</button>
            )}
          </div>
        </div>

        {coupons.length === 0 ? (
          <p style={{ fontSize: 13, color: '#bbb', margin: 0, textAlign: 'center', padding: '8px 0' }}>쿠폰 없음</p>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {/* 사용 가능 */}
            {availableCoupons.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', marginBottom: 5 }}>✅ 사용 가능</div>
                {availableCoupons.map(c => {
                  const left = couponDaysLeft(c.createdAt);
                  const isExp = left === 0;
                  const cat = COUPON_CAT[c.cat] ?? COUPON_CAT.etc;
                  return (
                    <div key={c.id} style={{
                      ...S.item,
                      background: isExp ? '#fff5f5' : '#f8fff8',
                      border: `1px solid ${isExp ? '#fcc' : '#c8ecd4'}`,
                      opacity: isExp ? 0.8 : 1,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>{c.title || cat.label}</div>
                        <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>
                          {c.sender} → {c.receiver}
                          {isExp
                            ? <span style={{ color: '#e74c3c', fontWeight: 600, marginLeft: 6 }}>만료됨</span>
                            : <span style={{ color: '#1D9E75', marginLeft: 6 }}>D-{left}</span>
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCoupon(c.id, c.title || cat.label)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 사용됨 */}
            {usedCoupons.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', marginBottom: 5 }}>🔖 사용됨</div>
                {usedCoupons.map(c => {
                  const cat = COUPON_CAT[c.cat] ?? COUPON_CAT.etc;
                  return (
                    <div key={c.id} style={{
                      ...S.item,
                      background: '#fafafa', border: '1px solid #eee', opacity: 0.75,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textDecoration: 'line-through' }}>{c.title || cat.label}</div>
                        <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{c.sender} → {c.receiver}</div>
                      </div>
                      <button
                        onClick={() => deleteCoupon(c.id, c.title || cat.label)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FCM 토큰 ── */}
      <div style={S.card}>
        <div style={{ ...S.h, justifyContent: 'space-between' }}>
          <span>📱 FCM 토큰</span>
          <button style={btn('#555', true)} onClick={loadTokens}>새로고침</button>
        </div>
        {USERS.map(u => (
          <div key={u} style={{ ...S.item, background: '#f8f8f8', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 32 }}>{u}</span>
            {tokens[u] ? (
              <>
                <span style={{ fontSize: 11, color: '#22aa55', flex: 1, wordBreak: 'break-all' }}>
                  ✅ {tokens[u].slice(0, 24)}...{tokens[u].slice(-8)}
                </span>
                <button style={btn('#e74c3c', true)} onClick={() => deleteToken(u)}>삭제</button>
              </>
            ) : (
              <span style={{ fontSize: 12, color: '#bbb', flex: 1 }}>❌ 토큰 없음 (앱 실행 시 자동 등록)</span>
            )}
          </div>
        ))}
      </div>

      {/* ── 알림 기록 ── */}
      <div style={S.card}>
        <div style={{ ...S.h, justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span>🔔 알림 기록 <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>({notifs.length}개 · 미읽음 {unreadCount}개)</span></span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btn('#555', true)} onClick={loadNotifs}>새로고침</button>
            <button style={btn('#e67e22', true)} onClick={deleteRead}>읽은것 삭제</button>
            <button style={btn('#e74c3c', true)} onClick={deleteAll}>전체 삭제</button>
          </div>
        </div>

        {notifs.length === 0 ? (
          <p style={{ fontSize: 13, color: '#bbb', margin: 0, textAlign: 'center', padding: '12px 0' }}>알림 없음</p>
        ) : (
          <div style={{ maxHeight: 310, overflowY: 'auto' }}>
            {notifs.map(n => {
              const color = TYPE_COLOR[n.type] ?? '#888';
              const ts = n.createdAt?.toDate?.()?.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '';
              return (
                <div key={n.id} style={{
                  ...S.item,
                  background: n.isRead ? '#fafafa' : '#fffbf0',
                  border: `1px solid ${n.isRead ? '#eee' : '#f5dfa0'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={S.tag(color)}>{n.type}</span>
                      {n.target && <span style={S.tag('#3A86FF')}>→{n.target}</span>}
                      {n.writer && <span style={S.tag('#999')}>{n.writer}</span>}
                      {!n.isRead && <span style={S.tag('#E8630A')}>NEW</span>}
                      <span style={{ fontSize: 10, color: '#bbb', marginLeft: 'auto' }}>{ts}</span>
                    </div>
                    <div style={{ fontSize: 12, color: n.isRead ? '#999' : '#333', lineHeight: 1.4 }}>{n.content}</div>
                  </div>
                  <button
                    onClick={() => deleteNotif(n.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 배포 이력 ── */}
      <div style={S.card}>
        <div style={{ ...S.h, justifyContent: 'space-between' }}>
          <span>🚀 배포 이력</span>
          <button style={btn('#555', true)} onClick={loadChangelog}>새로고침</button>
        </div>
        {changelog.length === 0 ? (
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>기록 없음</p>
        ) : (
          <div style={{ maxHeight: 290, overflowY: 'auto' }}>
            {changelog.map((c, i) => {
              const d = new Date(c.date);
              const dateStr = d.toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
              const isCurrent = i === 0;
              return (
                <div key={c.version} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '9px 10px', borderRadius: 9, marginBottom: 5,
                  background: isCurrent ? '#f0f7ff' : '#fafafa',
                  border: `1px solid ${isCurrent ? '#bbd6f5' : '#eee'}`,
                }}>
                  <div style={{ minWidth: 60 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                      color: isCurrent ? '#1a6fc4' : '#888',
                      background: isCurrent ? '#dbeafe' : '#eee',
                      borderRadius: 4, padding: '2px 5px', display: 'inline-block',
                    }}>v{c.version}</div>
                    {isCurrent && <div style={{ fontSize: 10, color: '#1a6fc4', marginTop: 2, fontWeight: 600 }}>현재</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>
                      {c.notes || <span style={{ color: '#bbb', fontStyle: 'italic' }}>메모 없음</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{dateStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#ccc', marginTop: 8 }}>
          * 앞으로 배포 시 <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>node deploy.js "배포 내용"</code> 으로 메모 추가 가능
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
