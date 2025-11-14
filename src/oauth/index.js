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

    // --- LINKEDIN LOGIN ---
    linkedin({ clientId, clientSecret, redirectUri }) {
        return {
            // Step 1: Redirect user to LinkedIn's authorization page
            redirect(res) {
                const linkedinURL =
                    "https://www.linkedin.com/oauth/v2/authorization?" +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "r_liteprofile r_emailaddress",
                        state: "secure123", // optional: you can randomize this
                    });
                res.redirect(linkedinURL);
            },

            // Step 2: Handle callback, exchange code for token, then get user data
            async callback(code) {
                // Exchange authorization code for access token
                const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        redirect_uri: redirectUri,
                        client_id: clientId,
                        client_secret: clientSecret,
                    }),
                });

                const tokenData = await tokenRes.json();
                if (tokenData.error)
                    throw new Error("OAuth Error: " + tokenData.error_description);

                // Fetch basic profile info
                const profileRes = await fetch("https://api.linkedin.com/v2/me", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const profile = await profileRes.json();

                // Fetch user's primary email
                const emailRes = await fetch(
                    "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
                    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
                );
                const emailData = await emailRes.json();

                return {
                    id: profile.id,
                    name: profile.localizedFirstName + " " + profile.localizedLastName,
                    email: emailData.elements?.[0]?.["handle~"]?.emailAddress || null,
                    access_token: tokenData.access_token,
                };
            },
        };
    }

      // --- APPLE LOGIN ---
    apple({ clientId, clientSecret, redirectUri }) {
        return {
            redirect: (res) => {
                const url =
                    "https://appleid.apple.com/auth/authorize?" +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "name email",
                        response_mode: "form_post",
                    });
                res.redirect(url);
            },
            callback: async (code) => {
                const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenData = await tokenRes.json();
                if (tokenData.error) throw new Error("OAuth Error: " + tokenData.error);
                return tokenData;
            },
        };
    }

    // --- DISCORD LOGIN ---
    discord({ clientId, clientSecret, redirectUri }) {
        return {
            redirect: (res) => {
                const url =
                    "https://discord.com/api/oauth2/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        response_type: "code",
                        scope: "identify email",
                    });
                res.redirect(url);
            },
            callback: async (code) => {
                const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenData = await tokenRes.json();
                if (tokenData.error) throw new Error("OAuth Error: " + tokenData.error);
                const userRes = await fetch("https://discord.com/api/users/@me", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const user = await userRes.json();
                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

    // --- SLACK LOGIN ---
    slack({ clientId, clientSecret, redirectUri }) {
        return {
            redirect: (res) => {
                const url =
                    "https://slack.com/oauth/v2/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        scope: "identity.basic identity.email",
                    });
                res.redirect(url);
            },
            callback: async (code) => {
                const tokenRes = await fetch("https://slack.com/api/oauth.v2.access?" +
                    new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        redirect_uri: redirectUri,
                    }));
                const tokenData = await tokenRes.json();
                if (!tokenData.ok) throw new Error("OAuth Error: " + tokenData.error);
                return { ...tokenData, access_token: tokenData.access_token };
            },
        };
    }

    // --- MICROSOFT LOGIN ---
    microsoft({ clientId, clientSecret, redirectUri }) {
        return {
            redirect: (res) => {
                const url =
                    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        response_type: "code",
                        scope: "User.Read",
                    });
                res.redirect(url);
            },
            callback: async (code) => {
                const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
                return tokenData;
            },
        };
    }

    // --- TELEGRAM LOGIN ---
    telegram({ botId, redirectUri }) {
        return {
            redirect: (res) => {
                const url =
                    "https://t.me/" + botId + "?start=auth&redirect_uri=" + encodeURIComponent(redirectUri);
                res.redirect(url);
            },
            callback: async (code) => {
                // Telegram uses bot login; typically handled via deep links
                return { code, message: "Telegram login uses deep link auth" };
            },
        };
    }

    // --- WHATSAPP LOGIN ---
    whatsapp({ phoneNumberId, redirectUri }) {
        return {
            redirect: (res) => {
                const url =
                    "https://api.whatsapp.com/send?" +
                    new URLSearchParams({
                        phone: phoneNumberId,
                        text: "Please authorize: " + redirectUri,
                    });
                res.redirect(url);
            },
            callback: async (code) => {
                // WhatsApp login usually handled via QR / deep link
                return { code, message: "WhatsApp login uses QR/deep link auth" };
            },
        };
    }

        // --- REDDIT LOGIN ---
    reddit({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const url =
                    "https://www.reddit.com/api/v1/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        response_type: "code",
                        state: "random_state",
                        redirect_uri: redirectUri,
                        duration: "temporary",
                        scope: "identity",
                    });
                res.redirect(url);
            },
            async callback(code) {
                const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                    },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenData = await tokenRes.json();
                const userRes = await fetch("https://oauth.reddit.com/api/v1/me", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const user = await userRes.json();
                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

    // --- YANDEX LOGIN ---
    yandex({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const url =
                    "https://oauth.yandex.com/authorize?" +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: clientId,
                        redirect_uri: redirectUri,
                    });
                res.redirect(url);
            },
            async callback(code) {
                const tokenRes = await fetch("https://oauth.yandex.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                    }),
                });
                const tokenData = await tokenRes.json();
                const userRes = await fetch("https://login.yandex.ru/info", {
                    headers: { Authorization: `OAuth ${tokenData.access_token}` },
                });
                const user = await userRes.json();
                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

    // --- TUMBLR LOGIN ---
    tumbler({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const url =
                    "https://www.tumblr.com/oauth2/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        response_type: "code",
                        redirect_uri: redirectUri,
                    });
                res.redirect(url);
            },
            async callback(code) {
                const tokenRes = await fetch("https://api.tumblr.com/v2/oauth2/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        redirect_uri: redirectUri,
                        client_id: clientId,
                        client_secret: clientSecret,
                    }),
                });
                const tokenData = await tokenRes.json();
                return tokenData;
            },
        };
    }

    // --- MAIL.RU LOGIN ---
    mailru({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const url =
                    "https://oauth.mail.ru/login?" +
                    new URLSearchParams({
                        client_id: clientId,
                        response_type: "code",
                        redirect_uri: redirectUri,
                    });
                res.redirect(url);
            },
            async callback(code) {
                const tokenRes = await fetch("https://oauth.mail.ru/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenData = await tokenRes.json();
                const userRes = await fetch("https://oauth.mail.ru/userinfo", {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                });
                const user = await userRes.json();
                return { ...user, access_token: tokenData.access_token };
            },
        };
    }

    // --- VK LOGIN ---
    vk({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const url =
                    "https://oauth.vk.com/authorize?" +
                    new URLSearchParams({
                        client_id: clientId,
                        display: "page",
                        redirect_uri: redirectUri,
                        response_type: "code",
                        scope: "email",
                        v: "5.131",
                    });
                res.redirect(url);
            },
            async callback(code) {
                const tokenRes = await fetch(
                    "https://oauth.vk.com/access_token?" +
                        new URLSearchParams({
                            client_id: clientId,
                            client_secret: clientSecret,
                            redirect_uri: redirectUri,
                            code,
                        })
                );
                const tokenData = await tokenRes.json();
                return tokenData;
            },
        };
    }

    // --- YAHOO LOGIN ---
    yahoo({ clientId, clientSecret, redirectUri }) {
        return {
            redirect(res) {
                const url =
                    "https://api.login.yahoo.com/oauth2/request_auth?" +
                    new URLSearchParams({
                        client_id: clientId,
                        response_type: "code",
                        redirect_uri: redirectUri,
                        scope: "openid email profile",
                    });
                res.redirect(url);
            },
            async callback(code) {
                const tokenRes = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                    },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenData = await tokenRes.json();
                return tokenData;
            },
        };
    }

    // --- CUSTOM PROVIDER ---
    register(name, fn) {
        if (!name || typeof fn !== "function") throw new Error("Provider registration requires a name and function");
        this.providers[name] = fn;
    }

    use(name, options) {
        const provider = this.providers[name];
        if (!provider) throw new Error(`Provider "${name}" not found`);
        return provider(options);
    }

}

module.exports = OAuthManager;
