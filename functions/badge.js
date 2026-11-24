// 앱 아이콘 배지(= 알림 서랍의 "안 읽은 알림" 개수) 계산.
// 클라이언트 src/hooks/useNotifications.jsx의 `mine` 필터와 "정확히 같은 기준"이어야 서랍의 숫자와 배지가 어긋나지 않는다:
//   - type === 'jilta'  → target이 나인 것
//   - 그 외             → writer가 있고, writer가 내가 아닌 것(상대가 쓴 것)
//   그 중 isRead가 아닌 것.
// 날씨/일정 브리핑/햄찌 위험 알림처럼 notifications 문서를 만들지 않는 푸시는 서랍에 안 보이므로 세지 않는다.

function isMine(n, user) {
  if (!n) return false;
  if (n.type === "jilta") return n.target === user;
  return !!n.writer && n.writer !== user;
}

function unreadCountFor(docs, user) {
  return (docs || []).filter((n) => isMine(n, user) && !n.isRead).length;
}

module.exports = { isMine, unreadCountFor };
