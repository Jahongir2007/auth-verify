const base64url = require('base64url');
const crypto = require("crypto");
const Redis = require('ioredis');
const cbor = require("cbor");

class PasskeyManager {
  constructor(options = {}) {
    this.rpName = options.rpName || "auth-verify";
    this.storeType = options.storeTokens || "memory";
    this.saveByToMemory = options.saveBy || "id"; 
    this.ttl = options.passExp || "2m";

    if (this.storeType === "memory") {
      this.tokenStore = new Map();
    } else if (this.storeType === 'redis') {
      this.redis = new Redis(options.redisUrl || "redis://localhost:6379");
    }
  }

  _generateChallenge() {
    return base64url(crypto.randomBytes(32));
  }

  _encode(buffer) {
    return base64url(buffer);
  }

  _decode(str) {
    return Buffer.from(base64url.toBuffer(str));
  }

  _parseTTL() {
    if (typeof this.ttl !== 'string') return this.ttl;
    const ttlValue = parseInt(this.ttl);
    if (this.ttl.endsWith('m')) return ttlValue * 60 * 1000;
    if (this.ttl.endsWith('s')) return ttlValue * 1000;
    throw new Error("TTL must end with 's' or 'm'");
  }

  _setWithTTL(key, challengeValue, ttlMs = 2 * 60 * 1000) {
    this.tokenStore.set(key, {
      value: challengeValue,
      expiresAt: Date.now() + ttlMs
    });
    setTimeout(() => this.tokenStore.delete(key), ttlMs);
  }

  _coseToPEM(coseKey) {
    const x = coseKey.get(-2);
    const y = coseKey.get(-3);
    const pubKeyBuffer = Buffer.concat([Buffer.from([0x04]), x, y]);
    const pubKeyDER = Buffer.concat([
      Buffer.from("3059301306072A8648CE3D020106082A8648CE3D030107034200", "hex"),
      pubKeyBuffer
    ]);
    return "-----BEGIN PUBLIC KEY-----\n" +
      pubKeyDER.toString("base64").match(/.{1,64}/g).join("\n") +
      "\n-----END PUBLIC KEY-----\n";
  }

  async _finishAttestation(clientResponse) {
    const { user, challenge } = this._pending;

    const clientDataJSON = JSON.parse(
      Buffer.from(clientResponse.response.clientDataJSON, 'base64').toString()
    );

    if (clientDataJSON.challenge !== challenge)
      throw new Error("Challenge mismatch");

    const attestationBuffer = Buffer.from(clientResponse.response.attestationObject, 'base64');
    const attestationStruct = await cbor.decodeFirst(attestationBuffer);

    // Parse authData
    const authData = attestationStruct.authData;
    const rpIdHash = authData.slice(0, 32);
    const flags = authData[32];
    const signCount = authData.readUInt32BE(33);

    const credIdLen = authData.readUInt16BE(37);
    const credentialId = authData.slice(39, 39 + credIdLen);

    const coseKeyBytes = authData.slice(39 + credIdLen);
    const coseKey = await cbor.decodeFirst(coseKeyBytes);
    const publicKeyPEM = this._coseToPEM(coseKey);

    // Save credential in user object
    user.credentials = user.credentials || [];
    user.credentials.push({
      id: this._encode(credentialId),
      publicKey: publicKeyPEM,
      signCount
    });

    return { status: "ok", user, credentialId: this._encode(credentialId) };
  }

  async _finishAssertion(clientResponse) {
    const { user, challenge } = this._pending;

    const clientDataJSON = JSON.parse(
      Buffer.from(clientResponse.response.clientDataJSON, 'base64').toString()
    );

    if (clientDataJSON.challenge !== challenge)
      throw new Error("Challenge mismatch");

    const credentialId = this._encode(Buffer.from(clientResponse.id, 'base64'));
    const credential = user.credentials?.find(c => c.id === credentialId);
    if (!credential) throw new Error("Unknown credential");

    const signature = Buffer.from(clientResponse.response.signature, 'base64');
    const authData = Buffer.from(clientResponse.response.authenticatorData, 'base64');

    const verify = crypto.createVerify('SHA256');
    const clientHash = crypto.createHash('sha256').update(Buffer.from(clientResponse.response.clientDataJSON, 'base64')).digest();
    verify.update(Buffer.concat([authData, clientHash]));

    const verified = verify.verify(credential.publicKey, signature);

    return { status: verified ? "ok" : "failed", user };
  }

  async register(user) {
    const challenge = this._generateChallenge();

    if (this.storeType === "memory") {
      this._setWithTTL(user[this.saveByToMemory], challenge, this._parseTTL());
    } else if (this.storeType === "redis") {
      await this.redis.set(user[this.saveByToMemory], challenge, "PX", this._parseTTL());
    }

    this._pending = { type: "register", user, challenge };
    return this;
  }

  async login(user) {
    const challenge = this._generateChallenge();

    if (this.storeType === "memory") {
      this._setWithTTL(user[this.saveByToMemory], challenge, this._parseTTL());
    } else if (this.storeType === "redis") {
      await this.redis.set(user[this.saveByToMemory], challenge, "PX", this._parseTTL());
    }

    this._pending = { type: "login", user, challenge };
    return this;
  }

  getOptions() {
    if (!this._pending) throw new Error("No pending operation");

    const { type, user, challenge } = this._pending;

    if (type === "register") {
      return {
        challenge,
        rp: { name: this.rpName },
        user: {
          id: this._encode(Buffer.from(user.id)),
          name: user.username,
          displayName: user.username
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }]
      };
    } else if (type === "login") {
      return {
        challenge,
        allowCredentials: user.credentials?.map(c => ({
          id: this._decode(c.id),
          type: "public-key"
        })) || [],
        timeout: 60000
      };
    }
  }

  async finish(clientResponse) {
    if (!this._pending) throw new Error("No pending operation");

    let result;
    if (this._pending.type === "register") {
      result = await this._finishAttestation(clientResponse);
    } else if (this._pending.type === "login") {
      result = await this._finishAssertion(clientResponse);
    } else {
      throw new Error("Unknown pending operation");
    }

    this._pending = null;
    return result;
  }
}

module.exports = PasskeyManager;
