import { Router } from 'express';
import { getNotifications, markAsRead } from './notification.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getNotifications);
router.post('/:id/read', authMiddleware, markAsRead);

export default router;
