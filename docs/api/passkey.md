## 🔑 Passkey Authentication — AuthVerify Frontend + Backend Guide
This guide explains how to integrate Passkey (WebAuthn) authentication using the AuthVerify ecosystem — including both:
 - 🧠 **Backend:** `PasskeyManager` (Node.js)
 - 💻 **Frontend:** `window.AuthVerify` wrapper (Browser)⚙️ 1. Backend Setup (Node.js)

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
💻 4. Frontend Integration (Browser)

Include your frontend wrapper (already built as window.AuthVerify):

<script src="auth-verify.js"></script>
<script>
  const auth = new AuthVerify({ apiBase: "http://localhost:3000" });
</script>

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
