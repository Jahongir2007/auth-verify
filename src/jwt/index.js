const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const CookieManager = require("./cookie");

class JWTManager {
    constructor(secret, options = {}) {
        // if (!secret) throw new Error("JWT secret is required");
        this.secret = secret || "jwt_secret";
        this.cookieName = options.cookieName || "jwt_token";
        this.storeType = options.storeTokens || "memory";
        this.jwtAlgorithm = options.useAlg || "HS256";

        if (this.storeType === "memory") {
            this.tokenStore = new Map();
        } else if (this.storeType === "redis") {
            this.redis = new Redis(options.redisUrl || "redis://localhost:6379");
        } else if (this.storeType !== "none") {
            throw new Error("{storeTokens} must be 'none', 'memory', or 'redis'");
        }
    }

    _parseExpiry(expiry) {
        if (typeof expiry === "number") return expiry;
        if (typeof expiry !== "string") return 3600000; // default 1h
        const num = parseInt(expiry);
        if (expiry.endsWith("d")) return num * 3600000 * 24;
        if (expiry.endsWith("h")) return num * 3600000;
        if (expiry.endsWith("m")) return num * 60000;
        if (expiry.endsWith("s")) return num * 1000;
        return num;
    }

    async sign(payload, expiry = "1h", options = {}, callback) {
        if (typeof expiry === "function") {
            callback = expiry;
            expiry = "1h";
        }
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        const expiryMs = this._parseExpiry(expiry);
        const expiryJwt = typeof expiry === "number"
            ? Math.floor(expiry / 1000)
            : expiry;

        const createToken = () =>
            new Promise((resolve, reject) => {
                jwt.sign(payload, this.secret, { expiresIn: expiryJwt, algorithm: this.jwtAlgorithm}, (err, token) => {
                    if (err) return reject(err);
                    // console.log(this.jwtAlgorithm);
                    resolve(token);
                });
            });

        const token = await createToken();

        // Save token if needed
        if (this.storeType === "memory") {
            this.tokenStore.set(token, { payload, createdAt: Date.now() });
            setTimeout(() => this.tokenStore.delete(token), expiryMs);
        } else if (this.storeType === "redis") {
            await this.redis.set(token, JSON.stringify({ payload, createdAt: Date.now() }), "EX", Math.floor(expiryMs / 1000));
        }

        // Auto cookie support
        if (options.res) {
            CookieManager.setCookie(options.res, this.cookieName, token, {
                httpOnly: true,
                secure: options.secure ?? true,
                sameSite: "Strict",
                maxAge: expiryMs,
            });
        }

        if (callback) return callback(null, token);
        return token;
    }

    async verify(input, callback) {
        let token = input;

        // If request object provided
        if (typeof input === "object" && input.headers) {
            token =
                CookieManager.getCookie(input, this.cookieName) ||
                (input.headers.authorization
                    ? input.headers.authorization.replace("Bearer ", "")
                    : null);

            if (!token) throw new Error("JWT not found in cookies or headers");
        }

        try {
            const decoded = jwt.verify(token, this.secret);

            if (this.storeType === "memory" && !this.tokenStore.has(token))
                throw new Error("Token not found or revoked");

            if (this.storeType === "redis") {
                const data = await this.redis.get(token);
                if (!data) throw new Error("Token not found or revoked");
            }

            if (callback) return callback(null, decoded);
            return decoded;
        } catch (err) {
            if (callback) return callback(err);
            throw new Error("JWT verification failed: " + err.message);
        }
    }

    async decode(token) {
        return jwt.decode(token);
    }

    async revoke(token, revokeTime = 0) {
        const revokeMs = this._parseExpiry(revokeTime);

        if (this.storeType === "memory") {
            if (revokeTime === 0) this.tokenStore.delete(token);
            else setTimeout(() => this.tokenStore.delete(token), revokeMs);
        } else if (this.storeType === "redis") {
            if (revokeTime === 0) await this.redis.del(token);
            else await this.redis.pexpire(token, revokeMs);
        }
    }

    async isRevoked(token) {
        if (this.storeType === "memory") return !this.tokenStore.has(token);
        if (this.storeType === "redis") return !(await this.redis.get(token));
        return false;
    }

    async revokeUntil(token, timestamp) {
        const revokeMs = this._parseExpiry(timestamp);
        const revokedUntil = Date.now() + revokeMs;

        if (this.storeType === "memory") {
            const data = this.tokenStore.get(token) || {};
            this.tokenStore.set(token, { ...data, revokedUntil });
        } else if (this.storeType === "redis") {
            const dataRaw = await this.redis.get(token);
            const data = dataRaw ? JSON.parse(dataRaw) : {};
            data.revokedUntil = revokedUntil;
            await this.redis.set(token, JSON.stringify(data));
        }
    }

    // JWT middleware part
    readCookie(req, name) {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) return null;

        const cookies = cookieHeader.split(';').map(v => v.trim());
        for (const c of cookies) {
            const [key, val] = c.split('=');
            if (key === name) return val;
        }
        return null;
    }

    protect(options = {}) {
        // customizable messages / behavior
        const {
            onError,
            attachProperty = "user",   // where to put decoded data on req
            requiredRole = null,        // optional: role check
            cookieName = this.cookieName,
            headerName = "authorization",
            extractor = null
        } = options;

        return async (req, res, next) => {
            try {
                // read token (cookie → header)
                let token = null;

                if (extractor && typeof extractor === "function") {
                    token = extractor(req);
                }

                if(!token && req.headers[headerName]){
                    if(headerName == "authorization"){
                        token = req.headers.authorization.split(" ")[1];
                    }else{
                        token = req.headers[headerName]; // custom header — return raw
                    }
                }

                if (!token) {
                    token = this.readCookie(req, cookieName);
                }

                if (!token) throw new Error("NO_TOKEN");

                const decoded = await this.verify(token);

                // role guard?
                if (requiredRole && decoded.role !== requiredRole) {
                    throw new Error("ROLE_NOT_ALLOWED");
                }

                // attach user
                req[attachProperty] = decoded;

                next();
            } catch (err) {
                if (onError) return onError(err, req, res);

                return res.status(401).json({
                    success: false,
                    error: err.message
                });
            }
        };
    }

    issue(user) {
        const accessToken = jwt.sign({ id: user.id }, this.secret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, this.secret, { expiresIn: '7d' });
        return { accessToken, refreshToken };
    }

    refresh(refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, this.secret);
            if (payload.type !== 'refresh') throw new Error('Invalid token');
            return this.issue({ id: payload.id });
        } catch (err) {
            throw new Error('Token expired or invalid');
        }
  }

}

module.exports = JWTManager;
