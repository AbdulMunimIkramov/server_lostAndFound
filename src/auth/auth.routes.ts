import { Router } from 'express';
import { register, login, getCurrentUser } from './auth.controller';
import { authMiddleware } from './auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// 🔐 защищённый маршрут
router.get('/me', authMiddleware, getCurrentUser);

export default router;
