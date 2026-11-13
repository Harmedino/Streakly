// Vercel's same-origin gateway. Express and MongoDB are deployed separately.
module.exports = async function proxy(req, res) {
  const configured = process.env.STREAKLY_API_ORIGIN;
  if (!configured || !/^https:\/\//.test(configured)) {
    res.status(503).json({
      ok: false,
      error: {
        code: 'SERVER_CONFIGURATION',
        message:
          'Set STREAKLY_API_ORIGIN to the HTTPS Express service in Vercel environment settings.',
      },
    });
    return;
  }
  try {
    const original = new URL(req.url, 'https://streakly.invalid');
    const route = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : String(req.query.path || '');
    if (
      route
        .split('/')
        .some((segment) => segment === '.' || segment === '..' || segment.includes('\\'))
    ) {
      res.status(400).json({ ok: false, error: { message: 'Invalid API path.' } });
      return;
    }
    // Keep requests within the configured service's API prefix.
    const url = new URL('/api/' + route.replace(/^\/+/, ''), configured);
    original.searchParams.delete('path');
    url.search = original.searchParams.toString();
    const headers = {};
    for (const name of ['content-type', 'cookie', 'x-csrf-token', 'origin'])
      if (req.headers[name]) headers[name] = req.headers[name];
    const response = await fetch(url, {
      method: req.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(18000),
      ...(['GET', 'HEAD'].includes(req.method)
        ? {}
        : { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}) }),
    });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(502).json({
      ok: false,
      error: {
        code: 'SERVER_UNAVAILABLE',
        message:
          'Cannot connect to the Streakly server. Your changes were not saved. Retry when connected.',
      },
    });
  }
};
