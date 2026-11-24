// 햄찌(타마고치) "파트너 펫이 위험해요" 알림 로직 — 순수 함수 + 의존성 주입형 오케스트레이션.
// 실제 Firestore/FCM 없이도 테스트할 수 있게 index.js와 분리했다(functions/petWarnings.test.js 참고).
//
// 규칙 (클라이언트 CoupleTamagotchi.jsx와 같은 기준):
//  - 펫은 "마지막 방문일(lastVisitDate)로부터 5일 이상" 지나면 사망 → 그 전인 3일째/4일째에 파트너에게 푸시.
//  - 이미 죽은 펫(isDead 또는 5일 이상 경과)에는 보내지 않는다.
//  - 같은 방문 공백(lastVisitDate)에서 3일째 1번, 4일째 1번 — petAlerts/{주인} 문서에 "lastVisitDate:일수" 키를
//    트랜잭션으로 먼저 기록(claim)한 뒤 보내므로, 스케줄이 중복 실행돼도 두 번 가지 않는다.
//  - 받는 사람은 항상 "상대방"(주인 본인이 아님).

const WARN_DAYS = [3, 4];   // 경고를 보내는 미방문 일수
const DEATH_DAYS = 5;       // 클라이언트의 사망 기준과 같아야 한다

// 'YYYY-MM-DD' 두 개의 일수 차이 (UTC 자정 기준이라 시간대/서머타임 영향 없음)
function daysBetween(iso1, iso2) {
  const t = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(iso2) - t(iso1)) / 86400000);
}

// 서울 기준 오늘 'YYYY-MM-DD' (sv-SE 로케일이 ISO 형식을 준다)
function todayKST(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

function buildMessage(owner, days) {
  if (days >= 4) {
    return {
      title: "🚨 햄찌가 위험해요",
      body: `${owner}의 햄찌가 ${days}일째 혼자예요! 오늘 안 오면 내일 떠나요 😢 ${owner}한테 알려주고 응원 보내기를 눌러주세요`,
    };
  }
  return {
    title: "🐹 햄찌가 외로워해요",
    body: `${owner}의 햄찌가 ${days}일째 혼자 있어요. 응원 보내기를 눌러볼까요?`,
  };
}

// pets: { 지수: {...}, 현하: {...} } (couple_tamagotchi 문서 내용), states: { 지수: {lastWarnKey}, ... }
// 반환: [{ owner, recipient, days, key, title, body }]
function decideWarnings(pets, states, today, users = ["지수", "현하"]) {
  const out = [];
  for (const owner of users) {
    const pet = pets?.[owner];
    if (!pet || pet.isDead) continue;
    const last = pet.lastVisitDate;
    if (typeof last !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(last)) continue;
    const days = daysBetween(last, today);
    if (days >= DEATH_DAYS || !WARN_DAYS.includes(days)) continue;
    const key = `${last}:${days}`;
    if (states?.[owner]?.lastWarnKey === key) continue;
    const recipient = users.find((u) => u !== owner);
    if (!recipient) continue;
    out.push({ owner, recipient, days, key, ...buildMessage(owner, days) });
  }
  return out;
}

// deps: { readPets(), readStates(), getTokens(user), claim(owner, key) → boolean, send(user, token, {title, body}) }
// 토큰이 없는 수신자는 claim하지 않는다(나중에 토큰이 생기면 같은 날 재시도 가능).
async function runPetWarnings(deps, today) {
  const pets = await deps.readPets();
  const states = await deps.readStates();
  const decisions = decideWarnings(pets, states, today);
  const sent = [];
  for (const d of decisions) {
    const tokens = await deps.getTokens(d.recipient);
    if (!tokens.length) { sent.push({ ...d, result: "skipped:no-token" }); continue; }
    const claimed = await deps.claim(d.owner, d.key);
    if (!claimed) { sent.push({ ...d, result: "skipped:already-sent" }); continue; }
    await Promise.all(tokens.map((t) => deps.send(d.recipient, t, { title: d.title, body: d.body })));
    sent.push({ ...d, result: "sent", tokenCount: tokens.length });
  }
  return { today, decisions: decisions.length, sent };
}

module.exports = { WARN_DAYS, DEATH_DAYS, daysBetween, todayKST, buildMessage, decideWarnings, runPetWarnings };
