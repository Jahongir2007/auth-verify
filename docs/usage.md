# auth-verify Usage Guide

This document explains how to use the `auth-verify` library for OTP and email verification in Node.js projects.

---

## 1. Installation

```bash
npm install auth-verify
```
## 2. Initialization
Create a new Verifier instance:

```js
const Verifier = require('auth-verify');

const verifier = new Verifier({
    sender: 'your_email@example.com',
    pass: 'your_email_password',
    serv: 'gmail',
    otp: {
        leng: 6,
        expMin: 3,
        limit: 5,
        cooldown: 60
    }
});
```
## 3. Sending OTP
```js
verifier
    .html("<h1>Your OTP is {otp}</h1>")
    .subject("Verify your account: {otp}")
    .text("Your OTP is {otp}")
    .sendTo('user@example.com', (err, success) => {
        if (err) console.error(err);
        console.log("OTP sent!");
    });
```
Tip: {otp} placeholder will automatically be replaced with the generated code.

## 4. Verifying OTP
```js
verifier.code('123456').verifyFor('user@example.com', (err, valid) => {
    if (err) console.error(err);
    console.log(valid ? "✅ OTP verified" : "❌ Invalid or expired OTP");
});
```
## 5. Fetching OTP Info (for testing)
```js
verifier.getOTP('user@example.com', (err, data) => {
    if (err) console.error(err);
    console.log(data); // { code: '123456', expiresAt: '2025-09-28T...' }
});
```
## 6. Cleaning Expired OTPs
```js
verifier.cleanExpired(); // Deletes expired OTPs from database
```
7. Notes
SQLite database authverify.db is automatically created in your project root.

You can configure OTP length, expiry, request limits, and cooldown in the constructor.

Use a Gmail App Password if using Gmail for sending emails.

The library is fully asynchronous and uses callbacks.
