// 홈 화면 앱 아이콘 배지 (Badging API) — 안 읽은 알림 개수를 아이콘에 표시한다.
//
// 지원 조건 (WebKit/MDN 문서 기준):
//  - iOS/iPadOS 16.4+ 에서 "홈 화면에 추가한 웹앱"에서만 동작(Safari 탭/WKWebView에는 API 자체가 없다).
//  - 알림 권한을 허용하면 배지 권한도 같이 허용된다. 권한이 없거나 iOS 설정에서 배지를 끄면 호출은 성공해도 표시되지 않는다.
//  - 서비스워커에서도 호출 가능(앱이 닫혀 있을 때 푸시로 갱신) — public/firebase-messaging-sw.js 참고.
//  - Chrome/Edge 데스크톱은 "설치한 PWA"에서만 표시된다.
// 지원하지 않거나 거부되는 환경에서는 조용히 아무 일도 하지 않는다(예외를 밖으로 던지지 않음).

export function isBadgeSupported() {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
}

// 0 이하이면 배지를 지운다. 반환값: 실제로 호출했는지(지원 여부) — 표시 여부는 OS 권한에 달려 있어 알 수 없다.
export async function setAppBadgeCount(count) {
  if (!isBadgeSupported()) return false;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  try {
    if (n > 0) await navigator.setAppBadge(n);
    else if (typeof navigator.clearAppBadge === 'function') await navigator.clearAppBadge();
    else await navigator.setAppBadge(0);
    return true;
  } catch {
    return false; // 권한 거부/미설치 등 — 배지는 부가 기능이라 무시
  }
}
