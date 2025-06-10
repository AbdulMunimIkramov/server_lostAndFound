import { Request, Response } from 'express';
import pool from '../db';

export const getChatsForUser = async (req: Request & { userId?: number }, res: Response) => {
  const userId = req.userId;
  try {
    const result = await pool.query(
      `
      SELECT c.*, u.username AS sender_name, u2.username AS receiver_name, p.title AS publication_title
      FROM chats c
      JOIN users u ON u.id = c.sender_id
      JOIN users u2 ON u2.id = c.receiver_id
      JOIN publications p ON p.id = c.publication_id
      WHERE c.sender_id = $1 OR c.receiver_id = $1
      ORDER BY c.created_at DESC
      `,
      [userId]
    );
    res.json({ chats: result.rows });
  } catch (err) {
    console.error('Ошибка при получении чатов:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getMessagesForChat = async (req: Request, res: Response) => {
  const chatId = req.params.chatId;
  try {
    const result = await pool.query(
      `
      SELECT * FROM messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
      `,
      [chatId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error('Ошибка при получении сообщений:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
