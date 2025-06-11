import { Router } from 'express';
import { getMyPublications, getMyProfile, updateMyProfile } from './user.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getMyProfile);
router.put('/me', authMiddleware, updateMyProfile);
router.get('/me/publications', authMiddleware, getMyPublications);

export default router;