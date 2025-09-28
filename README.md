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
