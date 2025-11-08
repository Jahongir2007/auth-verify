# auth-verify

**auth-verify** is a Node.js authentication utility that provides:
  - ✅ Secure OTP (one-time password) generation and verification.
  - ✅ Sending OTPs via Email, SMS (pluggable helpers), and Telegram bot.
  - ✅ TOTP (Time-based One Time Passwords) generation, QR code generation, and verification (Google Authenticator support).
  - ✅ JWT creation, verification, optional token revocation with memory/Redis storage, and advanced middleware for protecting routes, custom cookie/header handling, role-based guards, and token extraction from custom sources.
  - ✅ Session management (in-memory or Redis).
  - ✅ OAuth 2.0 integration for Google, Facebook, GitHub, X (Twitter), Linkedin, and additional providers like Apple, Discord, Slack, Microsoft, Telegram,and WhatsApp.
  - ⚙️ Developer extensibility: custom senders via `auth.register.sender()` and chainable sending via `auth.use(name).send(...)`.
  - ✅ Automatic JWT cookie handling for Express apps, supporting secure, HTTP-only cookies and optional auto-verification.
  - ✅ Fully asynchronous/Promise-based API, with callback support where applicable.
  - ✅ Chainable OTP workflow with cooldowns, max attempts, and resend functionality.
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
---

## 🚀 Example: Initialize library (CommonJS)

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

## 🔐 JWT Usage

### JWT Middleware (`protect`) (v1.5.0+) 

auth-verify comes with a fully customizable JWT middleware, making it easy to **protect routes**, **attach decoded data to the request**, and **check user roles**.

#### ⚙️ `protect` Method Overview

Function signature:
```js
protect(options = {})
```
**Description**:
 - Returns an Express-style middleware.
 - Automatically reads JWT from cookie, header, or custom extractor.
 - Verifies the token and optionally checks for roles.
 - Attaches the decoded payload to req (default property: req.user).

| Option           | Type     | Default           | Description                                                                            |
| ---------------- | -------- | ----------------- | -------------------------------------------------------------------------------------- |
| `onError`        | Function | `null`            | Custom error handler. `(err, req, res)`                                                |
| `attachProperty` | String   | `"user"`          | Where to attach decoded token payload on `req`                                         |
| `requiredRole`   | String   | `null`            | Optional role check. Throws error if decoded role does not match                       |
| `cookieName`     | String   | `this.cookieName` | Name of the cookie to read JWT from                                                    |
| `headerName`     | String   | `"authorization"` | Header name to read JWT from. `"authorization"` splits `Bearer TOKEN` automatically    |
| `extractor`      | Function | `null`            | Custom function to extract token. Receives `req` as argument and must return the token |

#### Middleware Behavior

1. **Token extraction order:**
  - First: `extractor(req)` if provided
  - Second: `req.headers[headerName]` (for `authorization`, splits `Bearer TOKEN`)
  - Third: `cookieName` from request cookies
2. **Verification**:
  - Calls `this.verify(token)`
  - Throws `NO_TOKEN` if no token is found
  - Throws `ROLE_NOT_ALLOWED` if `requiredRole`is provided but decoded role does not match
3. **Attachment**:
  - Decoded token is attached to `req[attachProperty]`
4. **Error handling**:
  - Default: responds with `401` and JSON `{ success: false, error: err.message }`
  - Custom: if `onError` is provided, it is called instead of default behavior

#### Example Usage
##### Basic Usage
```js
const express = require("express");
const AuthVerify = require("auth-verify");
const app = express();

const auth = new AuthVerify({ jwtSecret: "supersecret" });

// Protect route
app.get("/dashboard", auth.jwt.protect(), (req, res) => {
  // req.user contains decoded JWT payload
  res.json({ message: `Welcome, ${req.user.userId}` });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

##### Custom Cookie & Header
```js
app.get("/profile", auth.jwt.protect({
  cookieName: "myToken",
  headerName: "x-access-token"
}), (req, res) => {
  res.json({ user: req.user });
});
```
  - JWT will be read from the cookie named `"myToken"` or from the header `"x-access-token"`.

#### Role-based Guard
```js
app.get("/admin", auth.jwt.protect({
  requiredRole: "admin"
}), (req, res) => {
  res.json({ message: "Welcome Admin" });
});
``` 
  - Throws error if decoded token does not have role: `"admin"`.

#### Custom Token Extractor
```js
app.get("/custom", auth.jwt.protect({
  extractor: (req) => req.query.token
}), (req, res) => {
  res.json({ user: req.user });
});
```
  - Allows you to read token from any custom location (e.g., query params).

#### Custom Error Handler
```js
app.get("/custom-error", auth.jwt.protect({
  onError: (err, req, res) => {
    res.status(403).json({ error: "Access denied", details: err.message });
  }
}), (req, res) => {
  res.json({ user: req.user });
});
```
  - Overrides default `401` response with custom logic.

### JWA Handling (v1.3.0+) 

You can choose json web algorithm for signing jwt
```js
const AuthVerify = require('auth-verify');
const auth = new AuthVerify({ useAlg: 'HS512' }); // or 'HS256'

(async ()=>{
  const token = await auth.jwt.sign({userId: 123}, '30m');
  console.log('token', token);
})();
```


```js
// create JWT
const token = await auth.jwt.sign({ userId: 123 }, '1h'); // expiry string or number (ms) (and also you can add '1m' (minute), '5s' (second) and '7d' (day)) 
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
### 🍪 Automatic Cookie Handling (v1.1.0+)

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

## 🔢 OTP (email / sms / telegram / custom sender)

### 🤝 Configure sender

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
  apiKey: 'API_KEY',
  apiSecret: 'API_SECRET',
  sender: 'SENDER_NAME',
  mock: true // in dev prints message instead of sending
});

auth.otp.setSender({
  via: 'sms',
  provider: 'twilio',
  apiKey: 'ACCOUNT_SID',
  apiSecret: 'AUTH_TOKEN',
  sender: 'SENDER_NAME',
  mock: true // in dev prints message instead of sending
});

auth.otp.setSender({
  via: 'sms',
  provider: 'vonage',
  apiKey: 'API_KEY',
  apiSecret: 'API_SECRET',
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

### ⛓️ Generate → Save → Send (chainable)

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

// Sending OTP with SMS
auth.otp.generate(6).set('+1234567890', (err) => {
  if (err) throw err;
  auth.otp.message({
    to: '+1234567890',
    text: `Your code: <b>${auth.otp.code}</b>`
  }, (err, info) => {
    if (err) console.error('send error', err);
    else console.log('sent', info && info.messageId);
  });
});
```
`+1234567890` is reciever number

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

### ✔️ Verify

```js
// Promise style
try {
  const ok = await auth.otp.verify({ check: 'user@example.com', code: '123456' });
  console.log('verified', ok);
} catch (err) {
  console.error('verify failed', err.message);
}

// Callback style also supported: auth.otp.verify({check, code}, callback)
auth.otp.verify({ check: 'user@example.com', code: '123456' }, (err, isValid)=>{
  if(err) console.log(err);
  if(isValid) console.log('Correct code!');
  else console.log('Incorrect code!');
});
```

### Resend and cooldown / max attempts

- `auth.otp.cooldown('30s')` or `auth.otp.cooldown(30000)` — set cooldown duration.
- `auth.otp.maxAttempt(5)` — set maximum attempts allowed.
- `auth.otp.resend(identifier)` — regenerate and resend OTP, observing cooldown and expiry rules.

`resend` returns the new code (promise style) or calls callback.

---

## 🗝️ Passkey (WebAuthn) (New in v1.6.1)

`AuthVerify` includes a `PasskeyManager` class to handle passwordless login using WebAuthn / passkeys. You can **register** users, **verify login**, and manage **challenges** safely.

### Setup
```js
const AuthVerify = require("auth-verify");

const auth = new AuthVerify({
  passExp: "2m", // passkey challenge TTL
  rpName: "MyApp",
  storeTokens: "memory" // or "redis"
});

const user = {
  id: "user1",
  username: "john_doe",
  credentials: [] // will store registered credentials
};
```
### 1️⃣ Register a new Passkey
The registration process consists of **two steps**:
  **1.** Generate a registration challenge
  **2.** Complete attestation after client responds

#### Step 1: Generate challenge
```js
// register user
await auth.passkey.register(user);

// get WebAuthn options for the client
const options = auth.passkey.getOptions();
console.log(options);

/* Example output:
{
  challenge: "base64url-challenge",
  rp: { name: "MyApp" },
  user: { id: "dXNlcjE", name: "john_doe", displayName: "john_doe" },
  pubKeyCredParams: [{ alg: -7, type: "public-key" }]
}
*/
```
> Send options to the browser to call:
> ```js
> navigator.credentials.create({ publicKey: options })
> ```

#### Step 2: Finish attestation
Once the client returns the attestation response:
```js
const clientResponse = {
  id: "...", // credentialId from browser
  response: {
    clientDataJSON: "...",
    attestationObject: "..."
  }
};

const result = await auth.passkey.finish(clientResponse);
console.log(result);
/* Example result:
{
  status: "ok",
  user: {
    id: "user1",
    username: "john_doe",
    credentials: [
      { id: "credentialId", publicKey: "pem-key" }
    ]
  },
  challengeVerified: true,
  rawAuthData: <Buffer ...>
}
*/
```
> After this, the user now has a **registered passkey**.

### 2️⃣ Login with Passkey
Login also consists of **two steps**:
  **1.** Generate assertion challenge
  **2.** Complete verification
#### Step 1: Generate login challenge
```js
await auth.passkey.login(user);

const options = auth.passkey.getOptions();
console.log(options);

/* Example output:
{
  challenge: "base64url-challenge",
  allowCredentials: [
    { id: <Buffer...>, type: "public-key" }
  ],
  timeout: 60000
}
*/
```
> Send this `options` to the browser for `navigator.credentials.get({ publicKey: options })`.

#### Step 2: Finish login assertion
```js
const clientLoginResponse = {
  id: "credentialId",
  response: {
    clientDataJSON: "...",
    authenticatorData: "...",
    signature: "..."
  }
};

const loginResult = await auth.passkey.finish(clientLoginResponse);
console.log(loginResult);
/* Example output:
{
  status: "ok",
  user: {
    id: "user1",
    username: "john_doe",
    credentials: [...]
  }
}
*/
```
> If `status === "ok"`, the login is successful.

### 3️⃣ Notes

 - `auth.passkey.register()` and `auth.passkey.login()` return this so you can chain:
```js
await auth.passkey
  .register(user)
  .getOptions(); // get WebAuthn options
```
 - `finish()` **must be called after `register()` or `login()`** with the client’s response.
 - TTL (`passExp`) ensures challenges **expire automatically** (memory or Redis store).
 
### 4️⃣ Summary of Methods
| Method                   | Purpose                         | Returns            |
| ------------------------ | ------------------------------- | ------------------ |
| `register(user)`         | Start passkey registration      | `this` (chainable) |
| `login(user)`            | Start passkey login             | `this` (chainable) |
| `getOptions()`           | Get WebAuthn options for client | Object             |
| `finish(clientResponse)` | Complete attestation/assertion  | Result object      |

## ✅ TOTP (Time-based One Time Passwords) — Google Authenticator support (v1.4.0+)
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify();
// Optionally:
/*
const AuthVerify = require("auth-verify");
const auth = new AuthVerify({
    totp: {
      digits: 6 (default)
      step: 30 (default)
      alg: "SHA1" (default)
    }
});
*/
```
You can change `digits`, `step`, `alg`.
 - `digits`: how many digits your one-time password has **(Google Authenticator default = 6 digits)**
 - `step`: how long each TOTP code lives in seconds **(Google Authenticator default = 30 seconds)**
 - `alg`: the hashing algorithm used to generate the OTP **(Google Authenticator default = SHA1)**
### Generate secret
```js
const secret = auth.totp.secret();
console.log(secret); //base 32
```
### generate otpauth URI
```js
const uri = auth.totp.uri({
  label: "user@example.com",
  issuer: "AuthVerify",
  secret
});

console.log(uri);
```
### generate QR code image
(send this PNG to frontend or show in UI)
```js
const qr = await auth.totp.qrcode(uri);
console.log(qr); // data:image/png;base64,...
```
### generate a TOTP code
```js
const token = auth.totp.generate(secret);
console.log("TOTP:", token);
```
### verify a code entered by user
```js
const ok = auth.totp.verify({ secret, token });
console.log(ok); // true or false
```
### example real flow
```js
// Register UI
const secret = auth.totp.secret();
const uri = auth.totp.uri({ label: "john@example.com", issuer: "AuthVerify", secret });
const qr = await auth.totp.qrcode(uri);
// show qr to user

// Then user scans QR with Google Authenticator
// Then user enters 6-digit code
const token = req.body.code;

// Verify
if (auth.totp.verify({ secret, token })) {
  // enable 2FA
}
```
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
├─ babel.config.js
```

---

## Contributing & License

Contributions welcome! Open issues / PRs for bugs, improvements, or API suggestions.

MIT © 2025 — Jahongir Sobirov
