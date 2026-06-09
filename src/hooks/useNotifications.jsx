import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection, query, onSnapshot, updateDoc, doc,
  orderBy, limit, writeBatch,
} from 'firebase/firestore';

// sessionStorage + 24h TTL로 본 알림 ID 관리
function loadShownIds() {
  try {
    const raw = sessionStorage.getItem('shownNotifIds');
    if (!raw) return new Set();
    const obj = JSON.parse(raw);
    const cutoff = Date.now() - 86400000;
    return new Set(Object.keys(obj).filter(id => obj[id] > cutoff));
  } catch {
    return new Set();
  }
}

function saveShownId(id, shownSet) {
  try {
    const raw = sessionStorage.getItem('shownNotifIds');
    const obj = raw ? JSON.parse(raw) : {};
    obj[id] = Date.now();
    const cutoff = Date.now() - 86400000;
    Object.keys(obj).forEach(k => { if (obj[k] < cutoff) delete obj[k]; });
    sessionStorage.setItem('shownNotifIds', JSON.stringify(obj));
  } catch {}
}

export function useNotifications(currentUser) {
  const navigate = useNavigate();

  const [allNotifications, setAllNotifications] = useState([]);
  const [unreadCount,      setUnreadCount]      = useState(0);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastData, setToastData] = useState(null);

  const [schedulePopupOpen, setSchedulePopupOpen] = useState(false);
  const [schedulePopupItem, setSchedulePopupItem] = useState(null);
  const scheduleQueueRef = useRef([]);
  const scheduleOpenRef  = useRef(false);

  const shownRef = useRef(loadShownIds());
  const addShown = (id) => {
    shownRef.current.add(id);
    saveShownId(id, shownRef.current);
  };

  useEffect(() => {
    if (!schedulePopupOpen) scheduleOpenRef.current = false;
  }, [schedulePopupOpen]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(60),
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const mine = all.filter(n => {
        if (n.type === 'jilta') return n.target === currentUser;
        return n.writer && n.writer !== currentUser;
      });

      setAllNotifications(mine);
      setUnreadCount(mine.filter(n => !n.isRead).length);

      const newOnes = mine.filter(n => !n.isRead && !shownRef.current.has(n.id));
      if (newOnes.length === 0) return;

      const latest = newOnes[0];
      addShown(latest.id);

      const isSchedule = latest.type === 'schedule' || (!latest.type && latest.count !== undefined);
      if (isSchedule) {
        const scheduleNew = newOnes.filter(n => n.type === 'schedule' || (!n.type && n.count !== undefined));
        scheduleQueueRef.current = scheduleNew;
        setSchedulePopupItem(latest);
        setSchedulePopupOpen(true);
        scheduleOpenRef.current = true;
        return;
      }

      if (!scheduleOpenRef.current) {
        setToastData({ content: latest.content || '새로운 알림이 있어요!', type: latest.type });
        setToastOpen(true);
      }
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
      scheduleOpenRef.current = false;
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
    toastOpen, toastData, setToastOpen,
    schedulePopupOpen, schedulePopupItem,
    setSchedulePopupOpen, handleSchedulePopupClick,
  };
}
