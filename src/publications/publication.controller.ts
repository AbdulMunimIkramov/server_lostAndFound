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
      `SELECT * FROM publications WHERE id = $1`,
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
      images,  // добавляем поле images внутрь публикации
    };

    res.json({ publication });
  } catch (error) {
    console.error('Ошибка при получении публикации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};


export const getAllPublications = async (req: Request, res: Response) => {
  const { title, description, type, category, location, date } = req.query;

  const whereClauses: string[] = [];
  const values: any[] = [];

  const addFilter = (field: string, value: any, operator = 'ILIKE') => {
    values.push(`%${value}%`);
    whereClauses.push(`${field} ${operator} $${values.length}`);
  };

  if (title) addFilter('p.title', title);
  if (description) addFilter('p.description', description);
  if (type) addFilter('p.type', type);
  if (category) addFilter('p.category', category);
  if (location) addFilter('p.location', location);
  if (date) {
    values.push(date);
    whereClauses.push(`DATE(p.created_at) = $${values.length}`);
  }

  const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  try {
    const result = await pool.query(
      `
      SELECT 
        p.*, 
        COALESCE(json_agg(i.filename) FILTER (WHERE i.filename IS NOT NULL), '[]') AS images
      FROM publications p
      LEFT JOIN images i ON p.id = i.publication_id
      ${whereSQL}
      GROUP BY p.id
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
    // Проверим, что публикация принадлежит пользователю
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

    // Обновим статус
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
export const getPublications = async (req: Request, res: Response) => {
  const { search } = req.query;

  try {
    let query = 'SELECT * FROM publications ORDER BY created_at DESC';
    const values: any[] = [];

    if (search) {
      query = `
        SELECT * FROM publications
        WHERE title ILIKE $1 OR description ILIKE $1
        ORDER BY created_at DESC
      `;
      values.push(`%${search}%`);
    }

    const result = await pool.query(query, values);
    const publications = result.rows;

    // Здесь можно добавить загрузку изображений, если нужно
    for (const pub of publications) {
      const imagesResult = await pool.query(
        'SELECT url FROM publication_images WHERE publication_id = $1',
        [pub.id]
      );
      pub.images = imagesResult.rows.map((r) => r.url);
    }

    res.json({ publications });
  } catch (error) {
    console.error('Ошибка при получении публикаций:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
