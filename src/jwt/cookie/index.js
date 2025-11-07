class CookieManager {
  static setCookie(res, name, value, options = {}) {
    if (!res || typeof res.setHeader !== 'function') {
      throw new Error("Response object must have setHeader() method");
    }

    let cookieStr = `${name}=${encodeURIComponent(value)}; Path=/;`;

    if (options.httpOnly) cookieStr += " HttpOnly;";
    if (options.secure) cookieStr += " Secure;";
    if (options.maxAge) cookieStr += ` Max-Age=${Math.floor(options.maxAge / 1000)};`;
    if (options.sameSite) cookieStr += ` SameSite=${options.sameSite};`;
    if (options.domain) cookieStr += ` Domain=${options.domain};`;

    const existing = res.getHeader('Set-Cookie') || [];
    const newCookies = Array.isArray(existing) ? [...existing, cookieStr] : [cookieStr];
    res.setHeader('Set-Cookie', newCookies);
  }

  static getCookie(req, name) {
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const found = cookies.find(c => c.startsWith(name + '='));
    return found ? decodeURIComponent(found.split('=')[1]) : null;
  }
}

module.exports = CookieManager;
