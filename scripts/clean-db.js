const Verifier = require('../lib/verifier');

// Initialize Verifier (minimal, just for cleaning)
const verifier = new Verifier();

verifier.cleanExpired();
console.log('Expired OTPs cleaned from database.');
