import { Router } from 'express';
import {
  getUsers,
  blockUserByAdmin,
  getAllPublications,
  deletePublication,
  getStats
} from './admin.controller';

import { authMiddleware } from '../auth/auth.middleware';
import { isAdminMiddleware } from '../auth/isAdmin';

const router = Router();

router.use(authMiddleware, isAdminMiddleware);

router.get('/users', getUsers);
router.post('/users/:id/block', blockUserByAdmin);

router.get('/publications', getAllPublications);
router.delete('/publications/:id', deletePublication);

router.get('/stats', getStats);

export default router;
