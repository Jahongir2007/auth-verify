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

async function sendSMS({ provider, apiKey, apiSecret, from, to, text, mock = false }) {
  try {
    // 🧪 For testing only — no real SMS sent
    if (mock) {
      console.log(`📱 [Mock SMS via ${provider}]`);
      console.log(`→ To: ${to}`);
      console.log(`→ Message: ${text}`);
      return { status: "SENT (mock)", to, text };
    }

    // 🔷 Infobip API
    if (provider === 'infobip') {
      await axios.post(
        'https://api.infobip.com/sms/2/text/advanced',
        {
          messages: [{ from, destinations: [{ to }], text }],
        },
        {
          headers: {
            Authorization: `App ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return { status: "SENT", provider: "Infobip", to };
    }

    // 🟪 Vonage API
    if (provider === 'vonage') {
      await axios.post(
        'https://rest.nexmo.com/sms/json',
        {
          api_key: apiKey,
          api_secret: apiSecret,
          to,
          from,
          text,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return { status: "SENT", provider: "Vonage", to };
    }

    // 🟩 Twilio API
    if (provider === 'twilio') {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${apiKey}/Messages.json`,
        new URLSearchParams({
          To: to,
          From: from,
          Body: text,
        }),
        {
          auth: {
            username: apiKey,
            password: apiSecret,
          },
        }
      );
      return { status: "SENT", provider: "Twilio", to };
    }

    throw new Error(`Unsupported SMS provider: ${provider}`);
  } catch (err) {
    console.error("❌ SMS send failed:", err.message);
    throw new Error(err.message);
  }
}

// async function sendOTPwithTelegramBot(otpCode){
//     bot.onText(/\/start/, (msg) => {
//           bot.sendMessage(chatId, "Please share your phone number:", {
//                 reply_markup: {
//                     keyboard: [
//                     [
//                         {
//                         text: "📞 Share my phone number",
//                         request_contact: true, // 🔥 this requests the user's phone
//                         },
//                     ],
//                     ],
//                     resize_keyboard: true,
//                     one_time_keyboard: true,
//                 },
//             });
//         bot.sendMessage(msg.chat.id, `Your Verification code is <b>${otpCode}</b>`, {parse_mode: "HTML"});
//     });

//     bot.on("contact", (msg) => {
//         const phoneNumber = msg.contact.phone_number;
//         const firstName = msg.contact.first_name;
//         const userId = msg.from.id;

//         console.log("User shared phone:", phoneNumber);

//         bot.sendMessage(
//             msg.chat.id,
//             `Thanks, ${firstName}! Your phone number is ${phoneNumber}.`
//         );

//         // Here you can verify or store it in your database
//     });
// }

module.exports = {
    parseTime,
    generateSecureOTP,
    otpSendingProcessByEmail,
    resendGeneratedOTP,
    sendSMS
};
