const sqlite3 = require("sqlite3").verbose();
const nodemailer = require('nodemailer')
const crypto = require('crypto');
const { request } = require("http");

class Verifier {
    constructor(sender = {}){
        this.otpLen = sender.otp?.leng || 6;
        this.expMin = sender.otp?.expMin || 3;
        this.limit = sender.otp?.limit || 5;
        this.cooldown = sender.otp?.cooldown || 60;
        // Setup SMTP
        this.transport = nodemailer.createTransport({
            service: `${sender.serv}`,
            auth: {
                user: `${sender.sender}`,
                pass: sender.pass
            }
        });

        this.sender = `${sender.smtp?.sender}`

        //making a db for saving otp codes
        this.db = new sqlite3.Database('./authverify.db');
        this.db.serialize(()=>{
            // creating a table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS verifications (
                email TEXT PRIMARY KEY,
                code TEXT,
                expiresAt TEXT,
                requests INTEGER DEFAULT 0,
                lastRequest TEXT 
                )
            `);
        });

    }

     // Generate OTP securely
    generateOTP() {
        const buffer = crypto.randomBytes(this.otpLen);
        const number = parseInt(buffer.toString('hex'), 16)
        .toString()
        .slice(0, this.otpLen);
        return number.padStart(this.otpLen, '0');
    }

    html(html){
        this.htmlContent = html;
        return this;
    }

    subject(subject){
        this.mailSubject = subject;
        return this;
    }

    text(text){
        this.mailText = text;
        return this;
    }

    sendTo(email, callback){
    
        this.recieverEmail = email;
        const code = this.generateOTP();
        const expAt = new Date(Date.now() + this.expMin * 60 * 1000).toISOString();

        this.db.get(`SELECT * FROM verifications WHERE email = ?`, [email], (err, row)=>{
            if(err) return callback(err);

            const now = new Date();
            let requests = 1;

            if(row){
                const lastRequest = row.lastRequest ? new Date(row.lastRequest) : null;

                if(lastRequest && now.toDateString() === lastRequest.toDateString()){
                    requests = row.requests + 1;
                    if(requests > this.limit){
                        return callback(new Error("Too many OTP requests today"));
                    }

                    const diff = (now - lastRequest) / 1000;
                    if(diff < this.cooldown){
                        return callback(new Error(`Please wait ${Math.ceil(this.cooldown - diff)} seconds before requesting a new OTP.`));
                    }
                }
            }

            this.db.run(`INSERT INTO verifications (email, code, expiresAt, requests, lastRequest) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET
                code = excluded.code, 
                expiresAt = excluded.expiresAt, 
                requests = excluded.requests, 
                lastRequest = excluded.lastRequest`, [email, code, expAt, requests, now.toISOString()], (DBerr)=>{
                if(DBerr) return callback(DBerr);

                this.otpOptions = {
                    from: this.sender,
                    to: `${email}`,
                    subject: this.mailSubject ? this.mailSubject.replace("{otp}", code) : undefined,
                    text: this.mailText ? this.mailText.replace("{otp}", code) : undefined,
                    html: this.htmlContent ? this.htmlContent.replace("{otp}", code) : undefined 
                }

                this.transport.sendMail(this.otpOptions, (emailErr, info)=>{
                    if(emailErr) return callback(emailErr);

                    // console.log('📨 Email sent:', info.response);
                    callback(null, true); 
                });

                // console.log('💾 Code saved to DB');
            });
        });

        return this;

    }

    code(userCode){
        this.userCode = userCode
        return this;
    }

    verifyFor(email, callback){
        const now = new Date().toISOString();

        this.db.get(`SELECT * FROM verifications WHERE email = ? AND expiresAt > ?`, [email, now], (DBerr, row)=>{
            if(DBerr) return callback(DBerr);

            // console.log(`Code was got`);

            if(!row){
                // console.log(this.recieverEmail);
                callback(null, false)
            }else{
                if(row.code === this.userCode){
                    // console.log('✅ User verified');
                    callback(null, true);
                }else{
                    // console.log("❌ Code isn't correct")
                    callback(null, false);
                }
            }
        });
    }

    makeOTP(length){
        const buffer = crypto.randomBytes(length);
        const number = parseInt(buffer.toString('hex'), 16)
        .toString()
        .slice(0, length);
        return number.padStart(length, '0');
    }

    getOTP(email, callback){
        this.db.get(`SELECT * FROM verifications WHERE email = ?`, [email], (err, row)=>{
            if(err) return callback(err);
            if(!row) return callback(null, null);

            callback(null, { code: row.code, expiresAt: row.expiresAt });
        });
    }

    cleanExpired() {
    const now = new Date().toISOString();
    this.db.run(
        `DELETE FROM verifications WHERE expiresAt <= ?`,
        [now],
        function(err) {
            if (err) console.error("Error cleaning expired OTPs:", err.message);
            // Optional: console.log(`${this.changes} expired OTPs removed`);
        }
    );
}
    
}

module.exports = Verifier;
