## 🔐 OTP Manager — `auth-verify`
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
