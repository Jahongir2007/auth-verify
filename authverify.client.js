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

  async issue(publicKey){
    publicKey.challenge = this.base64urlToUint8Array(publicKey.challenge);
    publicKey.user.id = this.base64urlToUint8Array(publicKey.user.id);
    
    const credential = await navigator.credentials.create({ publicKey });

    const data = {
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      response: {
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
      },
    };

    return data;
  }

}
