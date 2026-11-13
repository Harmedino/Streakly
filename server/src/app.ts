import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config/index';
import { ApiError, errorHandler } from './middleware/errors';
import { auth } from './routes/auth';
import { drafts } from './routes/drafts';
import { workspace } from './routes/workspace';
export const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  }),
);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.get('origin');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    ((origin && origin !== config.APP_ORIGIN) || !req.is('application/json'))
  )
    throw new ApiError(403, 'ORIGIN', 'Send JSON requests from the configured application origin.');
  next();
});
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, data: { service: 'streakly', authentication: true } }),
);
app.use('/api/auth', auth);
app.use('/api/drafts', drafts);
app.use('/api', workspace);
app.use('/api', () => {
  throw new ApiError(404, 'ROUTE', 'API route not found.');
});
const browser = path.resolve(process.cwd(), '../client/dist/streakly/browser');
async function applicationHtml() {
  return (await readFile(path.join(browser, 'index.html'), 'utf8')).replace(
    '<head>',
    '<head><meta name="streakly-backend" content="required">',
  );
}
async function serveApp(_req: express.Request, res: express.Response) {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(await applicationHtml());
}
app.get('/index.html', serveApp);
app.get('/ngsw.json', async (_req, res) => {
  const [rawManifest, html] = await Promise.all([
    readFile(path.join(browser, 'ngsw.json'), 'utf8'),
    applicationHtml(),
  ]);
  const manifest = JSON.parse(rawManifest);
  // Angular verifies cached assets against SHA-1 hashes. Match the server's marked HTML.
  manifest.hashTable['/index.html'] = createHash('sha1').update(html).digest('hex');
  res.setHeader('Cache-Control', 'no-cache');
  res.json(manifest);
});
app.use(express.static(browser, { index: false }));
app.get('/{*path}', serveApp);
app.use(errorHandler);
