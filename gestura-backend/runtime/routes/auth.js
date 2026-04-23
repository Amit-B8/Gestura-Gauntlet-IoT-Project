const express = require('express');

function createAuthRouter({ authService }) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};

    try {
      const token = authService.login(username, password);

      if (!token) {
        return res.status(401).json({
          ok: false,
          error: 'Invalid username or password',
        });
      }

      // Optional: keep this if your non-Next backend clients still use backend cookies
      // if (typeof authService.setSessionCookie === 'function') {
      //   authService.setSessionCookie(res, token);
      // }

      return res.json({
        ok: true,
        token,
      });
    } catch (err) {
      return res.status(401).json({
        ok: false,
        error: err.message || 'Login failed',
      });
    }
  });

  router.post('/logout', (req, res) => {
    if (typeof authService.clearSessionCookie === 'function') {
      authService.clearSessionCookie(res);
    }

    return res.json({ ok: true });
  });

  router.get('/session', (req, res) => {
    const token =
      req.cookies?.gestura_session ||
      authService.extractSessionToken?.(req) ||
      null;

    if (!token) {
      return res.status(401).json({ ok: false, error: 'No session' });
    }

    const session = authService.verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Invalid session' });
    }

    return res.json({
      ok: true,
      session,
    });
  });

  return router;
}

module.exports = { createAuthRouter };