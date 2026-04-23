const express = require('express');

function createAuthRouter({ authService }) {
  const router = express.Router();

  router.get('/session', (req, res) => {
    const session = authService.readSession(req);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      username: session.sub,
      expiresAt: new Date(session.exp).toISOString(),
    });
  });

  router.post('/login', (req, res) => {
    const token = authService.login(req.body?.username, req.body?.password);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }

    authService.setSessionCookie(res, token);
    res.json({ ok: true, username: authService.dashboardUsername });
  });

  router.post('/logout', (_req, res) => {
    authService.clearSessionCookie(res);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAuthRouter };
