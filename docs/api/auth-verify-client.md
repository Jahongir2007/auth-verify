## auth-verify client
### 1️⃣ Introduction

**AuthVerify Client** is a lightweight frontend JavaScript library for TOTP / JWT authentication.
It works with your backend APIs to:
 - Display QR codes for TOTP enrollment
 - Verify user OTP codes
 - Request JWT tokens from backend
 - Send authenticated requests easily
 - **Register a passkey** (create a new credential)
 - **Login with a passkey** (authenticate existing credential)
 - Handle **Base64URL decoding**, **ArrayBuffer conversion**, and **backend communication** automatically
 - Easily integrate with your Node.js backend using `auth-verify`
Works like jQuery: just include the script in HTML, no module or bundler needed.

## 2️⃣ Installation
```html
<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
```

### 3️⃣ Initialization
```js
const qrImage = document.getElementById('qrImage');

const auth = new AuthVerify({
  apiBase: 'http://localhost:3000',  // Your backend API base URL
  qrEl: qrImage                       // Image element to display QR
});
```

### 4️⃣ Generating QR Code
```js
auth.get('/api/qr').qr();
```
 - Fetches QR code from backend
 - Displays it in the `qrEl` image element

### 5️⃣ Sending Data / JWT Requests
```js
const payload = { name: 'John', age: 23 };

const token = await auth.post('/api/sign-jwt').data(payload);
console.log('JWT token:', token);
```
 - `post(url)` sets endpoint
 - `data(payload)` sends JSON payload
 - If backend returns a token, it is stored in `auth.jwt`

### 6️⃣ Verifying OTP
```js
const result = await auth.post('/api/verify-totp').verify('123456');
console.log(result); // e.g. { verified: true }
```
 - Wraps the OTP code in `{ code: '...' }`
 - Sends to backend for verification

### 7️⃣ Sending Authenticated Requests
```js
const profile = await fetch('http://localhost:3000/api/profile', {
  headers: auth.header()
}).then(res => res.json());

console.log(profile);
```
 - `auth.header()` returns `{ Authorization: "Bearer <jwt>" }`
 - Easy to attach JWT to any request

### Passkey part (new in v1.8.0)
#### API Methods
##### `start(route)`
Sets the backend endpoint to start a **registration or login flow**.
```js
auth.start('/api/register/start');  // registration start
auth.start('/api/login/start');     // login start
```

#### `finish(route)`
Sets the backend endpoint to **finish the flow** (verify credential/assertion).
```js
auth.finish('/api/register/finish'); // registration finish
auth.finish('/api/login/finish');    // login finish
```

#### `registerPasskey(user)`
Registers a new passkey for the user.
##### Parameters:
| Param | Type   | Description                                                            |
| ----- | ------ | ---------------------------------------------------------------------- |
| user  | Object | `{ id: "user1", username: "john_doe" }` — user info to send to backend |

##### Returns:
`Promise<Object>` — result from backend (`{ success: true/false, message: "..." }`)
##### Example:
```js
auth.start('/api/register/start').finish('/api/register/finish');

const result = await auth.registerPasskey({ id: 'user1', username: 'john_doe' });

if(result.success) alert("Passkey registered!");
else alert("Error: " + result.message);
```

##### What it does internally:
1. Calls `/start` endpoint → gets assertion options.
2. Decodes `challenge` and `allowCredentials[].id` from Base64URL → Uint8Array.
3. Calls `navigator.credentials.get({ publicKey })`.
4. Converts ArrayBuffers to Base64.
5. Sends assertion to `/finish` endpoint for verification.
#### `base64urlToUint8Array(base64url)`
Helper to convert Base64URL string to `Uint8Array`.
Used internally in registration & login flow. Devs can use it for custom WebAuthn handling if needed.
### 8️⃣ Method Summary
| Method                  | Description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `get(url)`              | Set GET endpoint                                                                               |
| `post(url)`             | Set POST endpoint                                                                              |
| `qr()`                  | Fetch QR from backend and display                                                              |
| `data(payload)`         | Send payload to backend; stores JWT if returned                                                |
| `verify(code)`          | Send OTP code to backend                                                                       |
| `header()`              | Return JWT auth header object                                                                  |
| `start(route)`          | Set backend endpoint to **start registration or login**                                        |
| `finish(route)`         | Set backend endpoint to **finish registration or login**                                       |
| `registerPasskey(user)` | Full registration flow: fetch challenge, decode, create credential in browser, send to backend |
| `loginPasskey(user)`    | Full login flow: fetch assertion, decode, get credential from browser, send to backend         |

### 9️⃣ Example HTML
```html
<img id="qrImage" />
<div id="response"></div>
<button id="getQRBtn">Get QR</button>
<button id="sendBtn">Send Data</button>

<script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
<script>
const qrImage = document.getElementById('qrImage');
const responseDiv = document.getElementById('response');

const auth = new AuthVerify({ apiBase: 'http://localhost:3000', qrEl: qrImage });

document.getElementById('getQRBtn').addEventListener('click', () => auth.get('/api/qr').qr());

document.getElementById('sendBtn').addEventListener('click', async () => {
  const payload = { name: 'Jahongir' };
  const result = await auth.post('/api/sign-jwt').data(payload);
  responseDiv.textContent = JSON.stringify(result, null, 2);
});
</script>
```

### Passkey example
```html
<!DOCTYPE html>
<html>
<head>
  <title>AuthVerify Demo</title>
</head>
<body>
  <h1>AuthVerify Passkey Demo</h1>
  <button id="register">Register Passkey</button>
  <button id="login">Login with Passkey</button>

  <script src="https://cdn.jsdelivr.net/gh/jahongir2007/auth-verify/authverify.client.js"></script>
  <script>
    const auth = new AuthVerify({ apiBase: "http://localhost:3000" });

    // Registration setup
    auth.start('/api/register/start').finish('/api/register/finish');
    document.getElementById('register').addEventListener('click', async () => {
      const result = await auth.registerPasskey({ id: 'user1', username: 'john_doe' });
      alert(result.message);
    });

    // Login setup
    auth.start('/api/login/start').finish('/api/login/finish');
    document.getElementById('login').addEventListener('click', async () => {
      const result = await auth.loginPasskey({ id: 'user1', username: 'john_doe' });
      alert(result.message);
    });
  </script>
</body>
</html>
```
✅ Fully functional frontend passkey demo
✅ One line registration / login for devs
✅ Automatic Base64URL decoding and ArrayBuffer handling

### 10️⃣ Tips for Developers
 - Always call `auth.get('/api/qr').qr()` **after page loads**
 - Use `auth.header()` for any authenticated request
 - Backend must provide endpoints for `/api/qr`, `/api/verify-totp`, `/api/sign-jwt`
 - Make sure backend endpoints return **raw WebAuthn options** (`challenge`, `user`, `allowCredentials`) in **Base64URL format**.
 - `user.id` and `challenge` must be **Base64URL encoded** on backend.
 - JWT storage is automatic if backend returns **token**.
