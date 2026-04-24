const { onRequest } = require("firebase-functions/v2/https");
const fetch = require("node-fetch");

exports.kakaoProxy = onRequest(
  { cors: true},
  async (req, res) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
       // "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  }
);