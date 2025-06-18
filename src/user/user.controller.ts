import { Request, Response } from 'express';
import pool from '../db';

export const getMyPublications = async (req: Request & { userId?: number }, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `
      SELECT p.*, 
        COALESCE(json_agg(i.filename) FILTER (WHERE i.filename IS NOT NULL), '[]') AS images
      FROM publications p
      LEFT JOIN images i ON p.id = i.publication_id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      [userId]
    );

    const publications = result.rows.map(row => ({
      ...row,
      images: row.images.map((filename: string) =>
        `${req.protocol}://${req.get('host')}/uploads/${filename}`
      )
    }));

    res.json({ publications });
  } catch (error) {
    console.error('Ошибка при получении моих публикаций:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getMyProfile = async (req: Request & { userId?: number }, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, is_admin, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const updateMyProfile = async (req: Request & { userId?: number }, res: Response) => {
  const userId = req.userId;
  const { name, email, phone } = req.body;

  try {
    await pool.query(
      'UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4',
      [name, email, phone, userId]
    );

    res.json({ message: 'Профиль обновлён' });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
