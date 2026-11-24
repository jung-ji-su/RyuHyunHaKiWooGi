// 실행: node --test functions/petWarnings.test.js   (Firestore/FCM 없이 가짜 의존성으로 검증)
const test = require("node:test");
const assert = require("node:assert/strict");
const { decideWarnings, runPetWarnings, daysBetween, todayKST, buildMessage } = require("./petWarnings");

const TODAY = "2026-11-24";
const ago = (n) => { // TODAY에서 n일 전 날짜
  const [y, m, d] = TODAY.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - n));
  return dt.toISOString().slice(0, 10);
};
const pets = (js, hh) => ({ 지수: js, 현하: hh });
const alive = (n) => ({ lastVisitDate: ago(n), isDead: false });

test("daysBetween: 월/연 경계와 서머타임 무관", () => {
  assert.equal(daysBetween("2026-11-21", "2026-11-24"), 3);
  assert.equal(daysBetween("2026-12-30", "2027-01-02"), 3);
  assert.equal(daysBetween("2026-03-28", "2026-03-31"), 3);
});

test("todayKST: 서울 날짜 (UTC 15:00 이후는 다음 날)", () => {
  assert.equal(todayKST(new Date("2026-11-23T14:59:00Z")), "2026-11-23");
  assert.equal(todayKST(new Date("2026-11-23T15:00:00Z")), "2026-11-24");
});

test("0~2일: 알림 없음 / 3일·4일: 상대방에게 / 5일 이상: 이미 떠남 → 없음", () => {
  for (const n of [0, 1, 2, 5, 6, 30]) {
    assert.equal(decideWarnings(pets(alive(n), alive(0)), {}, TODAY).length, 0, `${n}일`);
  }
  const d3 = decideWarnings(pets(alive(3), alive(0)), {}, TODAY);
  assert.equal(d3.length, 1);
  assert.deepEqual([d3[0].owner, d3[0].recipient, d3[0].days], ["지수", "현하", 3]);
  const d4 = decideWarnings(pets(alive(0), alive(4)), {}, TODAY);
  assert.deepEqual([d4[0].owner, d4[0].recipient, d4[0].days], ["현하", "지수", 4]);
});

test("문구: 3일차는 부드럽게, 4일차는 긴박하게(다른 제목/본문)", () => {
  const a = buildMessage("지수", 3), b = buildMessage("지수", 4);
  assert.match(a.body, /지수의 햄찌가 3일째 혼자 있어요\. 응원 보내기를 눌러볼까요\?/);
  assert.match(b.body, /4일째 혼자예요! 오늘 안 오면 내일 떠나요/);
  assert.notEqual(a.title, b.title);
});

test("이미 죽은 펫(isDead)이거나 날짜 필드가 없거나 이상하면 보내지 않는다", () => {
  assert.equal(decideWarnings(pets({ lastVisitDate: ago(3), isDead: true }, alive(0)), {}, TODAY).length, 0);
  assert.equal(decideWarnings(pets({ isDead: false }, alive(0)), {}, TODAY).length, 0);
  assert.equal(decideWarnings(pets({ lastVisitDate: "어제", isDead: false }, alive(0)), {}, TODAY).length, 0);
  assert.equal(decideWarnings({}, {}, TODAY).length, 0);
  assert.equal(decideWarnings(undefined, undefined, TODAY).length, 0);
});

test("둘 다 3일/4일이면 각자 상대방에게 2건", () => {
  const d = decideWarnings(pets(alive(3), alive(4)), {}, TODAY);
  assert.equal(d.length, 2);
  assert.deepEqual(d.map((x) => `${x.owner}->${x.recipient}`).sort(), ["지수->현하", "현하->지수"]);
});

test("같은 키(lastVisitDate:일수)가 이미 기록돼 있으면 건너뜀, 새 일수(4일)면 다시 보냄", () => {
  const p = pets(alive(3), alive(0));
  const states = { 지수: { lastWarnKey: `${ago(3)}:3` } };
  assert.equal(decideWarnings(p, states, TODAY).length, 0);
  const p4 = pets(alive(4), alive(0));
  assert.equal(decideWarnings(p4, states, TODAY).length, 1); // 3일 키가 있어도 4일차는 별개
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
      // 실제 구현과 같은 의미: 같은 키가 이미 있으면 false(원자적)
      claim: async (owner, key) => { claims.push(`${owner}:${key}`); if (st[owner]?.lastWarnKey === key) return false; st[owner] = { lastWarnKey: key }; return true; },
      send: async (u, t, m) => { sent.push({ u, t, ...m }); },
    },
  };
}

test("실행 1회: 파트너의 모든 기기로 전송, 같은 날 재실행(스케줄 중복)해도 추가 전송 0", async () => {
  const { deps, sent } = makeDeps({ petData: pets(alive(3), alive(0)) });
  const r1 = await runPetWarnings(deps, TODAY);
  assert.equal(r1.sent[0].result, "sent");
  assert.equal(sent.length, 2);                       // 현하의 기기 2대
  assert.ok(sent.every((s) => s.u === "현하" && /지수의 햄찌/.test(s.body)));
  const r2 = await runPetWarnings(deps, TODAY);       // 같은 날 다시
  assert.equal(r2.decisions, 0);
  assert.equal(sent.length, 2);
});

test("동시 중복 실행(경합): claim이 원자적이므로 한 번만 전송", async () => {
  const { deps, sent } = makeDeps({ petData: pets(alive(4), alive(0)) });
  await Promise.all([runPetWarnings(deps, TODAY), runPetWarnings(deps, TODAY)]);
  assert.equal(sent.length, 2);                       // 현하 기기 2대 × 1회(두 번째 실행은 claim 실패로 0)
});

test("다음 날(4일째) 다시 한 번, 그 다음 날(5일=사망)은 없음 — 총 2번뿐", async () => {
  const lastVisit = ago(3);
  const { deps, sent } = makeDeps({ petData: pets({ lastVisitDate: lastVisit, isDead: false }, alive(0)) });
  await runPetWarnings(deps, TODAY);                                  // 3일째
  const t4 = (() => { const [y, m, d] = TODAY.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); })();
  const t5 = (() => { const [y, m, d] = TODAY.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 2)).toISOString().slice(0, 10); })();
  await runPetWarnings(deps, t4);                                     // 4일째
  await runPetWarnings(deps, t5);                                     // 5일째 → 이미 떠남
  assert.equal(sent.length, 4);                                       // (3일째 + 4일째) × 현하 기기 2대
  assert.deepEqual([...new Set(sent.map((s) => s.title))].length, 2);
  assert.match(sent[0].title, /외로워/); assert.match(sent[2].title, /위험/);
  assert.ok(sent.slice(0, 2).every((s) => /3일째/.test(s.body)) && sent.slice(2).every((s) => /4일째/.test(s.body)));
});

test("수신자 토큰이 없으면 claim도 안 한다(나중에 토큰 생기면 같은 날 재시도 가능)", async () => {
  const { deps, claims, sent } = makeDeps({ petData: pets(alive(3), alive(0)), tokens: {} });
  const r = await runPetWarnings(deps, TODAY);
  assert.equal(r.sent[0].result, "skipped:no-token");
  assert.equal(claims.length, 0);
  assert.equal(sent.length, 0);
});

test("죽은 펫·접속 중인 펫만 있으면 아무 것도 안 보냄", async () => {
  const { deps, sent } = makeDeps({ petData: pets({ lastVisitDate: ago(4), isDead: true }, alive(1)) });
  const r = await runPetWarnings(deps, TODAY);
  assert.equal(r.decisions, 0); assert.equal(sent.length, 0);
});
