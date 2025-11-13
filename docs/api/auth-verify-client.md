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
