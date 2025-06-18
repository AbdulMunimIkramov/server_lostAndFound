import pool from './db';

export async function initDb() {
  try {
    // Создание таблицы пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone VARCHAR(20),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Создание таблицы публикаций
    await pool.query(`
      CREATE TABLE IF NOT EXISTS publications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(20) CHECK (category IN ('lost', 'found')),
        type VARCHAR(50),
        phone VARCHAR(20),
        location TEXT,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
  CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    publication_id INTEGER REFERENCES publications(id) ON DELETE CASCADE,
    filename TEXT NOT NULL
  );
`);
    await pool.query(`CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  publication_id INTEGER REFERENCES publications(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (publication_id, sender_id, receiver_id)
);
`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(id),
  publication_id INTEGER REFERENCES publications(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
    await pool.query(`CREATE TABLE IF NOT EXISTS blocked_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, blocked_user_id)
);
`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- message, match, reply и т.д.
  content TEXT NOT NULL,
  link TEXT, -- куда вести (например, /chat/5)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
    await pool.query(`CREATE TABLE IF NOT EXISTS public.ads
(
    id serial NOT NULL,
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,
    image_url text COLLATE pg_catalog."default" NOT NULL,
    link text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ads_pkey PRIMARY KEY (id)
);`);
    await pool.query(`ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE reports DROP CONSTRAINT reports_publication_id_fkey;

ALTER TABLE reports
ADD CONSTRAINT reports_publication_id_fkey
FOREIGN KEY (publication_id)
REFERENCES publications(id)
ON DELETE CASCADE;
`);
    await pool.query(``);
    await pool.query(``);
    await pool.query(``);
    await pool.query(``);


    console.log('✅ Таблицы успешно созданы (если не существовали)');
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error);
  }
}
