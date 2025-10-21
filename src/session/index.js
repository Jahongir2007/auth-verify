const Redis = require("ioredis");
const { v4: uuidv4 } = require("uuid");

class SessionManager {
    constructor(options = {}) {
        this.storeType = options.storeTokens || 'memory'; // 'memory' or 'redis'

        if (this.storeType === 'memory') {
            this.sessions = new Map();
        } else if (this.storeType === 'redis') {
            this.redis = new Redis(options.redisUrl || "redis://localhost:6379");
        } else {
            throw new Error("{storeTokens} should be 'memory' or 'redis'");
        }
    }

    // Create a session
    async create(userId, options = {}) {
        const sessionId = uuidv4();
        const expiresIn = options.expiresIn || 3600; // default 1 hour
        if (typeof expiresIn === "string") {
        const timeValue = parseInt(expiresIn);
            if (expiresIn.endsWith("s")) expiresIn = timeValue;
            else if (expiresIn.endsWith("m")) expiresIn = timeValue * 60;
            else if (expiresIn.endsWith("h")) expiresIn = timeValue * 60 * 60;
            else if (expiresIn.endsWith("d")) expiresIn = timeValue * 60 * 60 * 24;
            else throw new Error("Invalid expiresIn format (use s, m, h, d)");
        }
        const now = Date.now();

        const sessionData = {
            userId,
            createdAt: now,
            expiresAt: now + expiresIn * 1000
        };

        if (this.storeType === 'memory') {
            this.sessions.set(sessionId, sessionData);
        } else if (this.storeType === 'redis') {
            await this.redis.set(
                sessionId,
                JSON.stringify(sessionData),
                "EX",
                expiresIn
            );
        }

        return sessionId;
    }

    // Verify a session
    async verify(sessionId) {
        let data;
        if (this.storeType === 'memory') {
            data = this.sessions.get(sessionId);
        } else if (this.storeType === 'redis') {
            const raw = await this.redis.get(sessionId);
            data = raw ? JSON.parse(raw) : null;
        }

        if (!data) throw new Error("Session not found or expired");

        if (Date.now() > data.expiresAt) {
            await this.destroy(sessionId);
            throw new Error("Session expired");
        }

        return data.userId;
    }

    // Destroy a session
    async destroy(sessionId) {
        if (this.storeType === 'memory') {
            this.sessions.delete(sessionId);
        } else if (this.storeType === 'redis') {
            await this.redis.del(sessionId);
        }
    }
}

module.exports = SessionManager;
