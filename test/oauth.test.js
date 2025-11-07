// __tests__/authVerify.oauth.direct.test.js
const AuthVerify = require("../index"); // your wrapper

describe("AuthVerify OAuth - Direct Provider Tests", () => {
    let auth;
    let res;

    beforeEach(() => {
        auth = new AuthVerify();
        res = { redirect: jest.fn() }; // mock Express response
    });

    beforeAll(() => {
        global.fetch = jest.fn(); // mock fetch
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("Apple redirect and callback", async () => {
        const apple = auth.oauth.apple({
            clientId: "apple_id",
            clientSecret: "apple_secret",
            redirectUri: "http://localhost/callback",
        });

        apple.redirect(res);
        expect(res.redirect).toHaveBeenCalled();
        expect(res.redirect.mock.calls[0][0]).toContain("https://appleid.apple.com/auth/authorize");

        global.fetch.mockResolvedValueOnce({ json: async () => ({ access_token: "apple_token" }) });
        const tokenData = await apple.callback("code123");
        expect(tokenData.access_token).toBe("apple_token");
    });

    test("Discord redirect and callback", async () => {
        const discord = auth.oauth.discord({
            clientId: "discord_id",
            clientSecret: "discord_secret",
            redirectUri: "http://localhost/callback",
        });

        discord.redirect(res);
        expect(res.redirect).toHaveBeenCalled();

        global.fetch
            .mockResolvedValueOnce({ json: async () => ({ access_token: "discord_token" }) })
            .mockResolvedValueOnce({ json: async () => ({ id: "discord_123", username: "user" }) });

        const userData = await discord.callback("code123");
        expect(userData.access_token).toBe("discord_token");
        expect(userData.id).toBe("discord_123");
    });

    test("Telegram callback returns message", async () => {
        const telegram = auth.oauth.telegram({ botId: "bot123", redirectUri: "http://localhost/callback" });
        const tResult = await telegram.callback("code123");
        expect(tResult.message).toContain("Telegram login");
    });

    test("WhatsApp callback returns message", async () => {
        const whatsapp = auth.oauth.whatsapp({ phoneNumberId: "12345", redirectUri: "http://localhost/callback" });
        const wResult = await whatsapp.callback("code456");
        expect(wResult.message).toContain("WhatsApp login");
    });

    test("Slack and Microsoft redirect URLs", () => {
        const slack = auth.oauth.slack({ clientId: "slack_id", redirectUri: "http://localhost/callback" });
        slack.redirect(res);
        expect(res.redirect).toHaveBeenCalled();

        const ms = auth.oauth.microsoft({ clientId: "ms_id", redirectUri: "http://localhost/callback" });
        ms.redirect(res);
        expect(res.redirect).toHaveBeenCalledTimes(2);
    });
});
