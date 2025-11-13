## 📝 SessionManager API Documentation - `auth-verify`
The session manager of `auth-verify` provides a simple way to **create**, **verify**, and **destroy user sessions** in either **memory** or **Redis** storage.

### Import
```js
const AuthVerify = require('auth-verify');
const auth = new AuthVerify({ storeTokens: 'redis', redisUrl: "redis://localhost:6379" });
```
##### Options:
| Option        | Type   | Default                    | Description                                               |
| ------------- | ------ | -------------------------- | --------------------------------------------------------- |
| `storeTokens` | string | `'memory'`                 | Storage type for sessions: `'memory'` or `'redis'`        |
| `redisUrl`    | string | `"redis://localhost:6379"` | Redis connection URL (required if `storeTokens: 'redis'`) |

### Methods
#### 1️⃣ `create(userId, options)`
Create a new session for a user.
**Parameters:**
| Name      | Type   | Required | Description                             |           |
| --------- | ------ | -------- | --------------------------------------- | --------- |
| `userId`  | string | ✅        | Unique ID of the user                   |           |
| `options` | object | ❌        | Optional settings: `{ expiresIn: number | string }` |

`expiresIn` formats:
 - Number → seconds
 - String → `"30s"`, `"5m"`, `"2h"`, `"1d"`
##### **Returns:**
`Promise<string>` → The session ID (UUID)
##### **Example:**
```js
// Memory storage
const auth = new AuthVerify({ storeTokens: 'memory' });
const sessionId = await auth.session.create("user123", { expiresIn: "2h" });
console.log(sessionId); // "550e8400-e29b-41d4-a716-446655440000"
```
#### 2️⃣ `verify(sessionId)`
Verify if a session is valid.
##### **Parameters:**
| Name        | Type   | Required | Description              |
| ----------- | ------ | -------- | ------------------------ |
| `sessionId` | string | ✅        | The session ID to verify |
##### Returns:
`Promise<string>` → Returns the `userId` if session is valid
##### Throws:
 - `"Session not found or expired"`
 - `"Session expired"`
##### Example:
```js
const userId = await auth.session.verify(sessionId);
console.log(userId); // "user123"
```
#### 3️⃣ `destroy(sessionId)`
Invalidate (destroy) a session manually.
##### Parameters:
| Name        | Type   | Required | Description               |
| ----------- | ------ | -------- | ------------------------- |
| `sessionId` | string | ✅        | The session ID to destroy |
##### Returns:
`Promise<void>`
##### Example:
```js
await auth.session.destroy(sessionId);
console.log("Session destroyed");
```

### Notes & Best Practices
 - **Memory** storage is fast but not persistent across server restarts. Use **Redis** in production.
 - Always verify session before allowing access to protected routes.
 - Optionally, combine with JWT or OTP for multi-layered authentication.
 - Use `expiresIn` wisely — shorter times improve security but may require more frequent re-login.
