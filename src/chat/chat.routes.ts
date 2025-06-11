import { Router } from 'express';
import {
  createChatWithFirstMessage,
  getChatsForUser,
  getMessagesForChat,
  sendMessage,
} from './chat.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getChatsForUser);
router.get('/:chatId/messages', authMiddleware, getMessagesForChat);
router.post('/', authMiddleware, createChatWithFirstMessage);
router.post('/:chatId/send', authMiddleware, sendMessage); // Убедимся, что маршрут правильный

export default router;
