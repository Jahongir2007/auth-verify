## 📝 AuthVerify TOTP API Guide
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
