import { Request, Response } from 'express';
import pool from '../db';

export const getNotifications = async (req: Request & { userId?: number }, res: Response) => {
  const userId = req.userId;
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения уведомлений:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const markAsRead = async (req: Request & { userId?: number }, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    res.json({ message: 'Уведомление прочитано' });
  } catch (err) {
    console.error('Ошибка при пометке уведомления:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
