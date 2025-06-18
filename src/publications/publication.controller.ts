import { Request, Response } from 'express';
import pool from '../db';

export const createPublication = async (req: Request & { userId?: number }, res: Response) => {
  const {
    title,
    description,
    category,
    type,
    phone,
    location
  } = req.body;

  if (!title || !category || !type) {
    return res.status(400).json({ message: 'Обязательные поля: title, category, type' });
  }
  const locationString = typeof location === 'string' ? location : JSON.stringify(location);

  try {
    const result = await pool.query(
      `INSERT INTO publications 
    (user_id, title, description, category, type, phone, location) 
   VALUES 
    ($1, $2, $3, $4, $5, $6, $7)
   RETURNING *`,
      [req.userId, title, description, category, type, phone, locationString]
    );

    res.status(201).json({ publication: result.rows[0] });
  } catch (error) {
    console.error('Ошибка при создании публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании публикации' });
  }
};

export const uploadImages = async (
  req: Request & { userId?: number },
  res: Response
) => {
  const publicationId = req.params.id;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'Нет файлов для загрузки' });
  }

  try {
    const values = files.map(file => [publicationId, file.filename]);
    const placeholders = values.map((_, i) => `($1, $${i + 2})`).join(', ');

    const params = [Number(publicationId), ...values.map(v => v[1])];

    await pool.query(
      `INSERT INTO images (publication_id, filename) VALUES ${placeholders}`,
      params
    );

    res.status(200).json({ message: 'Изображения загружены' });
  } catch (error) {
    console.error('Ошибка при сохранении изображений:', error);
    res.status(500).json({ message: 'Ошибка сервера при загрузке изображений' });
  }
};

export const getPublicationById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const pubResult = await pool.query(
      `SELECT p.*, u.name AS user_name 
       FROM publications p 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [id]
    );

    if (pubResult.rows.length === 0) {
      return res.status(404).json({ message: 'Публикация не найдена' });
    }

    const imagesResult = await pool.query(
      `SELECT filename FROM images WHERE publication_id = $1`,
      [id]
    );

    const images = imagesResult.rows.map(row => `${req.protocol}://${req.get('host')}/uploads/${row.filename}`);

    const publication = {
      ...pubResult.rows[0],
      images,
    };

    res.json({ publication });
  } catch (error) {
    console.error('Ошибка при получении публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getAllPublications = async (req: Request, res: Response) => {
  const { search, category, type } = req.query;

  const whereClauses: string[] = ['p.is_resolved = FALSE'];
  const values: any[] = [];

  const addFilter = (field: string, value: any, operator = 'ILIKE') => {
    values.push(`%${value}%`);
    whereClauses.push(`${field} ${operator} $${values.length}`);
  };

  if (search) {
    values.push(`%${search}%`);
    whereClauses.push(`(p.title ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
  }

  if (category && category !== "all") {
    values.push(category);
    whereClauses.push(`p.category = $${values.length}`);
  }

  if (type && type !== "all") {
    values.push(type);
    whereClauses.push(`p.type = $${values.length}`);
  }

  const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  try {
    const result = await pool.query(
      `
      SELECT 
        p.*, 
        u.name AS user_name,
        COALESCE(json_agg(i.filename) FILTER (WHERE i.filename IS NOT NULL), '[]') AS images
      FROM publications p
      LEFT JOIN images i ON p.id = i.publication_id
      LEFT JOIN users u ON p.user_id = u.id
      ${whereSQL}
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
      `,
      values
    );

    const publications = result.rows.map(row => ({
      ...row,
      images: row.images.map((filename: string) =>
        `${req.protocol}://${req.get('host')}/uploads/${filename}`
      )
    }));

    res.json({ publications });
  } catch (error) {
    console.error('Ошибка при поиске публикаций:', error);
    res.status(500).json({ message: 'Ошибка сервера при поиске' });
  }
};

export const closePublication = async (req: Request & { userId?: number }, res: Response) => {
  const publicationId = req.params.id;
  const userId = req.userId;

  try {
    const checkResult = await pool.query(
      'SELECT user_id FROM publications WHERE id = $1',
      [publicationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Публикация не найдена' });
    }

    const publication = checkResult.rows[0];
    if (publication.user_id !== userId) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    await pool.query(
      'UPDATE publications SET is_resolved = TRUE WHERE id = $1',
      [publicationId]
    );

    res.json({ message: 'Публикация завершена' });
  } catch (error) {
    console.error('Ошибка при завершении публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const reopenPublication = async (req: Request & { userId?: number }, res: Response) => {
  const publicationId = req.params.id;
  const userId = req.userId;

  try {
    const checkResult = await pool.query(
      'SELECT user_id, is_resolved FROM publications WHERE id = $1',
      [publicationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Публикация не найдена' });
    }

    const publication = checkResult.rows[0];
    if (publication.user_id !== userId) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    if (!publication.is_resolved) {
      return res.status(400).json({ message: 'Публикация уже активна' });
    }

    await pool.query(
      'UPDATE publications SET is_resolved = FALSE WHERE id = $1',
      [publicationId]
    );

    res.json({ message: 'Публикация активирована' });
  } catch (error) {
    console.error('Ошибка при активации публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getPublications = async (req: Request, res: Response) => {
  const { search } = req.query;

  try {
    let query = `
      SELECT p.*, u.name AS user_name,
      COALESCE(json_agg(i.filename) FILTER (WHERE i.filename IS NOT NULL), '[]') AS images
      FROM publications p
      LEFT JOIN images i ON p.id = i.publication_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_resolved = FALSE
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
    `;
    const values: any[] = [];

    if (search) {
      query = `
        SELECT p.*, u.name AS user_name,
        COALESCE(json_agg(i.filename) FILTER (WHERE i.filename IS NOT NULL), '[]') AS images
        FROM publications p
        LEFT JOIN images i ON p.id = i.publication_id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE (p.title ILIKE $1 OR p.description ILIKE $1) AND p.is_resolved = FALSE
        GROUP BY p.id, u.name
        ORDER BY p.created_at DESC
      `;
      values.push(`%${search}%`);
    }

    const result = await pool.query(query, values);
    const publications = result.rows.map(row => ({
      ...row,
      images: row.images.map((filename: string) =>
        `${req.protocol}://${req.get('host')}/uploads/${filename}`
      )
    }));

    res.json({ publications });
  } catch (error) {
    console.error('Ошибка при получении публикаций:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const updatePublication = async (req: Request & { userId?: number }, res: Response) => {
  const publicationId = req.params.id;
  const userId = req.userId;
  const { title, description, category, type, phone, location } = req.body;

  try {
    const checkResult = await pool.query(
      'SELECT user_id FROM publications WHERE id = $1',
      [publicationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Публикация не найдена' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    const locationString = typeof location === 'string' ? location : JSON.stringify(location);

    const result = await pool.query(
      `UPDATE publications 
       SET title = $1, description = $2, category = $3, type = $4, phone = $5, location = $6
       WHERE id = $7
       RETURNING *`,
      [title, description, category, type, phone, locationString, publicationId]
    );

    res.json({ publication: result.rows[0] });
  } catch (error) {
    console.error('Ошибка при обновлении публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const deletePublication = async (req: Request & { userId?: number }, res: Response) => {
  const publicationId = req.params.id;
  const userId = req.userId;

  try {
    const checkResult = await pool.query(
      'SELECT user_id FROM publications WHERE id = $1',
      [publicationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Публикация не найдена' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    // Удаляем связанные изображения
    await pool.query(
      'DELETE FROM images WHERE publication_id = $1',
      [publicationId]
    );

    // Удаляем публикацию
    await pool.query(
      'DELETE FROM publications WHERE id = $1',
      [publicationId]
    );

    res.json({ message: 'Публикация удалена' });
  } catch (error) {
    console.error('Ошибка при удалении публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};