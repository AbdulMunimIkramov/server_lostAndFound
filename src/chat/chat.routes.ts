import { Router } from 'express';
import { getChatsForUser, getMessagesForChat } from './chat.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getChatsForUser);
router.get('/:chatId/messages', authMiddleware, getMessagesForChat);

export default router;
