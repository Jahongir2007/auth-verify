const express = require("express");
const cors = require("cors");
const AuthVerify = require("../index");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const router = express.Router();   // FIXED

const auth = new AuthVerify();

// If user enters any route ("/", "/docs", etc) send homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Generating OTP (just generate code, no sending)
router.post('/auth/otp/generate/:leng', async (req, res) => {
    try {
        let { leng } = req.params;
        const length = leng ? parseInt(leng) : 6;  // default 6 digits if undefined

        const otp = auth.otp.generate(length);

        return res.json({
            ok: true,
            code: otp.code,
            length
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: "Failed to generate OTP", message: err.message });
    }
});


// ----------- Gmail Provider -------------
router.post('/auth/otp/send/gmail/:to', async (req, res) => {
    try {
        const { to } = req.params;
        const { email, pass, subject, text, html } = req.body.sender || {};

        if (!email || !pass) {
            return res.status(400).json({ error: "Missing sender email or password" });
        }

        auth.otp.sender({
            via: 'email',
            service: 'gmail',
            sender: email,
            pass
        });

        const info = await auth.otp.send(to, {
            subject: subject || "Your OTP Code",
            text: text || "",
            html: html || ""
        });

        return res.json({
            ok: true,
            provider: "gmail",
            to
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to send OTP" });
    }
});

// ----------- SMTP Provider -------------
router.post('/auth/otp/send/email/:to', async (req, res) => {
    try {
        const { to } = req.params;
        const { email, pass, host, port, secure, subject, text, html } = req.body.sender || {};

        if (!email || !pass || !host || !port) {
            return res.status(400).json({ error: "Missing sender email or pass or host or port" });
        }

        auth.otp.sender({
            via: 'email',
            host,
            port,
            secure: secure || false,
            sender: email,
            pass
        });

        const info = await auth.otp.send(to, {
            subject: subject || "Your OTP Code",
            text: text || "",
            html: html || ""
        });

        return res.json({
            ok: true,
            provider: "smtp",
            to
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to send OTP" });
    }
});

// ------ OTP SMS -------
router.post('/auth/otp/send/sms/:to', async (req, res)=>{
    try {
        const { to } = req.params;
        const { provider, apiKey, apiSecret, sender, text } = req.body.sender || {};

        if(!provider || !apiKey || !apiSecret || !sender) return res.status(400).json({error: "Missing sender provider or apiKey or apiSecret or sender"}); 

        auth.otp.sender({
            via: 'sms',
            provider,
            apiKey,
            apiSecret,
            sender, 
            mock: false
        });

        const info = await auth.otp.send(to, {text});

        return res.json({
            ok: true,
            provider,
            to
        });
    } catch(err){
        console.error(err);
        return res.status(500).json({ error: "Failed to send OTP with SMS" });
    }
});

// Verify OTP sent by email
router.post('/auth/otp/verify/:to', async (req, res) => {
    try {
        const { to } = req.params;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ success: false, message: "Missing OTP code" });
        }

        const valid = await auth.otp.verify(to, otp);

        if (valid) {
            return res.status(200).json({ success: true, message: "OTP verified", to });
        } else {
            return res.status(400).json({ success: false, message: "OTP is incorrect", to });
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Failed to verify OTP", error: err.message });
    }
});


// mount router
app.use("/api", router);   // IMPORTANT!!

app.listen(3000, () => {
    console.log("REST API running on port 3000");
});
