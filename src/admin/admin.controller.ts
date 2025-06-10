import { Request, Response } from 'express';
import pool from '../db';

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, is_admin, is_blocked FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const blockUserByAdmin = async (req: Request, res: Response) => {
  const userId = req.params.id;

  try {
    await pool.query(
      'UPDATE users SET is_blocked = TRUE WHERE id = $1',
      [userId]
    );
    res.json({ message: 'Пользователь заблокирован' });
  } catch (error) {
    console.error('Ошибка блокировки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getAllPublications = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM publications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения публикаций:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const deletePublication = async (req: Request, res: Response) => {
  const publicationId = req.params.id;

  try {
    await pool.query('DELETE FROM publications WHERE id = $1', [publicationId]);
    res.json({ message: 'Публикация удалена' });
  } catch (error) {
    console.error('Ошибка удаления публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getStats = async (_req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM publications) as publications_count,
        (SELECT COUNT(*) FROM reports) as reports_count
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
