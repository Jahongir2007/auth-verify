<p align="center">
  <img src="https://raw.githubusercontent.com/jahongir2007/auth-verify/main/assets/banner.png" alt="Auth Verify Banner" width="100%">
</p>

# Auth Verify 🔐  
Modern and flexible authentication manager for Node.js —  
with JWT, OTP, Redis, and Cookie support built in.

![npm](https://img.shields.io/npm/v/auth-verify)
![npm downloads](https://img.shields.io/npm/dt/auth-verify)
![tests](https://img.shields.io/badge/tests-passing-brightgreen)
![license](https://img.shields.io/npm/l/auth-verify)

---

### 🪄 Why Auth-Verify?

- ⚡ Simple API: `auth.register.sender()` and `auth.use('email')`
- 🧩 Multi-storage: memory, Redis, or cookie
- 🔑 JWT manager with auto cookie mode
- 📱 OTP via email, Telegram, SMS or custom sender
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
(For all documentation)[https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md] 
