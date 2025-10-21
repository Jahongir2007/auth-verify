const JWTManager = require("./src/jwt");
const OTPManager = require("./src/otp");
const SessionManager = require("./src/session");

class AuthVerify {
  constructor(options = {}) {
    const {
      jwtSecret,
      otpExpiry = 300,
      storeTokens = "none",
      otpHash = "sha256",
      redisUrl,
    } = options;

    if (!jwtSecret) throw new Error("jwtSecret is required in AuthVerify options");

    this.senderName;
    this.jwt = new JWTManager(jwtSecret, { storeTokens });
    this.otp = new OTPManager({
      storeTokens,
      otpExpiry,
      otpHash,
      redisUrl,
    });
    this.session = new SessionManager({ storeTokens, redisUrl });

    this.senders = new Map();
    // this.register = {
    //   sender: (name, fn)=>{
    //     if (!name || typeof fn !== "function") {
    //       throw new Error("Sender registration requires a name and a function");
    //     }else{
    //       try{
    //         this.senders.set(name, fn);
    //       }catch(err){
    //         throw new Error(err);
    //       }
    //     }
    //   }
    // }
    // ✅ No getters — directly reference otp.dev (it's a plain object)
  }
  
  // Session helpers
  async createSession(userId, options = {}) {
    return this.session.create(userId, options);
  }

  async verifySession(sessionId) {
    return this.session.verify(sessionId);
  }

  async destroySession(sessionId) {
    return this.session.destroy(sessionId);
  }

  async use(name){
    const senderFn = this.senders.get(name);
    if(!senderFn) throw new Error(`Sender "${name}" not found`);
    this.senderName = senderFn;
  }

    register = {
        sender: (name, fn) => {
            if (!name || typeof fn !== "function") {
                throw new Error("Sender registration requires a name and a function");
            }
            this.senders.set(name, fn);
            // console.log(`✅ Sender registered: ${name}`);
        }
    };

    // use a sender by name
    use(name) {
        const senderFn = this.senders.get(name);
        if (!senderFn) throw new Error(`Sender "${name}" not found`);

        return {
            send: async (options) => {
                return await senderFn(options); // call user function
            }
        };
    }
}

module.exports = AuthVerify;
