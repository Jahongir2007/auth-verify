const AuthVerify = require('auth-verify');
const auth = new AuthVerify({otpExpiry: '5m', storeTokens: 'memory'});

// connecting sender gmail (if you use other services like smtp you should add there host, secure)
auth.otp.setSender({
  via: 'email',
  sender: 'sender@gmail.com',
  pass: 'SENDER_APP_PASS',
  service: 'gmail'
});

(async ()=>{
  await auth.otp.generate(5).set('reciever@mail.com'); // making otp code (length of otp is 5) and saving it in memory for key 'user_1'
  console.log(`OTP generated: ${auth.otp.code}`); // for viewing code we should use auth.otp.code
  
  await auth.otp.message({to: 'reciever@mail.com'}); // you can add subject, html, text properties to this fucntion
  console.log('OTP was sent');
  
  const verified = await auth.otp.verify({
    check: "reciever@mail.com", // checking OTP for user_1
    code: "reciever@mail.com_otp_code" // user's code should be there
  });

  if(verified){
    console.log('Correct!');
  }else{
    console.log('Incorrect!');
  }
})();
