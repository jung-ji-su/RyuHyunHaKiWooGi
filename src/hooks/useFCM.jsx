import { useEffect, useCallback } from 'react';
import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

function urlBase64ToUint8Array(base64String) {
  const b = base64String.trim();
  const padding = '='.repeat((4 - b.length % 4) % 4);
  const base64 = (b + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function useFCM(currentUser) {
  // 권한 있으면 앱 시작 시 자동 토큰 갱신
  useEffect(() => {
    if (!currentUser || !VAPID_KEY) return;
    if (!('serviceWorker' in navigator)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    let unsubMessage = null;

    const run = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const messaging = getMessaging(getApp());
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
        if (token) {
          await setDoc(doc(db, 'fcmTokens', currentUser), { token, updatedAt: serverTimestamp() });
        }
        unsubMessage = onMessage(messaging, (payload) => {
          window.dispatchEvent(new CustomEvent('fcm-foreground', { detail: payload }));
        });
      } catch (e) {
        console.error('FCM auto-register:', e);
      }
    };
    run();
    return () => { unsubMessage?.(); };
  }, [currentUser]);

  // 버튼 클릭 시 호출
  const requestPermission = useCallback(async () => {
    if (!currentUser)    throw new Error('로그인 정보 없음');
    if (!VAPID_KEY)      throw new Error('VAPID_KEY 미설정');
    if (!('Notification' in window)) throw new Error('알림 미지원 브라우저');
    if (!('serviceWorker' in navigator)) throw new Error('ServiceWorker 미지원');

    // ① 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error(`권한 거부: ${permission}`);

    // ② SW 활성화 완료까지 대기
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const reg = await navigator.serviceWorker.ready;

    // ③ 기존 push 구독 해제 (키 불일치로 인한 오류 방지)
    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) await existingSub.unsubscribe();

    // ④ push 구독 직접 생성 (iOS Safari 호환)
    await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });

    // ⑤ FCM 토큰 발급
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY.trim(),
      serviceWorkerRegistration: reg,
    });
    if (!token) throw new Error('토큰 발급 실패 (null)');

    // ⑥ Firestore 저장
    await setDoc(doc(db, 'fcmTokens', currentUser), { token, updatedAt: serverTimestamp() });
    return token;
  }, [currentUser]);

  return { requestPermission };
}
