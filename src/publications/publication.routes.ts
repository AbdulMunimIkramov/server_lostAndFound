import { Router } from 'express';
import { createPublication, uploadImages, getPublicationById, getAllPublications, closePublication, reopenPublication, updatePublication, deletePublication } from './publication.controller';
import { authMiddleware } from '../auth/auth.middleware';
import { upload } from '../upload';

const router = Router();

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
router.post('/:id/reopen', authMiddleware, reopenPublication);
router.put('/:id', authMiddleware, updatePublication);
router.delete('/:id', authMiddleware, deletePublication);

export default router;