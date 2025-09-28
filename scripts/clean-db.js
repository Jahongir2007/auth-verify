const Verifier = require('../lib/auth-verify');

// Initialize Verifier (minimal, just for cleaning)
const verifier = new Verifier();

verifier.cleanExpired();
console.log('Expired OTPs cleaned from database.');
