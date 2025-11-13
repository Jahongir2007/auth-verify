# auth-verify

**AuthVerify** is a modular authentication library for Node.js, providing JWT, OTP, TOTP, Passkeys (WebAuthn), Magic Links, Sessions, and OAuth helpers. You can easily register custom senders for OTPs or notifications.
 - [Installation](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-installation)
 - [Initialization](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-example-initialize-library-commonjs)
 - [JWT](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-jwt-usage)
 - [OTP](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-otp-email--sms--telegram--whatsapp-api--custom-sender)
 - [TOTP](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-totp-time-based-one-time-passwords--google-authenticator-support)
 - [Passkeys](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-totp-time-based-one-time-passwords--google-authenticator-support)
 - [Auth-Verify client](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-authverify-client-guide)
 - [OAuth](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-oauth-manager--auth-verify)
 - [Magic Links](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-magiclink-passwordless-login-v180)
 - [Custom Senders](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#developer-extensibility-custom-senders)
 - [Session Management](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#sessionmanager)
 - [Crypto hashing](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md#-cryptomanager-api-guide)
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
#### 1️⃣ Generate TOTP Secret
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

#### 2️⃣ Generate TOTP URI
##### Theory:
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
##### Usage:
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

#### 3️⃣ Generate QR Code
##### Theory:
 - Convert TOTP URI into a QR code.
 - Users can scan QR code with their authenticator app.
##### Code:
```js
// POST /api/totp/qrcode
app.post("/api/totp/qrcode", async (req, res) => {
  const { uri } = req.body;
  const qr = await auth.totp.qr(uri); // returns base64 data URL
  res.json({ success: true, qr });
});
```
##### Usage:
```
const { qr } = await fetch("http://localhost:3000/api/totp/qrcode", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ uri })
}).then(r => r.json());

document.getElementById("totp-qrcode").src = qr;
```
##### Usage (with Auth-verify client):
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
##### Usage (with Auth-verify client):
```js
const auth = new AuthVerify({ apiBase: "http://localhost:3000" });

const valid = auth.post("/api/totp/verify").verify(userCode);
if(valid) alert("✅ Verified!");
else alert("❌ Invalid TOTP code");
```
#### 5️⃣ API Reference Table

| Endpoint           | Method | Description                   | Payload                     | Response                                             |
| ------------------ | ------ | ----------------------------- | --------------------------- | ---------------------------------------------------- |
| `/api/totp/secret` | GET    | Generate a Base32 secret      | None                        | `{ success: true, secret: "..." }`                   |
| `/api/totp/uri`    | POST   | Convert secret to otpauth URI | `{ secret, label, issuer }` | `{ success: true, uri: "..." }`                      |
| `/api/totp/qrcode` | POST   | Generate QR code from URI     | `{ uri }`                   | `{ success: true, qr: "data:image/png;base64,..." }` |
| `/api/totp/verify` | POST   | Verify user TOTP code         | `{ secret, code, window? }` | `{ success: true, valid: true/false }`               |

---

## 🗝️ Passkey (WebAuthn)

### 🔑 Passkey Authentication — AuthVerify Frontend + Backend Guide
This guide explains how to integrate Passkey (WebAuthn) authentication using the AuthVerify ecosystem — including both:
 - 🧠 **Backend:** `PasskeyManager` (Node.js)
 - 💻 **Frontend:** `window.AuthVerify` wrapper (Browser)

#### ⚙️ 1. Backend Setup (Node.js)
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

#### 🧩 2. Passkey Registration API
##### ✅ `POST /api/register/start`
Generate registration challenge for a new user.
```js
app.post("/api/register/start", async (req, res) => {
  const user = req.body.user; // e.g. { id: "u123", username: "john_doe" }
  await auth.passkey.register(user);
  res.json(auth.passkey.getOptions());
});
```
> `auth.issue()` can be used for saving passkey in any device
##### ✅ `POST /api/register/finish`
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
#### 🔐 3. Passkey Login API
##### ✅ `POST /api/login/start`
Generate login challenge for existing user.
```js
app.post("/api/login/start", async (req, res) => {
  const user = req.body.user; // same user object used at registration
  await auth.passkey.login(user);
  res.json(auth.passkey.getOptions());
});
```
##### ✅ `POST /api/login/finish`
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
#### 💻 4. Frontend Integration (Browser)
Include your frontend wrapper (already built as `window.AuthVerify`):
```html
<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/auth-verify.client.js"></script>
<script>
  const auth = new AuthVerify({ apiBase: "http://localhost:3000" });
</script>
```
#### ⚡ 5. Frontend Methods
##### 🧱 `.post(url) / .get(url)`
Set endpoint for POST/GET requests before calling `.data()`.
##### ⚙️ `.data(payload)`
Send JSON to backend and return response.

<!-- ### 🧩 6. Passkey Registration (Frontend)
#### 🚀 Full Flow Example
```js
const auth = new AuthVerify({ apiBase: "http://localhost:3000" });

auth
  .start("/api/register/start")
  .finish("/api/register/finish")
  .registerPasskey({ id: "u123", username: "john_doe" })
  .then(result => console.log("✅ Registered:", result))
  .catch(err => console.error("❌ Error:", err));
``` -->

#### 🧠 Step Breakdown
##### 1️⃣ **Frontend → Backend:** `/api/register/start`
Sends `{ user }` and gets WebAuthn challenge/options.
##### 2️⃣ **Browser:**
Calls `navigator.credentials.create({ publicKey })`
Prompts user for biometric or security key registration.

##### 3️⃣ **Frontend → Backend:** `/api/register/finish`
Sends credential data (`clientDataJSON`, `attestationObject`, etc.)

##### 4️⃣ **Backend:**
Validates and stores public key in user credentials.

<!-- ### 🔐 7. Passkey Login (Frontend)
#### 🚀 Full Flow Example
```js
auth
  .start("/api/login/start")
  .finish("/api/login/finish")
  .loginPasskey({ id: "u123", username: "john_doe" })
  .then(result => console.log("✅ Logged in:", result))
  .catch(err => console.error("❌ Error:", err));
``` -->
#### 🧠 Step Breakdown
##### 1️⃣ **Frontend → Backend:** `/api/login/start`
Sends `{ user, login: true }` to get challenge and `allowCredentials`.
##### 2️⃣ **Browser:**
Calls `navigator.credentials.get({ publicKey })`.
##### 3️⃣ **Frontend → Backend:** `/api/login/finish`
Sends credential signature data (`authenticatorData`, `signature`, etc.)
##### 4️⃣ **Backend:**
Verifies signature using stored public key.

#### 🧠 8. Quick Reference
| Layer    | Method                           | Description                  |
| -------- | -------------------------------- | ---------------------------- |
| Backend  | `passkey.register(user)`         | Start registration           |
| Backend  | `passkey.getOptions()`           | Return challenge for browser |
| Backend  | `passkey.finish(clientResponse)` | Finish registration/login    |

#### ✅ 9. Notes & Best Practices
 - Use HTTPS in production (`navigator.credentials` requires secure origin)
 - Always send real `user.id` (string, not numeric)
 - Store public keys securely in DB after registration
 - Set realistic expiration time for passkey challenges (`passExp`)
 - Combine with your `JWTManager` for session generation after successful login

---

## 🔑 AuthVerify Client Guide
This client is designed to **interact with the backend AuthVerify API** for passkeys / WebAuthn credentials.
It **does not require body-parser or any server-side logic** on the frontend.

### 📦 Import
```html
<!-- ✅ Import auth-verify client -->
  <script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/auth-verify.client.js"></script>
```
### ⚙️ Initialization
```js
const auth = new AuthVerify({
  apiBase: "http://localhost:3000",
  qrEl: document.getElementById("qr") // optional, for QR codes
});
```

| Option    | Type               | Default                   | Description                          |
| --------- | ------------------ | ------------------------- | ------------------------------------ |
| `apiBase` | `string`           | `'http://localhost:3000'` | Backend API base URL                 |
| `qrEl`    | `HTMLImageElement` | `null`                    | Optional element to display QR codes |

### 📬 Methods
#### 1️⃣ `post(url)`
Sets the POST endpoint for the next request.
```js
auth.post("/start-passkey");
```
#### 2️⃣ `get(url)`
Sets the GET endpoint for the next request.
```js
auth.get("/fetch-qr");
```
#### 3️⃣ `qr()`
Fetches a QR code from the backend and renders it in `qrEl`.
```js
await auth.get("/fetch-qr").qr();
```
##### Behavior:
 - If `qrEl` exists, its `src` will be set to the QR image returned by the backend.
 - Logs an error if no QR or fetch fails.

#### 4️⃣ `data(payload)`
Sends a POST request with JSON payload to the set endpoint.
```js
const response = await auth.post("/verify-otp").data({ code: "123456" });
console.log(response);
```
#### 5️⃣ `header()`
Returns an authorization header if `jwt` exists.
```js
const headers = auth.header();
// { Authorization: 'Bearer <token>' }
```
#### 6️⃣ `verify(code)`
Shortcut for sending OTP / code to backend.
```js
const result = await auth.verify("123456");
```
#### 7️⃣ `base64urlToUint8Array(base64url)`
Helper to decode Base64URL strings (used for WebAuthn challenges).
```js
const arr = auth.base64urlToUint8Array("BASE64URL_STRING");
```
#### 8️⃣ `issue(publicKey)`
Creates a WebAuthn credential on the client (passkey).
```js
// 1️⃣ Get registration options from backend
const publicKey = await auth.post("/start-passkey").data({ user: { id: "user123", name: "Alice" } });

// 2️⃣ Issue credential in browser
const credentialData = await auth.issue(publicKey);

// 3️⃣ Send credential back to backend
const result = await auth.post("/finish-passkey").data(credentialData);
console.log(result);
```

| Step | Description                                                                         |
| ---- | ----------------------------------------------------------------------------------- |
| 1    | Fetch `publicKey` options from backend                                              |
| 2    | Decode challenge & user ID, create credential with `navigator.credentials.create()` |
| 3    | Convert ArrayBuffers to Base64 and return structured object                         |
| 4    | Send credential to backend via `post()`                                             |

##### Returned object:
```js
{
  id: "...",
  rawId: "...",
  type: "public-key",
  response: {
    clientDataJSON: "...",
    attestationObject: "..."
  }
}
```

### 🧪 Example Full Flow
```js
(async () => {
  const auth = new AuthVerify({ apiBase: "http://localhost:3000", qrEl: document.getElementById("qr") });

  // Display QR from backend
  await auth.get("/fetch-qr").qr();

  // Create a passkey
  const publicKey = await auth.post("/start-passkey").data({ user: { id: "user123", name: "Alice" } });
  const credential = await auth.issue(publicKey);

  // Send back to backend
  const result = await auth.post("/finish-passkey").data(credential);
  console.log(result);
})();
```

### 9️⃣ Example HTML
```html
<img id="qrImage" />
<div id="response"></div>
<button id="getQRBtn">Get QR</button>
<button id="sendBtn">Send Data</button>

<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/auth-verify.client.js"></script>
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

### 10️⃣ Tips for Developers
 - Always call `auth.get('/api/qr').qr()` **after page loads**
 - Use `auth.header()` for any authenticated request
 - Backend must provide endpoints for `/api/qr`, `/api/verify-totp`, `/api/sign-jwt`
 - Make sure backend endpoints return **raw WebAuthn options** (`challenge`, `user`, `allowCredentials`) in **Base64URL format**.
 - `user.id` and `challenge` must be **Base64URL encoded** on backend.
 - JWT storage is automatic if backend returns **token**.

---

## 🔐 OAuth Manager — `auth-verify`
The **OAuthManager** in `auth-verify` provides an easy and unified way to integrate popular social logins such as Google, GitHub, Facebook, Twitter (X), LinkedIn, and others.
Each provider offers two main methods:
 - `redirect(res)` → Redirects users to provider’s authorization page
 - `callback(code)` → Exchanges authorization code for access token and retrieves user data

### 📦 Import
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify();
```
Then access:
```js
auth.oauth
```

### ⚙️ Constructor Options
| Option      | Type     | Default | Description                                  |
| ----------- | -------- | ------- | -------------------------------------------- |
| `providers` | `object` | `{}`    | Register custom OAuth providers dynamically. |

### 🧩 Supported Providers
The following providers are **built-in** and ready to use:

| Provider    | Method                   | OAuth Version |
| ----------- | ------------------------ | ------------- |
| Google      | `auth.oauth.google()`    | v2            |
| Facebook    | `auth.oauth.facebook()`  | v2            |
| GitHub      | `auth.oauth.github()`    | v2            |
| Twitter (X) | `auth.oauth.x()`         | v2            |
| LinkedIn    | `auth.oauth.linkedin()`  | v2            |
| Apple       | `auth.oauth.apple()`     | v2            |
| Discord     | `auth.oauth.discord()`   | v2            |
| Slack       | `auth.oauth.slack()`     | v2            |
| Microsoft   | `auth.oauth.microsoft()` | v2            |
| Telegram    | `auth.oauth.telegram()`  | Deep Link     |
| WhatsApp    | `auth.oauth.whatsapp()`  | Deep Link     |
| Reddit      | `auth.oauth.reddit()`    | v2            |
| Yandex      | `auth.oauth.yandex()`    | v2            |
| Tumblr      | `auth.oauth.tumblr()`    | v2            |
| Mail.ru     | `auth.oauth.mailru()`    | v2            |
| VK          | `auth.oauth.vk()`        | v2            |
| Yahoo       | `auth.oauth.yahoo()`     | v2            |

### 🪄 Common Usage
#### Step 1: Redirect user to provider
```js
app.get("/auth/google", (req, res) => {
  auth.oauth.google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    redirectUri: "http://localhost:3000/auth/google/callback"
  }).redirect(res);
});
```
#### Step 2: Handle callback and get user data
```js
app.get("/auth/google/callback", async (req, res) => {
  try {
    const data = await auth.oauth.google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: "http://localhost:3000/auth/google/callback"
    }).callback(req.query.code);

    res.json({ success: true, user: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```
### 🌍 Provider Reference
Each provider returns `{ redirect, callback }`.
Below are provider-specific examples and scopes.

#### 🟢 Google Login
**Scopes:** `openid email profile`
```js
auth.oauth.google({
  clientId,
  clientSecret,
  redirectUri
});
```
**Returns user:**
```json
{
  "email": "user@gmail.com",
  "name": "John Doe",
  "picture": "https://...",
  "access_token": "ya29.a0..."
}
```
#### 🔵 Facebook Login
**Scopes:** `email, public_profile`
```js
auth.oauth.facebook({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```json
{
  "id": "123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": { "data": { "url": "https://..." } },
  "access_token": "EAAJ..."
}
```
#### ⚫ GitHub Login
**Scopes:** `user:email`
```js
auth.oauth.github({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```json
{
  "login": "johndoe",
  "id": 123456,
  "email": "john@example.com",
  "avatar_url": "https://github.com/images/...",
  "access_token": "gho_..."
}
```
#### 🐦 Twitter (X) Login
**Scopes:** `tweet.read users.read offline.access`
```js
auth.oauth.x({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```json
{
  "data": { "id": "12345", "name": "John Doe", "username": "johndoe" },
  "access_token": "2.abc..."
}
```
#### 💼 LinkedIn Login
**Scopes:** `r_liteprofile r_emailaddress`
```js
auth.oauth.linkedin({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```json
{
  "id": "A1B2C3D4",
  "name": "John Doe",
  "email": "john@example.com",
  "access_token": "AQW..."
}
```
#### 🍎 Apple Login
**Scopes:** `name email`
```js
auth.oauth.apple({ clientId, clientSecret, redirectUri });
```
**Returns:**
```json
{
  "access_token": "eyJraWQiOi...",
  "id_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```
#### 💬 Discord Login
**Scopes:** `identify email`
```js
auth.oauth.discord({ clientId, clientSecret, redirectUri });
```
**Returns:**
```json
{
  "id": "123456789",
  "username": "john",
  "email": "john@example.com",
  "access_token": "abc123..."
}
```
#### 🧰 Slack Login
**Scopes:** `identity.basic identity.email`
```js
auth.oauth.slack({ clientId, clientSecret, redirectUri });
```
**Returns:**
```json
{
  "ok": true,
  "access_token": "xoxp-...",
  "authed_user": { "id": "U1234", "scope": "identity.basic,identity.email" }
}
```
#### 🪟 Microsoft Login
**Scopes:*** `User.Read`
```js
auth.oauth.microsoft({ clientId, clientSecret, redirectUri });
```
**Returns token:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "access_token": "EwB4A8l6..."
}
```
#### 💬 Telegram Login (Deep Link)
```js
auth.oauth.telegram({ botId: "YourBotName", redirectUri });
```
**Note:** Telegram handles authentication through deep links.
**Returns:**
```json
{ "message": "Telegram login uses deep link auth" }
```
#### 🟢 WhatsApp Login (Deep Link)
```js
auth.oauth.whatsapp({ phoneNumberId: "1234567890", redirectUri });
```
**Note:** Usually handled via QR code or direct chat.
**Returns:**
```json
{ "message": "WhatsApp login uses QR/deep link auth" }
```
#### 🧱 Reddit Login
**Scopes:** `identity`
```js
auth.oauth.reddit({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```js
{
  "name": "johndoe",
  "id": "t2_123abc",
  "icon_img": "https://styles.redditmedia.com/...",
  "access_token": "abc123..."
}
```
#### 🟥 Yandex Login
**Scopes:** `login:email login:info`
```js
auth.oauth.yandex({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```js
{
  "id": "1234567",
  "display_name": "John Doe",
  "emails": ["john@yandex.ru"],
  "default_email": "john@yandex.ru",
  "access_token": "y0_AgAAA..."
}
```
#### 🌐 Tumblr Login
**Scopes:** `basic write offline_access`
```js
auth.oauth.tumblr({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```js
{
  "name": "johndoe",
  "blogs": [{ "name": "myblog", "title": "My Tumblr Blog" }],
  "access_token": "xyz..."
}
```
#### ✉️ Mail.ru Login
**Scopes:** `userinfo.email`
```js
auth.oauth.mailru({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```js
{
  "id": "123456",
  "email": "user@mail.ru",
  "name": "John Doe",
  "access_token": "abc123..."
}
```
#### 🧍 VK (VKontakte) Login
**Scopes:** `email`
```js
auth.oauth.vk({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```js
{
  "id": 987654,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "access_token": "vk1.a.abc..."
}
```
#### 💜 Yahoo Login
**Scopes:** `openid profile email`
```js
auth.oauth.yahoo({ clientId, clientSecret, redirectUri });
```
**Returns user:**
```js
{
  "sub": "12345",
  "email": "john@yahoo.com",
  "name": "John Doe",
  "access_token": "y0_AgA..."
}
```
### 🧩 Custom OAuth Provider
You can register your own provider logic:
```js
auth.oauth.register("custom", ({ clientId, clientSecret, redirectUri }) => ({
  redirect(res) {
    res.redirect("https://custom-oauth.com/auth");
  },
  async callback(code) {
    return { code, message: "Custom provider handled!" };
  },
}));

// Usage:
auth.oauth.use("custom", { clientId, clientSecret, redirectUri });
```

### 🔒 Error Handling
Each `callback()` method may throw:
 - `OAuth Error: invalid_client`
 - `OAuth Error: invalid_grant`
 - `OAuth Error: unauthorized_client`
 - `OAuth Error: access_denied`
Always wrap in try/catch:
```js
try {
  const user = await auth.oauth.google(...).callback(code);
} catch (err) {
  console.error("Login failed:", err.message);
}
```

### 💡 Notes
 - Every provider uses **OAuth 2.0 Authorization Code flow**.
 - `redirect(res)` is server-side only (Node.js Express compatible).
 - Works perfectly inside your `auth-verify` unified wrapper.

---

## 💌 Magiclink (Passwordless login) (v1.8.0+)
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

## 🔐 CryptoManager API Guide
It supports both **PBKDF2** and **scrypt** algorithms for password or data hashing.

### 🚀 Overview
The `CryptoManager` class helps developers easily hash and verify passwords or any sensitive data
using strong cryptographic functions. It supports both **Promise** and **callback** styles.

### 🧩 Import and Setup
```js
const AuthVerify = require('auth-verify');

// Default: pbkdf2 algorithm
const auth = new AuthVerify({
  hashAlg: 'pbkdf2', // or 'scrypt'
  iterations: 100000,
  keyLen: 64
});
```
### 🔨 1️⃣ Hash Data
#### Method
```js
async hash(data, [callback])
```
#### Description
Hashes a string (like a password) using the specified algorithm and salt.
You can use **Promise** or **callback** style.
#### Parameters
| Name       | Type        | Description                                  |
| ---------- | ----------- | -------------------------------------------- |
| `data`     | `string`    | The input data to hash (e.g. password)       |
| `callback` | `function?` | Optional Node-style callback `(err, result)` |

#### Returns
An object containing:
```js
{
  hashAlg: "pbkdf2" | "scrypt",
  salt: "<random hex string>",
  hash: "<hashed data in hex>"
}
```
#### Example (Promise)
```js
const result = await auth.crypto.hash("myPassword123");
console.log(result);
// { hashAlg: 'pbkdf2', salt: '...', hash: '...' }
```
#### Example (Callback)
```js
auth.crypto.hash("myPassword123", (err, result) => {
  if (err) return console.error(err);
  console.log(result);
});
```

### 🔍 2️⃣ Verify Data
#### Method
```js
async verify(data, { hashAlg, salt, hash }, [callback])
```
#### Description
Verifies whether a given input matches a stored hash.
#### Parameters
| Name                      | Type        | Description                                   |
| ------------------------- | ----------- | --------------------------------------------- |
| `data`                    | `string`    | The plaintext input (e.g. user password)      |
| `{ hashAlg, salt, hash }` | `object`    | The hash object from `.hash()`                |
| `callback`                | `function?` | Optional Node-style callback `(err, isValid)` |

#### Returns
A boolean value:
 - `true` → data matches
 - `false` → mismatch
#### Example (Promise)
```js
const result = await cryptoManager.hash("secret123");
const isValid = await cryptoManager.verify("secret123", result);
console.log(isValid); // true
```
#### Example (Callback)
```js
const original = await cryptoManager.hash("secret123");

cryptoManager.verify("secret123", original, (err, valid) => {
  if (err) throw err;
  console.log(valid); // true
});
```
### 📊 3️⃣ Summary Table
| Method                                              | Description                         | Returns                   | Async |
| --------------------------------------------------- | ----------------------------------- | ------------------------- | ----- |
| `hash(data, [callback])`                            | Hashes input using PBKDF2 or scrypt | `{ hashAlg, salt, hash }` | ✅     |
| `verify(data, { hashAlg, salt, hash }, [callback])` | Verifies input against hash         | `boolean`                 | ✅     |

### 🧠 Notes
 - Both PBKDF2 and scrypt are **strong**, **salted**, **one-way** hashing algorithms.
 - Use PBKDF2 for compatibility; use scrypt for better memory-hard protection.
 - Salt ensures that each hash output is unique even for identical inputs.
 - The default iteration count (100,000) is secure but can be increased for stronger protection.

### 🧪 Example Full Flow
```js
(async () => {
  const manager = new CryptoManager({ hashAlg: 'scrypt' });

  // Hash password
  const hashData = await manager.hash('MyStrongPassword');
  console.log('Stored hash:', hashData);

  // Verify password
  const match = await manager.verify('MyStrongPassword', hashData);
  console.log('Password valid:', match);
})();
```

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
│  ├─ /crypto/index.js
│  ├─ totp/
|  |  ├─ index.js
|  |  ├─ base32.js
│  ├─ /session/index.js
|  ├─ /oauth/index.js
│  └─ helpers/helper.js
├─ tests/
│  ├─ jwa.test.js
│  ├─ cryptomanager.test.js
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
