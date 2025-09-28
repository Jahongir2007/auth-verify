# auth-verify

`auth-verify` is a **Node.js library** for handling **OTP (One-Time Password) generation, email verification, and expiration tracking**. It provides secure OTP generation, rate-limiting, cooldowns, and integration with **Nodemailer** for sending verification emails.  

---

## Features

- Generate secure OTP codes  
- Send OTP via **email** using Nodemailer  
- Verify OTP codes with expiration checks  
- Limit OTP requests per day and enforce cooldowns  
- Store OTPs in a **SQLite database**  
- Fully asynchronous with callback support  

---

## Installation

```bash
npm install auth-verify
```
### 🚀 Quick Start

##### 1. Initialize Verifier
```js
const Verifier = require('auth-verify');

const verifier = new Verifier({
    sender: 'your_email@example.com',
    pass: 'your_email_password',
    serv: 'gmail', // SMTP service name
    otp: {
        leng: 6,        // OTP length (default: 6)
        expMin: 3,      // OTP expiration in minutes (default: 3)
        limit: 5,       // Max requests per day (default: 5)
        cooldown: 60    // Cooldown between requests in seconds (default: 60)
    }
});
```
##### 2. Send OTP
```js
verifier
    .html("<h1>Your OTP is {otp}</h1>")   // optional HTML template
    .subject("Verify your account: {otp}") // optional subject
    .text("Your OTP is {otp}")            // optional plain text
    .sendTo('user@example.com', (err, success) => {
        if (err) return console.error(err);
        console.log("OTP sent successfully!");
    });
```
##### 3. Verify OTP
```js
verifier.code('123456').verifyFor('user@example.com', (err, isValid) => {
    if (err) return console.error(err);
    console.log(isValid ? "✅ OTP verified" : "❌ Invalid or expired OTP");
});
```
##### 4. Get OTP Details (for testing/debugging)
```js
verifier.getOTP('user@example.com', (err, data) => {
    if (err) return console.error(err);
    console.log(data); // { code: '123456', expiresAt: '2025-09-28T...' }
});
```
##### 5. Clean Expired OTPs
```js
verifier.cleanExpired(); // Deletes expired OTPs from the database
```
#### API Reference
`new Verifier(options)`

`sender` – sender email for Nodemailer

`pass` – email password

`serv` – SMTP service name

`otp` – object:

`leng` (number) – OTP length (default: 6)

`expMin` (number) – OTP expiration in minutes (default: 3)

`limit` (number) – Max requests per day (default: 5)

`cooldown` (number) – Cooldown in seconds between requests (default: 60)

Methods

`html(content)` – Sets optional HTML content with {otp} placeholder

`subject(content)` – Sets optional email subject with {otp} placeholder

`text(content)` – Sets optional plain text with {otp} placeholder

`sendTo(email, callback)` – Sends OTP to an email

`code(otp)` – Set user-provided OTP for verification

`verifyFor(email, callback)` – Verify OTP for the given email

`getOTP(email, callback)` – Retrieve OTP and expiration from DB

`cleanExpired()` – Delete expired OTPs from database

Database

Uses SQLite (authverify.db) to store:

Email

OTP code

Expiration timestamp

Request count

Last request timestamp
