import { Request, Response } from 'express';
import  pool  from '../db';

export const reportUserOrPublication = async (req: Request & { userId?: number }, res: Response) => {
  const { reportedUserId, publicationId, message } = req.body;
  const reporterId = req.userId;

  if (!message || (!reportedUserId && !publicationId)) {
    return res.status(400).json({ message: 'Недостаточно данных' });
  }

  try {
    await pool.query(
      `
      INSERT INTO reports (reporter_id, reported_user_id, publication_id, message)
      VALUES ($1, $2, $3, $4)
      `,
      [reporterId, reportedUserId || null, publicationId || null, message]
    );

    res.json({ message: 'Жалоба отправлена' });
  } catch (err) {
    console.error('Ошибка при отправке жалобы:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const blockUser = async (req: Request & { userId?: number }, res: Response) => {
  const userId = req.userId;
  const { blockedUserId } = req.body;

  if (!blockedUserId) {
    return res.status(400).json({ message: 'ID пользователя обязателен' });
  }

  try {
    await pool.query(
      `
      INSERT INTO blocked_users (user_id, blocked_user_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
      `,
      [userId, blockedUserId]
    );

    res.json({ message: 'Пользователь заблокирован' });
  } catch (err) {
    console.error('Ошибка при блокировке пользователя:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
