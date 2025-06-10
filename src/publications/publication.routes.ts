import { Router } from 'express';
import { createPublication } from './publication.controller';
import { authMiddleware } from '../auth/auth.middleware';
import { upload } from '../upload';
import { uploadImages } from './publication.controller';
import { getAllPublications, getPublicationById } from './publication.controller';
import { closePublication } from './publication.controller';

const router = Router();

// 🔐 Только для авторизованных пользователей
router.post('/', authMiddleware, createPublication);

router.post(
  '/:id/images',
  authMiddleware,
  upload.array('images', 5),
  uploadImages
);

router.get('/', getAllPublications);
router.get('/:id', getPublicationById);

router.post('/:id/close', authMiddleware, closePublication);

export default router;
