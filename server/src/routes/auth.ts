import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import * as controller from '../controllers/auth';
import { protect } from '../middleware/auth';
export const auth = Router();
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
auth.get('/session', controller.session);
auth.post('/signup', limiter, controller.signup);
auth.post('/login', limiter, controller.login);
auth.post('/logout', protect, controller.logout);
auth.post('/forgot-password', limiter, controller.forgotPassword);
auth.post('/reset-password', limiter, controller.resetPassword);
