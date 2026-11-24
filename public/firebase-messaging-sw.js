self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = {}; }

  const notif = payload.notification ?? {};
  const title  = notif.title ?? '부리부리 🐷';
  const body   = notif.body  ?? '새로운 알림이 있어요!';
  const link   = payload.fcmOptions?.link ?? '/';

  // 앱 아이콘 배지: 서버(sendPushOnNotification)가 data.badge에 "안 읽은 알림 총개수"를 실어 보낸다.
  // 앱이 닫혀 있어도 여기서 배지를 갱신한다(iOS 16.4+ 홈 화면 웹앱, Badging API는 서비스워커에서도 호출 가능).
  //  - badge 값이 없거나 숫자가 아니면(날씨/브리핑/햄찌 알림 등) 배지는 건드리지 않는다.
  //  - 미지원/권한 없음이면 조용히 무시. 배지 갱신만으로는 푸시의 "알림 표시" 의무를 대신할 수 없으므로 알림은 항상 띄운다.
  // (빈 문자열은 Number('')===0 이라 배지를 지워버리므로 "값 없음"으로 취급)
  const rawBadge = payload.data?.badge;
  const badgeCount = (rawBadge === undefined || rawBadge === null || String(rawBadge).trim() === '') ? NaN : Number(rawBadge);
  const updateBadge = (async () => {
    try {
      if (!Number.isFinite(badgeCount) || badgeCount < 0) return;
      const nav = self.navigator;
      if (!nav || typeof nav.setAppBadge !== 'function') return;
      if (badgeCount > 0) await nav.setAppBadge(Math.floor(badgeCount));
      else if (typeof nav.clearAppBadge === 'function') await nav.clearAppBadge();
      else await nav.setAppBadge(0);
    } catch { /* 권한 거부 등 — 무시 */ }
  })();

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body,
      icon:    '/icon.svg',
      badge:   '/icon.svg',
      vibrate: [200, 100, 200],
      data:    { link, ...(payload.data ?? {}) },
      tag:     'buri-push',
    }),
    updateBadge,
  ]));
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
