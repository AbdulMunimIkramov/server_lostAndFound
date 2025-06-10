import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export const isAdminMiddleware = async (req: Request & { userId?: number }, res: Response, next: NextFunction) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки администратора:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
