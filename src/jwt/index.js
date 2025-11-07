// const jwt = require("jsonwebtoken");
// const Redis = require("ioredis");
// const { parseTime } = require('../helpers/helper');
// const CookieManager = require('./cookie');

// class JWTManager {
//     constructor(secret, options = {}) {
//         if (!secret) throw new Error("JWT secret is required");
//         this.secret = secret;
//         this.storeType = options.storeTokens || "none";

//         if (this.storeType !== 'none') {
//             if (this.storeType === 'memory') {
//                 this.tokenStore = new Map();
//             } else if (this.storeType === 'redis') {
//                 this.redis = new Redis(options.redisUrl || "redis://localhost:6379");
//             } else {
//                 throw new Error("{storeTokens} should be 'none', 'memory', or 'redis'");
//             }
//         }
//     }

//     // Helper: convert expiry string like "1h" / "30m" / "10s" to milliseconds
//     _parseExpiry(expiry) {
//         if (typeof expiry === 'number') return expiry;
//         if (typeof expiry !== 'string') return 3600000; // default 1h

//         const num = parseInt(expiry);
//         if (expiry.endsWith('h')) return num * 60 * 60 * 1000;
//         if (expiry.endsWith('m')) return num * 60 * 1000;
//         if (expiry.endsWith('s')) return num * 1000;
//         return num;
//     }

//     async sign(payload, expiry, options = {}, callback) {
//         if (typeof expiry === 'function') {
//             callback = expiry;
//             expiry = '1h'; // default
//         }

//         const expiryMs = this._parseExpiry(expiry || '1h');  // fallback to '1h'
//         const expiryJwt = typeof expiry === 'number' 
//                   ? Math.floor(expiry / 1000) 
//                   : (typeof expiry === 'string' ? expiry : '1h'); 

//          // Auto-set cookie if res provided
//         if(typeof options == 'function'){
//             callback = options;
//         }

        
//         // Callback version
//         if(callback && typeof callback === 'function') {
//             if(this.storeType === 'redis') return callback(new Error("⚠️ Redis requires async/await use promise style functions"));

//             jwt.sign(payload, this.secret, { expiresIn: expiryJwt }, (err, token) => {
//                 if(err) return callback(err);

//                 if (options.res) {
//                     CookieManager.setCookie(options.res, 'jwt_token', token, {
//                         httpOnly: true,
//                         secure: options.secure ?? true,
//                         sameSite: 'Strict',
//                         maxAge: this._parseTime(expiresIn),
//                     });
//                 }else if(this.storeType === 'memory') {
//                     this.tokenStore.set(token, {payload, createdAt: Date.now()});
//                     setTimeout(() => this.tokenStore.delete(token), expiryMs);
//                 }

//                 callback(null, token);
//             });
//             return;
//         }

//         // Async version
//         const token = await new Promise((res, rej) => {
//             jwt.sign(payload, this.secret, { expiresIn: expiryJwt }, (err, t) => {
//                 if(err) rej(err);
//                 else res(t);
//             });
//         });

//         if (options.res) {
//             CookieManager.setCookie(options.res, 'jwt_token', token, {
//                 httpOnly: true,
//                 secure: options.secure ?? true,
//                 sameSite: 'Strict',
//                 maxAge: this._parseExpiry(expiresIn),
//             });
//         }else if(this.storeType === 'memory') {
//             this.tokenStore.set(token, {payload, createdAt: Date.now()});
//             setTimeout(() => this.tokenStore.delete(token), expiryMs);
//         } else if(this.storeType === 'redis') {
//             await this.redis.set(token, JSON.stringify({payload, createdAt: Date.now()}), "EX", Math.floor(expiryMs/1000));
//         }

//         return token;
//     }

//     async verify(token, callback) {

//         let cookieToken;
//         if(typeof token == 'object' && token.headers){
//             cookieToken = CookieManager.getCookie(token, 'jwt_token');
//             if (!token) throw new Error('JWT not found in cookies');

//             try{
//                 const decoded = jwt.verify(cookieToken, this.secret);
//                 return decoded;
//             }catch(err){
//                 throw new Error('Invalid or expired token');
//             }
//         }

//         // Callback version
//         if (callback && typeof callback === 'function') {
//             if (this.storeType === 'redis') {
//                 return callback(new Error("⚠️ Redis requires async/await. Use Promise style."));
//             }

//             if (this.storeType === 'memory' && !this.tokenStore.has(token)) {
//                 return callback(new Error("❌ Token not found or revoked"));
//             }

//             jwt.verify(token, this.secret, (err, decoded) => {
//                 if (err) {
//                     if (err.name === "TokenExpiredError") return callback(new Error("❌ Token expired!"));
//                     if (err.name === "JsonWebTokenError") return callback(new Error("❌ Invalid token!"));
//                     return callback(new Error("❌ JWT error: " + err.message));
//                 }
//                 callback(null, decoded);
//             });
//             return;
//         }

//         // Async / Promise version
//         try {
//             if (this.storeType === 'memory' && !this.tokenStore.has(token)) {
//                 throw new Error("❌ Token not found or revoked");
//             }

//             if (this.storeType === 'redis') {
//                 const data = await this.redis.get(token);
//                 if (!data) throw new Error("❌ Token not found or revoked");
//             }

//             const decoded = jwt.verify(token, this.secret);
//             return decoded;
//         } catch (err) {
//             throw new Error("❌ JWT verification failed: " + err.message);
//         }
//     }

//     async decode(token, callback) {
//         try {
//             const decoded = jwt.decode(token);
//             // if (callback && typeof callback === 'function') return callback(null, decoded);
//             return decoded;
//         } catch (err) {
//             // if (callback && typeof callback === 'function') return callback(err);
//             throw err;
//         }
//     }

//     // Optional: manual token revoke for memory/redis
//     async revoke(token, revokeTime = 0) {
//         // function parseTime(str) {
//         //     if (typeof str === 'number') return str; // already in ms
//         //     if (typeof str !== 'string') return 0;

//         //     const num = parseInt(str);
//         //     if (str.endsWith('h')) return num * 60 * 60 * 1000;
//         //     if (str.endsWith('m')) return num * 60 * 1000;
//         //     if (str.endsWith('s')) return num * 1000;
//         //     return num;
//         // }

//         const revokeMs = parseTime(revokeTime);
//         const revokeAfter = Date.now() + revokeMs; 


//         if (this.storeType === 'memory') {
//             if(revokeTime == 0){
//                 this.tokenStore.delete(token);
//             }else{
//                 setTimeout(() => this.tokenStore.delete(token), revokeAfter);
//             }
//         }else if(this.storeType == 'redis'){
//             if(revokeTime == 0){
//                 await this.redis.del(token);
//             }else{
//                 await this.redis.pexpire(token, revokeAfter);
//             }
//         }else{
//             throw new Error("❌ {storeTokens} should be 'memory' or 'redis' or 'none'");
//         }
//     }

//     async isRevoked(token) {
//         if(this.storeType === 'memory') {
//             const data = this.tokenStore.get(token);
//             return data?.revokedUntil && data.revokedUntil > Date.now();
//         } else if(this.storeType === 'redis') {
//              const dataRaw = await this.redis.get(token);
//             if (!dataRaw) return true;
//             const data = JSON.parse(dataRaw);
//             return data?.revokedUntil && data.revokedUntil > Date.now();
//         } else {
//             return false; // no store, can't revoke
//         }
//     }

//     async revokeUntil(token, timestamp){
//         // function parseTime(str) {
//         //     if (typeof str === 'number') return str; // already in ms
//         //     if (typeof str !== 'string') return 0;

//         //     const num = parseInt(str);
//         //     if (str.endsWith('h')) return num * 60 * 60 * 1000;
//         //     if (str.endsWith('m')) return num * 60 * 1000;
//         //     if (str.endsWith('s')) return num * 1000;
//         //     return num;
//         // }

//         const revokeMs = parseTime(timestamp);
//         const revokedUntil = Date.now() + revokeMs; 

//         if(this.storeType == 'memory'){
//             const data = this.tokenStore.get(token) || {};
//             this.tokenStore.set(token, {...data, revokedUntil: revokedUntil});
//         }else if(this.storeType == 'redis'){
//             const dataRaw = await this.redis.get(token);
//             const data = dataRaw ? JSON.parse(dataRaw) : {};
//             data.revokedUntil = revokedUntil;
//             await this.redis.set(token, JSON.stringify(data));
//         }else{
//             throw new Error("{storeTokens} should be 'memory' or 'redis'");
//         }
//     }
// }

// module.exports = JWTManager;

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

}

module.exports = JWTManager;
