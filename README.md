# auth-verify

**auth-verify** is a Node.js authentication utility that provides:
- Secure OTP (one-time password) generation and verification
- Sending OTPs via Email, SMS (pluggable helpers), and Telegram bot
- JWT creation, verification and optional token revocation with memory/Redis storage
- Automatic cookie handling
- Session management (in-memory or Redis)
- Developer extensibility: custom senders and `auth.register.sender()` / `auth.use(name).send(...)`

> This README documents the code structure and APIs found in the library files you provided (OTPManager, JWTManager, SessionManager, AuthVerify).

---

## Installation

```bash
# from npm (when published)
npm install auth-verify

# or locally during development
# copy the package into your project and `require` it`
```

---

## Quick overview

- `AuthVerify` (entry): constructs and exposes `.jwt`, `.otp`, and (optionally) `.session` managers.
- `JWTManager`: sign, verify, decode, revoke tokens. Supports `storeTokens: "memory" | "redis" | "none"`.
- `OTPManager`: generate, store, send, verify, resend OTPs. Supports `storeTokens: "memory" | "redis" | "none"`. Supports email, SMS helper, Telegram bot, and custom dev senders.
- `SessionManager`: simple session creation/verification/destroy with memory or Redis backend.

---

## Example: Initialize library (CommonJS)

```js
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  jwtSecret: "super_secret_value",
  storeTokens: "memory", // or "redis" or "none"
  otpExpiry: "5m",       // supports number (seconds) OR string like '30s', '5m', '1h'
  otpHash: "sha256",     // optional OTP hashing algorithm
  // you may pass redisUrl inside managers' own options when using redis
});
```

---

## JWT usage

```js
// create JWT
const token = await auth.jwt.sign({ userId: 123 }, '1h'); // expiry string or number (ms)
console.log('token', token);

// verify
const decoded = await auth.jwt.verify(token);
console.log('decoded', decoded);

// decode without verification
const payload = await auth.jwt.decode(token);

// revoke a token (immediately)
await auth.jwt.revoke(token, 0);

// revoke token until a time in the future (e.g. '10m' or number ms)
await auth.jwt.revokeUntil(token, '10m');

// check if token is revoked (returns boolean)
const isRevoked = await auth.jwt.isRevoked(token);
```
## 🍪 Automatic Cookie Handling (New in v1.1.0)

You can now automatically store and verify JWTs via HTTP cookies — no need to manually send them!
```js
const AuthVerify = require("auth-verify");
const express = require("express");
const app = express();

const auth = new AuthVerify({
  jwtSecret: "supersecret", storeTokens: "memory"
});

app.post("/login", async (req, res) => {
  const token = await auth.jwt.sign({ userId: 1 }, "5s", { res });
  res.json({ token }); // token is also set as cookie automatically
});

app.get("/verify", async (req, res) => {
  try {
    const data = await auth.jwt.verify(req); // auto reads from cookie
    res.json({ valid: true, data });
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));
```

What it does automatically:

 - Saves token in a secure HTTP-only cookie
 - Reads and verifies token from cookies
 - Supports both async/await and callback styles

Notes:
- `sign` and `verify` support callback and promise styles in the implementation. When `storeTokens` is `"redis"` you should use the promise/async style (callback mode returns an error for redis in the current implementation).

---

## OTP (email / sms / telegram / custom sender)

### Configure sender

You can set the default sender (email/sms/telegram):

```js
// email example
auth.otp.setSender({
  via: 'email',
  sender: 'your@address.com',
  pass: 'app-password-or-smtp-pass',
  service: 'gmail' // or 'smtp'
  // if smtp service: host, port, secure (boolean)
});

// sms example (the internal helper expects provider/apiKey or mock flag)
auth.otp.setSender({
  via: 'sms',
  provider: 'infobip',
  apiKey: 'xxx',
  apiSecret: 'yyy',
  sender: 'SENDER_NAME',
  mock: true // in dev prints message instead of sending
});

// telegram example
auth.otp.setSender({
  via: 'telegram',
  token: '123:ABC', // bot token
  // call auth.otp.setupTelegramBot(token) to start the bot
});
```

### Generate → Save → Send (chainable)

OTP generation is chainable: `generate()` returns the OTP manager instance.

```js
// chainable + callback style example
auth.otp.generate(6).set('user@example.com', (err) => {
  if (err) throw err;
  auth.otp.message({
    to: 'user@example.com',
    subject: 'Your OTP',
    html: `Your code: <b>${auth.otp.code}</b>`
  }, (err, info) => {
    if (err) console.error('send error', err);
    else console.log('sent', info && info.messageId);
  });
});
```

Async/await style:

```js
await auth.otp.generate(6);              // generates and stores `auth.otp.code`
await auth.otp.set('user@example.com'); // saves OTP into memory/redis
await auth.otp.message({
  to: 'user@example.com',
  subject: 'Verify',
  html: `Your code: <b>${auth.otp.code}</b>`
});
```

### Verify

```js
// Promise style
try {
  const ok = await auth.otp.verify({ check: 'user@example.com', code: '123456' });
  console.log('verified', ok);
} catch (err) {
  console.error('verify failed', err.message);
}

// Callback style also supported: auth.otp.verify({check, code}, callback)
```

### Resend and cooldown / max attempts

- `auth.otp.cooldown('30s')` or `auth.otp.cooldown(30000)` — set cooldown duration.
- `auth.otp.maxAttempt(5)` — set maximum attempts allowed.
- `auth.otp.resend(identifier)` — regenerate and resend OTP, observing cooldown and expiry rules.

`resend` returns the new code (promise style) or calls callback.

---

## Telegram integration

There are two ways to use Telegram flow:

1. Use the built-in `senderConfig.via = 'telegram'` and call `auth.otp.setupTelegramBot(botToken)` — this starts a polling bot that asks users to share their phone via `/start`, and then matches the phone to in-memory/Redis OTP records and replies with the code.

2. Developer-supplied custom sender (see below) — you can create your own bot and call it from `auth.use(...).send(...)` or register via `auth.register.sender()`.

**Important**: Only one bot using long polling must be running per bot token — if you get `409 Conflict` it's because another process or instance is already polling that bot token.

---

## Developer extensibility (custom senders)

You can register custom senders and use them:

```js
// register a named sender function
auth.register.sender('consoleOtp', async ({ to, code }) => {
  console.log(`[DEV SEND] send to ${to}: ${code}`);
});

// use it later (chainable)
await auth.use('consoleOtp').send({ to: '+998901234567', code: await auth.otp.generate(5) });
```

---

When a custom sender is registered, `auth.otp.message()` will first attempt the `customSender` before falling back to built-in providers.

---

## SessionManager

```js
const SessionManager = require('./src/session'); // or auth.session after export
const sessions = new SessionManager({ storeTokens: 'redis' });

// create
const sessionId = await sessions.create('user123', { expiresIn: '2h' });

// verify
const userId = await sessions.verify(sessionId);

// destroy
await sessions.destroy(sessionId);
```

Notes:
- `expiresIn` accepts numeric seconds or strings like `'30s'`, `'5m'`, `'1h'`, `'1d'`.

---

## Helpers

`helpers/helper.js` exposes utility functions used by managers:

- `generateSecureOTP(length, hashAlgorithm)` — returns secure numeric OTP string
- `parseTime(strOrNumber)` — converts `'1h' | '30s' | number` into milliseconds
- `resendGeneratedOTP(params)` — helper to send email via nodemailer (used by resend)
- `sendSMS(params)` — helper for sending SMS using supported providers or mock

---

## Error handling and notes

- Many methods support both **callback** and **Promise (async/await)** styles. When using Redis store, prefer **async/await** (callback variants intentionally return an error when Redis is selected).
- OTP storage keys are the user identifier you pass (email or phone number). Keep identifiers consistent.
- Be careful when using Telegram polling: do not run two instances with polling true for the same bot token (use webhooks or a single process).
- When configuring SMTP (non-Gmail), provide `host`, `port` and `secure` in `setSender()`.

---

## Suggested folder structure

```
auth-verify/
├─ README.md
├─ package.json
├─ src/
│  ├─ index.js         // exports AuthVerify
│  ├─ jwt.js
│  ├─ otp.js
│  ├─ session.js
│  └─ helpers/helper.js
```

---

## Contributing & License

Contributions welcome! Open issues / PRs for bugs, improvements, or API suggestions.

MIT © 2025 — Jahongir Sobirov
