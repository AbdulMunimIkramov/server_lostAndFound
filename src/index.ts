import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { initDb } from './initDb';
import authRoutes from './auth/auth.routes';
import publicationRoutes from './publications/publication.routes';
import userRoutes from './user/user.routes';
import chatRoutes from './chat/chat.routes';
import reportRoutes from './report/report.routes';
import notificationRoutes from './notifications/notification.routes';
import adminRoutes from './admin/admin.routes';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import pool from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Настройка CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Сессии
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
}));

// Парсинг JSON
app.use(express.json());

// Роуты
app.use('/api', authRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/user', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Backend работает!');
});

// WebSocket сервер
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" }); // ✅ path: /ws

type SocketWithUser = WebSocket & { userId?: number };
const clients = new Map<number, SocketWithUser>();

wss.on('connection', (ws: SocketWithUser, req) => {
  console.log("ws", ws, "req" , req)
  const url = new URL(req.url || '', 'http://localhost');
  const userId = parseInt(url.searchParams.get('userId') || '');

  if (!userId) {
    console.warn("❌ Подключение без userId");
    ws.close();
    return;
  }

  console.log("⚡ Подключился пользователь по WebSocket:", userId);

  ws.userId = userId;
  clients.set(userId, ws);

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const { chatId, senderId, receiverId, content } = msg;

      // ✅ Проверка: участвует ли senderId в чате
      const chatCheck = await pool.query(
        'SELECT * FROM chats WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
        [chatId, senderId]
      );
      if (chatCheck.rowCount === 0) {
        console.warn("❌ Попытка отправить сообщение в чужой чат:", { chatId, senderId });
        ws.send(JSON.stringify({ type: 'error', message: 'Нет доступа к чату' }));
        return;
      }

      const result = await pool.query(
        `INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [chatId, senderId, content]
      );

      const message = result.rows[0];

      // 📡 Рассылка обоим участникам чата
      [senderId, receiverId].forEach((id) => {
        const client = clients.get(id);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'new_message', message }));
        }
      });

    } catch (err) {
      console.error('❌ Ошибка при обработке WebSocket-сообщения:', err);
      try {
        ws.send(JSON.stringify({ type: 'error', message: 'Ошибка при отправке сообщения' }));
      } catch (_) {}
    }
  });

  ws.on('ping', () => {
    ws.pong();
  });

  ws.on('close', () => {
    console.log("🔌 Отключение WebSocket пользователя:", ws.userId);
    clients.delete(ws.userId!);
  });
});

// Запуск
server.listen(port, async () => {
  try {
    await initDb();
    console.log(`🚀 Сервер работает на http://localhost:${port} (HTTP + WS /ws)`);
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
    process.exit(1);
  }
});
