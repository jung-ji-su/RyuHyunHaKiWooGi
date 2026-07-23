self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = {}; }

  const notif = payload.notification ?? {};
  const title  = notif.title ?? '부리부리 🐷';
  const body   = notif.body  ?? '새로운 알림이 있어요!';
  const link   = payload.fcmOptions?.link ?? '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:    '/icon.svg',
      badge:   '/icon.svg',
      vibrate: [200, 100, 200],
      data:    { link, ...(payload.data ?? {}) },
      tag:     'buri-push',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(wins => {
        const existing = wins.find(w => w.url.startsWith(self.location.origin));
        if (existing) {
          existing.focus();
          // iOS에서 navigate()가 미지원 → postMessage로 앱에 전달
          existing.postMessage({ type: 'NAVIGATE', url: link });
          return;
        }
        // iOS PWA: sub-path openWindow가 무시될 수 있어 쿼리 파라미터로 경로 전달
        try {
          const path = new URL(link).pathname;
          return clients.openWindow(path && path !== '/'
            ? `/?__nav=${encodeURIComponent(path)}`
            : '/');
        } catch {
          return clients.openWindow('/');
        }
      })
  );
});
