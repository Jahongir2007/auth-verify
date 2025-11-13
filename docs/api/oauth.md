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
