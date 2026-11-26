// 규칙 배포 전 점검용: 새 번들을 쓰는 기기가 어떤 것들인지 appClients에 남긴다(관리자 페이지 "기기 현황"에서 확인).
// 옛 번들은 이 코드가 없어서 안 남는다 → 두 사람이 쓰는 기기가 전부 목록에 새 버전으로 보이면 옛 번들은 없는 것.
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/* global __APP_VERSION__ */
export const BUNDLE_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const THROTTLE_MS = 30 * 60 * 1000;

export async function reportClient(user) {
  try {
    const last = Number(localStorage.getItem('hb_at') || 0);
    if (Date.now() - last < THROTTLE_MS) return;
    let id = localStorage.getItem('device_id');
    if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('device_id', id); }
    await setDoc(doc(db, 'appClients', `${user}_${id}`), {
      user, version: BUNDLE_VERSION, lastSeen: serverTimestamp(),
      standalone: !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches),
      ua: (navigator.userAgent || '').slice(0, 90),
    });
    localStorage.setItem('hb_at', String(Date.now()));
  } catch { /* 점검용이라 실패해도 무시 */ }
}
