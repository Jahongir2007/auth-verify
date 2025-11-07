const AuthVerify = require('auth-verify');
const auth = new AuthVerify();

auth.otp.setSender({
   via: 'sms',
   provider: 'twilio',
   apiKey: "YOUR_ACCOUNT_SID",
   apiSecret "YOUR_AUTH_TOKEN",
   sender: "SENDER_NAME",
   mock: false // If you want to just test you can change this value to true
});

auth.otp.generate(5).set("RECIEVER_NUMBER", (err)=>{
   if(err) console.log(err);
   auth.otp.message({
      to: "RECIEVER_NUMBER",
      text: `Your OTP code is ${auth.otp.code}`
   });
});

auth.otp.verify({check: "RECIEVER_NUMBER", code: "12345"}, (err, valid)=>{
   if(err) console.log(err);
   if (valid) console.log("Correct code!");
   else console.log("Incorrect code!");
});
