const { onRequest }         = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule }        = require("firebase-functions/v2/scheduler");
const admin                 = require("firebase-admin");
const fetch                 = require("node-fetch");

admin.initializeApp();

const BASE = "https://ryuhyunhakiwoogi.web.app";
const USERS = ["지수", "현하"];
const TEST_SECRET = "buri2026";

// ── 공용: 활성 FCM 토큰 맵 반환 ─────────────────────────────────
async function getActiveTokenMap() {
  const snaps = await Promise.all(
    USERS.map(u => admin.firestore().doc(`fcmTokens/${u}`).get())
  );
  const map = {};
  snaps.forEach((snap, i) => {
    if (snap.exists) {
      const { token } = snap.data();
      if (token) map[USERS[i]] = token;
    }
  });
  return map;
}

// ── 공용: 전체 토큰에 메시지 병렬 전송 ─────────────────────────
async function sendToTokens(tokens, title, body, link = BASE) {
  await Promise.all(
    tokens.map(token =>
      admin.messaging().send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            icon: `${BASE}/icon.svg`,
            badge: `${BASE}/icon.svg`,
          },
          fcmOptions: { link },
        },
      }).catch(e => console.error("FCM send error:", e))
    )
  );
}

// ── 카카오 API 프록시 ────────────────────────────────────────────
exports.kakaoProxy = onRequest(
  { cors: true },
  async (req, res) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  }
);

// ── 알림 타입 → 이동 경로 매핑 ──────────────────────────────────
const ROUTE = {
  diary:        `${BASE}/diary`,
  comment:      `${BASE}/diary`,
  schedule:     `${BASE}/schedule`,
  bucket:       `${BASE}/bucket`,
  bucket_add:   `${BASE}/bucket`,
  letter:       `${BASE}/letter`,
  letter_reply: `${BASE}/letter`,
  thermo:       `${BASE}/thermo`,
  hug:          `${BASE}/thermo`,
  temp_diff:    `${BASE}/thermo`,
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
    if (data.type === "jilta") {
      recipient = data.target;
    } else {
      if (!data.writer) return null;
      recipient = data.writer === "지수" ? "현하" : "지수";
    }
    if (!recipient) return null;

    // FCM 토큰 조회
    const tokenSnap = await admin.firestore().doc(`fcmTokens/${recipient}`).get();
    if (!tokenSnap.exists) return null;
    const { token } = tokenSnap.data();
    if (!token) return null;

    const message = {
      token,
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

    try {
      await admin.messaging().send(message);
    } catch (e) {
      console.error("FCM send error:", e);
      if (e.code === "messaging/registration-token-not-registered") {
        await admin.firestore().doc(`fcmTokens/${recipient}`).delete().catch(() => {});
      }
    }
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
    + `&hourly=weathercode,temperature_2m`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max`
    + `&timezone=Asia%2FSeoul&forecast_days=1`;
  const res = await fetch(url);
  const data = await res.json();

  const times = data.hourly.time;
  const codes = data.hourly.weathercode;
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
  { schedule: "0 9 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const tokenMap = await getActiveTokenMap();
    if (Object.keys(tokenMap).length === 0) return null;
    const tokens = Object.values(tokenMap);

    await Promise.all(
      LOCATIONS.map(async (loc) => {
        try {
          const w = await fetchWeather(loc.lat, loc.lon);
          const line1 = [
            w.morning   && `아침 ${w.morning}`,
            w.afternoon && `점심 ${w.afternoon}`,
            w.evening   && `저녁 ${w.evening}`,
          ].filter(Boolean).join("  /  ");
          const line2 = `최고 ${w.maxTemp}° / 최저 ${w.minTemp}° · 강수 ${w.rainProb}%💧`;
          await sendToTokens(tokens, `📍 ${loc.name} 오늘 날씨`, `${line1}\n${line2}`);
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
    const tokenMap = await getActiveTokenMap();
    if (Object.keys(tokenMap).length === 0) return null;
    const tokens = Object.values(tokenMap);

    // ① 기념일 카운트다운
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
        await sendToTokens(tokens, `🎉 기념일 D-${days}`, `${title}\n${dateLabel}`);
      }
    }

    // ② 이번주 일정 브리핑 (월요일만)
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

      await sendToTokens(tokens, "📅 이번주 일정 브리핑", body);
    }

    return null;
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
    const { token } = tokenSnap.data();
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
