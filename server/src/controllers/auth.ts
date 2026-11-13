import { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { emptyData } from '../../../client/src/app/core/models/tracker';
import { config } from '../config/index';
import { ApiError } from '../middleware/errors';
import { Session, User, Workspace } from '../models/index';
import {
  digest,
  findSession,
  hashPassword,
  issueSession,
  sendReset,
  verifyPassword,
} from '../services/auth';
import { credentials } from '../validators/auth';
export const session: RequestHandler = async (req, res) => {
  const found = await findSession(req.cookies?.streakly_session || '');
  res.json({
    ok: true,
    data: found
      ? { user: { id: String(found.user._id), email: found.user.email }, csrf: found.session.csrf }
      : null,
  });
};
export const signup: RequestHandler = async (req, res) => {
  const body = credentials.parse(req.body);
  const user = await User.create({
    email: body.email,
    passwordHash: await hashPassword(body.password),
  });
  const data = emptyData();
  data.preferences.onboarded = true;
  await Workspace.create({ userId: user._id, data });
  res.status(201).json({ ok: true, data: await issueSession(user, res) });
};
export const login: RequestHandler = async (req, res) => {
  const body = credentials.parse(req.body);
  const user = await User.findOne({ email: body.email });
  const hash = user?.passwordHash || (await hashPassword('dummy-password-for-timing'));
  if (!(await verifyPassword(body.password, hash)) || !user)
    throw new ApiError(401, 'LOGIN_FAILED', 'Email or password is incorrect.');
  res.json({ ok: true, data: await issueSession(user, res) });
};
export const logout: RequestHandler = async (req, res) => {
  await Session.deleteOne({ tokenHash: digest(req.cookies.streakly_session) });
  res.clearCookie('streakly_session', {
    path: '/api',
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
  });
  res.json({ ok: true, data: null });
};
export const forgotPassword: RequestHandler = async (req, res) => {
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
};
export const resetPassword: RequestHandler = async (req, res) => {
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
};
