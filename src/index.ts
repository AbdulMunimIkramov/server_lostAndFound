import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './initDb';
import authRoutes from './auth/auth.routes';
import publicationRoutes from './publications/publication.routes';
import userRoutes from './user/user.routes';
import chatRoutes from './chat/chat.routes';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import  pool  from './db'; // Обязательно подключи pool, если он используется в ws
import reportRoutes from './report/report.routes';
import notificationRoutes from './notifications/notification.routes';
import adminRoutes from './admin/admin.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// 🧱 Middleware
app.use(cors());
app.use(express.json());

// 🧭 Роуты
app.use('/api', authRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/user', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 🔘 Тестовая заглушка
app.get('/', (req, res) => {
  res.send('Backend работает!');
});

// 🌐 WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

type SocketWithUser = WebSocket & { userId?: number };
const clients = new Map<number, SocketWithUser>();

wss.on('connection', (ws: SocketWithUser, req) => {
  const userId = parseInt((req.url || '').split('userId=')[1]);

  if (!userId) {
    ws.close();
    return;
  }

  ws.userId = userId;
  clients.set(userId, ws);

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const { chatId, senderId, receiverId, content } = msg;

      const result = await pool.query(
        `INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [chatId, senderId, content]
      );

      const message = result.rows[0];

      [senderId, receiverId].forEach((id) => {
        const client = clients.get(id);
        if (client && client.readyState === client.OPEN) {
          client.send(JSON.stringify({ type: 'new_message', message }));
        }
      });
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws.userId!);
  });
});

// ✅ Инициализация и запуск
server.listen(port, async () => {
  try {
    await initDb();
    console.log(`🚀 HTTP + WebSocket сервер запущен на http://localhost:${port}`);
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
    process.exit(1);
  }
});
