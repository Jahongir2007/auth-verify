# Auth Verify 🔐  
Modern and flexible authentication manager for Node.js —  
with JWT, OTP, Redis, and Cookie support built in.

[![npm version](https://img.shields.io/npm/v/auth-verify.svg)](https://www.npmjs.com/package/auth-verify)
[![GitHub stars](https://img.shields.io/github/stars/jahongir2007/auth-verify.svg?style=social)](https://github.com/jahongir2007/auth-verify)

---

### 🪄 Why Auth-Verify?

- ⚡ Simple API: `auth.register.sender()` and `auth.use('email')`
- 🧩 Multi-storage: memory, Redis, or cookie
- 🔑 JWT manager with auto cookie mode
- 📱 OTP via email, Telegram, or custom sender
- 🧰 Extensible — add your own integrations easily

---

### 🧭 Quick Start

```bash
npm install auth-verify
```

---
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify({ secret: "my-secret", storeTokens: "memory" });

// Register sender
auth.register.sender("email", async ({ to, code }) => {
  console.log("Send to:", to, "Code:", code);
});

// Send OTP
await auth.use("email").send({ to: "user@example.com" });

// Verify OTP
const isValid = await auth.use("email").verify("123456");
console.log(isValid ? "✅ Success" : "❌ Invalid");
```
