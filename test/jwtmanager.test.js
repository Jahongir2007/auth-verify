// tests/jwtManager.test.js
const AuthVerify = require('../index');
const express = require('express');
const request = require('supertest'); // for API tests

describe('JWTManager', () => {
  let auth;

  beforeAll(() => {
    auth = new AuthVerify({jwtSecret: 'test_secret', storeTokens: 'memory'});
  });

  test('should sign and verify a JWT', async () => {
    const payload = { userId: 1 };
    const token = await auth.jwt.sign(payload, '5s');
    expect(typeof token).toBe('string');

    const verified = await auth.jwt.verify(token);
    expect(verified.userId).toBe(1);
  });

  test('should fail after expiration', async () => {
    const token = await auth.jwt.sign({ name: 'Jahongir' }, '1s');
    await new Promise(r => setTimeout(r, 2000)); // wait 2s
    await expect(auth.jwt.verify(token)).rejects.toThrow(/expired/i);
  });

  test('should set cookie automatically if res is provided', async () => {
    const app = express();

    app.get('/login', async (req, res) => {
      const token = await auth.jwt.sign({ userId: 123 }, '5s', { res });
      res.json({ token });
    });

    const res = await request(app).get('/login');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
