import { Request, Response } from 'express';
import pool from '../db';

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, is_admin, created_at FROM users ORDER BY id;'
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

export const getReports = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.message,
        r.reporter_id,
        r.reported_user_id,
        r.publication_id,
        u1.name AS reporter_name,
        u2.name AS reported_user_name,
        p.title AS publication_title
      FROM reports r
      LEFT JOIN users u1 ON r.reporter_id = u1.id
      LEFT JOIN users u2 ON r.reported_user_id = u2.id
      LEFT JOIN publications p ON r.publication_id = p.id
      ORDER BY r.id DESC;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения жалоб:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getAds = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM ads ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения рекламы:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const createAd = async (req: Request, res: Response) => {
  const { title, image_url, link } = req.body;

  if (!title || !image_url) {
    return res.status(400).json({ message: 'Не указаны обязательные поля' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO ads (title, image_url, link) VALUES ($1, $2, $3) RETURNING *',
      [title, image_url, link]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания рекламы:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const deleteAd = async (req: Request, res: Response) => {
  const adId = req.params.id;

  try {
    await pool.query('DELETE FROM ads WHERE id = $1', [adId]);
    res.json({ message: 'Реклама удалена' });
  } catch (error) {
    console.error('Ошибка удаления рекламы:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
