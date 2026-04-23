const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'gestura_session';

class AuthService {
  constructor(options = {}) {
    this.dashboardUsername = options.dashboardUsername || process.env.DASHBOARD_USERNAME || 'admin';
    this.dashboardPasswordHash = options.dashboardPasswordHash || process.env.DASHBOARD_PASSWORD_HASH || '';
    this.dashboardPassword = options.dashboardPassword || process.env.DASHBOARD_PASSWORD || '';
    this.sessionSecret = options.sessionSecret || process.env.SESSION_SECRET || '';
    this.sessionTtlMs = options.sessionTtlMs || 12 * 60 * 60 * 1000;
    this.picoToken = options.picoToken || process.env.PICO_API_TOKEN || process.env.GLOVE_API_TOKEN || '';
  }

  validateConfig() {
    const errors = [];

    if (!this.sessionSecret) errors.push('SESSION_SECRET is required');
    if (!this.dashboardPasswordHash && !this.dashboardPassword) {
      errors.push('DASHBOARD_PASSWORD_HASH or DASHBOARD_PASSWORD is required');
    }

    return errors;
  }

  login(username, password) {
    if (!this.verifyUsername(username) || !this.verifyPassword(password)) {
      return null;
    }

    return this.createSessionToken({
      sub: this.dashboardUsername,
      iat: Date.now(),
      exp: Date.now() + this.sessionTtlMs,
    });
  }

  verifyUsername(username) {
    const expected = this.dashboardUsername || 'admin';
    const candidate = String(username || expected);
    return candidate === expected;
  }

  verifyPassword(password) {
    if (typeof password !== 'string' || !password.length) return false;

    if (this.dashboardPasswordHash) {
      return verifyConfiguredHash(password, this.dashboardPasswordHash);
    }

    return timingSafeStringEqual(password, this.dashboardPassword);
  }

  createSessionToken(payload) {
    const encodedPayload = base64url(JSON.stringify(payload));
    const signature = signValue(encodedPayload, this.sessionSecret);
    return `${encodedPayload}.${signature}`;
  }

  readSession(req) {
    const cookies = parseCookies(req.headers?.cookie || '');
    return this.verifySessionToken(cookies[SESSION_COOKIE_NAME]);
  }

  verifySessionToken(token) {
    if (!token || !this.sessionSecret) return null;
    const [encodedPayload, signature] = String(token).split('.');
    if (!encodedPayload || !signature) return null;
    if (!timingSafeStringEqual(signature, signValue(encodedPayload, this.sessionSecret))) return null;

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  setSessionCookie(res, token) {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.sessionTtlMs,
      path: '/',
    });
  }

  clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  requireDashboardSession() {
    return (req, res, next) => {
      const session = this.readSession(req);
      if (!session) {
        res.status(401).json({ ok: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }

      req.dashboardSession = session;
      next();
    };
  }

  requirePicoToken() {
    return (req, res, next) => {
      if (this.hasValidPicoToken(req)) {
        next();
        return;
      }

      res.status(401).json({ ok: false, error: 'Valid Pico token required', code: 'PICO_TOKEN_REQUIRED' });
    };
  }

  requireDashboardOrPicoToken() {
    return (req, res, next) => {
      const session = this.readSession(req);
      if (session) {
        req.dashboardSession = session;
        next();
        return;
      }

      if (this.hasValidPicoToken(req)) {
        next();
        return;
      }

      res.status(401).json({ ok: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    };
  }

  hasValidPicoToken(req) {
    if (!this.picoToken) return false;
    const provided = getBearerToken(req.headers?.authorization) || req.query?.api_key;
    if (!provided) return false;
    return timingSafeStringEqual(String(provided), this.picoToken);
  }

  authenticateDashboardSocket(socket, next) {
    const session = this.verifySessionToken(
      parseCookies(socket.request?.headers?.cookie || '')[SESSION_COOKIE_NAME],
    );

    if (!session) {
      next(new Error('Authentication required'));
      return;
    }

    socket.dashboardSession = session;
    next();
  }
}

function verifyConfiguredHash(password, configuredHash) {
  if (configuredHash.startsWith('scrypt$')) {
    const [, saltHex, expectedHex] = configuredHash.split('$');
    if (!saltHex || !expectedHex) return false;
    const derived = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), Buffer.from(expectedHex, 'hex').length);
    return timingSafeBufferEqual(derived, Buffer.from(expectedHex, 'hex'));
  }

  return timingSafeStringEqual(password, configuredHash);
}

function signValue(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function parseCookies(header) {
  return String(header || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separator = part.indexOf('=');
      if (separator === -1) return acc;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function getBearerToken(header) {
  if (!header) return null;
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function base64url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return timingSafeBufferEqual(Buffer.from(a), Buffer.from(b));
}

function timingSafeBufferEqual(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  AuthService,
  SESSION_COOKIE_NAME,
};
