const crypto = require('crypto');

class CryptoManager {
  constructor(options = {}) {
    this.hashAlgorithm = options.hashAlg || 'pbkdf2';
    this.iterations = options.iterations || 100000;
    this.keyLength = options.keyLen || 64;
  }

  async hash(data, callback) {
    const process = async () => {
      const salt = crypto.randomBytes(16).toString('hex');
      let hash;

      if (this.hashAlgorithm === 'pbkdf2') {
        hash = crypto.pbkdf2Sync(data, salt, this.iterations, this.keyLength, 'sha512').toString('hex');
      } else if (this.hashAlgorithm === 'scrypt') {
        hash = crypto.scryptSync(data, salt, this.keyLength).toString('hex');
      } else {
        throw new Error('Unsupported algorithm');
      }

      return { hashAlg: this.hashAlgorithm, salt, hash };
    };

    if (callback && typeof callback === 'function') {
      try {
        const result = await process();
        callback(null, result);
      } catch (err) {
        callback(err);
      }
    } else {
      return process();
    }
  }

  async verify(data, { hashAlg, salt, hash }, callback) {
    const process = async () => {
      let newHash;
      if (hashAlg === 'pbkdf2') {
        newHash = crypto.pbkdf2Sync(data, salt, this.iterations, this.keyLength, 'sha512').toString('hex');
      } else if (hashAlg === 'scrypt') {
        newHash = crypto.scryptSync(data, salt, this.keyLength).toString('hex');
      } else {
        throw new Error('Unsupported algorithm');
      }
      return newHash === hash;
    };

    if (callback && typeof callback === 'function') {
      try {
        const result = await process();
        callback(null, result);
      } catch (err) {
        callback(err);
      }
    } else {
      return process();
    }
  }
}

module.exports = CryptoManager;
