import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import nodemailer from 'nodemailer';
import type { Response } from 'express';
import { User, Session } from '../models/index';
import { config } from '../config';
const scrypt = promisify(scryptCallback);
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + ((await scrypt(password, salt, 64)) as Buffer).toString('hex');
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  const check = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return expected.length === check.length && timingSafeEqual(expected, check);
}
export async function issueSession(user: any, res: Response) {
  const token = randomBytes(32).toString('base64url'),
    csrf = randomBytes(32).toString('base64url'),
    expiresAt = new Date(Date.now() + 7 * 86400000);
  await Session.create({
    userId: user._id,
    tokenHash: digest(token),
    csrf,
    expiresAt,
    authVersion: user.authVersion,
  });
  res.cookie('streakly_session', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
    maxAge: 7 * 86400000,
  });
  return { user: { id: String(user._id), email: user.email }, csrf };
}
export const testMail: { to: string; url: string }[] = [];
export async function sendReset(email: string, url: string) {
  if (config.NODE_ENV === 'test') {
    testMail.push({ to: email, url });
    return;
  }
  if (!config.SMTP_URL) throw new Error('Password reset email is not configured.');
  await nodemailer.createTransport(config.SMTP_URL).sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: 'Reset your Streakly password',
    text: `Reset your password within 30 minutes: ${url}\nIf you did not request this, ignore this message.`,
  });
}
export async function findSession(token: string) {
  if (!token) return null;
  const session = await Session.findOne({
    tokenHash: digest(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await User.findById(session.userId);
  if (!user || user.authVersion !== session.authVersion) return null;
  return { session, user };
}
