const express = require("express");
const request = require("supertest");
const AuthVerify = require("../index");

describe("JWT multi-tab verification", () => {
  const auth = new AuthVerify({ jwtSecret: "test_secret", storeTokens: "memory" });
  const app = express();

  app.get("/login", async (req, res) => {
    const token = await auth.jwt.sign({ userId: 1 }, "5s", { res });
    res.json({ token });
  });

  app.get("/protected", async (req, res) => {
    try {
      const data = await auth.jwt.verify(req);
      res.json({ valid: true, data });
    } catch (err) {
      res.status(401).json({ valid: false, error: err.message });
    }
  });

  test("should work in second tab (same cookie)", async () => {
    const loginRes = await request(app).get("/login");
    const cookie = loginRes.headers["set-cookie"][0];

    const protectedRes = await request(app)
      .get("/protected")
      .set("Cookie", cookie);

    expect(protectedRes.body.valid).toBe(true);
    expect(protectedRes.body.data.userId).toBe(1);
  });
});
