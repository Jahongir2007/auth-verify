## 🔐 AuthVerify JWT API Guide

`AuthVerify` includes a powerful `jwt` manager that simplifies JSON Web Token (JWT) authentication.
It supports **automatic cookie handling**, **memory or Redis token storage**, and an **Express middleware** for route protection.

### ⚙️ Setup
```js
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  jwtSecret: 'super_secret_key',
  cookieName: 'auth_token',
  storeTokens: 'redis',         // or 'memory'
  redisUrl: 'redis://localhost:6379',
  useAlg: 'HS256',              // or any supported algorithm
});
```
After initialization, the JWT system is accessible via `auth.jwt`.

### 🧩 JWT Methods Overview
| Method                                      | Description                                                  |
| ------------------------------------------- | ------------------------------------------------------------ |
| `auth.jwt.sign(payload, expiry?, options?)` | Creates a JWT token and optionally sets it in a cookie       |
| `auth.jwt.verify(tokenOrReq)`               | Verifies a token or extracts it automatically from a request |
| `auth.jwt.decode(token)`                    | Decodes JWT payload without verification                     |
| `auth.jwt.revoke(token, revokeTime?)`       | Revokes a token immediately or after a timeout               |
| `auth.jwt.isRevoked(token)`                 | Checks whether a token has been revoked                      |
| `auth.jwt.protect(options?)`                | Express middleware to protect API routes                     |
| `auth.jwt.readCookie(req, name)`            | Reads a JWT from cookies manually                            |
| `auth.jwt.issue(user)`                      | Issues an **access token** and a **refresh token**           |
| `auth.jwt.refresh(refreshToken)`            | Refreshes an **access token** using a valid refresh token    |

### 🪄 `auth.jwt.sign(payload, expiry?, options?)`
Signs a new JWT token.
Can automatically store it in memory/Redis and set an HTTP-only cookie for browser clients.
```js
const token = await auth.jwt.sign(
  { id: 'user_123', role: 'admin' },
  '2h', // expiry time
  { res } // Express res object to auto-set cookie
);
```
#### Parameters:
| Name             | Type               | Default | Description                                              |
| ---------------- | ------------------ | ------- | -------------------------------------------------------- |
| `payload`        | `object`           | —       | Data to include in the JWT                               |
| `expiry`         | `string \| number` | `'1h'`  | Expiration time (`5m`, `2h`, `1d`, etc.)                 |
| `options.res`    | `Response`         | —       | Express response object (sets cookie automatically)      |
| `options.secure` | `boolean`          | `true`  | If `false`, cookie is not secure (for localhost testing) |

#### Returns:
`Promise<string>` → The generated JWT token.

### ✅ `auth.jwt.verify(input)`

Verifies and decodes a token.
You can pass either a **raw JWT token string** or an **Express request object**.
When passing `req`, the library automatically extracts the token from:
 - `Authorization` header (`Bearer <token>`)
 - Cookies (`auth_token` by default)
```js
// 1️⃣ Verify a token string
const decoded = await auth.jwt.verify(token);

// 2️⃣ Verify directly from a request
const decoded = await auth.jwt.verify(req);
```
#### Returns:
`Promise<object>` → Decoded payload if valid, throws error if invalid or revoked.

### 🧠 `auth.jwt.decode(token)`
Decodes a token **without verifying** the signature (useful for inspection or debugging).
```js
const data = await auth.jwt.decode(token);
```
**Returns:** Decoded object or `null`.

### 🧩 `auth.jwt.issue(user)`
Issues a new access token and a refresh token for a user.
```js
const { accessToken, refreshToken } = auth.jwt.issue({ id: 'user_123' });
```
 - **Access token:** short-lived, used for authentication.
 - **Refresh token:** long-lived, used to get a new access token without logging in again.

**Parameters:**
| Name | Type   | Description                    |
| ---- | ------ | ------------------------------ |
| user | object | User object with `id` property |
**Returns:**
```js
{ accessToken: string, refreshToken: string }
```

### 🔄 `auth.jwt.refresh(refreshToken)`
Refreshes an **access token** using a valid **refresh token**.
```js
const newTokens = auth.jwt.refresh(refreshToken);
```
 - Validates the refresh token.
 - Issues a new access token and refresh token pair.
 - Throws an error if the token is invalid or expired.
**Parameters:**
| Name         | Type   | Description                  |
| ------------ | ------ | ---------------------------- |
| refreshToken | string | A valid refresh token string |
**Returns:**
```js
{ accessToken: string, refreshToken: string }
```
### ❌ `auth.jwt.revoke(token, revokeTime?)`
Revokes a token immediately or after a specified duration.
```js
await auth.jwt.revoke(token);      // revoke now
await auth.jwt.revoke(token, '5m'); // revoke after 5 minutes
```
If using:
 - `memory`: the token is removed from internal store.
 - `redis`: the key is deleted or set to expire.

### 🚫 `auth.jwt.isRevoked(token)`

Checks if a token is revoked (missing in memory or Redis).
```js
const revoked = await auth.jwt.isRevoked(token);
if (revoked) console.log('Token is no longer valid.');
```
**Returns:** `boolean`

### 🛡️ `auth.jwt.protect(options)`
Express middleware for protecting routes that require authentication.
```js
app.get('/dashboard', auth.jwt.protect(), (req, res) => {
  res.json({ user: req.user });
});
```
Or with extra security options:
```js
app.get('/admin',
  auth.jwt.protect({
    requiredRole: 'admin',
    attachProperty: 'sessionUser',
    onError: (err, req, res) => res.status(403).json({ error: err.message })
  }),
  (req, res) => {
    res.json({ message: `Welcome ${req.sessionUser.id}` });
  });
```
#### Options:
| Name             | Type       | Default                   | Description                                   |
| ---------------- | ---------- | ------------------------- | --------------------------------------------- |
| `attachProperty` | `string`   | `'user'`                  | Where decoded data is attached on the request |
| `requiredRole`   | `string`   | `null`                    | Restricts route access by user role           |
| `cookieName`     | `string`   | Inherited from AuthVerify | Cookie name to extract token                  |
| `headerName`     | `string`   | `'authorization'`         | Header name to look for JWT                   |
| `extractor`      | `function` | —                         | Custom token extraction logic                 |
| `onError`        | `function` | —                         | Custom error handler `(err, req, res)`        |

### 🍪 `auth.jwt.readCookie(req, name)`
Manually extract a JWT from a cookie:
```js
const token = auth.jwt.readCookie(req, 'auth_token');
```
**Returns:** `string | null`

### 🧩 Full Example
```js
const express = require('express');
const AuthVerify = require('auth-verify');

const auth = new AuthVerify({
  jwtSecret: 'supersecret',
  storeTokens: 'memory',
});

const app = express();

app.use(express.json());

// Login: issue JWT
app.post('/login', async (req, res) => {
  const token = await auth.jwt.sign({ id: 'u1', role: 'admin' }, '2h', { res });
  res.json({ token });
});

// Protected route
app.get('/me', auth.jwt.protect(), (req, res) => {
  res.json({ message: `Welcome, ${req.user.id}` });
});

// Logout: revoke token
app.post('/logout', async (req, res) => {
  const token = auth.jwt.readCookie(req, 'auth_token');
  await auth.jwt.revoke(token);
  res.json({ success: true, message: 'Logged out' });
});

app.listen(3000, () => console.log('✅ Auth server running on port 3000'));
```

### 🧠 Notes
 - Works seamlessly with `cookie-parser` or built-in cookie reader.
 - Supports both **stateful (Redis/Memory)** and **stateless (None)** JWT modes.
 - Built-in cookie signing ensures secure browser sessions.
 - Middleware simplifies authentication guards in Express apps.
