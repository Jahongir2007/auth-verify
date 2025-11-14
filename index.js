const JWTManager = require("./src/jwt");
const OTPManager = require("./src/otp");
const SessionManager = require("./src/session");
const OAuthManager = require("./src/oauth");
const TOTPManager = require("./src/totp");
const PasskeyManager = require("./src/passkey");
const MagicLinkManager = require("./src/magiclink");
const CryptoManager = require("./src/crypto");

class AuthVerify {
  constructor(options = {}) {
    let {
      jwtSecret = "jwt_secret",
      cookieName = "jwt_token",
      otpExpiry = 300,
      storeTokens = "memory",
      otpHash = "sha256",
      redisUrl,
      useAlg,
      totp = {
        digits: 6,
        step: 30,
        alg: "SHA1"
      },
      rpName = "auth-verify",
      saveBy = "id",
      passExp = "2m",
      mlSecret = "ml_secret",
      mlExpiry = "5m",
      appUrl = "https://yourapp.com",
      hashAlg = "pbkdf2",
      iterations = 100000,
      keyLen = 64
    } = options;

    // ✅ Ensure cookieName and secret always exist
    this.cookieName = cookieName;
    this.jwtSecret = jwtSecret;

    // ✅ Pass both into JWTManager
    this.jwt = new JWTManager(jwtSecret, {
      storeTokens,
      cookieName,
      useAlg
    });

    this.otp = new OTPManager({
      storeTokens,
      otpExpiry,
      otpHash,
      redisUrl,
    });

    this.session = new SessionManager({ storeTokens, redisUrl });
    this.oauth = new OAuthManager();
    this.totp = new TOTPManager(totp);

    this.senders = new Map();

    this.passkey = new PasskeyManager({rpName, storeTokens, saveBy, passExp});
    this.magic = new MagicLinkManager({mlSecret, mlExpiry, appUrl, storeTokens});
    this.crypto = new CryptoManager({hashAlg, iterations, keyLen});
  }

  // --- Session helpers ---
  async createSession(userId, options = {}) {
    return this.session.create(userId, options);
  }

  async verifySession(sessionId) {
    return this.session.verify(sessionId);
  }

  async destroySession(sessionId) {
    return this.session.destroy(sessionId);
  }

  // --- Passkey helpers ---
  async registerPasskey(user) {
    return this.passkey.register(user);
  }

  async finishPasskey(clientResponse) {
    return this.passkey.finish(clientResponse);
  }

  async loginPasskey(user) {
    return this.passkey.login(user);
  }

  // --- Sender registration ---
  register = {
    sender: (name, fn) => {
      if (!name || typeof fn !== "function") {
        throw new Error("Sender registration requires a name and a function");
      }
      this.senders.set(name, fn);
    },
  };

  use(name) {
    const senderFn = this.senders.get(name);
    if (!senderFn) throw new Error(`Sender "${name}" not found`);
    return {
      send: async (options) => await senderFn(options),
    };
  }
}

module.exports = AuthVerify;
