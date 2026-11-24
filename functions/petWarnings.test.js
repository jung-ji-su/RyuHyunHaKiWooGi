// 실행: node --test functions/petWarnings.test.js   (Firestore/FCM 없이 가짜 의존성으로 검증)
const test = require("node:test");
const assert = require("node:assert/strict");
const { decideWarnings, runPetWarnings, daysBetween, todayKST, buildMessage, DEATH_DAYS, GRACE_CAP, WARN_START } = require("./petWarnings");

const TODAY = "2026-11-24";
const shift = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const ago = (n) => shift(TODAY, -n);
// 지수 펫: 마지막 방문 n일 전, 유예 g일 / 현하 펫: 오늘 방문(기본), 오늘 응원을 이미 보냈는지 선택
const pets = (js, hh = { lastVisitDate: TODAY, isDead: false }) => ({ 지수: js, 현하: hh });
const away = (n, graceDays = 0) => ({ lastVisitDate: ago(n), isDead: false, graceDays });
const cheered = { lastVisitDate: TODAY, isDead: false, lastCheerSentDate: TODAY };

// 지수가 n일째 혼자일 때의 결정(0건 또는 1건)
const decide = (n, g = 0, partner) => decideWarnings(pets(away(n, g), partner), {}, TODAY);

test("상수는 클라이언트와 같은 값", () => {
  assert.equal(DEATH_DAYS, 5); assert.equal(GRACE_CAP, 2); assert.equal(WARN_START, 3);
});

test("daysBetween / todayKST", () => {
  assert.equal(daysBetween("2026-11-21", "2026-11-24"), 3);
  assert.equal(daysBetween("2026-12-30", "2027-01-02"), 3);
  assert.equal(todayKST(new Date("2026-11-23T14:59:00Z")), "2026-11-23");
  assert.equal(todayKST(new Date("2026-11-23T15:00:00Z")), "2026-11-24");
});

test("유예 0: 3일째 부드럽게 → 4일째 긴박(응원하면 하루 더) → 5일째부터 이미 떠남(없음)", () => {
  for (const n of [0, 1, 2, 5, 6, 30]) assert.equal(decide(n).length, 0, `${n}일`);
  const d3 = decide(3); assert.equal(d3.length, 1);
  assert.deepEqual([d3[0].owner, d3[0].recipient, d3[0].days, d3[0].left, d3[0].kind], ["지수", "현하", 3, 2, "gentle"]);
  const d4 = decide(4);
  assert.deepEqual([d4[0].days, d4[0].left, d4[0].kind], [4, 1, "urgent-cheer"]);
});

test("유예 1(사망일 6일): 3·4일째 부드럽게, 5일째 긴박(응원으로 하루 더 가능), 6일째 없음", () => {
  assert.deepEqual([3, 4, 5, 6].map((n) => decide(n, 1).map((x) => x.kind)), [["gentle"], ["gentle"], ["urgent-cheer"], []]);
  assert.equal(decide(5, 1)[0].left, 1);
});

test("유예 2=상한(사망일 7일): 응원은 더 못 도우므로 부드러운 경고는 생략, 6일째 긴박(최대 안내), 7일째 없음", () => {
  assert.deepEqual([3, 4, 5].map((n) => decide(n, 2).length), [0, 0, 0]);
  const d6 = decide(6, 2); assert.equal(d6.length, 1);
  assert.equal(d6[0].kind, "urgent-capped"); assert.equal(d6[0].left, 1);
  assert.equal(decide(7, 2).length, 0);
});

test("유예 값이 이상해도(9, -3, 문자열) 0~상한으로 보정", () => {
  assert.equal(decide(7, 9).length, 0);                    // 9→2 → 사망일 7 → 7일째는 없음
  assert.equal(decide(6, 9)[0].kind, "urgent-capped");
  assert.equal(decide(3, -3)[0].kind, "gentle");           // -3→0
  assert.equal(decideWarnings(pets({ ...away(3), graceDays: "abc" }), {}, TODAY)[0].kind, "gentle");
});

test("오늘 파트너가 이미 응원했으면: 부드러운 경고는 생략, 긴박한 날은 '오늘 응원은 이미 보냈다' 문구", () => {
  assert.equal(decide(3, 0, cheered).length, 0);
  const d4 = decide(4, 0, cheered);
  assert.equal(d4[0].kind, "urgent-used");
  assert.match(d4[0].body, /오늘 응원은 이미 보냈어요/);
});

test("문구: 응원이 실제로 도움이 되는지에 따라 달라진다", () => {
  assert.match(buildMessage("지수", 3, "gentle").body, /응원 보내기를 누르면 하루 더 버틸 수 있어요/);
  assert.match(buildMessage("지수", 4, "urgent-cheer").body, /내일 떠나요.*지금 응원 보내기를 눌러주면 하루 더 버텨요/);
  assert.match(buildMessage("지수", 6, "urgent-capped").body, /응원은 이미 최대로 보냈어요/);
  assert.notEqual(buildMessage("지수", 3, "gentle").title, buildMessage("지수", 4, "urgent-cheer").title);
  assert.ok(!/알려주고 응원/.test(buildMessage("지수", 4, "urgent-cheer").body));   // 예전 "당사자에게 알려주고" 문구 제거
});

test("죽은 펫 / 날짜 이상 / 빈 데이터는 보내지 않는다", () => {
  assert.equal(decideWarnings(pets({ lastVisitDate: ago(3), isDead: true }), {}, TODAY).length, 0);
  assert.equal(decideWarnings(pets({ isDead: false }), {}, TODAY).length, 0);
  assert.equal(decideWarnings(pets({ lastVisitDate: "어제", isDead: false }), {}, TODAY).length, 0);
  assert.equal(decideWarnings({}, {}, TODAY).length, 0);
  assert.equal(decideWarnings(undefined, undefined, TODAY).length, 0);
});

test("둘 다 위험하면 각자 상대방에게 2건", () => {
  const d = decideWarnings({ 지수: away(3), 현하: away(4) }, {}, TODAY);
  assert.deepEqual(d.map((x) => `${x.owner}->${x.recipient}`).sort(), ["지수->현하", "현하->지수"]);
});

test("같은 키(lastVisitDate:일수)가 이미 기록돼 있으면 건너뜀, 다른 일수는 별개", () => {
  const states = { 지수: { lastWarnKey: `${ago(3)}:3` } };
  assert.equal(decideWarnings(pets(away(3)), states, TODAY).length, 0);
  assert.equal(decideWarnings(pets(away(4)), states, TODAY).length, 1);
});

// ── 오케스트레이션: 가짜 Firestore/FCM ──
function makeDeps({ petData, tokens = { 지수: ["tJ"], 현하: ["tH1", "tH2"] }, states = {} }) {
  const sent = [], claims = [];
  const st = { ...states };
  return {
    sent, claims, st,
    deps: {
      readPets: async () => petData,
      readStates: async () => JSON.parse(JSON.stringify(st)),
      getTokens: async (u) => tokens[u] || [],
      claim: async (owner, key) => { claims.push(`${owner}:${key}`); if (st[owner]?.lastWarnKey === key) return false; st[owner] = { lastWarnKey: key }; return true; },
      send: async (u, t, m) => { sent.push({ u, t, ...m }); },
    },
  };
}

test("실행 1회: 파트너의 모든 기기로 전송, 같은 날 재실행해도 추가 전송 0", async () => {
  const { deps, sent } = makeDeps({ petData: pets(away(3)) });
  const r1 = await runPetWarnings(deps, TODAY);
  assert.equal(r1.sent[0].result, "sent");
  assert.equal(sent.length, 2);
  assert.ok(sent.every((s) => s.u === "현하" && /지수의 햄찌/.test(s.body)));
  await runPetWarnings(deps, TODAY);
  assert.equal(sent.length, 2);
});

test("동시 중복 실행(경합): claim이 원자적이므로 한 번만 전송", async () => {
  const { deps, sent } = makeDeps({ petData: pets(away(4)) });
  await Promise.all([runPetWarnings(deps, TODAY), runPetWarnings(deps, TODAY)]);
  assert.equal(sent.length, 2);   // 현하 기기 2대 × 1회
});

test("수신자 토큰이 없으면 claim도 안 한다", async () => {
  const { deps, claims, sent } = makeDeps({ petData: pets(away(3)), tokens: {} });
  const r = await runPetWarnings(deps, TODAY);
  assert.equal(r.sent[0].result, "skipped:no-token");
  assert.equal(claims.length, 0); assert.equal(sent.length, 0);
});

test("죽은 펫·접속 중인 펫만 있으면 아무 것도 안 보냄", async () => {
  const { deps, sent } = makeDeps({ petData: pets({ lastVisitDate: ago(4), isDead: true }, away(1)) });
  const r = await runPetWarnings(deps, TODAY);
  assert.equal(r.decisions, 0); assert.equal(sent.length, 0);
});
