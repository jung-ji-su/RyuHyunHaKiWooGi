const { onRequest }         = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin                 = require("firebase-admin");
const fetch                 = require("node-fetch");

admin.initializeApp();

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
          icon: "https://ryuhyunhakiwoogi.web.app/icon.svg",
          badge: "https://ryuhyunhakiwoogi.web.app/icon.svg",
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: "https://ryuhyunhakiwoogi.web.app/" },
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (e) {
      console.error("FCM send error:", e);
      // 토큰 만료 시 자동 삭제
      if (e.code === "messaging/registration-token-not-registered") {
        await admin.firestore().doc(`fcmTokens/${recipient}`).delete().catch(() => {});
      }
    }
    return null;
  }
);

// ── 테스트 푸시: ?user=지수 or ?user=현하 로 호출 ────────────────
exports.sendTestPush = onRequest(
  { cors: true },
  async (req, res) => {
    const user = req.query.user || req.body?.user;
    if (!user) { res.status(400).json({ error: "user 파라미터 필요" }); return; }

    const tokenSnap = await admin.firestore().doc(`fcmTokens/${user}`).get();
    if (!tokenSnap.exists) { res.status(404).json({ error: "토큰 없음" }); return; }
    const { token } = tokenSnap.data();
    if (!token) { res.status(404).json({ error: "토큰 없음" }); return; }

    const message = {
      token,
      notification: {
        title: "🐷 테스트 알림",
        body: `${user}에게 테스트 푸시 전송 성공!`,
      },
      webpush: {
        notification: {
          icon: "https://ryuhyunhakiwoogi.web.app/icon.svg",
          badge: "https://ryuhyunhakiwoogi.web.app/icon.svg",
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: "https://ryuhyunhakiwoogi.web.app/" },
      },
    };

    try {
      const result = await admin.messaging().send(message);
      res.json({ ok: true, messageId: result });
    } catch (e) {
      console.error("sendTestPush error:", e);
      res.status(500).json({ error: e.message, code: e.code });
    }
  }
);
