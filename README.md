<p align="center">
  <img src="https://raw.githubusercontent.com/jahongir2007/auth-verify/main/assets/banner.png" alt="Auth Verify Banner" width="100%">
</p>

# AuthVerify — Node.js Authentication Library

AuthVerify is a modular authentication library for Node.js, providing JWT, OTP, TOTP, Passkeys (WebAuthn), Magic Links, Sessions, and OAuth helpers. You can easily register custom senders for OTPs or notifications.

![npm](https://img.shields.io/npm/v/auth-verify)
![npm downloads](https://img.shields.io/npm/dt/auth-verify)
![tests](https://img.shields.io/badge/tests-passing-brightgreen)
![license](https://img.shields.io/npm/l/auth-verify)

---

### 🪄 Why Auth-Verify?

- ⚡ Simple API: `auth.register.sender()` and `auth.use('email')`
- 🧩 Multi-storage: memory, Redis, or cookie
- 🔑 JWT manager with auto cookie mode
- 📱 OTP via email, Telegram, SMS, WhatsApp Business API or custom sender
- 🔢 TOTP code and QR code generation and verification
- 🗝️ Passwordless login & registration with passkey/webauthn
- 💌 Magiclink for passwordless logins
- 🌎 Oauth 2.0 integration with providers
- 🧰 Extensible — add your own integrations easily
- 🔗 Frontend integration for creating QR codes of TOTP and verifying OTP codes and sending data for backend

---

### 🧭 Quick Start

```bash
npm install auth-verify
```

---
```js
const AuthVerify = require("auth-verify");
const auth = new AuthVerify({ storeTokens: "memory" });

// Connecting sender
auth.otp.sender({
  via: 'email',
  service: 'gmail',
  sender: 'johndoe@example.com',
  pass: 'YOUR_APP_PASS'
});

// Send OTP
auth.otp.send('alice@example.com', (err)=>{
  if(err) console.log(err);
  console.log("OTP sent!");
  // Verify OTP
  auth.otp.verify('alice@example.com', '123456', (err, valid)=>{
    if(err) console.log(err);
    if(valid) console.log('Correct');
    else console.log('Incorrect');
  });
});

```
[For all documentation](https://github.com/Jahongir2007/auth-verify/blob/main/docs/docs.md) 
