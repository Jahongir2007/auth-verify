const crypto = require('crypto');
const nodemailer = require("nodemailer");
const axios = require('axios');

/**
 * Convert time strings like "1h", "30m", "10s" to milliseconds
 */
function parseTime(str) {
    if (typeof str === 'number') return str; // already ms
    if (typeof str !== 'string') return 0;

    const num = parseInt(str);
    if (str.endsWith('h')) return num * 60 * 60 * 1000;
    if (str.endsWith('m')) return num * 60 * 1000;
    if (str.endsWith('s')) return num * 1000;
    return num;
}

/**
 * Generate a random numeric OTP of given length
 */
function generateSecureOTP(length = 6, hash = 'sha256') {
    // Create random bytes
    const randomBytes = crypto.randomBytes(32); 
    // Hash the bytes
    const hashed = crypto.createHash(hash).update(randomBytes).digest('hex');
    
    // Convert to numeric OTP
    let otp = '';
    for (let i = 0; i < hashed.length && otp.length < length; i++) {
        const char = hashed[i];
        if (!isNaN(char)) otp += char;
    }

    // If not enough digits, recursively generate more
    if (otp.length < length) return generateSecureOTP(length, hash);
    return otp.slice(0, length);
}

function otpSendingProcessByEmail({senderService, senderEmail, senderPass, senderHost, senderPort, senderSecure, receiverEmail, senderText, senderSubject, senderHtml}){
    if(senderService == 'gmail'){
        const transporter = nodemailer.createTransport({
            service: senderService,
            auth: {
                user: senderEmail,
                pass: senderPass, // not your normal password
             },
        });

        if(senderText && !senderHtml){
            transporter.sendMail({
                from: senderEmail,
                to: receiverEmail,
                subject: senderSubject,
                text: senderText,
                // html: senderHtml
            }, (err, info) => {
            if (err) return console.error("❌ Failed:", err);
                // console.log("✅ Email sent:", info.response);
            });
        }else if (senderHtml && !senderText){
            transporter.sendMail({
                from: senderEmail,
                to: receiverEmail,
                subject: senderSubject,
                // text: senderText,
                html: senderHtml
            }, (err, info) => {
            if (err) return console.error("❌ Failed:", err);
                // console.log("✅ Email sent:", info.response);
            });
        }
    }else{
        const transporter = nodemailer.createTransport({
            host: senderHost,
            port: senderPort,
            secure: senderSecure, // true for 465, false for others
            auth: {
                user: senderEmail,
                pass: senderPass,
            },
        });

        if(senderText && !senderHtml){
            transporter.sendMail({
                from: senderEmail,
                to: receiverEmail,
                subject: senderSubject,
                text: senderText,
                // html: senderHtml
            }, (err, info) => {
            if (err) return console.error("❌ Failed:", err);
                // console.log("✅ Email sent:", info.response);
            });
        }else if (senderHtml && !senderText){
            transporter.sendMail({
                from: senderEmail,
                to: receiverEmail,
                subject: senderSubject,
                // text: senderText,
                html: senderHtml
            }, (err, info) => {
            if (err) return console.error("❌ Failed:", err);
                // console.log("✅ Email sent:", info.response);
            });
        }
    }
}

async function resendGeneratedOTP({from, to, pass, service, host, secure, port, subject, text, html, code}, callbackData){
    if(callbackData && typeof callbackData == 'function'){
        // const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
        let transporter;
        if (service === 'gmail') {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: from, pass }
            });
        } else if (service === 'smtp') {
            transporter = nodemailer.createTransport({
                host,
                port,
                secure: !!secure,
                auth: { user: from, pass }
        });
        } else {
            throw new Error(`Unsupported email service: ${service}`);
        }
        // prepare mail
        const mail = {
            from,
            to,
            subject: subject || 'Your OTP Code',
            text: text || `Your OTP is ${code}`,
            html: html || `<p>Your OTP is <b>${code}</b></p>`
        };
        transporter.sendMail(mail, (err, info)=>{
            if(err) return callbackData(new Error(err));
            callbackData(null, info);
        });
    }else{
        try{
            let transporter;
            if (service === 'gmail') {
                transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: from, pass }
                });
            } else if (service === 'smtp') {
                transporter = nodemailer.createTransport({
                    host,
                    port,
                    secure: !!secure,
                    auth: { user: from, pass: pass }
                });
            } else {
                throw new Error(`Unsupported email service: ${service}`);
            }
            // prepare mail
            const mail = {
                from,
                to,
                subject: subject || 'Your OTP Code',
                text: text || `Your OTP is ${code}`,
                html: html || `<p>Your OTP is <b>${code}</b></p>`
            };
            await transporter.sendMail(mail);
        }catch(err){
            throw new Error(err);
        }
    }
}

async function sendSMS({
  provider,
  apiKey,
  apiSecret,
  from,
  to,
  text,
  mock = false,
  email,
  password,
  token,
  region,
  template_id
}) {
  try {
    // 🧪 Mock mode
    if (mock) {
      console.log(`📱 [Mock SMS via ${provider}]`);
      return { status: "SENT (mock)", to, text };
    }

    //
    // ─────────────────────────────────────────
    //  Already existing providers (Your ones)
    // ─────────────────────────────────────────
    //

    // 🔷 Infobip
    if (provider === "infobip") {
      await axios.post(
        "https://api.infobip.com/sms/2/text/advanced",
        { messages: [{ from, destinations: [{ to }], text }] },
        { headers: { Authorization: `App ${apiKey}` } }
      );
      return { status: "SENT", provider: "Infobip", to };
    }

    // 🟪 Vonage
    if (provider === "vonage") {
      await axios.post(
        "https://rest.nexmo.com/sms/json",
        { api_key: apiKey, api_secret: apiSecret, to, from, text },
        { headers: { "Content-Type": "application/json" } }
      );
      return { status: "SENT", provider: "Vonage", to };
    }

    // 🟩 Twilio
    if (provider === "twilio") {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${apiKey}/Messages.json`,
        new URLSearchParams({ To: to, From: from, Body: text }),
        { auth: { username: apiKey, password: apiSecret } }
      );
      return { status: "SENT", provider: "Twilio", to };
    }

    // 🇺🇿 Eskiz
    if (provider === "eskiz") {
      const login = await axios.post("https://notify.eskiz.uz/api/auth/login", {
        email,
        password
      });
      const authToken = login.data.data.token;

      await axios.post(
        "https://notify.eskiz.uz/api/message/sms/send",
        {
          mobile_phone: to,
          message: text,
          from: from || "4546"
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return { status: "SENT", provider: "Eskiz", to };
    }

    // 🇺🇿 PlayMobile
    if (provider === "playmobile") {
      await axios.post(
        "http://send.smsxabar.uz/broker-api/send",
        {
          messages: [
            {
              recipient: to,
              "message-id": "auth-verify",
              sms: {
                originator: from || "3700",
                content: { text }
              }
            }
          ]
        },
        { auth: { username: apiKey, password: apiSecret } }
      );
      return { status: "SENT", provider: "PlayMobile", to };
    }

    // 🇮🇳 MSG91
    if (provider === "msg91") {
      await axios.post(
        "https://api.msg91.com/api/v5/flow/",
        {
          template_id: apiSecret,
          recipients: [{ mobiles: to }],
          message: text
        },
        { headers: { authkey: apiKey } }
      );
      return { status: "SENT", provider: "MSG91", to };
    }

    // 🌍 Telesign
    if (provider === "telesign") {
      await axios.post(
        "https://rest-api.telesign.com/v1/messaging",
        { phone_number: to, message: text, message_type: "ARN" },
        { auth: { username: apiKey, password: apiSecret } }
      );
      return { status: "SENT", provider: "Telesign", to };
    }

    // 🇷🇺 SMS.ru
    if (provider === "smsru") {
      await axios.get(
        `https://sms.ru/sms/send?api_id=${apiKey}&to=${to}&msg=${encodeURIComponent(
          text
        )}&json=1`
      );
      return { status: "SENT", provider: "SMS.ru", to };
    }

    // 🇮🇳🇬🇧 TextLocal
    if (provider === "textlocal") {
      await axios.post(
        "https://api.textlocal.in/send/",
        new URLSearchParams({
          apiKey,
          numbers: to,
          sender: from,
          message: text
        })
      );
      return { status: "SENT", provider: "TextLocal", to };
    }

    //
    // ─────────────────────────────────────────
    //  NEW PROVIDERS ADDED BELOW
    // ─────────────────────────────────────────
    //

    // 🌍 ClickSend
    if (provider === "clicksend") {
      await axios.post(
        "https://rest.clicksend.com/v3/sms/send",
        {
          messages: [{ source: "auth-verify", from, body: text, to }]
        },
        {
          auth: { username: apiKey, password: apiSecret }
        }
      );
      return { status: "SENT", provider: "ClickSend", to };
    }

    // 🌍 Sinch SMS
    if (provider === "sinch") {
      await axios.post(
        `https://sms.api.sinch.com/xms/v1/${apiKey}/batches`,
        {
          from,
          to: [to],
          body: text
        },
        { headers: { Authorization: `Bearer ${apiSecret}` } }
      );
      return { status: "SENT", provider: "Sinch", to };
    }

    // 🌍 Telnyx
    if (provider === "telnyx") {
      await axios.post(
        "https://api.telnyx.com/v2/messages",
        {
          from,
          to,
          text
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` }
        }
      );
      return { status: "SENT", provider: "Telnyx", to };
    }

    // 🇹🇷 NetGSM
    if (provider === "netgsm") {
      await axios.get(
        `https://api.netgsm.com.tr/sms/send/get/?usercode=${apiKey}&password=${apiSecret}&gsmno=${to}&message=${encodeURIComponent(
          text
        )}&msgheader=${from}`
      );
      return { status: "SENT", provider: "NetGSM", to };
    }

    // 🇮🇷 KaveNegar
    if (provider === "kavenegar") {
      await axios.get(
        `https://api.kavenegar.com/v1/${apiKey}/sms/send.json?receptor=${to}&message=${encodeURIComponent(
          text
        )}`
      );
      return { status: "SENT", provider: "KaveNegar", to };
    }

    // 🇸🇦 Unifonic
    if (provider === "unifonic") {
      await axios.post(
        "https://el.cloud.unifonic.com/rest/SMS/messages",
        {
          recipient: to,
          body: text,
          sender: from
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` }
        }
      );
      return { status: "SENT", provider: "Unifonic", to };
    }

    // 🇨🇳 Alibaba Cloud SMS
    if (provider === "alibaba") {
      await axios.get("https://dysmsapi.aliyuncs.com/", {
        params: {
          PhoneNumbers: to,
          SignName: from,
          TemplateCode: template_id,
          TemplateParam: JSON.stringify({ code: text }),
          RegionId: region || "cn-hangzhou",
          AccessKeyId: apiKey,
          Format: "JSON"
        }
      });
      return { status: "SENT", provider: "Alibaba Cloud SMS", to };
    }

    // 🔥 Firebase (for OTP only)
    if (provider === "firebase") {
      return {
        status: "NOT_SENT",
        provider: "Firebase",
        to,
        note: "Firebase SMS must be sent by client-side SDK"
      };
    }

    // 💰 CheapGlobalsms
    if (provider === "cheapglobalsms") {
      await axios.get(
        `https://cheapglobalsms.com/api?username=${apiKey}&password=${apiSecret}&sender=${from}&recipient=${to}&message=${encodeURIComponent(
          text
        )}`
      );
      return { status: "SENT", provider: "CheapGlobalsms", to };
    }

    // 🌍 Africa's Talking
    if (provider === "africastalking") {
    await axios.post(
        "https://api.africastalking.com/version1/messaging",
        {
        to,
        message: text,
        from: from || "AUTHVERIFY"
        },
        { headers: { "apiKey": apiKey } }
    );
    return { status: "SENT", provider: "Africa's Talking", to };
    }

    // 🌍 MessageBird
    if (provider === "messagebird") {
    await axios.post(
        "https://rest.messagebird.com/messages",
        { recipients: [to], originator: from, body: text },
        { headers: { Authorization: `AccessKey ${apiKey}` } }
    );
    return { status: "SENT", provider: "MessageBird", to };
    }

    // 🌍 SMSAPI (Europe)
    if (provider === "smsapi") {
    await axios.post(
        `https://api.smsapi.com/sms.do`,
        new URLSearchParams({
        to,
        message: text,
        from,
        format: "json"
        }),
        { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    return { status: "SENT", provider: "SMSAPI", to };
    }

    // 🌍 Clickatell
    if (provider === "clickatell") {
        await axios.post(
            "https://platform.clickatell.com/messages/http/send",
            { to, content: text, from },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        return { status: "SENT", provider: "Clickatell", to };
    }

    // 🌍 Plivo
    if (provider === "plivo") {
        await axios.post(
            "https://api.plivo.com/v1/Account/" + apiKey + "/Message/",
            { src: from, dst: to, text },
            { auth: { username: apiKey, password: apiSecret } }
        );
        return { status: "SENT", provider: "Plivo", to };
    }

    // 🌍 Vibes (US)
    if (provider === "vibes") {
        await axios.post(
            "https://api.vibes.com/messages",
            { phone: to, text },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        return { status: "SENT", provider: "Vibes", to };
    }

    // 🌍 SMS Gateway Hub (India)
    if (provider === "smsgatewayhub") {
        await axios.get(
            `https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=${apiKey}&senderid=${from}&channel=2&DCS=0&flashsms=0&number=${to}&text=${encodeURIComponent(
            text
            )}&route=13`
        );
        return { status: "SENT", provider: "SMSGatewayHub", to };
    }

    throw new Error(`❌ Unsupported SMS provider: ${provider}`);
  } catch (err) {
    console.error("❌ SMS send failed:", err.message);
    throw new Error(err.message);
  }

}

module.exports = {
    parseTime,
    generateSecureOTP,
    otpSendingProcessByEmail,
    resendGeneratedOTP,
    sendSMS
};
