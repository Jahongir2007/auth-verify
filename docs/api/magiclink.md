## ✨ Magic Link Manager — `auth-verify`
Magic Link authentication allows users to log in securely without passwords by receiving a time-limited login link via email.

### 📦 Import
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify({ mlSecret: "super_secret", appUrl: "https://myapp.com" });
```
Then access via:
```js
auth.magic
```
### ⚙️ Constructor Options
| Option        | Type                            | Default                    | Description                                           |
| ------------- | ------------------------------- | -------------------------- | ----------------------------------------------------- |
| `mlSecret`    | `string`                        | `'authverify_secret'`      | Secret key for JWT token signing.                     |
| `mlExpiry`    | `string`                        | `'5m'`                     | Token expiration time (e.g. `'30s'`, `'5m'`). |
| `appUrl`      | `string`                        | `'https://yourapp.com'`    | Base URL used in generated magic links.               |
| `storeTokens` | `'memory' \| 'redis' \| 'none'` | `'memory'`                 | Where to store issued tokens for verification.        |
| `redisUrl`    | `string`                        | `'redis://localhost:6379'` | Redis URL (used only if `storeTokens` = `'redis'`).   |

### 🪄 Methods
1. `sender(config)`
Configures email sending service (Gmail or custom SMTP).
#### Example:
```js
auth.magic.sender({
  service: "gmail",
  sender: "your@gmail.com",
  pass: "app_password"
});
```
#### Or using custom SMTP:
```js
auth.magic.sender({
  host: "smtp.mailtrap.io",
  port: 587,
  sender: "no-reply@yourapp.com",
  pass: "password",
  secure: false
});
```

### 2. `generate(email)`
Creates a new **JWT token** for the given email (does not send it).
#### Example:
```js
const token = await auth.magic.generate("user@example.com");
console.log(token);
```
#### Returns:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. `send(email, [mailOptions], [callback])`
Generates a magic link, sends it via email, and stores it in memory or Redis.
#### Parameters:
| Name          | Type                    | Description                          |
| ------------- | ----------------------- | ------------------------------------ |
| `email`       | `string`                | User’s email to send link to.        |
| `mailOptions` | `object` *(optional)*   | Custom email options.                |
| `callback`    | `function` *(optional)* | Node-style callback `(err, result)`. |

#### Mail Options:
| Property  | Description                                                           |
| --------- | --------------------------------------------------------------------- |
| `subject` | Email subject (default: *"Your Magic Login Link ✨"*)                  |
| `html`    | Custom HTML body. Use `{{link}}` as a placeholder for the magic link. |

#### Example:
```js
await auth.magic.send("user@example.com", {
  subject: "Login to MyApp",
  html: "<p>Click here: <a href='{{link}}'>Login Now</a></p>"
});
```
#### Returns:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "link": "https://yourapp.com/auth/verify?token=eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. `verify(token, [callback])`
Verifies a received token from the user’s magic link.
#### Example:
```js
const result = await auth.magic.verify(req.query.token);
if (result.success) {
  console.log("User verified:", result.user.email);
}
```
#### Returns:
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "iat": 1731278391,
    "exp": 1731278691
  }
}
```
#### Errors:
 - `"Invalid or expired magic link"`
 - `"Magic link expired or not found"`
 - `"Invalid or already used magic link"`

### 🔒 Token Storage Behavior
| Store Type | Description                                                                          |
| ---------- | ------------------------------------------------------------------------------------ |
| `memory`   | Tokens are saved in a `Map()` until expiry. Good for single-instance apps.           |
| `redis`    | Tokens stored with expiry in Redis. Ideal for distributed or multi-server apps.      |
| `none`     | Tokens not stored — verification will only check signature, not state (less secure). |

### 🌐 Example Integration
Server route (Express.js):
```js
app.post("/api/send-magic", async (req, res) => {
  await auth.magic.send(req.body.email);
  res.json({ message: "Magic link sent!" });
});

app.get("/auth/verify", async (req, res) => {
  try {
    const result = await auth.magic.verify(req.query.token);
    res.json({ verified: true, user: result.user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
```
### 🧠 Notes
 - Tokens are **single-use**: once verified, they are deleted.
 - Supports both **callback** and **Promise-based** syntax.
 - You can use the result to generate a JWT session or cookie with your `JWTManager`.
