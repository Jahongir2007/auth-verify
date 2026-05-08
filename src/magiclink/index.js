const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const sgMail = require('@sendgrid/mail');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { Resend } = require('resend');

class MagicLinkManager {
  constructor(config = {}) {
    this.secret = config.mlSecret || 'authverify_secret';
    this.expiresIn = config.mlExpiry || '5m';
    this.appUrl = config.appUrl || 'https://yourapp.com';
    this.storeType = config.storeTokens || 'memory';

    if (this.storeType === 'memory') {
      this.tokenStore = new Map();
    } else if (this.storeType === 'redis') {
      this.redis = new Redis(config.redisUrl || 'redis://localhost:6379');
    } else if (this.storeType !== 'none') {
      throw new Error("{storeTokens} must be 'memory' or 'redis'");
    }
  }

  async generate(email) {
    return jwt.sign({ email }, this.secret, { expiresIn: this.expiresIn });
  }

  sender(config = {}) {
    this.senderConfig = config;
  }

  async send(email, mailOption = {}, callback) {
    if (typeof mailOption === 'function') {
      callback = mailOption;
      mailOption = {};
    }

    const sendProcess = async () => {
      const token = await this.generate(email);
      const link = `${this.appUrl}/auth/verify?token=${token}`;

      const letterHtml = mailOption.html
        ? mailOption.html.replace(/{{\s*link\s*}}/gi, link)
        : `<p>Click to login: <a href="${link}">${link}</a></p>`;

      if(this.senderConfig.apiService === "sendgrid" && this.senderConfig.service === 'api'){
        sgMail.setApiKey(this.senderConfig.apiKey)

        const apiMail = {
          to: email,
          from: this.senderConfig.sender,
          subject: mailOption.subject || 'Your Magic Login Link ✨',
          html: letterHtml
        };

        try{
          const info = await sgMail.send(apiMail)
          this.recieverConfig = mailOption
          // return info

          let timeVal = 5 * 60 * 1000;
          if (typeof this.expiresIn === 'string') {
            if (this.expiresIn.endsWith('m')) timeVal = parseInt(this.expiresIn) * 60 * 1000;
            else if (this.expiresIn.endsWith('s')) timeVal = parseInt(this.expiresIn) * 1000;
          } else if (typeof this.expiresIn === 'number') timeVal = this.expiresIn * 1000;

          if (this.storeType === 'memory') {
            this.tokenStore.set(email, token);
            setTimeout(() => this.tokenStore.delete(email), timeVal);
          } else if (this.storeType === 'redis') {
            await this.redis.set(email, token, 'PX', timeVal);
          }

          return { token, link };
        }catch(err){
          throw new Error(err.response?.body || err.message)
        }
      }else if(this.senderConfig.apiService === "mailgun" && this.senderConfig.service === "api"){
        const mg = new Mailgun(formData).client({
          username: 'api',
          key: this.senderConfig.apiKey,
        });

        const apiMail = {
          to: email,
          from: this.senderConfig.sender,
          subject: mailOption.subject || 'Your Magic Login Link ✨',
          html: letterHtml
        };

        try{
          const info = await mg.messages.create(this.senderConfig.domain, apiMail)
          this.recieverConfig = mailOption
          // return info

          let timeVal = 5 * 60 * 1000;
          if (typeof this.expiresIn === 'string') {
            if (this.expiresIn.endsWith('m')) timeVal = parseInt(this.expiresIn) * 60 * 1000;
            else if (this.expiresIn.endsWith('s')) timeVal = parseInt(this.expiresIn) * 1000;
          } else if (typeof this.expiresIn === 'number') timeVal = this.expiresIn * 1000;

          if (this.storeType === 'memory') {
            this.tokenStore.set(email, token);
            setTimeout(() => this.tokenStore.delete(email), timeVal);
          } else if (this.storeType === 'redis') {
            await this.redis.set(email, token, 'PX', timeVal);
          }

          return { token, link };
        }catch(err){
          throw new Error(err.response?.body || err.message)
        }
        
      }else if(this.senderConfig.apiService === "resend" && this.senderConfig.service === 'api'){
        const resend = new Resend(this.senderConfig.apiKey);

        const apiMail = {
          to: email,
          from: this.senderConfig.sender,
          subject: mailOption.subject || 'Your Magic Login Link ✨',
          html: letterHtml
        };

        try {
          const info = await resend.emails.send(apiMail);
          this.recieverConfig = mailOption;
          // return info;

          let timeVal = 5 * 60 * 1000;
          if (typeof this.expiresIn === 'string') {
            if (this.expiresIn.endsWith('m')) timeVal = parseInt(this.expiresIn) * 60 * 1000;
            else if (this.expiresIn.endsWith('s')) timeVal = parseInt(this.expiresIn) * 1000;
          } else if (typeof this.expiresIn === 'number') timeVal = this.expiresIn * 1000;

          if (this.storeType === 'memory') {
            this.tokenStore.set(email, token);
            setTimeout(() => this.tokenStore.delete(email), timeVal);
          } else if (this.storeType === 'redis') {
            await this.redis.set(email, token, 'PX', timeVal);
          }

          return { token, link };
        } catch(err) {
          throw new Error(err.response?.body || err.message);
        }
      }

      let transporter;
      if (this.senderConfig.service === 'gmail') {
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: this.senderConfig.port || 587,
          secure: this.senderConfig.secure || false,
          auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass },
          pool: true,
          maxConnections: 3,
          maxMessages: 50
        });
      } else {
        transporter = nodemailer.createTransport({
          host: this.senderConfig.host,
          port: this.senderConfig.port || 587,
          secure: this.senderConfig.secure || false,
          auth: { user: this.senderConfig.sender, pass: this.senderConfig.pass },
          pool: true,
          maxConnections: 3,
          maxMessages: 50
        });
      }

      await transporter.sendMail({
        from: this.senderConfig.sender,
        to: email,
        subject: mailOption.subject || 'Your Magic Login Link ✨',
        html: letterHtml
      });

      let timeVal = 5 * 60 * 1000;
      if (typeof this.expiresIn === 'string') {
        if (this.expiresIn.endsWith('m')) timeVal = parseInt(this.expiresIn) * 60 * 1000;
        else if (this.expiresIn.endsWith('s')) timeVal = parseInt(this.expiresIn) * 1000;
      } else if (typeof this.expiresIn === 'number') timeVal = this.expiresIn * 1000;

      if (this.storeType === 'memory') {
        this.tokenStore.set(email, token);
        setTimeout(() => this.tokenStore.delete(email), timeVal);
      } else if (this.storeType === 'redis') {
        await this.redis.set(email, token, 'PX', timeVal);
      }

      return { token, link };
    };

    if (callback) sendProcess().then(r => callback(null, r)).catch(e => callback(e));
    else return sendProcess();
  }

  async verify(token, callback) {
    const verifyProcess = async () => {
      try {
        const decoded = jwt.verify(token, this.secret);
        // console.log("Decoded",decoded);
        // console.log("Token", token);
        // console.log("Secret", this.secret);
        const email = decoded.email;

        let stored;
        if (this.storeType === 'memory') stored = this.tokenStore.get(email);
        else if (this.storeType === 'redis') stored = await this.redis.get(email);

        if (!stored) throw new Error('Magic link expired or not found');
        if (stored !== token) throw new Error('Invalid or already used magic link');

        if (this.storeType === 'memory') this.tokenStore.delete(email);
        if (this.storeType === 'redis') await this.redis.del(email);

        return { success: true, user: decoded };
      } catch (err) {
        throw new Error(`Invalid or expired magic link: ${err}`);
      }
    };

    if (callback && typeof callback === 'function')
      verifyProcess().then(r => callback(null, r)).catch(e => callback(e));
    else return verifyProcess();
  }
}

module.exports = MagicLinkManager;
