const Verifier = require('../lib/verifier');

// Initialize Verifier
const verifier = new Verifier({
    sender: 'your_email@example.com',
    pass: 'your_email_password',
    serv: 'gmail',
    otp: {
        leng: 6,
        expMin: 3,
        limit: 5,
        cooldown: 60
    }
});

// Send OTP
verifier
    .html("<h1>Your OTP is {otp}</h1>")
    .subject("Verify your account: {otp}")
    .text("Your OTP is {otp}")
    .sendTo('user@example.com', (err, success) => {
        if (err) return console.error(err);
        console.log("OTP sent successfully!");

        // Example: Verify OTP after sending (replace with actual user input)
        const userInput = '123456';
        verifier.code(userInput).verifyFor('user@example.com', (err, isValid) => {
            if (err) return console.error(err);
            console.log(isValid ? "✅ OTP verified" : "❌ Invalid or expired OTP");
        });
    });
