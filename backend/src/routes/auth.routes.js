import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { registerValidator, loginValidator, changePasswordValidator } from '../validators/auth.validators.js';
import { authLimiter, registerLimiter, passwordLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

router.post('/register', registerLimiter(), registerValidator, auth.register);
router.post('/login', authLimiter(), loginValidator, auth.login);
router.post('/refresh', authLimiter(), auth.refresh);
router.post('/logout', auth.logout);
router.post('/logout-others', authenticate, auth.logoutOtherSessions);
router.get('/me', authenticate, auth.me);
router.patch('/me', authenticate, auth.updateProfile);
router.patch('/me/password', authenticate, passwordLimiter(), changePasswordValidator, auth.changePassword);

export default router;