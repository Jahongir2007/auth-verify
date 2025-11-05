const AuthVerify = require('../index');

describe("TOTP Manager", () => {
  let auth;
  let secret;

  beforeAll(() => {
    auth = new AuthVerify();
    secret = auth.totp.secret();
  });

  test("should generate base32 secret", () => {
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThan(10);
  });

  test("should generate 6 digit code", () => {
    const code = auth.totp.generate(secret);
    expect(code).toMatch(/^[0-9]{6}$/);
  });

  test("should verify valid totp", () => {
    const code = auth.totp.generate(secret);
    expect(auth.totp.verify(secret, code)).toBe(true);
  });

  test("should reject invalid totp", () => {
    const fake = "000000";
    expect(auth.totp.verify(secret, fake)).toBe(false);
  });

  test("should generate valid otpauth:// URL", () => {
    const uri = auth.totp.uri({
      label: "test@example.com",
      issuer: "AuthVerify",
      secret,
    });

    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri.includes("secret=")).toBe(true);
  });

test("should generate QR DataURL", async () => {
    const uri = auth.totp.uri({
        label: "qrtest@example.com",
        issuer: "AuthVerify",
        secret,
    });

    const url = await auth.totp.qrcode(uri);

    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
