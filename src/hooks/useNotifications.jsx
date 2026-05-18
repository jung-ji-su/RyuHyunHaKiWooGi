import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection, query, onSnapshot, updateDoc, doc,
  orderBy, limit, writeBatch,
} from 'firebase/firestore';

export function useNotifications(currentUser) {
  const navigate = useNavigate();

  // ── 전체 알림 리스트 (드로어용) ─────────────────────────────────
  const [allNotifications, setAllNotifications] = useState([]);
  const [unreadCount,      setUnreadCount]      = useState(0);

  // ── 팝업 토스트 ─────────────────────────────────────────────────
  const [toastOpen, setToastOpen] = useState(false);
  const [toastData, setToastData] = useState(null); // { content, type }

  // ── 일정 팝업 (클릭 시 /schedule 이동) ──────────────────────────
  const [schedulePopupOpen, setSchedulePopupOpen] = useState(false);
  const [schedulePopupItem, setSchedulePopupItem] = useState(null);
  const scheduleQueueRef = useRef([]);

  // 이미 팝업으로 보여준 ID 추적 (localStorage)
  const shownRef = useRef(new Set(JSON.parse(localStorage.getItem('shownNotifIds') || '[]')));
  const addShown = (id) => {
    shownRef.current.add(id);
    localStorage.setItem('shownNotifIds', JSON.stringify([...shownRef.current].slice(-300)));
  };

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 나에게 해당하는 알림 필터
      const mine = all.filter(n => {
        if (n.type === 'jilta') return n.target === currentUser;
        return n.writer && n.writer !== currentUser;
      });

      setAllNotifications(mine);
      setUnreadCount(mine.filter(n => !n.isRead).length);

      // 팝업 표시 (새 미읽음 & 미표시)
      const newOnes = mine.filter(n => !n.isRead && !shownRef.current.has(n.id));
      if (newOnes.length === 0) return;

      const latest = newOnes[0];
      addShown(latest.id);

      // 일정 type → 일정 전용 팝업
      const isSchedule = latest.type === 'schedule' || (!latest.type && latest.count !== undefined);
      if (isSchedule) {
        const scheduleNew = newOnes.filter(n => n.type === 'schedule' || (!n.type && n.count !== undefined));
        scheduleQueueRef.current = scheduleNew;
        setSchedulePopupItem(latest);
        setSchedulePopupOpen(true);
        return;
      }

      // 나머지 → 일반 토스트
      setToastData({ content: latest.content || '새로운 알림이 있어요!', type: latest.type });
      setToastOpen(true);
    });
    return () => unsub();
  }, [currentUser]);

  const handleSchedulePopupClick = async () => {
    if (!schedulePopupItem) return;
    const id = schedulePopupItem.id;
    addShown(id);
    updateDoc(doc(db, 'notifications', id), { isRead: true }).catch(() => {});
    const next = scheduleQueueRef.current.filter(n => n.id !== id && !shownRef.current.has(n.id));
    if (next.length > 0) {
      setSchedulePopupItem(next[0]);
    } else {
      setSchedulePopupOpen(false);
      setSchedulePopupItem(null);
      setTimeout(() => navigate('/schedule'), 50);
    }
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    allNotifications.filter(n => !n.isRead).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit().catch(console.error);
  };

  return {
    allNotifications,
    unreadCount,
    markAllRead,
    // 일반 토스트
    toastOpen, toastData, setToastOpen,
    // 일정 팝업
    schedulePopupOpen, schedulePopupItem,
    setSchedulePopupOpen, handleSchedulePopupClick,
  };
}
