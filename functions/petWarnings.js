// 햄찌(타마고치) "파트너 펫이 위험해요" 알림 로직 — 순수 함수 + 의존성 주입형 오케스트레이션.
// 실제 Firestore/FCM 없이도 테스트할 수 있게 index.js와 분리했다(functions/petWarnings.test.js 참고).
//
// 규칙 (클라이언트 CoupleTamagotchi.jsx와 같은 기준 — 아래 상수는 그쪽 DEATH_DAYS/GRACE_CAP/GRACE_MIN_MISSED와 같아야 한다):
//  - 펫은 "마지막 방문일(lastVisitDate)로부터 DEATH_DAYS + 유예일(graceDays)일 이상" 지나면 사망.
//    유예는 파트너가 응원(하루 1회)을 보낼 때 +1일(상한 GRACE_CAP, 주인이 방문하면 0으로 리셋).
//  - 미방문 WARN_START(3)일째부터 사망 전날까지 파트너에게 푸시. 이미 죽은 펫(isDead 또는 기준 초과)은 보내지 않는다.
//  - 남은 일수(left) = 사망일 - 미방문일수.  left>=2 는 부드러운 경고, left==1("오늘이 마지막 날")은 긴박한 경고.
//  - 부드러운 경고는 "지금 응원으로 도울 수 있을 때"(유예 여유가 있고, 오늘 아직 응원을 안 보냈을 때)만 보낸다 — 할 수 있는 게 없으면 조용히.
//    긴박한 경고는 항상 보내되, 응원이 아직 도움이 되는지에 따라 문구가 다르다.
//  - 같은 방문 공백(lastVisitDate)에서 일수별로 1번 — petAlerts/{주인}에 "lastVisitDate:일수" 키를 트랜잭션으로 먼저 기록(claim)한 뒤
//    보내므로, 스케줄이 중복 실행돼도 두 번 가지 않는다.
//  - 받는 사람은 항상 "상대방"(주인 본인이 아님).

const DEATH_DAYS = 5;       // 기본 사망 기준(유예 없을 때)
const GRACE_CAP = 2;        // 응원으로 벌 수 있는 유예 상한(일)
const WARN_START = 3;       // 이 일수부터 경고 (= 클라이언트의 GRACE_MIN_MISSED)

// 'YYYY-MM-DD' 두 개의 일수 차이 (UTC 자정 기준이라 시간대/서머타임 영향 없음)
function daysBetween(iso1, iso2) {
  const t = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(iso2) - t(iso1)) / 86400000);
}

// 서울 기준 오늘 'YYYY-MM-DD' (sv-SE 로케일이 ISO 형식을 준다)
function todayKST(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

const clampGrace = (g) => Math.max(0, Math.min(GRACE_CAP, Number(g) || 0));

// kind: "gentle"(응원으로 도울 수 있음) | "urgent-cheer"(마지막 날, 지금 응원하면 하루 더) |
//       "urgent-capped"(마지막 날, 응원은 이미 최대) | "urgent-used"(마지막 날, 오늘 응원은 이미 보냄)
function buildMessage(owner, days, kind = "gentle") {
  switch (kind) {
    case "urgent-cheer":
      return {
        title: "🚨 햄찌가 위험해요",
        body: `${owner}의 햄찌가 ${days}일째 혼자예요! 오늘 안 오면 내일 떠나요 😢 지금 응원 보내기를 눌러주면 하루 더 버텨요!`,
      };
    case "urgent-capped":
      return {
        title: "🚨 햄찌가 위험해요",
        body: `${owner}의 햄찌가 ${days}일째 혼자예요! 응원은 이미 최대로 보냈어요. ${owner}가 오늘 안에 들어와야 해요, 얼른 알려주세요!`,
      };
    case "urgent-used":
      return {
        title: "🚨 햄찌가 위험해요",
        body: `${owner}의 햄찌가 ${days}일째 혼자예요! 오늘 응원은 이미 보냈어요. ${owner}가 오늘 안에 들어와야 해요, 얼른 알려주세요!`,
      };
    default:
      return {
        title: "🐹 햄찌가 외로워해요",
        body: `${owner}의 햄찌가 ${days}일째 혼자 있어요. 응원 보내기를 누르면 하루 더 버틸 수 있어요!`,
      };
  }
}

// pets: { 지수: {...}, 현하: {...} } (couple_tamagotchi 문서 내용), states: { 지수: {lastWarnKey}, ... }
// 반환: [{ owner, recipient, days, left, kind, key, title, body }]
function decideWarnings(pets, states, today, users = ["지수", "현하"]) {
  const out = [];
  for (const owner of users) {
    const pet = pets?.[owner];
    if (!pet || pet.isDead) continue;
    const last = pet.lastVisitDate;
    if (typeof last !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(last)) continue;

    const grace = clampGrace(pet.graceDays);
    const deathDay = DEATH_DAYS + grace;
    const days = daysBetween(last, today);
    if (days < WARN_START || days >= deathDay) continue;     // 경고 전이거나 이미 떠남
    const left = deathDay - days;                             // 1 = 오늘이 마지막 날

    const recipient = users.find((u) => u !== owner);
    if (!recipient) continue;
    const cheerUsedToday = pets?.[recipient]?.lastCheerSentDate === today;
    const canGrace = grace < GRACE_CAP;

    let kind;
    if (left >= 2) {
      if (!canGrace || cheerUsedToday) continue;              // 지금 응원으로 도울 수 없으면 조용히
      kind = "gentle";
    } else {
      kind = !canGrace ? "urgent-capped" : cheerUsedToday ? "urgent-used" : "urgent-cheer";
    }

    const key = `${last}:${days}`;
    if (states?.[owner]?.lastWarnKey === key) continue;
    out.push({ owner, recipient, days, left, kind, key, ...buildMessage(owner, days, kind) });
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

module.exports = { DEATH_DAYS, GRACE_CAP, WARN_START, daysBetween, todayKST, buildMessage, decideWarnings, runPetWarnings };
