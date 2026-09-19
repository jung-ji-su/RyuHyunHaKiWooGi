const { onRequest }         = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule }        = require("firebase-functions/v2/scheduler");
const admin                 = require("firebase-admin");
const fetch                 = require("node-fetch");

admin.initializeApp();

const BASE = "https://ryuhyunhakiwoogi.web.app";
const USERS = ["지수", "현하"];
const TEST_SECRET = "buri2026";

// fcmTokens/{user} 문서: 구버전은 { token } 하나, 신버전은 { token(최근), tokens[](전체 기기) }.
// 어느 형태든 읽을 수 있도록 두 필드를 합쳐서 중복 제거한다.
function extractTokens(data) {
  if (!data) return [];
  const list = Array.isArray(data.tokens) ? data.tokens : [];
  return [...new Set([...list, data.token].filter(t => typeof t === "string" && t))];
}

// 더 이상 유효하지 않은 토큰으로 판정하는 FCM 에러 코드
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

// ── 공용: 만료된 토큰 하나만 문서에서 제거 (남은 기기 토큰은 보존) ──
async function pruneToken(user, deadToken) {
  const ref = admin.firestore().doc(`fcmTokens/${user}`);
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data();
      const remaining = extractTokens(data).filter(t => t !== deadToken);
      if (remaining.length === 0) { tx.delete(ref); return; }
      const latest = remaining.includes(data.token) ? data.token : remaining[remaining.length - 1];
      tx.set(ref, { token: latest, tokens: remaining }, { merge: true });
    });
  } catch (e) {
    console.error("FCM 토큰 정리 실패:", user, e);
  }
}

// ── 공용: 토큰 하나에 전송, 만료 토큰이면 정리 (실패해도 throw 안 함) ──
async function sendSafe(user, token, message) {
  try {
    await admin.messaging().send({ ...message, token });
    return true;
  } catch (e) {
    console.error("FCM send error:", user, e.code || e);
    if (DEAD_TOKEN_CODES.has(e.code)) await pruneToken(user, token);
    return false;
  }
}

// ── 공용: 활성 FCM 토큰 맵 반환 ({ 사용자: [토큰...] }) ─────────
async function getActiveTokenMap() {
  const map = {};
  await Promise.all(
    USERS.map(async (u) => {
      try {
        const snap = await admin.firestore().doc(`fcmTokens/${u}`).get();
        const tokens = snap.exists ? extractTokens(snap.data()) : [];
        if (tokens.length) map[u] = tokens;
      } catch (e) {
        console.error("FCM 토큰 조회 실패:", u, e);
      }
    })
  );
  return map;
}

// { 사용자: [토큰...] } → [{ user, token }, ...]
function flattenTokenMap(tokenMap) {
  return Object.entries(tokenMap).flatMap(([user, tokens]) => tokens.map(token => ({ user, token })));
}

// ── 공용: 전체 토큰에 메시지 병렬 전송 ─────────────────────────
async function sendToTokens(targets, title, body, link = BASE) {
  const message = {
    notification: { title, body },
    webpush: {
      notification: {
        icon: `${BASE}/icon.svg`,
        badge: `${BASE}/icon.svg`,
      },
      fcmOptions: { link },
    },
  };
  await Promise.all(targets.map(({ user, token }) => sendSafe(user, token, message)));
}

// ── 알림 타입 → 이동 경로 매핑 ──────────────────────────────────
const ROUTE = {
  diary:        `${BASE}/diary`,
  comment:      `${BASE}/diary`,
  like:         `${BASE}/diary`,
  schedule:     `${BASE}/schedule`,
  bucket:       `${BASE}/bucket`,
  bucket_add:   `${BASE}/bucket`,
  letter:       `${BASE}/letter`,
  letter_reply: `${BASE}/letter`,
  thermo:       `${BASE}/thermo`,
  hug:          `${BASE}/thermo`,
  temp_diff:    `${BASE}/thermo`,
  coupon:       `${BASE}/coupons`,
  coupon_used:  `${BASE}/coupons`,
  jilta:        BASE,
};

// ── FCM 푸시 알림: notifications 문서 생성 시 상대방에게 전송 ────
exports.sendPushOnNotification = onDocumentCreated(
  "notifications/{notifId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return null;

    // 수신자 결정
    let recipient;
    if (data.type === "jilta" || data.type === "admin") {
      recipient = data.target;
    } else {
      if (!data.writer) return null;
      recipient = data.writer === "지수" ? "현하" : "지수";
    }
    if (!recipient) return null;

    // FCM 토큰 조회 (기기 여러 대 지원)
    const tokenSnap = await admin.firestore().doc(`fcmTokens/${recipient}`).get();
    if (!tokenSnap.exists) return null;
    const tokens = extractTokens(tokenSnap.data());
    if (tokens.length === 0) return null;

    const message = {
      notification: {
        title: "부리부리 미니홈피 🐷",
        body: data.content ?? "새로운 알림이 있어요!",
      },
      webpush: {
        notification: {
          icon: `${BASE}/icon.svg`,
          badge: `${BASE}/icon.svg`,
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: ROUTE[data.type] ?? BASE },
      },
    };

    await Promise.all(tokens.map(token => sendSafe(recipient, token, message)));
    return null;
  }
);

// ── 날씨 관련 ────────────────────────────────────────────────────
const LOCATIONS = [
  { name: "동탄", lat: 37.2015, lon: 127.0726 },
  { name: "서울", lat: 37.5665, lon: 126.9780 },
];

const WMO = {
  0: "맑음☀️", 1: "대체로맑음🌤️", 2: "구름조금⛅", 3: "흐림☁️",
  45: "안개🌫️", 48: "안개🌫️",
  51: "이슬비🌦️", 53: "이슬비🌦️", 55: "이슬비🌦️",
  61: "비🌧️", 63: "비🌧️", 65: "폭우🌧️",
  71: "눈🌨️", 73: "눈🌨️", 75: "폭설❄️",
  80: "소나기🌦️", 81: "소나기🌦️", 82: "강한소나기🌧️",
  95: "뇌우⛈️", 96: "뇌우⛈️", 99: "뇌우⛈️",
};

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&hourly=weather_code,temperature_2m`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max`
    + `&timezone=Asia%2FSeoul&forecast_days=1`;
  const res = await fetch(url);
  const data = await res.json();

  const times = data.hourly.time;
  const codes = data.hourly.weather_code;
  const temps = data.hourly.temperature_2m;
  const at = (h) => {
    const i = times.findIndex(t => t.endsWith(`T${String(h).padStart(2, "0")}:00`));
    return i >= 0 ? `${WMO[codes[i]] ?? "?"} ${Math.round(temps[i])}°` : null;
  };

  const maxTemp  = Math.round(data.daily.temperature_2m_max[0]);
  const minTemp  = Math.round(data.daily.temperature_2m_min[0]);
  const rainProb = data.daily.precipitation_probability_max[0];

  return { morning: at(9), afternoon: at(14), evening: at(19), maxTemp, minTemp, rainProb };
}

// ── 매일 09:00 KST 날씨 알림 ────────────────────────────────────
exports.sendDailyWeather = onSchedule(
  { schedule: "0 6 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const targets = flattenTokenMap(await getActiveTokenMap());
    if (targets.length === 0) return null;

    await Promise.all(
      LOCATIONS.map(async (loc) => {
        try {
          const w = await fetchWeather(loc.lat, loc.lon);
          const body = [
            w.morning   && `🌅 아침  ${w.morning}`,
            w.afternoon && `☀️ 점심  ${w.afternoon}`,
            w.evening   && `🌙 저녁  ${w.evening}`,
            `📊 최고 ${w.maxTemp}° / 최저 ${w.minTemp}° · 강수 ${w.rainProb}%💧`,
          ].filter(Boolean).join("\n");
          await sendToTokens(targets, `📍 ${loc.name} 오늘 날씨`, body);
        } catch (e) {
          console.error(`날씨 fetch 오류 ${loc.name}:`, e);
        }
      })
    );
    return null;
  }
);

// ── 기념일 카운트다운 + 이번주 일정 브리핑 ───────────────────────
const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MILESTONES = [90, 60, 30, 7, 3, 2, 1];

function daysUntil(dateStr) {
  const e = new Date(dateStr);
  const event = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((event - today) / 86400000);
}

exports.sendDailyReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const targets = flattenTokenMap(await getActiveTokenMap());
    if (targets.length === 0) return null;

    // ① 기념일 카운트다운 — ②와 독립적으로 실행(한쪽이 실패해도 나머지는 발송)
    try {
      const importantSnap = await admin.firestore()
        .collection("schedules")
        .where("isImportant", "==", true)
        .get();

      const seen = new Set();
      for (const doc of importantSnap.docs) {
        const { title, date } = doc.data();
        const key = `${title}|${date}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const days = daysUntil(date);
        if (MILESTONES.includes(days)) {
          const d = new Date(date);
          const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 (${KO_DAYS[d.getDay()]})`;
          await sendToTokens(targets, `🎉 기념일 D-${days}`, `${title}\n${dateLabel}`);
        }
      }
    } catch (e) {
      console.error("기념일 알림 실패:", e);
    }

    // ② 이번주 일정 브리핑 (월요일만)
    try {
      const now = new Date();
      if (now.getDay() === 1) {
        const weekDates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() + i);
          return d.toDateString();
        });

        const schedSnap = await admin.firestore()
          .collection("schedules")
          .where("date", "in", weekDates)
          .get();

        let body;
        if (schedSnap.empty) {
          body = "이번주 등록된 일정이 없어요 🕊️\n같이 뭔가 계획해봐요!";
        } else {
          const seenSched = new Set();
          const lines = schedSnap.docs
            .map(d => d.data())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .filter(s => {
              const k = `${s.date}|${s.title}`;
              if (seenSched.has(k)) return false;
              seenSched.add(k);
              return true;
            })
            .map(s => {
              const d = new Date(s.date);
              return `${d.getMonth()+1}/${d.getDate()}(${KO_DAYS[d.getDay()]}) ${s.title}`;
            });
          body = lines.join("\n");
        }

        await sendToTokens(targets, "📅 이번주 일정 브리핑", body);
      }
    } catch (e) {
      console.error("주간 브리핑 실패:", e);
    }

    return null;
  }
);

// ── 날씨 알림 즉시 테스트: ?secret=buri2026 로 호출 ─────────────
exports.sendTestWeather = onRequest(
  { cors: true },
  async (req, res) => {
    const secret = req.query.secret || req.body?.secret;
    if (secret !== TEST_SECRET) { res.status(401).json({ error: "인증 실패" }); return; }

    const targets = flattenTokenMap(await getActiveTokenMap());
    if (targets.length === 0) {
      res.status(200).json({ ok: false, error: "등록된 FCM 토큰 없음" });
      return;
    }

    const results = [];
    for (const loc of LOCATIONS) {
      try {
        const w = await fetchWeather(loc.lat, loc.lon);
        const line1 = [
          w.morning   && `아침 ${w.morning}`,
          w.afternoon && `점심 ${w.afternoon}`,
          w.evening   && `저녁 ${w.evening}`,
        ].filter(Boolean).join("  /  ");
        const line2 = `최고 ${w.maxTemp}° / 최저 ${w.minTemp}° · 강수 ${w.rainProb}%💧`;
        await sendToTokens(targets, `📍 ${loc.name} 오늘 날씨 [테스트]`, `${line1}\n${line2}`);
        results.push({ loc: loc.name, ok: true, line1, line2 });
      } catch (e) {
        results.push({ loc: loc.name, ok: false, error: e.message });
      }
    }
    res.json({ ok: true, results });
  }
);

// ── 테스트 푸시: ?user=지수&secret=buri2026 로 호출 ─────────────
exports.sendTestPush = onRequest(
  { cors: true },
  async (req, res) => {
    const secret = req.query.secret || req.body?.secret;
    if (secret !== TEST_SECRET) { res.status(401).json({ error: "인증 실패" }); return; }

    const user = req.query.user || req.body?.user;
    if (!user) { res.status(400).json({ error: "user 파라미터 필요" }); return; }

    const tokenSnap = await admin.firestore().doc(`fcmTokens/${user}`).get();
    if (!tokenSnap.exists) { res.status(404).json({ error: "토큰 없음" }); return; }
    const tokenData = tokenSnap.data();
    const token = tokenData.token || extractTokens(tokenData)[0];
    if (!token) { res.status(404).json({ error: "토큰 없음" }); return; }

    try {
      const result = await admin.messaging().send({
        token,
        notification: {
          title: "🐷 테스트 알림",
          body: `${user}에게 테스트 푸시 전송 성공!`,
        },
        webpush: {
          notification: {
            icon: `${BASE}/icon.svg`,
            badge: `${BASE}/icon.svg`,
            vibrate: [200, 100, 200],
          },
          fcmOptions: { link: BASE },
        },
      });
      res.json({ ok: true, messageId: result });
    } catch (e) {
      console.error("sendTestPush error:", e);
      res.status(500).json({ error: e.message, code: e.code });
    }
  }
);
