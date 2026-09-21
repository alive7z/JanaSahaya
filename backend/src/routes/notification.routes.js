import { Router } from 'express';
import * as notif from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/', notif.list);
router.get('/unread-count', notif.unreadCount);
router.post('/mark-all-read', notif.markAll);
router.patch('/:id/read', notif.markOneRead);

export default router;