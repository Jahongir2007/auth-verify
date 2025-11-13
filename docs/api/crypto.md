## 🔐 CryptoManager API Guide
It supports both **PBKDF2** and **scrypt** algorithms for password or data hashing.

### 🚀 Overview
The `CryptoManager` class helps developers easily hash and verify passwords or any sensitive data
using strong cryptographic functions. It supports both **Promise** and **callback** styles.

### 🧩 Import and Setup
```js
const AuthVerify = require('auth-verify');

// Default: pbkdf2 algorithm
const auth = new AuthVerify({
  hashAlg: 'pbkdf2', // or 'scrypt'
  iterations: 100000,
  keyLen: 64
});
```
### 🔨 1️⃣ Hash Data
#### Method
```js
async hash(data, [callback])
```
#### Description
Hashes a string (like a password) using the specified algorithm and salt.
You can use **Promise** or **callback** style.
#### Parameters
| Name       | Type        | Description                                  |
| ---------- | ----------- | -------------------------------------------- |
| `data`     | `string`    | The input data to hash (e.g. password)       |
| `callback` | `function?` | Optional Node-style callback `(err, result)` |

#### Returns
An object containing:
```js
{
  hashAlg: "pbkdf2" | "scrypt",
  salt: "<random hex string>",
  hash: "<hashed data in hex>"
}
```
#### Example (Promise)
```js
const result = await auth.crypto.hash("myPassword123");
console.log(result);
// { hashAlg: 'pbkdf2', salt: '...', hash: '...' }
```
#### Example (Callback)
```js
auth.crypto.hash("myPassword123", (err, result) => {
  if (err) return console.error(err);
  console.log(result);
});
```

### 🔍 2️⃣ Verify Data
#### Method
```js
async verify(data, { hashAlg, salt, hash }, [callback])
```
#### Description
Verifies whether a given input matches a stored hash.
#### Parameters
| Name                      | Type        | Description                                   |
| ------------------------- | ----------- | --------------------------------------------- |
| `data`                    | `string`    | The plaintext input (e.g. user password)      |
| `{ hashAlg, salt, hash }` | `object`    | The hash object from `.hash()`                |
| `callback`                | `function?` | Optional Node-style callback `(err, isValid)` |

#### Returns
A boolean value:
 - `true` → data matches
 - `false` → mismatch
#### Example (Promise)
```js
const result = await cryptoManager.hash("secret123");
const isValid = await cryptoManager.verify("secret123", result);
console.log(isValid); // true
```
#### Example (Callback)
```js
const original = await cryptoManager.hash("secret123");

cryptoManager.verify("secret123", original, (err, valid) => {
  if (err) throw err;
  console.log(valid); // true
});
```
### 📊 3️⃣ Summary Table
| Method                                              | Description                         | Returns                   | Async |
| --------------------------------------------------- | ----------------------------------- | ------------------------- | ----- |
| `hash(data, [callback])`                            | Hashes input using PBKDF2 or scrypt | `{ hashAlg, salt, hash }` | ✅     |
| `verify(data, { hashAlg, salt, hash }, [callback])` | Verifies input against hash         | `boolean`                 | ✅     |

### 🧠 Notes
 - Both PBKDF2 and scrypt are **strong**, **salted**, **one-way** hashing algorithms.
 - Use PBKDF2 for compatibility; use scrypt for better memory-hard protection.
 - Salt ensures that each hash output is unique even for identical inputs.
 - The default iteration count (100,000) is secure but can be increased for stronger protection.

### 🧪 Example Full Flow
```js
(async () => {
  const manager = new CryptoManager({ hashAlg: 'scrypt' });

  // Hash password
  const hashData = await manager.hash('MyStrongPassword');
  console.log('Stored hash:', hashData);

  // Verify password
  const match = await manager.verify('MyStrongPassword', hashData);
  console.log('Password valid:', match);
})();
```
