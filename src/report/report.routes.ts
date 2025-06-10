import { Router } from 'express';
import { reportUserOrPublication, blockUser } from './report.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();

router.post('/report', authMiddleware, reportUserOrPublication);
router.post('/block', authMiddleware, blockUser);

export default router;
