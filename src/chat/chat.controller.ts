import { Request, Response } from "express";
import pool from "../db";

interface AuthRequest extends Request {
  userId?: number;
}

export const getChatsForUser = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Пользователь не авторизован" });
  try {
    const result = await pool.query(
      `
      SELECT c.*, u.name AS sender_name, u2.name AS receiver_name, p.title AS publication_title
      FROM chats c
      JOIN users u ON u.id = c.sender_id
      JOIN users u2 ON u2.id = c.receiver_id
      JOIN publications p ON p.id = c.publication_id
      WHERE c.sender_id = $1 OR c.receiver_id = $1
      ORDER BY c.created_at DESC
      `,
      [userId]
    );
    console.log('Чаты для пользователя:', result.rows);
    res.json({ chats: result.rows });
  } catch (err) {
    console.error("Ошибка при получении чатов:", err);
    res.status(500).json({ message: "Ошибка сервера при получении чатов" });
  }
};

export const getMessagesForChat = async (req: AuthRequest, res: Response) => {
  const chatId = parseInt(req.params.chatId);
  if (isNaN(chatId)) return res.status(400).json({ message: "Неверный ID чата" });
  try {
    const result = await pool.query(
      `
      SELECT * FROM messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
      `,
      [chatId]
    );
    console.log('Сообщения для чата:', { chatId, messages: result.rows });
    res.json({ messages: result.rows });
  } catch (err) {
    console.error("Ошибка при получении сообщений:", err);
    res.status(500).json({ message: "Ошибка сервера при получении сообщений" });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const chatId = parseInt(req.params.chatId); // Получаем chatId из параметров маршрута
  const { content } = req.body;
  const senderId = req.userId;
  console.log('Получен запрос на отправку сообщения:', { chatId, senderId, content });
  if (!senderId || !content || content.trim() === "") {
    console.log('Ошибка валидации:', { senderId, content });
    return res.status(400).json({ message: "Отправитель или содержимое сообщения не указано" });
  }
  try {
    // Проверка существования чата
    const chatCheck = await pool.query('SELECT id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rowCount === 0) {
      console.log('Чат не найден:', { chatId });
      return res.status(404).json({ message: "Чат не найден" });
    }

    const result = await pool.query(
      `
      INSERT INTO messages (chat_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [chatId, senderId, content]
    );
    console.log('Сообщение успешно добавлено:', result.rows[0]);
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error("Ошибка при отправке сообщения:", err);
    res.status(500).json({ message: "Ошибка сервера при отправке сообщения" });
  }
};

export const createChatWithFirstMessage = async (req: AuthRequest, res: Response) => {
  const { publicationId, receiverId, firstMessage } = req.body;
  const senderId = req.userId;

  if (!senderId || senderId === receiverId || !firstMessage || firstMessage.trim() === "") {
    return res.status(400).json({ message: "Некорректные данные для создания чата" });
  }

  try {
    await pool.query('BEGIN');
    
    const publicationCheck = await pool.query('SELECT id FROM publications WHERE id = $1', [publicationId]);
    if (publicationCheck.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: "Публикация не найдена" });
    }

    const receiverCheck = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (receiverCheck.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: "Получатель не найден" });
    }

    const existingChat = await pool.query(
      `SELECT * FROM chats WHERE publication_id = $1 AND sender_id = $2 AND receiver_id = $3`,
      [publicationId, senderId, receiverId]
    );

    if (existingChat.rows.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(200).json({ chat: existingChat.rows[0], info: "Чат уже существует" });
    }

    const chatResult = await pool.query(
      `INSERT INTO chats (publication_id, sender_id, receiver_id) VALUES ($1, $2, $3) RETURNING *`,
      [publicationId, senderId, receiverId]
    );
    const chat = chatResult.rows[0];

    await pool.query(
      `INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3)`,
      [chat.id, senderId, firstMessage]
    );

    await pool.query('COMMIT');
    console.log('Чат успешно создан:', chat);
    res.status(201).json({ chat });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Ошибка создания чата:", err);
    res.status(500).json({ message: "Ошибка создания чата" });
  }
};
