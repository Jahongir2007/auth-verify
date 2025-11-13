# auth-verify

**AuthVerify** is a modular authentication library for Node.js, providing JWT, OTP, TOTP, Passkeys (WebAuthn), Magic Links, Sessions, and OAuth helpers. You can easily register custom senders for OTPs or notifications.
 - [Installation](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-installation)
 - [Initialization](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-example-initialize-library-commonjs)
 - [JWT](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-jwt-usage)
 - [OTP](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-otp-email--sms--telegram--custom-sender)
 - [TOTP](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-totp-time-based-one-time-passwords--google-authenticator-support-v140)
 - [Passkeys](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#%EF%B8%8F-passkey-webauthn-v161)
 - [Auth-Verify client](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#auth-verify-client)
 - [OAuth](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-oauth-20-integration-v120)
 - [Magic Links](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-magiclink-passwordless-login-new-in-v180)
 - [Custom Senders](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#developer-extensibility-custom-senders)
 - [Session Management](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#sessionmanager)
---

## 🧩 Installation

```bash
# from npm (when published)
npm install auth-verify

# or locally during development
# copy the package into your project and `require` it`
```

---

## ⚙️ Quick overview

- `AuthVerify` (entry): constructs and exposes `.jwt`, `.otp`, (optionally) `.session`, `.totp` and `.oauth` managers.
- `JWTManager`: sign, verify, decode, revoke tokens. Supports `storeTokens: "memory" | "redis" | "none"` and middleware with custom cookie, header, and token extraction.
- `OTPManager`: generate, store, send, verify, resend OTPs. Supports `storeTokens: "memory" | "redis" | "none"`. Supports email, SMS helper, Telegram bot, and custom dev senders.
- `TOTPManager`: generate, verify uri, codes and QR codes.
- `SessionManager`: simple session creation/verification/destroy with memory or Redis backend.
- `OAuthManager`: Handle OAuth 2.0 logins for Google, Facebook, GitHub, X, Linkedin, Apple, Discord, Slack, Microsoft, Telegram and WhatsApp.
- `PasskeyManager`: Handle passwordless login and registration using WebAuthn/passkey.
- `MagicLinkManager`: Handle passwordless login with magic link generation and verification.
---

## 🚀 Example: Initialize library (CommonJS)

```js
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  jwtSecret: 'your_jwt_secret',
  cookieName: 'jwt_token',
  otpExpiry: 300,        // in seconds
  storeTokens: 'memory', // or 'redis'
  redisUrl: 'redis://localhost:6379',
  totp: { digits: 6, step: 30, alg: 'SHA1' },
  rpName: 'myApp',
  passExp: '2m',
  mlSecret: 'ml_secret',
  mlExpiry: '5m',
  appUrl: 'https://yourapp.com'
});
```
### Options explained:

| Option        | Default                                | Description                              |
| ------------- | -------------------------------------- | ---------------------------------------- |
| `jwtSecret`   | `"jwt_secret"`                         | Secret key for JWT signing               |
| `cookieName`  | `"jwt_token"`                          | Cookie name for JWT storage              |
| `otpExpiry`   | `300`                                  | OTP expiration in seconds                |
| `storeTokens` | `"memory"`                             | Token storage type (`memory` or `redis`) |
| `redisUrl`    | `undefined`                            | Redis connection string if using Redis   |
| `totp`        | `{ digits: 6, step: 30, alg: 'SHA1' }` | TOTP configuration                       |
| `rpName`      | `"auth-verify"`                        | Relying party name for Passkeys          |
| `passExp`     | `"2m"`                                 | Passkey expiration duration              |
| `mlSecret`    | `"ml_secret"`                          | Magic link secret                        |
| `mlExpiry`    | `"5m"`                                 | Magic link expiration duration           |
| `appUrl`      | `"https://yourapp.com"`                | App base URL for Magic Links             |


---

## 🔐 JWT Usage

## 🔐 AuthVerify JWT API Guide

`AuthVerify` includes a powerful `jwt` manager that simplifies JSON Web Token (JWT) authentication.
It supports **automatic cookie handling**, **memory or Redis token storage**, and an **Express middleware** for route protection.

### ⚙️ Setup
```js
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  jwtSecret: 'super_secret_key',
  cookieName: 'auth_token',
  storeTokens: 'redis',         // or 'memory'
  redisUrl: 'redis://localhost:6379',
  useAlg: 'HS256',              // or any supported algorithm
});
```
After initialization, the JWT system is accessible via `auth.jwt`.

### 🧩 JWT Methods Overview
| Method                                      | Description                                                  |
| ------------------------------------------- | ------------------------------------------------------------ |
| `auth.jwt.sign(payload, expiry?, options?)` | Creates a JWT token and optionally sets it in a cookie       |
| `auth.jwt.verify(tokenOrReq)`               | Verifies a token or extracts it automatically from a request |
| `auth.jwt.decode(token)`                    | Decodes JWT payload without verification                     |
| `auth.jwt.revoke(token, revokeTime?)`       | Revokes a token immediately or after a timeout               |
| `auth.jwt.isRevoked(token)`                 | Checks whether a token has been revoked                      |
| `auth.jwt.protect(options?)`                | Express middleware to protect API routes                     |
| `auth.jwt.readCookie(req, name)`            | Reads a JWT from cookies manually                            |
| `auth.jwt.issue(user)`                      | Issues an **access token** and a **refresh token**           |
| `auth.jwt.refresh(refreshToken)`            | Refreshes an **access token** using a valid refresh token    |

### 🪄 `auth.jwt.sign(payload, expiry?, options?)`
Signs a new JWT token.
Can automatically store it in memory/Redis and set an HTTP-only cookie for browser clients.
```js
const token = await auth.jwt.sign(
  { id: 'user_123', role: 'admin' },
  '2h', // expiry time
  { res } // Express res object to auto-set cookie
);
```
#### Parameters:
| Name             | Type               | Default | Description                                              |
| ---------------- | ------------------ | ------- | -------------------------------------------------------- |
| `payload`        | `object`           | —       | Data to include in the JWT                               |
| `expiry`         | `string \| number` | `'1h'`  | Expiration time (`5m`, `2h`, `1d`, etc.)                 |
| `options.res`    | `Response`         | —       | Express response object (sets cookie automatically)      |
| `options.secure` | `boolean`          | `true`  | If `false`, cookie is not secure (for localhost testing) |

#### Returns:
`Promise<string>` → The generated JWT token.

### ✅ `auth.jwt.verify(input)`

Verifies and decodes a token.
You can pass either a **raw JWT token string** or an **Express request object**.
When passing `req`, the library automatically extracts the token from:
 - `Authorization` header (`Bearer <token>`)
 - Cookies (`auth_token` by default)
```js
// 1️⃣ Verify a token string
const decoded = await auth.jwt.verify(token);

// 2️⃣ Verify directly from a request
const decoded = await auth.jwt.verify(req);
```
#### Returns:
`Promise<object>` → Decoded payload if valid, throws error if invalid or revoked.

### 🧠 `auth.jwt.decode(token)`
Decodes a token **without verifying** the signature (useful for inspection or debugging).
```js
const data = await auth.jwt.decode(token);
```
**Returns:** Decoded object or `null`.

### 🧩 `auth.jwt.issue(user)`
Issues a new access token and a refresh token for a user.
```js
const { accessToken, refreshToken } = auth.jwt.issue({ id: 'user_123' });
```
 - **Access token:** short-lived, used for authentication.
 - **Refresh token:** long-lived, used to get a new access token without logging in again.

**Parameters:**
| Name | Type   | Description                    |
| ---- | ------ | ------------------------------ |
| user | object | User object with `id` property |
**Returns:**
```js
{ accessToken: string, refreshToken: string }
```

### 🔄 `auth.jwt.refresh(refreshToken)`
Refreshes an **access token** using a valid **refresh token**.
```js
const newTokens = auth.jwt.refresh(refreshToken);
```
 - Validates the refresh token.
 - Issues a new access token and refresh token pair.
 - Throws an error if the token is invalid or expired.

**Parameters:**
| Name         | Type   | Description                  |
| ------------ | ------ | ---------------------------- |
| refreshToken | string | A valid refresh token string |
**Returns:**
```js
{ accessToken: string, refreshToken: string }
```
### ❌ `auth.jwt.revoke(token, revokeTime?)`
Revokes a token immediately or after a specified duration.
```js
await auth.jwt.revoke(token);      // revoke now
await auth.jwt.revoke(token, '5m'); // revoke after 5 minutes
```
If using:
 - `memory`: the token is removed from internal store.
 - `redis`: the key is deleted or set to expire.

### 🚫 `auth.jwt.isRevoked(token)`

Checks if a token is revoked (missing in memory or Redis).
```js
const revoked = await auth.jwt.isRevoked(token);
if (revoked) console.log('Token is no longer valid.');
```
**Returns:** `boolean`

### 🛡️ `auth.jwt.protect(options)`
Express middleware for protecting routes that require authentication.
```js
app.get('/dashboard', auth.jwt.protect(), (req, res) => {
  res.json({ user: req.user });
});
```
Or with extra security options:
```js
app.get('/admin',
  auth.jwt.protect({
    requiredRole: 'admin',
    attachProperty: 'sessionUser',
    onError: (err, req, res) => res.status(403).json({ error: err.message })
  }),
  (req, res) => {
    res.json({ message: `Welcome ${req.sessionUser.id}` });
  });
```
#### Options:
| Name             | Type       | Default                   | Description                                   |
| ---------------- | ---------- | ------------------------- | --------------------------------------------- |
| `attachProperty` | `string`   | `'user'`                  | Where decoded data is attached on the request |
| `requiredRole`   | `string`   | `null`                    | Restricts route access by user role           |
| `cookieName`     | `string`   | Inherited from AuthVerify | Cookie name to extract token                  |
| `headerName`     | `string`   | `'authorization'`         | Header name to look for JWT                   |
| `extractor`      | `function` | —                         | Custom token extraction logic                 |
| `onError`        | `function` | —                         | Custom error handler `(err, req, res)`        |

### 🍪 `auth.jwt.readCookie(req, name)`
Manually extract a JWT from a cookie:
```js
const token = auth.jwt.readCookie(req, 'auth_token');
```
**Returns:** `string | null`

### 🧩 Full Example
```js
const express = require('express');
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  jwtSecret: 'supersecret',
  storeTokens: 'memory',
});

const app = express();

app.use(express.json());

// Login: issue JWT
app.post('/login', async (req, res) => {
  const token = await auth.jwt.sign({ id: 'u1', role: 'admin' }, '2h', { res });
  res.json({ token });
});

// Protected route
app.get('/me', auth.jwt.protect(), (req, res) => {
  res.json({ message: `Welcome, ${req.user.id}` });
});

// Logout: revoke token
app.post('/logout', async (req, res) => {
  const token = auth.jwt.readCookie(req, 'auth_token');
  await auth.jwt.revoke(token);
  res.json({ success: true, message: 'Logged out' });
});

app.listen(3000, () => console.log('✅ Auth server running on port 3000'));
```

### 🧠 Notes
 - Works seamlessly with `cookie-parser` or built-in cookie reader.
 - Supports both **stateful (Redis/Memory)** and **stateless (None)** JWT modes.
 - Built-in cookie signing ensures secure browser sessions.
 - Middleware simplifies authentication guards in Express apps.

---

## 🔢 OTP (email / sms / telegram / whatsapp api / custom sender)

### 🔐 OTP Manager — `auth-verify`
The **OTPManager** handles one-time passwords (OTP) for multi-channel authentication:
 - ✅ Email
 - ✅ SMS
 - ✅ WhatsApp
 - ✅ Telegram
Supports **memory**, **Redis**, or **no storage**, cooldowns, and max-attempt tracking.
### 📦 Import
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify();

// Access OTP manager
const otp = auth.otp; // internally uses OTPManager
```
### ⚙️ Constructor Options
| Option        | Type          | Default                    | Description                                       |
| ------------- | ------------- | -------------------------- | ------------------------------------------------- |
| `otpExpiry`   | string/number | `300`                      | OTP expiration time, e.g., `"5m"` or `"30s"`      |
| `storeTokens` | string        | `"memory"`                 | Storage type: `"memory"`, `"redis"`, or `"none"`  |
| `otpHash`     | string        | `"sha256"`                 | Hashing algorithm for OTP (optional)              |
| `sender`      | object        | `null`                     | Email/SMS/WhatsApp/Telegram sender configuration  |
| `redisUrl`    | string        | `"redis://localhost:6379"` | Redis connection URL (if `storeTokens = 'redis'`) |

### ⚙️ Sender Configuration
#### Email sender
```js
otp.sender({
    via: "email", // or "sms", "telegram", "whatsapp"
    service: "gmail", // email service
    sender: "your_email@gmail.com",
    pass: "your_app_password",
    host: "smtp.gmail.com",
    port: 587,
    secure: false
});

// or you can use otp.setSender({...});
```
#### SMS sender
##### Using infobip:
```js
otp.sender({
  via: 'sms',
  provider: 'infobip',
  apiKey: 'API_KEY',
  apiSecret: 'API_SECRET',
  sender: 'SENDER_NAME',
  mock: true // in dev prints message instead of sending
});
```
##### Using twilio:
```js
otp.sender({
  via: 'sms',
  provider: 'twilio',
  apiKey: 'ACCOUNT_SID',
  apiSecret: 'AUTH_TOKEN',
  sender: 'SENDER_NAME',
  mock: true // in dev prints message instead of sending
});
```
##### Using vonage:
```js
otp.sender({
  via: 'sms',
  provider: 'vonage',
  apiKey: 'API_KEY',
  apiSecret: 'API_SECRET',
  sender: 'SENDER_NAME',
  mock: true // in dev prints message instead of sending
});
```

#### Telegram sender
```js
otp.sender({
  via: 'telegram',
  token: '123:ABC', // bot token
  // call auth.otp.setupTelegramBot(token) to start the bot
});
```
#### WhatsApp Business API
```js
otp.sender({
  via: 'whatsapp',
  phoneId: "YOUR_PHONE_ID",
  token: "YOUR_WHATSAPP_TOKEN"
});
```

### 🪄 Generate OTP
```js
otp.generate(6); // 6-digit OTP
```
 - Returns a **numeric string**
 - Supports callback style:
```js
otp.generate(6, (err, code) => {
    console.log(code);
});
```
 - Chainable:
```js
otp.generate(6).set("user@example.com");
```

### 💾 Store OTP
```js
await otp.set("user@example.com");
```
 - Supports **memory** and **Redis**
 - Stores metadata: attempts, expiry, cooldown
 - Can also use **callback style** for memory storage

### 📤 Send OTP
```js
await otp.send("user@example.com", {
    subject: "Your OTP Code",
    text: "Your OTP is 123456",
    html: "<b>123456</b>"
});
```
Supports channels:
| `via`    | Notes                                    |
| -------- | ---------------------------------------- |
| email    | Configured with Gmail/SMTP               |
| sms      | Uses `sendSMS` helper or custom provider |
| telegram | Sends OTP via bot, requires `botToken`   |
| whatsapp | Uses WhatsApp Business API               |

**Callback style:**
```js
otp.send("user@example.com", options, (err, info) => {
    if(err) console.error(err);
    else console.log(info);
});
```

### 🔑 Verify OTP
```js
// Promise style
const result = await otp.verify({ check: "user@example.com", code: "123456" });

// Callback style
otp.verify({ check: "user@example.com", code: "123456" }, (err, success) => {
    if(err) console.error(err.message);
    else console.log("✅ OTP verified");
});
```
 - Automatically deletes OTP after successful verification
 - Checks expiry and maximum attempts
 - Throws descriptive errors:
  - `OTP expired`
  - `Invalid OTP`
  - `Max attempts reached`

### ⏱ Cooldown
```js
otp.cooldown("30s"); // cooldown before OTP can be resent
```
 - Accepts `"30s"`, `"2m"`, `"1h"`, or milliseconds
 - Enforced in `resend()` method

### 🔄 Resend OTP
```js
const code = await otp.resend("user@example.com");
```
 - Automatically generates a new OTP if expired
 - Updates cooldown
 - Sends via configured channel (email/SMS/WhatsApp)
 - Callback support:
```js
otp.resend("user@example.com", (err, code) => {
    if(err) console.error(err.message);
    else console.log("Resent OTP:", code);
});
```

### 🤖 Telegram Integration
```js
await otp.setupTelegramBot("YOUR_BOT_TOKEN");
```
 - Sets up a Telegram bot to send OTP
 - Users share their phone number in chat
 - OTP automatically sent to the shared number

### 📌 Private Methods (Internal)
- `#sendEmail(reciever, options)` → Sends email OTP
- `#sendSMS(reciever, options)` → Sends SMS OTP
- `#sendWhatsApp(reciever, options)` → Sends WhatsApp OTP
> Usually not called directly — use `otp.send()` instead.

### 🧩 Example Usage
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify({ otpExpiry: "5m", storeTokens: "memory" });

// Set sender
auth.otp.setSender({
    via: "email",
    service: "gmail",
    sender: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
});

// Generate and send OTP
await auth.otp.send("user@example.com", { subject: "Verify your account" });

// Verify OTP
try {
    await auth.otp.verify({ check: "user@example.com", code: "123456" });
    console.log("✅ OTP verified!");
} catch (err) {
    console.error(err.message);
}

// Resend OTP if needed
const newCode = await auth.otp.resend("user@example.com");
console.log("Resent OTP:", newCode);
```

### ⚡ Notes
 - OTPManager is fully **integrated** into auth-verify wrapper
 - Supports **multi-channel OTP** with memory or Redis storage
 - Handles **cooldowns**, **max attempts**, and **automatic expiry**
 - Can be **extended** with custom sender functions

---

## 📝 AuthVerify TOTP API Guide
### ✅ TOTP (Time-based One Time Passwords) — Google Authenticator support
### 1️⃣ Generate TOTP Secret
##### Theory:
 - Generate a Base32 secret for a user.
 - Secret is required to generate TOTP codes in an authenticator app (Google Authenticator, Authy, etc.).
##### Code:
```js
// GET /api/totp/secret
app.get("/api/totp/secret", (req, res) => {
  const secret = auth.totp.secret(); // Base32 secret
  res.json({ success: true, secret });
});
```
##### Usage:
```js
const response = await fetch("http://localhost:3000/api/totp/secret");
const data = await response.json();
console.log(data.secret); // "JBSWY3DPEHPK3PXP"
```
##### Usage (with Auth-verify client):
```js
const auth = new AuthVerify({ apiBase: "http://localhost:3000" });
const res = auth.get("/api/secret/totp/secret").data();
console.log(res.secret); // "JBSWY3DPEHPK3PXP"
```

### 2️⃣ Generate TOTP URI
#### Theory:
 - Convert secret into an **otpauth:// URI** for authenticator apps.
 - URI includes: `secret`, `label` (user email), `issuer` (app name), algorithm, digits, and period.
##### Code:
```js
// POST /api/totp/uri
app.post("/api/totp/uri", (req, res) => {
  const { secret, label, issuer } = req.body;
  const uri = auth.totp.uri({ secret, label, issuer });
  res.json({ success: true, uri });
});
```
#### Usage:
```js
const { uri } = await fetch("http://localhost:3000/api/totp/uri", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: "JBSWY3DPEHPK3PXP",
    label: "user@example.com",
    issuer: "MyApp"
  })
}).then(r => r.json());

console.log(uri);
// otpauth://totp/MyApp:user@example.com?secret=...
```
##### Usage (with Auth-verify client):
```js
const auth = new AuthVerify({ apiBase: "http://localhost:3000" });
const uri = auth.post("/api/totp/uri").data({secret: "JBSWY3DPEHPK3PXP", label: "user@example.com", issuer: "MyApp"});
console.log(uri); // otpauth://totp/MyApp:user@example.com?secret=...
```

### 3️⃣ Generate QR Code
#### Theory:
 - Convert TOTP URI into a QR code.
 - Users can scan QR code with their authenticator app.
#### Code:
```js
// POST /api/totp/qrcode
app.post("/api/totp/qrcode", async (req, res) => {
  const { uri } = req.body;
  const qr = await auth.totp.qr(uri); // returns base64 data URL
  res.json({ success: true, qr });
});
```
#### Usage:
```
const { qr } = await fetch("http://localhost:3000/api/totp/qrcode", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ uri })
}).then(r => r.json());

document.getElementById("totp-qrcode").src = qr;
```
#### Usage (with Auth-verify client):
```js
const auth = new AuthVerify({
  apiBase: "http://localhost:3000",
  qrEl: document.getElementById("totp-qrcode")
});

auth.get("/api/totp/qrcode").qr();
```
### 4️⃣ Verify TOTP Code
#### Theory:
 - Compare user-provided code with expected code.
 - Optional `window` allows ±1 or more steps to account for clock skew.
#### Code:
```js
// POST /api/totp/verify
app.post("/api/totp/verify", (req, res) => {
  const { secret, code, window } = req.body;
  const valid = auth.totp.verify(secret, code, window);
  res.json({ success: true, valid });
});
```
#### Usage:
```js
const userCode = prompt("Enter your TOTP code:");
const { valid } = await fetch("http://localhost:3000/api/totp/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: "JBSWY3DPEHPK3PXP",
    code: userCode
  })
}).then(r => r.json());

if(valid) alert("✅ Verified!");
else alert("❌ Invalid TOTP code");
```
#### Usage (with Auth-verify client):
```js
const auth = new AuthVerify({ apiBase: "http://localhost:3000" });

const valid = auth.post("/api/totp/verify").verify(userCode);
if(valid) alert("✅ Verified!");
else alert("❌ Invalid TOTP code");
```
### 5️⃣ API Reference Table

| Endpoint           | Method | Description                   | Payload                     | Response                                             |
| ------------------ | ------ | ----------------------------- | --------------------------- | ---------------------------------------------------- |
| `/api/totp/secret` | GET    | Generate a Base32 secret      | None                        | `{ success: true, secret: "..." }`                   |
| `/api/totp/uri`    | POST   | Convert secret to otpauth URI | `{ secret, label, issuer }` | `{ success: true, uri: "..." }`                      |
| `/api/totp/qrcode` | POST   | Generate QR code from URI     | `{ uri }`                   | `{ success: true, qr: "data:image/png;base64,..." }` |
| `/api/totp/verify` | POST   | Verify user TOTP code         | `{ secret, code, window? }` | `{ success: true, valid: true/false }`               |

---

## 🗝️ Passkey (WebAuthn)

## 🔑 Passkey Authentication — AuthVerify Frontend + Backend Guide
This guide explains how to integrate Passkey (WebAuthn) authentication using the AuthVerify ecosystem — including both:
 - 🧠 **Backend:** `PasskeyManager` (Node.js)
 - 💻 **Frontend:** `window.AuthVerify` wrapper (Browser)

### ⚙️ 1. Backend Setup (Node.js)
Import and configure `AuthVerify`:
```js
const express = require("express");
const AuthVerify = require("auth-verify");
const app = express();

app.use(express.json());

const auth = new AuthVerify({
  rpName: "AuthVerifyApp",   // Display name in browser prompt
  storeTokens: "memory",     // or "redis"
  passExp: "2m",             // Challenge expiration
});
```

### 🧩 2. Passkey Registration API
#### ✅ `POST /api/register/start`
Generate registration challenge for a new user.
```js
app.post("/api/register/start", async (req, res) => {
  const user = req.body.user; // e.g. { id: "u123", username: "john_doe" }
  await auth.passkey.register(user);
  res.json(auth.passkey.getOptions());
});
```
#### ✅ `POST /api/register/finish`
Verify attestation and save credential.
```js
app.post("/api/register/finish", async (req, res) => {
  const result = await auth.passkey.finish(req.body);
  res.json(result);
});
```
Example successful response:
```json
{
  "status": "ok",
  "user": {
    "id": "u123",
    "username": "john_doe",
    "credentials": [
      {
        "id": "AaBbCcDdEe...",
        "publicKey": "-----BEGIN PUBLIC KEY-----...",
        "signCount": 0
      }
    ]
  },
  "credentialId": "AaBbCcDdEe..."
}
```
### 🔐 3. Passkey Login API
#### ✅ `POST /api/login/start`
Generate login challenge for existing user.
```js
app.post("/api/login/start", async (req, res) => {
  const user = req.body.user; // same user object used at registration
  await auth.passkey.login(user);
  res.json(auth.passkey.getOptions());
});
```
#### ✅ `POST /api/login/finish`
Verify user assertion (digital signature).
```js
app.post("/api/login/finish", async (req, res) => {
  const result = await auth.passkey.finish(req.body);
  res.json(result);
});
```
Successful login:
```json
{
  "status": "ok",
  "user": { "id": "u123", "username": "john_doe" }
}
```
### 💻 4. Frontend Integration (Browser)
Include your frontend wrapper (already built as `window.AuthVerify`):
```html
<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
<script>
  const auth = new AuthVerify({ apiBase: "http://localhost:3000" });
</script>
```
### ⚡ 5. Frontend Methods
#### 🧱 `.post(url) / .get(url)`
Set endpoint for POST/GET requests before calling `.data()`.
#### ⚙️ `.data(payload)`
Send JSON to backend and return response.

### 🧩 6. Passkey Registration (Frontend)
#### 🚀 Full Flow Example
```js
const auth = new AuthVerify({ apiBase: "http://localhost:3000" });

auth
  .start("/api/register/start")
  .finish("/api/register/finish")
  .registerPasskey({ id: "u123", username: "john_doe" })
  .then(result => console.log("✅ Registered:", result))
  .catch(err => console.error("❌ Error:", err));
```

### 🧠 Step Breakdown
##### 1️⃣ **Frontend → Backend:** `/api/register/start`
Sends `{ user }` and gets WebAuthn challenge/options.
##### 2️⃣ **Browser:**
Calls `navigator.credentials.create({ publicKey })`
Prompts user for biometric or security key registration.

##### 3️⃣ **Frontend → Backend:** `/api/register/finish`
Sends credential data (`clientDataJSON`, `attestationObject`, etc.)

##### 4️⃣ **Backend:**
Validates and stores public key in user credentials.

### 🔐 7. Passkey Login (Frontend)
#### 🚀 Full Flow Example
```js
auth
  .start("/api/login/start")
  .finish("/api/login/finish")
  .loginPasskey({ id: "u123", username: "john_doe" })
  .then(result => console.log("✅ Logged in:", result))
  .catch(err => console.error("❌ Error:", err));
```
#### 🧠 Step Breakdown
##### 1️⃣ **Frontend → Backend:** `/api/login/start`
Sends `{ user, login: true }` to get challenge and `allowCredentials`.
##### 2️⃣ **Browser:**
Calls `navigator.credentials.get({ publicKey })`.
##### 3️⃣ **Frontend → Backend:** `/api/login/finish`
Sends credential signature data (`authenticatorData`, `signature`, etc.)
##### 4️⃣ **Backend:**
Verifies signature using stored public key.

### 🧠 8. Quick Reference
| Layer    | Method                           | Description                  |
| -------- | -------------------------------- | ---------------------------- |
| Backend  | `passkey.register(user)`         | Start registration           |
| Backend  | `passkey.getOptions()`           | Return challenge for browser |
| Backend  | `passkey.finish(clientResponse)` | Finish registration/login    |
| Frontend | `.registerPasskey(user)`         | Full registration flow       |
| Frontend | `.loginPasskey(user)`            | Full login flow              |
| Frontend | `.start(url)`                    | Set “start” API route        |
| Frontend | `.finish(url)`                   | Set “finish” API route       |

### ✅ 9. Notes & Best Practices
 - Use HTTPS in production (`navigator.credentials` requires secure origin)
 - Always send real `user.id` (string, not numeric)
 - Store public keys securely in DB after registration
 - Set realistic expiration time for passkey challenges (`passExp`)
 - Combine with your `JWTManager` for session generation after successful login

---

## auth-verify client
### 1️⃣ Introduction

**AuthVerify Client** is a lightweight frontend JavaScript library for TOTP / JWT authentication.
It works with your backend APIs to:
 - Display QR codes for TOTP enrollment
 - Verify user OTP codes
 - Request JWT tokens from backend
 - Send authenticated requests easily
 - **Register a passkey** (create a new credential)
 - **Login with a passkey** (authenticate existing credential)
 - Handle **Base64URL decoding**, **ArrayBuffer conversion**, and **backend communication** automatically
 - Easily integrate with your Node.js backend using `auth-verify`
Works like jQuery: just include the script in HTML, no module or bundler needed.

## 2️⃣ Installation
```html
<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
```

### 3️⃣ Initialization
```js
const qrImage = document.getElementById('qrImage');

const auth = new AuthVerify({
  apiBase: 'http://localhost:3000',  // Your backend API base URL
  qrEl: qrImage                       // Image element to display QR
});
```

### 4️⃣ Generating QR Code
```js
auth.get('/api/qr').qr();
```
 - Fetches QR code from backend
 - Displays it in the `qrEl` image element

### 5️⃣ Sending Data / JWT Requests
```js
const payload = { name: 'John', age: 23 };

const token = await auth.post('/api/sign-jwt').data(payload);
console.log('JWT token:', token);
```
 - `post(url)` sets endpoint
 - `data(payload)` sends JSON payload
 - If backend returns a token, it is stored in `auth.jwt`

### 6️⃣ Verifying OTP
```js
const result = await auth.post('/api/verify-totp').verify('123456');
console.log(result); // e.g. { verified: true }
```
 - Wraps the OTP code in `{ code: '...' }`
 - Sends to backend for verification

### 7️⃣ Sending Authenticated Requests
```js
const profile = await fetch('http://localhost:3000/api/profile', {
  headers: auth.header()
}).then(res => res.json());

console.log(profile);
```
 - `auth.header()` returns `{ Authorization: "Bearer <jwt>" }`
 - Easy to attach JWT to any request

### Passkey part (new in v1.8.0)
#### API Methods
##### `start(route)`
Sets the backend endpoint to start a **registration or login flow**.
```js
auth.start('/api/register/start');  // registration start
auth.start('/api/login/start');     // login start
```

#### `finish(route)`
Sets the backend endpoint to **finish the flow** (verify credential/assertion).
```js
auth.finish('/api/register/finish'); // registration finish
auth.finish('/api/login/finish');    // login finish
```

#### `registerPasskey(user)`
Registers a new passkey for the user.
##### Parameters:
| Param | Type   | Description                                                            |
| ----- | ------ | ---------------------------------------------------------------------- |
| user  | Object | `{ id: "user1", username: "john_doe" }` — user info to send to backend |

##### Returns:
`Promise<Object>` — result from backend (`{ success: true/false, message: "..." }`)
##### Example:
```js
auth.start('/api/register/start').finish('/api/register/finish');

const result = await auth.registerPasskey({ id: 'user1', username: 'john_doe' });

if(result.success) alert("Passkey registered!");
else alert("Error: " + result.message);
```

##### What it does internally:
1. Calls `/start` endpoint → gets assertion options.
2. Decodes `challenge` and `allowCredentials[].id` from Base64URL → Uint8Array.
3. Calls `navigator.credentials.get({ publicKey })`.
4. Converts ArrayBuffers to Base64.
5. Sends assertion to `/finish` endpoint for verification.
#### `base64urlToUint8Array(base64url)`
Helper to convert Base64URL string to `Uint8Array`.
Used internally in registration & login flow. Devs can use it for custom WebAuthn handling if needed.
### 8️⃣ Method Summary
| Method                  | Description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `get(url)`              | Set GET endpoint                                                                               |
| `post(url)`             | Set POST endpoint                                                                              |
| `qr()`                  | Fetch QR from backend and display                                                              |
| `data(payload)`         | Send payload to backend; stores JWT if returned                                                |
| `verify(code)`          | Send OTP code to backend                                                                       |
| `header()`              | Return JWT auth header object                                                                  |
| `start(route)`          | Set backend endpoint to **start registration or login**                                        |
| `finish(route)`         | Set backend endpoint to **finish registration or login**                                       |
| `registerPasskey(user)` | Full registration flow: fetch challenge, decode, create credential in browser, send to backend |
| `loginPasskey(user)`    | Full login flow: fetch assertion, decode, get credential from browser, send to backend         |

### 9️⃣ Example HTML
```html
<img id="qrImage" />
<div id="response"></div>
<button id="getQRBtn">Get QR</button>
<button id="sendBtn">Send Data</button>

<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
<script>
const qrImage = document.getElementById('qrImage');
const responseDiv = document.getElementById('response');

const auth = new AuthVerify({ apiBase: 'http://localhost:3000', qrEl: qrImage });

document.getElementById('getQRBtn').addEventListener('click', () => auth.get('/api/qr').qr());

document.getElementById('sendBtn').addEventListener('click', async () => {
  const payload = { name: 'Jahongir' };
  const result = await auth.post('/api/sign-jwt').data(payload);
  responseDiv.textContent = JSON.stringify(result, null, 2);
});
</script>
```

### Passkey example
```html
<!DOCTYPE html>
<html>
<head>
  <title>AuthVerify Demo</title>
</head>
<body>
  <h1>AuthVerify Passkey Demo</h1>
  <button id="register">Register Passkey</button>
  <button id="login">Login with Passkey</button>

  <script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
  <script>
    const auth = new AuthVerify({ apiBase: "http://localhost:3000" });

    // Registration setup
    auth.start('/api/register/start').finish('/api/register/finish');
    document.getElementById('register').addEventListener('click', async () => {
      const result = await auth.registerPasskey({ id: 'user1', username: 'john_doe' });
      alert(result.message);
    });

    // Login setup
    auth.start('/api/login/start').finish('/api/login/finish');
    document.getElementById('login').addEventListener('click', async () => {
      const result = await auth.loginPasskey({ id: 'user1', username: 'john_doe' });
      alert(result.message);
    });
  </script>
</body>
</html>
```
✅ Fully functional frontend passkey demo
✅ One line registration / login for devs
✅ Automatic Base64URL decoding and ArrayBuffer handling

### 10️⃣ Tips for Developers
 - Always call `auth.get('/api/qr').qr()` **after page loads**
 - Use `auth.header()` for any authenticated request
 - Backend must provide endpoints for `/api/qr`, `/api/verify-totp`, `/api/sign-jwt`
 - Make sure backend endpoints return **raw WebAuthn options** (`challenge`, `user`, `allowCredentials`) in **Base64URL format**.
 - `user.id` and `challenge` must be **Base64URL encoded** on backend.
 - JWT storage is automatic if backend returns **token**.

---

## 🌍 OAuth 2.0 Integration (v1.2.0+)
`auth.oauth` supports login via Google, Facebook, GitHub, X (Twitter), Linkedin, Microsoft, Telegram, Slack, WhatsApp, Apple and Discord.
### Providers & Routes table
| Provider    | Redirect URL      | Callback URL               | Scopes / Notes                         |
| ----------- | ----------------- | -------------------------- | -------------------------------------- |
| Google      | `/auth/google`    | `/auth/google/callback`    | `openid email profile`                 |
| Facebook    | `/auth/facebook`  | `/auth/facebook/callback`  | `email,public_profile`                 |
| GitHub      | `/auth/github`    | `/auth/github/callback`    | `user:email`                           |
| X (Twitter) | `/auth/x`         | `/auth/x/callback`         | `tweet.read users.read offline.access` |
| LinkedIn    | `/auth/linkedin`  | `/auth/linkedin/callback`  | `r_liteprofile r_emailaddress`         |
| Microsoft   | `/auth/microsoft` | `/auth/microsoft/callback` | `User.Read`                            |
| Telegram    | `/auth/telegram`  | `/auth/telegram/callback`  | Bot deep-link                          |
| Slack       | `/auth/slack`     | `/auth/slack/callback`     | `identity.basic identity.email`        |
| WhatsApp    | `/auth/whatsapp`  | `/auth/whatsapp/callback`  | QR / deep-link                         |
| Apple       | `/auth/apple`     | `/auth/apple/callback`     | `name email`                           |
| Discord     | `/auth/discord`   | `/auth/discord/callback`   | `identify email`                       |

### Example (Google Login with Express)
```js
const express = require('express');
const AuthVerify = require("auth-verify");
const app = express();
app.use(express.json());
const auth = new AuthVerify({ jwtSecret: 's', storeTokens: 'memory'});

const google = auth.oauth.google({clientId: 'YOUR_CLIENT_ID', clientSecret: 'YOUR_CLIENT_SECRET', redirectUri: 'http://localhost:3000/auth/google/callback'});
app.get('/', async (req, res) => {
      res.send(`
    <h1>Login with Google</h1>
    <a href="/auth/google">Login</a>
  `);
});


app.get('/auth/google', (req, res) => google.redirect(res));

app.get('/auth/google/callback', async (req, res)=>{
    const code = req.query.code;
    try {
        const user = await google.callback(code);
        res.send(`
            <h2>Welcome, ${user.name}!</h2>
            <img src="${user.picture}" width="100" style="border-radius:50%">
            <p>Email: ${user.email}</p>
            <p>Access Token: ${user.access_token.slice(0, 20)}...</p>
        `);
    } catch(err){
        res.status(500).send("Error: " + err.message);
    }
});

app.listen(3000, ()=>{
    console.log('Server is running...');
});
```
---
### API documentation for OAuth
 - `auth.oauth.google({...})` for making connection to your Google cloud app.
 - `google.redirect(res)` for sending user/client to the Google OAuth page for verifying and selecting his accaount
 - `google.callback(code)` for exchanging server code to the user/client token.

### Other examples with other platforms
```js
const express = require('express');
const AuthVerify = require("auth-verify");
const app = express();
app.use(express.json());
const auth = new AuthVerify({ jwtSecret: 's', storeTokens: 'memory'});

// --- Example: FACEBOOK LOGIN ---
const facebook = auth.oauth.facebook({
  clientId: "YOUR_FB_APP_ID",
  clientSecret: "YOUR_FB_APP_SECRET",
  redirectUri: "http://localhost:3000/auth/facebook/callback",
});

// --- Example: GITHUB LOGIN ---
const github = auth.oauth.github({
  clientId: "YOUR_GITHUB_CLIENT_ID",
  clientSecret: "YOUR_GITHUB_CLIENT_SECRET",
  redirectUri: "http://localhost:3000/auth/github/callback",
});

// --- Example: X (Twitter) LOGIN ---
const twitter = auth.oauth.x({
  clientId: "YOUR_TWITTER_CLIENT_ID",
  clientSecret: "YOUR_TWITTER_CLIENT_SECRET",
  redirectUri: "http://localhost:3000/auth/x/callback",
});

// --- Example: Linkedin LOGIN ---
const linkedin = auth.oauth.linkedin({
  clientId: "YOUR_LINKEDIN_CLIENT_ID",
  clientSecret: "YOUR_LINKEDIN_CLIENT_SECRET",
  redirectUri: "http://localhost:3000/auth/linkedin/callback"
});

// --- MICROSOFT ---
const microsoft = auth.oauth.microsoft({
  clientId: "YOUR_MICROSOFT_CLIENT_ID",
  clientSecret: "YOUR_MICROSOFT_CLIENT_SECRET",
  redirectUri: "http://localhost:3000/auth/microsoft/callback"
});

app.get("/auth/microsoft", (req, res) => microsoft.redirect(res));

app.get("/auth/microsoft/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const user = await microsoft.callback(code);
    res.json({ success: true, provider: "microsoft", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- TELEGRAM ---
const telegram = auth.oauth.telegram({
  botId: "YOUR_BOT_ID",
  redirectUri: "http://localhost:3000/auth/telegram/callback"
});

app.get("/auth/telegram", (req, res) => telegram.redirect(res));

app.get("/auth/telegram/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const result = await telegram.callback(code);
    res.json({ success: true, provider: "telegram", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- SLACK ---
const slack = auth.oauth.slack({
  clientId: "YOUR_SLACK_CLIENT_ID",
  clientSecret: "YOUR_SLACK_CLIENT_SECRET",
  redirectUri: "http://localhost:3000/auth/slack/callback"
});

app.get("/auth/slack", (req, res) => slack.redirect(res));

app.get("/auth/slack/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const user = await slack.callback(code);
    res.json({ success: true, provider: "slack", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- WHATSAPP ---
const whatsapp = auth.oauth.whatsapp({
  phoneNumberId: "YOUR_PHONE_ID",
  redirectUri: "http://localhost:3000/auth/whatsapp/callback"
});

app.get("/auth/whatsapp", (req, res) => whatsapp.redirect(res));

app.get("/auth/whatsapp/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const result = await whatsapp.callback(code);
    res.json({ success: true, provider: "whatsapp", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== FACEBOOK ROUTES =====
app.get("/auth/facebook", (req, res) => facebook.redirect(res));

app.get("/auth/facebook/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const user = await facebook.callback(code);
    res.json({ success: true, provider: "facebook", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ===== GITHUB ROUTES =====
app.get("/auth/github", (req, res) => github.redirect(res));

app.get("/auth/github/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const user = await github.callback(code);
    res.json({ success: true, provider: "github", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ===== X (TWITTER) ROUTES =====
app.get("/auth/x", (req, res) => twitter.redirect(res));

app.get("/auth/x/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const user = await twitter.callback(code);
    res.json({ success: true, provider: "x", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
  
// ==== LINKEDIN ROUTES ====
app.get("/auth/linkedin", (req, res) => linkedin.redirect(res));

app.get("/auth/linkedin/callback", async (req, res)=>{
  try{
    const { code } = req.query;
    const user = await linkedin.callback(code);
    res.json({ success: true, provider: "linkedin", user });
  }catch(err){
    res.status(400).json({ error: err.message });
  }
});


app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

```   

### ✅ Notes for Devs
  1. Each provider has **redirect** and **callback** URLs.
  2. Scopes can be customized per provider.
  3. **Telegram & WhatsApp** use deep-link / QR-style flows.
  4. The result of `callback()` is a JSON object containing the user info and `access_token` (except deep-link flows, which return code/messages).
  5. You can **register custom providers** via:
  ```js
  auth.oauth.register("myCustom", (options) => {
    return {
      redirect(res) { /* redirect user */ },
      callback: async (code) => { /* handle callback */ }
    };
  });
  ```
---

## 💌 Magiclink (Passwordless login) (New in v1.8.0)
The **Magic Link Manager** allows developers to implement **secure**, **passwordless login** using **email-based links**.
Built directly into the AuthVerify SDK, it supports **Gmail**, **custom SMTP**, and token storage via **Memory** or **Redis**.

### 🚀 Basic Setup
```js
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  mlSecret: 'super_secret_key',
  mlExpiry: '5m',
  appUrl: 'http://localhost:3000',
  storeTokens: 'memory'
});
```

### ⚙️ Configure Magic Link Sender
Before sending links, you must set up your email transport.
#### Gmail Example
```js
await auth.magic.sender({
  service: 'gmail',
  sender: 'yourapp@gmail.com',
  pass: 'your_gmail_app_password'
});
```

#### Custom SMTP Example
```js
await auth.magic.sender({
  host: 'smtp.mailgun.org',
  port: 587,
  secure: false,
  sender: 'noreply@yourdomain.com',
  pass: 'your_smtp_password'
});
```
> ✅ Both Gmail and any SMTP provider are supported.
> Use app passwords or tokens instead of your real password!

### 📩 Send Magic Link
Send a secure, expiring link to the user’s email:
```js
await auth.magic.send('user@example.com', {
  subject: 'Your Secure Login Link ✨',
  html: `<p>Click below to sign in:</p>
         <a href="{{link}}">Login Now</a>`
});
```
> The `{{link}}` placeholder will automatically be replaced with the generated magic link.

### 🪄 Generate Magic Link Manually
If you just want to create a link (not send it yet):
```js
const token = await auth.magic.generate('user@example.com');
console.log(token);
```
Then make your own URL:
```js
const link = `http://localhost:3000/auth/verify?token=${token}`;
```

### 🔐 Verify Magic Link
Typically used in your backend `/auth/verify` route:
```js
app.get('/auth/verify', async (req, res) => {
  const { token } = req.query;
  try {
    const user = await auth.magic.verify(token);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
```

### 🧠 How It Works
1. `auth.magic.generate()` → creates a short-lived JWT with the user’s email.
2. `auth.magic.send()` → sends a secure login link by email.
3. `auth.magic.verify()` → decodes & validates the token, optionally checks store.

### 💾 Storage Options
| Mode               | Description          | Best For                       |
| ------------------ | -------------------- | ------------------------------ |
| `memory` (default) | Uses in-memory Map() | Single server / small projects |
| `redis`            | Uses Redis with TTL  | Scalable, multi-server apps    |

Example using Redis:
```js
const auth = new AuthVerify({
  storeTokens: 'redis',
  redisUrl: 'redis://localhost:6379'
});
```

### 🧰 Callback Support
You can also use Node-style callbacks if you prefer:
```js
auth.magic.send('user@example.com', (err) => {
  if (err) console.error('❌ Failed to send link:', err);
  else console.log('✅ Magic link sent!');
});
```

### 🌍 Example Express Integration
```js
const express = require('express');
const bodyParser = require('body-parser');
const { AuthVerify } = require('auth-verify');

const app = express();
app.use(bodyParser.json());

const auth = new AuthVerify({
  mlSecret: 'supersecretkey',
  appUrl: 'http://localhost:3000',
  storeTokens: 'memory'
});

auth.magic.sender({
  service: 'gmail',
  sender: 'yourapp@gmail.com',
  pass: 'your_app_password'
});

// Send link
app.post('/auth/send', async (req, res) => {
  const { email } = req.body;
  await auth.magic.send(email);
  res.json({ message: 'Magic link sent!' });
});

// Verify link
app.get('/auth/verify', async (req, res) => {
  try {
    const user = await auth.magic.verify(req.query.token);
    res.json({ message: 'Login successful!', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));
```

### 🧾 Summary
| Feature                    | Supported |
| -------------------------- | --------- |
| Gmail & SMTP               | ✅         |
| Memory & Redis Token Store | ✅         |
| Token Expiry               | ✅         |
| Callback & Promise APIs    | ✅         |
| HTML Custom Email          | ✅         |

### ⚡ Future Vision

`auth.magic` is built for **modern SaaS**, **fintech**, and **crypto** apps that need **passwordless**, **secure**, and **user-friendly** authentication.

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
await auth.use('consoleOtp').send({ to: '+998901234567', code: await auth.otp.generate(5).code });
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
├─ index.js         // exports AuthVerify
├─ src/
│  ├─ jwt/
|  |  ├─ index.js
|  |  ├─ cookie/index.js
│  ├─ /otp/index.js
│  ├─ /magiclink/index.js
│  ├─ totp/
|  |  ├─ index.js
|  |  ├─ base32.js
│  ├─ /session/index.js
|  ├─ /oauth/index.js
│  └─ helpers/helper.js
├─ tests/
│  ├─ jwa.test.js
│  ├─ jwtmanager.multitab.test.js
│  ├─ jwtmanager.test.js
│  ├─ otpmanager.test.js
│  ├─ oauth.test.js
│  ├─ totpmanager.test.js
│  ├─ passkeymanager.test.js
│  ├─ magiclinkmanager.test.js
├─ babel.config.js
├─ authverify.client.js
```

---

## Contributing & License

Contributions welcome! Open issues / PRs for bugs, improvements, or API suggestions.

MIT © 2025 — Jahongir Sobirov
