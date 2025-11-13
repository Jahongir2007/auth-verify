window.AuthVerify = class AuthVerify {
    constructor(options = {}){
        this.apiBase = options.apiBase || 'http://localhost:3000';
        this.qrContainer = options.qrEl || null;
    }

    // Fetch QR code from backend and display
    post(url){
        this.fetchPostUrl = url;
        return this;
    }

    get(url){
        this.fetchGetUrl = url;
        return this;
    }

    async qr() {
        if (!this.qrContainer) return;
        try {
        const res = await fetch(`${this.apiBase}${this.fetchGetUrl}`);
        const data = await res.json();
        if (data.qr) {
            this.qrContainer.src = data.qr;
        } else {
            this.showResponse('No QR received');
        }
        } catch (err) {
        console.error(err);
        this.showResponse('Error fetching QR');
        }
    }

    showResponse(msg){
        console.log("[AuthVerify]", msg);
    }

    async data(payload){
        try {
            const res = await fetch(`${this.apiBase}${this.fetchPostUrl}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
            });

            const data = await res.json();

            // if backend returned jwt we store it but still return whole data
            if (data.token) {
            this.jwt = data.token;
            }

            return data;

        } catch(err){
            console.error(err);
            return { error: true, message: err.message };
        }
    }

    header(){
        if(!this.jwt) return {};
        return {
            Authorization: `Bearer ${this.jwt}`
        };
    }

    async verify(code){
        return this.data({code});
    }

      // -----------------------------
  // Helper: decode Base64URL to Uint8Array
  // -----------------------------
  base64urlToUint8Array(base64url) {
    if (!base64url) throw new Error("Missing Base64URL data");
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const str = atob(base64);
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }

  start(route){
    this.startRegisterApi = route;
    return this;
  }

  finish(route){
    this.finishRegisterApi = route;
    return this;
  }

  // -----------------------------
  // REGISTER PASSKEY (full flow)
  // -----------------------------
  async registerPasskey(user) {
    try {
      // 1️⃣ Get registration options from backend
      const publicKey = await this.post(`${this.startRegisterApi}`).data({user});

      // 2️⃣ Decode challenge & user.id automatically
      publicKey.challenge = this.base64urlToUint8Array(publicKey.challenge);
      publicKey.user.id = this.base64urlToUint8Array(publicKey.user.id);

      // 3️⃣ Ask browser to create credential
      const credential = await navigator.credentials.create({ publicKey });

      // 4️⃣ Convert ArrayBuffers to base64
      const data = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        type: credential.type,
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
        },
      };

      // 5️⃣ Send credential to backend to finish registration
      const result = await this.post(`${this.finishRegisterApi}`).data(data);

      return result;

    } catch (err) {
      console.error("[AuthVerify registerPasskey]", err);
      return { error: true, message: err.message };
    }
  }

  // -----------------------------
// LOGIN / AUTHENTICATE PASSKEY
// -----------------------------
async loginPasskey(user) {
        try {
            // 1️⃣ Get assertion options (challenge) from backend
            const publicKey = await this.post(`${this.startRegisterApi}`).data({ user, login: true });

            // 2️⃣ Decode Base64URL fields
            publicKey.challenge = this.base64urlToUint8Array(publicKey.challenge);
            publicKey.allowCredentials = publicKey.allowCredentials.map(cred => ({
            ...cred,
            id: this.base64urlToUint8Array(cred.id)
            }));

            // 3️⃣ Ask browser to get credential
            const credential = await navigator.credentials.get({ publicKey });

            // 4️⃣ Convert ArrayBuffers to Base64
            const data = {
            id: credential.id,
            rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            type: credential.type,
            response: {
                clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
                authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
                signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
                userHandle: credential.response.userHandle
                ? btoa(String.fromCharCode(...new Uint8Array(credential.response.userHandle)))
                : null,
            },
            };

            // 5️⃣ Send assertion to backend for verification
            const result = await this.post(`${this.finishRegisterApi}`).data(data);

            return result;

        } catch (err) {
            console.error("[AuthVerify loginPasskey]", err);
            return { error: true, message: err.message };
        }
    }

}
