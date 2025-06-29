import { Router } from 'express';
import {
  getUsers,
  blockUserByAdmin,
  getAllPublications,
  deletePublication,
  getStats, getReports,
  getAds,
  createAd,
  deleteAd,
  unblockUserByAdmin
} from './admin.controller';

import { authMiddleware } from '../auth/auth.middleware';
import { isAdminMiddleware } from '../auth/isAdmin';

const router = Router();

router.get('/ads', getAds);
router.use(authMiddleware, isAdminMiddleware);

router.get('/users', getUsers);
router.post('/users/:id/block', blockUserByAdmin);
router.post('/users/:id/unblock', unblockUserByAdmin);

router.get('/publications', getAllPublications);
router.delete('/publications/:id', deletePublication);
router.get('/reports', getReports);

router.get('/stats', getStats);

router.post('/ads', createAd);
router.delete('/ads/:id', deleteAd);

export default router;
