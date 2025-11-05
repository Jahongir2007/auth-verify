// totp.js
const crypto = require("crypto");
const base32 = require("./base32");

class TOTPManager {
  constructor(options = {}) {
    this.step = options.step || 30;
    this.digits = options.digits || 6;
    this.algorithm = (options.alg || "SHA1").toUpperCase();
  }

  // generate random Base32 secret
  secret(length = 20) {
    const buf = crypto.randomBytes(length);
    return base32.encode(buf);
  }

  // generate TOTP code
  generate(secret) {
    const time = Math.floor(Date.now() / 1000 / this.step);
    return this._hotp(secret, time);
  }

  // verify code from user
  verify(secret, code, window = 1) {
    // check ± 1 window to allow delay
    const time = Math.floor(Date.now() / 1000 / this.step);
    for (let i = -window; i <= window; i++) {
      const otp = this._hotp(secret, time + i);
      if (otp === code) return true;
    }
    return false;
  }

  // build key URI for authenticator apps
  uri({ label, secret, issuer }) {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=${this.algorithm}&digits=${this.digits}&period=${this.step}`;
  }

  // optional QR for CLI users (we can integrate QR lib later)
  async qrcode(uri) {
    const qrcode = require("qrcode");
    return await qrcode.toDataURL(uri);
  }

  // internal HOTP algorithm
  _hotp(secret, counter) {
    const key = base32.decode(secret);

    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / Math.pow(2, 32)), 0);
    buf.writeUInt32BE(counter & 0xffffffff, 4);

    const hmac = crypto.createHmac(this.algorithm, key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;

    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);

    return (code % 10 ** this.digits).toString().padStart(this.digits, "0");
  }
}

module.exports = TOTPManager;
