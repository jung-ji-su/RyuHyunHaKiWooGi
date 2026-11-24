// 실행: node --test functions/badge.test.js
// 서버가 푸시에 실어 보내는 배지 개수가 앱 서랍(useNotifications의 mine 필터)과 같은 기준인지 검증한다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { unreadCountFor, isMine } = require("./badge");

const docs = [
  { writer: "지수", type: "diary", isRead: false },           // 지수가 씀 → 현하의 안 읽음
  { writer: "지수", type: "comment", isRead: true },           // 읽음
  { writer: "현하", type: "like", isRead: false },             // 현하가 씀 → 지수의 안 읽음 / 현하 본인에겐 해당 없음
  { type: "jilta", target: "현하", isRead: false },            // 현하에게 온 콕
  { type: "jilta", target: "지수", isRead: false },            // 지수에게 온 콕
  { type: "jilta", target: "현하", isRead: true },
  { writer: "지수", count: 2, isRead: false },                  // 구버전 일정 알림(type 없음)
  { type: "admin", target: "현하", isRead: false },            // writer 없음 → 클라이언트가 안 보여주므로 세지 않음
  { type: "diary", isRead: false },                             // writer 없음 → 제외
  null, undefined,
];

test("현하의 안 읽음: 지수가 쓴 것 + 현하에게 온 콕", () => {
  // diary(지수) + jilta(현하) + 일정(지수) = 3
  assert.equal(unreadCountFor(docs, "현하"), 3);
});

test("지수의 안 읽음: 현하가 쓴 것 + 지수에게 온 콕", () => {
  // like(현하) + jilta(지수) = 2
  assert.equal(unreadCountFor(docs, "지수"), 2);
});

test("읽음 처리하면 줄어들고 다 읽으면 0", () => {
  const read = docs.map((d) => (d ? { ...d, isRead: true } : d));
  assert.equal(unreadCountFor(read, "현하"), 0);
  assert.equal(unreadCountFor(read, "지수"), 0);
});

test("빈/이상한 입력은 0", () => {
  assert.equal(unreadCountFor([], "지수"), 0);
  assert.equal(unreadCountFor(undefined, "지수"), 0);
  assert.equal(unreadCountFor(null, "지수"), 0);
  assert.equal(isMine(null, "지수"), false);
});

test("서버 기준이 클라이언트(useNotifications)의 mine 필터와 어긋나지 않는다(소스 대조)", () => {
  const src = fs.readFileSync(path.join(__dirname, "../src/hooks/useNotifications.jsx"), "utf8");
  // 클라이언트 필터가 바뀌면 이 테스트가 깨져서 badge.js도 같이 고치도록 알려준다.
  assert.match(src, /if \(n\.type === 'jilta'\) return n\.target === currentUser;/);
  assert.match(src, /return n\.writer && n\.writer !== currentUser;/);
  assert.match(src, /mine\.filter\(n => !n\.isRead\)\.length/);
});
