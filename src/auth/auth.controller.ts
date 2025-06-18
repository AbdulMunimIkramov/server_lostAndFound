import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Определите структуру тела запроса
interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

// Расширяем тип Request для поддержки userId
interface AuthRequest extends Request {
  userId?: number;
}

export const register = async (req: Request<{}, {}, RegisterRequestBody>, res: Response): Promise<Response> => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Заполните все обязательные поля' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone',
      [name, email, hashedPassword, phone]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const login = async (req: Request<{}, {}, LoginRequestBody>, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin,
      },
      token,
    });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Неавторизованный запрос' });
    }

    const result = await pool.query('SELECT id, name, email, phone, is_admin FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};
