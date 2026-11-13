import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { User, Session, Workspace } from '../models/index';
import {
  hashPassword,
  verifyPassword,
  issueSession,
  findSession,
  digest,
  sendReset,
} from '../services/auth';
import { ApiError } from '../middleware/errors';
import { protect } from '../middleware/auth';
import { config } from '../config';
import { emptyData } from '../../src/app/models/tracker';
export const auth = Router();
const credentials = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .strict();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.NODE_ENV === 'test' ? 500 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 'RATE_LIMIT', message: 'Too many attempts. Please try again in 15 minutes.' },
  },
});
auth.get('/session', async (req, res) => {
  const found = await findSession(req.cookies?.streakly_session || '');
  res.json({
    ok: true,
    data: found
      ? { user: { id: String(found.user._id), email: found.user.email }, csrf: found.session.csrf }
      : null,
  });
});
auth.post('/signup', limiter, async (req, res) => {
  const body = credentials.parse(req.body);
  const user = await User.create({
    email: body.email,
    passwordHash: await hashPassword(body.password),
  });
  const data = emptyData();
  data.preferences.onboarded = true;
  await Workspace.create({ userId: user._id, data });
  res.status(201).json({ ok: true, data: await issueSession(user, res) });
});
auth.post('/login', limiter, async (req, res) => {
  const body = credentials.parse(req.body);
  const user = await User.findOne({ email: body.email });
  const hash = user?.passwordHash || (await hashPassword('dummy-password-for-timing'));
  if (!(await verifyPassword(body.password, hash)) || !user)
    throw new ApiError(401, 'LOGIN_FAILED', 'Email or password is incorrect.');
  res.json({ ok: true, data: await issueSession(user, res) });
});
auth.post('/logout', protect, async (req, res) => {
  await Session.deleteOne({ tokenHash: digest(req.cookies.streakly_session) });
  res.clearCookie('streakly_session', {
    path: '/api',
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
  });
  res.json({ ok: true, data: null });
});
auth.post('/forgot-password', limiter, async (req, res) => {
  const { email } = credentials.pick({ email: true }).parse(req.body);
  if (!config.SMTP_URL && config.NODE_ENV !== 'test')
    throw new ApiError(
      503,
      'MAIL_UNAVAILABLE',
      'Password reset email is not configured. Contact the owner of this installation.',
    );
  const user = await User.findOne({ email });
  if (user) {
    const token = randomBytes(32).toString('base64url');
    await User.updateOne(
      { _id: user._id },
      { $set: { resetHash: digest(token), resetExpires: new Date(Date.now() + 30 * 60000) } },
    );
    await sendReset(email, config.APP_ORIGIN + '/?reset=' + encodeURIComponent(token));
  }
  res.status(202).json({
    ok: true,
    data: { message: 'If that address has an account, a reset email will arrive shortly.' },
  });
});
auth.post('/reset-password', limiter, async (req, res) => {
  const { token, password } = z
    .object({ token: z.string().min(40).max(100), password: z.string().min(12).max(128) })
    .strict()
    .parse(req.body);
  const user = await User.findOneAndUpdate(
    { resetHash: digest(token), resetExpires: { $gt: new Date() } },
    {
      $set: { passwordHash: await hashPassword(password) },
      $unset: { resetHash: 1, resetExpires: 1 },
      $inc: { authVersion: 1 },
    },
  );
  if (!user)
    throw new ApiError(
      400,
      'RESET_EXPIRED',
      'This reset link is invalid or expired. Request a new one.',
    );
  await Session.deleteMany({ userId: user._id });
  res.json({ ok: true, data: { message: 'Password updated. Sign in with your new password.' } });
});
