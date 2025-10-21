const {generateSecureOTP, resendGeneratedOTP, sendSMS} = require('../helpers/helper');
const Redis = require("ioredis");
const nodemailer = require("nodemailer");
const TelegramBot = require("node-telegram-bot-api");

class OTPManager {
    constructor(otpOptions = {}){
        if(typeof otpOptions.otpExpiry == 'string'){
            let timeValue = parseInt(otpOptions.otpExpiry);
            if(otpOptions.otpExpiry.endsWith('s')) this.otpExpiry = timeValue * 1000;
            else if(otpOptions.otpExpiry.endsWith('m')) this.otpExpiry = timeValue * 1000 * 60;
        }else{
            this.otpExpiry = (otpOptions.otpExpiry || 300) * 1000;
        }
        this.storeType = otpOptions.storeTokens || 'none';
        this.hashAlgorithm = otpOptions.otpHash || 'sha256';
        this.logger = null;
        this.customSender = null;

        if(this.storeType !== 'none'){
            if(this.storeType == 'memory'){
                this.tokenStore = new Map();
            }else if(this.storeType == 'redis'){
                this.redis = new Redis(otpOptions.redisUrl || "redis://localhost:6379");
            }else{
                throw new Error("⚠️ {storeTokens} should be 'none', 'memory', or 'redis'");
            }
        }

    }

    // generate(length = 6, callback) {
    //     try {
    //         const code = generateSecureOTP(length, this.hashAlgorithm);
    //         this.code = code;

    //         if (callback && typeof callback === 'function') {
    //             callback(null, code);
    //         }

    //         return this; // always return instance for chaining
    //     } catch (err) {
    //         if (callback && typeof callback === 'function') callback(err);
    //         else throw err;
    //     }
    // }

    setSender(config){
        if(!config.via) throw new Error("⚠️ Sender type { via } is required. It shouldbe 'email' or 'sms' or 'telegram'");
        this.senderConfig = config;
    }

    async set(receiverEmailorPhone, callback){
        const expiryInSeconds = Math.floor(this.otpExpiry / 1000);

        if(callback && typeof callback == 'function'){
            if(this.storeType == 'memory'){
                this.tokenStore.set(receiverEmailorPhone, {
                    code: this.code,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + this.otpExpiry,
                    attempts: 0,
                    cooldownUntil: 0
                });

                callback(null)
            }else if(this.storeType == 'redis'){
                callback(new Error('⚠️ Redis requires async/await. Use Promise style.'));
            }else{
                callback(new Error("❌ {storeTokens} should be 'memory' or 'redis' or 'none'"));
            }
            return;
        }

        try {
            if(this.storeType == 'memory'){
                this.tokenStore.set(receiverEmailorPhone, {
                    code: this.code,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + this.otpExpiry,
                    attempts: 0,
                    cooldownUntil: 0
                });

                return this;
            }else if(this.storeType == 'redis'){
                await this.redis.set(receiverEmailorPhone, JSON.stringify({
                    code,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + this.otpExpiry,
                    attempts: 0
                }), "EX", expiryInSeconds);

                return this;
            }else{
                throw new Error("❌ {storeTokens} should be 'memory' or 'redis'");
            }
        }catch(err){
            throw new Error(err);
        }
    }

    // async message(options, callback) {
    //     try {
    //         const { to, subject, text, html } = options;
    //         let transporter;

    //         if (this.senderConfig.via === "email") {
    //             if (this.senderConfig.service === "gmail") {
    //                 transporter = nodemailer.createTransport({
    //                     service: 'gmail',
    //                     auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass },
    //                 });
    //             } else if (this.senderConfig.service === "smtp") {
    //                 transporter = nodemailer.createTransport({
    //                     host: this.senderConfig.host,
    //                     port: this.senderConfig.port,
    //                     secure: this.senderConfig.secure,
    //                     auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass },
    //                 });
    //             } else {
    //                 throw new Error(`❌ Unsupported email service: ${this.senderConfig.service}`);
    //             }

    //             const info = await transporter.sendMail({ from: this.senderConfig.sender, to, subject, text, html });

    //             if (callback && typeof callback === "function") return callback(null, info);
    //             return info;
    //         }

    //         throw new Error(`❌ Unsupported via type: ${via}`);
    //     } catch (err) {
    //         if (callback && typeof callback === "function") return callback(err);
    //         throw err;
    //     }
    // }

    maxAttempt(limit) {
        this.maxAttempts = limit;
    }

    // async verify({check, code}, callback){
    //     if(callback && typeof callback == 'function'){
    //         if(this.storeType == 'memory'){
    //             const data = this.tokenStore.get(check);
    //             if(!data) callback(new Error("⚠️ OTP not found or expired"));

    //             if(Date.now() > data.expiresAt){
    //                 this.tokenStore.delete(check);
    //                 callback(new Error("⚠️ OTP expired"));
    //             }

    //             if(this.maxAttempt <= data.attempts){
    //                 callback(new Error("⚠️ Max attempts reached"));
    //             }

    //             if(data.code != code){
    //                 data.attempts+=1;
    //                 this.tokenStore.set(check, data);
    //                 callback(new Error("⚠️ Invalid OTP"));
    //             }

    //             this.tokenStore.delete(check);
    //             return true;
    //         }else if(this.storeType == 'redis'){
    //             callback(new Error('⚠️ Redis requires async/await. Use Promise style.'));
    //         }else{
    //             callback(new Error("❌ {storeTokens} should be 'memory' or 'redis'"));
    //         }
    //     }

    //     try {
    //         if(this.storeType == 'memory'){
    //             const data = await this.tokenStore.get(check);
    //             if(!data) throw new Error("⚠️ OTP not found or expired");

    //             if(Date.now() > data.expiresAt){
    //                 this.tokenStore.delete(check);
    //                 console.log("Now:", Date.now(), "ExpiresAt:", data.expiresAt);
    //                 throw new Error("⚠️ OTP expired");
    //             }

    //             if(this.maxAttempt <= data.attempts){
    //                 throw new Error("⚠️ Max attempts reached");
    //             }

    //             if(data.code != code){
    //                 data.attempts+=1;
    //                 this.tokenStore.set(check, data);
    //                 throw new Error("⚠️ Invalid OTP");
    //             }

    //             this.tokenStore.delete(check);
    //             return true
    //         }else if(this.storeType == 'redis'){
    //             const rawData = await this.redis.get(check);
    //             if(!rawData) throw new Error("⚠️ OTP not found or expired");

    //             const data = JSON.parse(rawData);

    //             if (Date.now() > data.expiresAt) {
    //                 await this.redis.del(check);
    //                 throw new Error("⚠️ OTP expired");
    //             }

    //             if (data.attempts >= this.maxAttempts) {
    //                 throw new Error("⚠️ Max attempts reached");
    //             }

    //             if (data.code !== code) {
    //                 data.attempts++;
    //                 await this.redis.set(check, JSON.stringify(data), 'EX', Math.floor((data.expiresAt - Date.now()) / 1000));
    //                 throw new Error("⚠️ Invalid OTP");
    //             }

    //              await this.redis.del(check);
    //             return true;
    //         }else{
    //             throw new Error("❌ {storeTokens} should be 'memory' or 'redis'");
    //         }
    //     }catch(err){
    //         throw new Error(err);
    //     }
    // }  

    setLogger(logger) {
        if (typeof logger === "function") {
            this.logger = logger;
        } else if (logger && typeof logger.log === "function") {
            this.logger = logger.log.bind(logger);
        } else {
            throw new Error("Logger must be a function or object with 'log' method");
        }
        console.log("✅ Logger attached");
        return this;
    }

    logEvent(event, details) {
        if (this.logger) {
            this.logger({ event, timestamp: new Date().toISOString(), ...details });
        }
    }

    // Put into OTPManager class (ensure nodemailer imported, tokenStore created earlier)
    generate(length = 6, callback) {
        try {
            // generateSecureOTP should return a numeric string (e.g. "123456")
            const code = generateSecureOTP(length, this.hashAlgorithm);
            this.code = String(code); // always keep string
            // callback-first style
            if (typeof callback === 'function') {
                callback(null, this.code);
                return this;
            }
            // chainable
            return this;
        } catch (err) {
            if (typeof callback === 'function') {
                callback(err);
                return this;
            }
            throw err;
        }
    }

    async set(identifier, callback) {
        const expiryMs = (typeof this.otpExpiry === 'number' ? this.otpExpiry : 300) * 1000; // ensure ms
        const record = {
            code: String(this.code),
            to: identifier,
            createdAt: Date.now(),
            expiresAt: Date.now() + expiryMs,
            attempts: 0,
            cooldownUntil: Date.now() + this.cooldownTime 
        };

        // Callback style for memory only
        if (callback && typeof callback === 'function') {
            try {
                if (this.storeType === 'memory' || this.storeType === 'none') {
                    // store in memory map
                    if (!this.tokenStore) this.tokenStore = new Map();
                    this.tokenStore.set(identifier, record);
                    return callback(null, this); // return instance
                } else if (this.storeType === 'redis') {
                    return callback(new Error('Redis requires async/await. Use Promise style.'));
                } else {
                    return callback(new Error("{storeTokens} should be 'none', 'memory', or 'redis'"));
                }
            } catch (err) {
                return callback(err);
            }
        }

        // Promise/async style
        if (this.storeType === 'memory' || this.storeType === 'none') {
            if (!this.tokenStore) this.tokenStore = new Map();
            this.tokenStore.set(identifier, record);
            return this; // chainable
        } else if (this.storeType === 'redis') {
            const expirySeconds = Math.floor(expiryMs / 1000);
            await this.redis.set(identifier, JSON.stringify(record), 'EX', expirySeconds);
            return this;
        } else {
            throw new Error("{storeTokens} should be 'none', 'memory', or 'redis'");
        }
    }

    async message(options, callback) {
        const { to, subject, text, html, provider, apiKey, apiSecret } = options;

        try {
            // if developer provided their own sender function

            if (!this.senderConfig)
            throw new Error("Sender not configured. Use setSender() before message().");

            // ---- EMAIL PART ----
            if (this.senderConfig.via === 'email') {
                let transporter;

                if (this.senderConfig.service === 'gmail') {
                    transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass },
                    });
                } else if (this.senderConfig.service === 'smtp') {
                    transporter = nodemailer.createTransport({
                        host: this.senderConfig.host,
                        port: this.senderConfig.port,
                        secure: !!this.senderConfig.secure,
                        auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass },
                    });
                } else {
                    throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
                }

                const mail = {
                    from: this.senderConfig.sender,
                    to,
                    subject: subject || 'Your OTP Code',
                    text: text || `Your OTP is ${this.code}`,
                    html: html || `<p>Your OTP is <b>${this.code}</b></p>`,
                };

                if (typeof callback === 'function') {
                    transporter.sendMail(mail, (err, info) => {
                        if (err) return callback(err);
                        this.recieverConfig = options;
                        return callback(null, info);
                    });
                    return; // stop here in callback mode
                }

                // Async/await version
                const info = await transporter.sendMail(mail);
                this.recieverConfig = options;
                return info;
            }

            // ---- SMS PART ----
            else if (this.senderConfig.via === 'sms') {
                // Simple structure: no callback needed since SMS sending is async
                const smsResponse = await sendSMS({
                    provider: provider || this.senderConfig.provider, // allow override
                    apiKey: apiKey || this.senderConfig.apiKey,
                    apiSecret: apiSecret || this.senderConfig.apiSecret,
                    from: this.senderConfig.sender,
                    to,
                    text: text || `Your OTP is ${this.code}`,
                    mock: this.senderConfig.mock ?? true,
                });

                this.recieverConfig = options;
                return smsResponse;
            }

            // ---- TELEGRAM BOT PART ----
            // else if(this.senderConfig.via === 'telegram'){
            //     const token = "8476429380:AAH8TNrdrqrzdoZ23ERy2w0eQnLSdUN8qB4";
            //     const bot = new TelegramBot(token, { polling: true });
            //     bot.onText(/\/start/, (msg) => {
            //         bot.sendMessage(msg.chat.id, "Please share your phone number:", {
            //             reply_markup: {
            //                 keyboard: [
            //                     [
            //                         {
            //                             text: "📞 Share my phone number",
            //                             request_contact: true, // 🔥 this requests the user's phone
            //                         },
            //                     ],
            //                 ],
            //                 resize_keyboard: true,
            //                 one_time_keyboard: true,
            //             },
            //         });
            //     });

            //     bot.on("polling_error", (err) => console.error("Polling error:", err));

            //     bot.on("contact", (msg) => {
            //         const phoneNumber = msg.contact.phone_number;
            //         const firstName = msg.contact.first_name;
            //         const userId = msg.from.id;

            //         console.log("User shared phone:", phoneNumber);

            //         // bot.sendMessage(
            //         //     msg.chat.id,
            //         //     `Thanks, ${firstName}! Your phone number is ${phoneNumber}.`
            //         // );

            //         // Here you can verify or store it in your database
            //         if(callback && typeof callback == 'function'){
            //             if(this.storeType == 'memory'){
            //                 const data = this.tokenStore.get(phoneNumber);
            //                 if(!data) callback(new Error('No OTP found for this phone number'));

            //                 bot.sendMessage(msg.chat.id, `Your Verification code is <b>${this.code}</b>`, {parse_mode: "HTML"});
            //                 callback(null);
            //             }else if(this.storeType == 'redis'){
            //                 callback(new Error("Redis require async/await. Use promise style instead of callback"));
            //             }else{
            //                 callback(new Error("{storeTokens} should be 'redis' or 'memory'"));
            //             }
            //         }else{
            //             try {
            //                 if(this.storeType == 'memory'){
            //                     const data = this.tokenStore.get(phoneNumber);
            //                     if(!data) throw new Error('No OTP found for this phone number');

            //                     bot.sendMessage(msg.chat.id, `Your Verification code is <b>${data.code}</b>`, {parse_mode: "HTML"});
            //                     return null;
            //                 }else if(this.storeType == 'redis'){
            //                     const raw = await this.redis.get(phoneNumber);
            //                     if(!raw) throw new Error('No OTP found for this phone number');

            //                     const data = JSON.parse(raw);
            //                     bot.sendMessage(msg.chat.id, `Your Verification code is <b>${data.code}</b>`, {parse_mode: "HTML"});
            //                 }
            //             }catch(err){
            //                 throw new Error(err);
            //             }
            //         }
            //     });
            // }
            else if (this.senderConfig.via === 'telegram') {
                const token = this.senderConfig.token; // replace with your actual bot token
                const bot = new TelegramBot(token, { polling: true });

                // handle /start command
                bot.onText(/\/start/, (msg) => {
                    const chatId = msg.chat.id;

                    bot.sendMessage(chatId, "Please share your phone number:", {
                    reply_markup: {
                        keyboard: [[
                        {
                            text: "📞 Share my phone number",
                            request_contact: true, // 🔥 asks user to send phone number
                        },
                        ]],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                    });
                });

                // handle polling errors gracefully
                bot.on("polling_error", (err) => console.error("Polling error:", err.message || err));

                // handle user sending their phone number
                    bot.on("contact", async (msg) => {
                        const chatId = msg.chat.id;
                        const phoneNumber = msg.contact.phone_number;
                        const firstName = msg.contact.first_name;

                        console.log(`📞 ${firstName} shared phone number: ${phoneNumber}`);

                        try {
                            let data;

                            // 🔹 check OTP from memory or redis
                            if (this.storeType === "memory") {
                                data = this.tokenStore?.get(phoneNumber);
                            } else if (this.storeType === "redis") {
                                const raw = await this.redis.get(phoneNumber);
                                if (raw) data = JSON.parse(raw);
                            }

                            // 🔸 if no OTP found
                            if (!data || !data.code) {
                                bot.sendMessage(chatId, "❌ No OTP found for your number. Please request a new one.");
                                return;
                            }

                            // ✅ send OTP to Telegram
                            await bot.sendMessage(
                                chatId,
                                `✅ Your verification code is <b>${data.code}</b>`,
                                { parse_mode: "HTML" }
                            );

                            console.log(`✅ OTP ${data.code} sent to Telegram user: ${phoneNumber}`);
                        } catch (err) {
                            console.error("❌ Telegram OTP error:", err);
                            bot.sendMessage(chatId, "Something went wrong. Please try again.");
                        }
                    });
                }
                // ---- UNKNOWN METHOD ----
            else {
                throw new Error(`Unsupported sending method: ${this.senderConfig.via}`);
            }

        } catch (err) {
            if (typeof callback === 'function') return callback(err);
            throw err;
        }
    }

    async verify({ check: identifier, code }, callback) {
        // callback style
        if (typeof callback === 'function') {
            try {
                const res = await this._verifyInternal(identifier, code);
                return callback(null, res);
            } catch (err) {
                return callback(err);
            }
        }

        // promise style
        return this._verifyInternal(identifier, code);
    }

    // helper used by verify()
    async _verifyInternal(identifier, code) {
    // memory
        if (this.storeType === 'memory' || this.storeType === 'none') {
            const data = this.tokenStore ? this.tokenStore.get(identifier) : null;
            if (!data) throw new Error("OTP not found or expired");

            if (Date.now() > data.expiresAt) {
                this.tokenStore.delete(identifier);
                throw new Error("OTP expired");
            }

            if ((this.maxAttempts || 5) <= data.attempts) {
                throw new Error("Max attempts reached");
            }

            if (String(data.code) !== String(code)) {
                data.attempts = (data.attempts || 0) + 1;
                this.tokenStore.set(identifier, data);
                throw new Error("Invalid OTP");
            }

            // success
            this.tokenStore.delete(identifier);
            return true;
        }

        // redis
        if (this.storeType === 'redis') {
            const raw = await this.redis.get(identifier);
            if (!raw) throw new Error("OTP not found or expired");
            const data = JSON.parse(raw);

            if (Date.now() > data.expiresAt) {
                await this.redis.del(identifier);
                throw new Error("OTP expired");
            }

            if ((this.maxAttempts || 5) <= (data.attempts || 0)) {
                throw new Error("Max attempts reached");
            }

            if (String(data.code) !== String(code)) {
                data.attempts = (data.attempts || 0) + 1;
                const remaining = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000));
                await this.redis.set(identifier, JSON.stringify(data), 'EX', remaining);
                throw new Error("Invalid OTP");
            }

            await this.redis.del(identifier);
            return true;
        }

        throw new Error("{storeTokens} must be 'memory' or 'redis'");
    }

    cooldown(timestamp){
        let timeforCooldown;
        if(typeof timestamp == 'number') return timestamp;
        if (typeof timestamp == 'string'){
            let timeValue = parseInt(timestamp);
            if(timestamp.endsWith('s')) return timeforCooldown = timeValue * 1000;
            if(timestamp.endsWith('m')) return timeforCooldown = timeValue * 1000 * 60;
            if(timestamp.endsWith('h')) return timeforCooldown = timeValue * 1000 * 60 * 60;
        }

        this.cooldownTime = timeforCooldown;
        return this;
    }

    // async resend(identifier, callback){
    //     if(callback && typeof callback == 'function'){
    //         if(this.storeType == 'memory'){
    //             const data = this.tokenStore ? this.tokenStore.get(identifier) : null;
    //             if(!data){
    //                 callback(new Error("No OTP generated yet."));
    //             }

    //             if(Date.now() <= data.cooldownUntil){
    //                 let waitingTime = (data.cooldownUntil - Date.now())/1000; 
    //                 callback(new Error(`Cooling down is processing... You should wait ${waitingTime} seconds for sending OTP`));
    //             }else{
    //                 const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
    //                 // let transporter;
    //                 // if (this.senderConfig.service === 'gmail') {
    //                 //     transporter = nodemailer.createTransport({
    //                 //         service: 'gmail',
    //                 //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                 //     });
    //                 // } else if (this.senderConfig.service === 'smtp') {
    //                 //     transporter = nodemailer.createTransport({
    //                 //         host: this.senderConfig.host,
    //                 //         port: this.senderConfig.port,
    //                 //         secure: !!this.senderConfig.secure,
    //                 //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                 //     });
    //                 // } else {
    //                 //     throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
    //                 // }
    //                 // // prepare mail
    //                 // const mail = {
    //                 //     from: this.senderConfig.sender,
    //                 //     to: this.recieverConfig.to,
    //                 //     subject: this.recieverConfig.subject || 'Your OTP Code',
    //                 //     text: this.recieverConfig.text || `Your OTP is ${code}`,
    //                 //     html: this.recieverConfig.html || `<p>Your OTP is <b>${code}</b></p>`
    //                 // };
    //                 // transporter.sendMail(mail, (err, info)=>{
    //                 //     if(err) return callback(new Error(err));
    //                 //     callback(null, info);
    //                 // });
    //                 resendGeneratedOTP({
    //                     from: this.senderConfig, 
    //                     to: this.recieverConfig.to, 
    //                     pass: this.senderConfig.pass, 
    //                     host: this.senderConfig.host,
    //                     port: this.senderConfig.port,
    //                     code: code,
    //                     secure: this.senderConfig.secure ,
    //                     subject: this.recieverConfig.subject,
    //                     text: this.recieverConfig.text,
    //                     html: this.recieverConfig.html   
    //                 }, (err, info)=>{
    //                     if(err) return callback(new Error(err));
    //                     callback(null, info);
    //                 });
    //                 data.cooldownUntil = null;
    //                 data.code = code;
    //                 this.tokenStore.set(identifier, data);
    //             }

    //             if(Date.now() > data.expiresAt){
    //                const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
    //             //    let transporter;
    //             //     if (this.senderConfig.service === 'gmail') {
    //             //         transporter = nodemailer.createTransport({
    //             //             service: 'gmail',
    //             //             auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //             //         });
    //             //     } else if (this.senderConfig.service === 'smtp') {
    //             //         transporter = nodemailer.createTransport({
    //             //             host: this.senderConfig.host,
    //             //             port: this.senderConfig.port,
    //             //             secure: !!this.senderConfig.secure,
    //             //             auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //             //         });
    //             //     } else {
    //             //         throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
    //             //     }
    //             //     // prepare mail
    //             //     const mail = {
    //             //         from: this.senderConfig.sender,
    //             //         to: this.recieverConfig.to,
    //             //         subject: this.recieverConfig.subject || 'Your OTP Code',
    //             //         text: this.recieverConfig.text || `Your OTP is ${code}`,
    //             //         html: this.recieverConfig.html || `<p>Your OTP is <b>${code}</b></p>`
    //             //     };
    //             //     transporter.sendMail(mail, (err, info)=>{
    //             //         if(err) return callback(new Error(err));
    //             //         callback(null, info);
    //             //     });
    //                 resendGeneratedOTP({
    //                     from: this.senderConfig, 
    //                     to: this.recieverConfig.to, 
    //                     pass: this.senderConfig.pass, 
    //                     host: this.senderConfig.host,
    //                     port: this.senderConfig.port,
    //                     code: code,
    //                     secure: this.senderConfig.secure ,
    //                     subject: this.recieverConfig.subject,
    //                     text: this.recieverConfig.text,
    //                     html: this.recieverConfig.html   
    //                 }, (err, info)=>{
    //                     if(err) return callback(new Error(err));
    //                     callback(null, info);
    //                 });
    //                 data.cooldownUntil = null;
    //                 data.code = code;
    //                 this.tokenStore.set(identifier, data);
    //             }

    //         }else if(this.storeType == 'redis'){
    //             callback(new Error(`Redis require async/await. Use promise style`));
    //         }else{
    //             callback(new Error("{storeTokens} should be 'none', 'memory', or 'redis'"));
    //         }
    //     }else{
    //         try{
    //             if(this.storeType == 'memory'){
    //                 const data = this.tokenStore ? this.tokenStore.get(identifier) : null;
    //                 if(!data){
    //                     callback(new Error("No OTP generated yet."));
    //                 }

    //                 if(Date.now() <= data.cooldownUntil){
    //                     let waitingTime = (data.cooldownUntil - Date.now())/1000; 
    //                     callback(new Error(`Cooling down is processing... You should wait ${waitingTime} seconds for sending OTP`));
    //                 }else{
    //                     const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
    //                     // let transporter;
    //                     // if (this.senderConfig.service === 'gmail') {
    //                     //     transporter = nodemailer.createTransport({
    //                     //         service: 'gmail',
    //                     //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                     //     });
    //                     // } else if (this.senderConfig.service === 'smtp') {
    //                     //     transporter = nodemailer.createTransport({
    //                     //         host: this.senderConfig.host,
    //                     //         port: this.senderConfig.port,
    //                     //         secure: !!this.senderConfig.secure,
    //                     //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                     //     });
    //                     // } else {
    //                     //     throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
    //                     // }
    //                     // // prepare mail
    //                     // const mail = {
    //                     //     from: this.senderConfig.sender,
    //                     //     to: this.recieverConfig.to,
    //                     //     subject: this.recieverConfig.subject || 'Your OTP Code',
    //                     //     text: this.recieverConfig.text || `Your OTP is ${code}`,
    //                     //     html: this.recieverConfig.html || `<p>Your OTP is <b>${code}</b></p>`
    //                     // };
    //                     // await transporter.sendMail(mail);
    //                     await resendGeneratedOTP({
    //                         from: this.senderConfig, 
    //                         to: this.recieverConfig.to, 
    //                         pass: this.senderConfig.pass, 
    //                         host: this.senderConfig.host,
    //                         port: this.senderConfig.port,
    //                         code: code,
    //                         secure: this.senderConfig.secure ,
    //                         subject: this.recieverConfig.subject,
    //                         text: this.recieverConfig.text,
    //                         html: this.recieverConfig.html   
    //                     });
    //                     data.cooldownUntil = 0;
    //                     data.code = code;
    //                     this.tokenStore.set(identifier, data);

    //                     return null;
    //                 }

    //                 if(Date.now() > data.expiresAt){
    //                 const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
    //                 // let transporter;
    //                 //     if (this.senderConfig.service === 'gmail') {
    //                 //         transporter = nodemailer.createTransport({
    //                 //             service: 'gmail',
    //                 //             auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                 //         });
    //                 //     } else if (this.senderConfig.service === 'smtp') {
    //                 //         transporter = nodemailer.createTransport({
    //                 //             host: this.senderConfig.host,
    //                 //             port: this.senderConfig.port,
    //                 //             secure: !!this.senderConfig.secure,
    //                 //             auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                 //         });
    //                 //     } else {
    //                 //         throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
    //                 //     }
    //                 //     // prepare mail
    //                 //     const mail = {
    //                 //         from: this.senderConfig.sender,
    //                 //         to: this.recieverConfig.to,
    //                 //         subject: this.recieverConfig.subject || 'Your OTP Code',
    //                 //         text: this.recieverConfig.text || `Your OTP is ${code}`,
    //                 //         html: this.recieverConfig.html || `<p>Your OTP is <b>${code}</b></p>`
    //                 //     };
    //                 //     await transporter.sendMail(mail);
    //                 await resendGeneratedOTP({
    //                     from: this.senderConfig, 
    //                     to: this.recieverConfig.to, 
    //                     pass: this.senderConfig.pass, 
    //                     host: this.senderConfig.host,
    //                     port: this.senderConfig.port,
    //                     code: code,
    //                     secure: this.senderConfig.secure ,
    //                     subject: this.recieverConfig.subject,
    //                     text: this.recieverConfig.text,
    //                     html: this.recieverConfig.html   
    //                 });
    //                 data.cooldownUntil = 0;
    //                 data.code = code;
    //                 this.tokenStore.set(identifier, data);

    //                 return null;
    //                 }
    //             }else if(this.storeType == 'redis'){
    //                 const raw = await this.redis.get(identifier);
    //                 if(!raw){
    //                     throw new Error("No OTP generated yet.");
    //                 }

    //                 const data = JSON.parse(raw);

    //                 if(Date.now() <= data.cooldownUntil){
    //                     let waitingTime = (data.cooldownUntil - Date.now())/1000;
    //                     throw new Error(`Cooling down is processing... You should wait ${waitingTime} seconds for sending OTP`);
    //                 }else{
    //                     const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
    //                     // let transporter;
    //                     // if (this.senderConfig.service === 'gmail') {
    //                     //     transporter = nodemailer.createTransport({
    //                     //         service: 'gmail',
    //                     //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                     //     });
    //                     // } else if (this.senderConfig.service === 'smtp') {
    //                     //     transporter = nodemailer.createTransport({
    //                     //         host: this.senderConfig.host,
    //                     //         port: this.senderConfig.port,
    //                     //         secure: !!this.senderConfig.secure,
    //                     //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                     //     });
    //                     // } else {
    //                     //     throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
    //                     // }
    //                     // // prepare mail
    //                     // const mail = {
    //                     //     from: this.senderConfig.sender,
    //                     //     to: this.recieverConfig.to,
    //                     //     subject: this.recieverConfig.subject || 'Your OTP Code',
    //                     //     text: this.recieverConfig.text || `Your OTP is ${code}`,
    //                     //     html: this.recieverConfig.html || `<p>Your OTP is <b>${code}</b></p>`
    //                     // };
    //                     // await transporter.sendMail(mail);
    //                     await resendGeneratedOTP({
    //                         from: this.senderConfig, 
    //                         to: this.recieverConfig.to, 
    //                         pass: this.senderConfig.pass, 
    //                         host: this.senderConfig.host,
    //                         port: this.senderConfig.port,
    //                         code: code,
    //                         secure: this.senderConfig.secure ,
    //                         subject: this.recieverConfig.subject,
    //                         text: this.recieverConfig.text,
    //                         html: this.recieverConfig.html   
    //                     });
    //                     data.cooldownUntil = 0;
    //                     data.code = code;
    //                     await this.redis.set(identifier, JSON.stringify(data));
    //                 }

    //                 if(Date.now() > data.expiresAt){
    //                     const code = generateSecureOTP(data.code.length, this.hashAlgorithm);
    //                     // let transporter;
    //                     // if (this.senderConfig.service === 'gmail') {
    //                     //     transporter = nodemailer.createTransport({
    //                     //         service: 'gmail',
    //                     //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                     //     });
    //                     // } else if (this.senderConfig.service === 'smtp') {
    //                     //     transporter = nodemailer.createTransport({
    //                     //         host: this.senderConfig.host,
    //                     //         port: this.senderConfig.port,
    //                     //         secure: !!this.senderConfig.secure,
    //                     //         auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass }
    //                     //     });
    //                     // } else {
    //                     //     throw new Error(`Unsupported email service: ${this.senderConfig.service}`);
    //                     // }
    //                     // // prepare mail
    //                     // const mail = {
    //                     //     from: this.senderConfig.sender,
    //                     //     to: this.recieverConfig.to,
    //                     //     subject: this.recieverConfig.subject || 'Your OTP Code',
    //                     //     text: this.recieverConfig.text || `Your OTP is ${code}`,
    //                     //     html: this.recieverConfig.html || `<p>Your OTP is <b>${code}</b></p>`
    //                     // };
    //                     // await transporter.sendMail(mail);
    //                     await resendGeneratedOTP({
    //                         from: this.senderConfig, 
    //                         to: this.recieverConfig.to, 
    //                         pass: this.senderConfig.pass, 
    //                         host: this.senderConfig.host,
    //                         port: this.senderConfig.port,
    //                         code: code,
    //                         secure: this.senderConfig.secure ,
    //                         subject: this.recieverConfig.subject,
    //                         text: this.recieverConfig.text,
    //                         html: this.recieverConfig.html   
    //                     });
    //                     data.cooldownUntil = 0;
    //                     data.code = code;
    //                     await this.redis.set(identifier, JSON.stringify(data));
    //                 }
    //             }
    //         }catch(err){
    //             throw new Error(err);
    //         }
    //     }
    
    // }

        async resend(identifier, callback) {
            const handleError = (err) => {
                if (callback && typeof callback === 'function') return callback(err);
                throw err;
            };

            try {
                let data;

                // Get data from memory or Redis
                if (this.storeType === 'memory') {
                    data = this.tokenStore.get(identifier);
                } else if (this.storeType === 'redis') {
                    const raw = await this.redis.get(identifier);
                    data = raw ? JSON.parse(raw) : null;
                } else {
                    return handleError(new Error("{storeTokens} should be 'memory' or 'redis'"));
                }

                if (!data) return handleError(new Error("No OTP generated yet."));

                const now = Date.now();

                // Check cooldown
                if (data.cooldownUntil && now < data.cooldownUntil) {
                    const waitingTime = Math.ceil((data.cooldownUntil - now) / 1000);
                    return handleError(new Error(`Cooldown active. Wait ${waitingTime} seconds before resending OTP.`));
                }

                // Check if OTP expired
                if (data.expiresAt && now > data.expiresAt) {
                    data.code = generateSecureOTP(data.code.length, this.hashAlgorithm);
                    data.expiresAt = now + this.otpExpiry;
                } else {
                    // regenerate code to resend
                    data.code = generateSecureOTP(data.code.length, this.hashAlgorithm);
                }

                // Update cooldown
                data.cooldownUntil = now + (this.cooldown || 30000); // default 30s

                // Save updated data
                if (this.storeType === 'memory') {
                    this.tokenStore.set(identifier, data);
                } else if (this.storeType === 'redis') {
                    const ttlSeconds = Math.max(1, Math.ceil((data.expiresAt - now) / 1000));
                    await this.redis.set(identifier, JSON.stringify(data), "PX", ttlSeconds);
                }

                // Send OTP
                const sendParams = {
                    from: this.senderConfig.sender,
                    to: data.to,
                    pass: this.senderConfig.pass,
                    host: this.senderConfig.host,
                    port: this.senderConfig.port,
                    secure: this.senderConfig.secure,
                    service: this.senderConfig.service,
                    subject: this.recieverConfig.subject || `Email verification`,
                    text: this.recieverConfig.text || `Your OTP is ${data.code}`,
                    html: this.recieverConfig.html || `<p>Your OTP is <b>${data.code}</b></p>`,
                    code: data.code
                };

                if (callback && typeof callback === 'function') {
                    resendGeneratedOTP(sendParams, callback);
                } else {
                    await resendGeneratedOTP(sendParams);
                    return data.code;
                }

            } catch (err) {
                handleError(err);
            }
    }

    async setupTelegramBot(botToken) {
        const TelegramBot = require("node-telegram-bot-api");
        const bot = new TelegramBot(botToken, { polling: true });

        bot.onText(/\/start/, async (msg) => {
            await bot.sendMessage(msg.chat.id, "📱 Please share your phone number:", {
            reply_markup: {
                keyboard: [[{ text: "Share my phone number", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
            });
        });

        bot.on("contact", async (msg) => {
            const phone = msg.contact.phone_number;
            const chatId = msg.chat.id;

            try {
            let record;
            if (this.storeType === "memory") {
                record = this.tokenStore.get(phone);
            } else if (this.storeType === "redis") {
                const raw = await this.redis.get(phone);
                record = raw ? JSON.parse(raw) : null;
            }

            if (!record) {
                await bot.sendMessage(chatId, "❌ No OTP found for your number. Try again.");
                return;
            }

            await bot.sendMessage(chatId, `✅ Your verification code: <b>${record.code}</b>`, { parse_mode: "HTML" });
            } catch (err) {
                console.error("Telegram error:", err);
                await bot.sendMessage(chatId, "⚠️ Something went wrong. Try later.");
            }
        });

        console.log("🚀 Telegram verification bot ready!");
    }


}

module.exports = OTPManager;
