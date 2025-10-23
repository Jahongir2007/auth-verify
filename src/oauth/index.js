// src/managers/oauth.js

class OAuthManager {
    constructor(config = {}) {
        this.providers = config.providers || {};
    }

    // --- GOOGLE LOGIN ---
    google({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const googleURL =
                    "https://accounts.google.com/o/oauth2/v2/auth?" +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        response_type: "code",
                        scope: "openid email profile",
                        access_type: "offline",
                        prompt: "consent",
                    });
                res.redirect(googleURL);
            },

            async callback(code) {
                // Step 1: Exchange code for access token
                const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        redirect_uri: redirectUri,
                        grant_type: "authorization_code",
                    }),
                });

                const tokenData = await tokenRes.json();
                if (tokenData.error) throw new Error("OAuth Error: " + tokenData.error);

                // Step 2: Get user info
                const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const user = await userRes.json();

                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

     // --- FACEBOOK LOGIN ---
    facebook({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const fbURL =
                    "https://www.facebook.com/v19.0/dialog/oauth?" +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "email,public_profile",
                        response_type: "code",
                    });
                res.redirect(fbURL);
            },

            async callback(code) {
                const tokenRes = await fetch(
                    `https://graph.facebook.com/v19.0/oauth/access_token?` +
                        new URLSearchParams({
                            client_id: clientId,
                            client_secret: clientSecret,
                            redirect_uri: redirectUri,
                            code,
                        })
                );

                const tokenData = await tokenRes.json();
                if (tokenData.error) throw new Error("OAuth Error: " + tokenData.error.message);

                const userRes = await fetch(
                    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
                );
                const user = await userRes.json();

                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

    // --- GITHUB LOGIN ---
    github({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const githubURL =
                    "https://github.com/login/oauth/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "user:email",
                        allow_signup: "true",
                    });
                res.redirect(githubURL);
            },

            async callback(code) {
                const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        redirect_uri: redirectUri,
                    }),
                });

                const tokenData = await tokenRes.json();
                if (tokenData.error) throw new Error("OAuth Error: " + tokenData.error);

                const userRes = await fetch("https://api.github.com/user", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const user = await userRes.json();

                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

    // --- X (TWITTER) LOGIN ---
    x({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const twitterURL =
                    "https://twitter.com/i/oauth2/authorize?" +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "tweet.read users.read offline.access",
                        state: "state123",
                        code_challenge: "challenge",
                        code_challenge_method: "plain",
                    });
                res.redirect(twitterURL);
            },

            async callback(code) {
                const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization:
                            "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                    },
                    body: new URLSearchParams({
                        code,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                        code_verifier: "challenge",
                    }),
                });

                const tokenData = await tokenRes.json();
                if (tokenData.error) throw new Error("OAuth Error: " + tokenData.error);

                const userRes = await fetch("https://api.twitter.com/2/users/me", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const user = await userRes.json();

                return { ...user, access_token: tokenData.access_token };
            },
        };
    }
}

module.exports = OAuthManager;
