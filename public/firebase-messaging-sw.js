// Firebase CDN 없이 순수 Push API로 처리
// Firebase getToken()은 SW에 Firebase SDK가 없어도 동작함

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = {}; }

  const notif = payload.notification ?? {};
  const title   = notif.title ?? '부리부리 🐷';
  const body    = notif.body  ?? '새로운 알림이 있어요!';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:    '/icon.svg',
      badge:   '/icon.svg',
      vibrate: [200, 100, 200],
      data:    payload.data ?? {},
      tag:     'buri-push',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(wins => wins.length > 0 ? wins[0].focus() : clients.openWindow('/'))
  );
});
