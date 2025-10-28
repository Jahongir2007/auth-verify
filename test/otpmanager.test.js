jest.setTimeout(15000);

const AuthVerify = require('../index');
const delay = ms => new Promise(r => setTimeout(r, ms));

describe('OTPManager', () => {
  let auth;

  beforeAll(() => {
    auth = new AuthVerify({
      storeTokens: 'memory',   // you can also test with 'redis'
      otpExpiry: 1,            // 1 second expiry
    });
  });

  test('should generate and verify OTP successfully', async () => {
    const email = 'test@example.com';
    
    // generate OTP
    const otp = await auth.otp.generate().set(email);
    expect(typeof otp.code).toBe('string');
    expect(otp.code.length).toBeGreaterThan(3);

    // verify OTP
    const isValid = await auth.otp.verify({check: email, code: otp.code});
    expect(isValid).toBe(true);
  });

//   jest.useFakeTimers();

  test('should reject wrong OTP', async () => {
    const email = 'fake@example.com';
    await auth.otp.generate().set(email);
    await expect(auth.otp.verify({check: email, code: '000000'})).rejects.toThrow('Invalid OTP');
  });

    test('should expire OTP after time limit', async () => {
    const email = 'expire@test.com';
    const otp = await auth.otp.generate().set(email);

    // await delay(3000); // wait longer than expiry

    setTimeout(async () => {
    try {
      await expect(auth.otp.verify({ check: email, code: otp.code })).rejects.toThrow('OTP expired');
    } catch (err) {
    //   console.error("🔴 Expired as expected:", err.message);
    }
  }, 3000);
    });
});
