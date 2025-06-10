import  pool  from '../db';

export const createNotification = async (
  userId: number,
  type: string,
  content: string,
  link?: string
) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, content, link) VALUES ($1, $2, $3, $4)',
      [userId, type, content, link || null]
    );
  } catch (err) {
    console.error('Ошибка при создании уведомления:', err);
  }
};
