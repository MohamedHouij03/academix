const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// FORCER le chemin absolu vers data/academix.db
const dbPath = path.join(__dirname, '..', 'data', 'academix.db');

console.log('Chemin BDD:', dbPath); // Pour débug

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur connexion DB:', err.message);
  } else {
    console.log('Connecté à SQLite3:', dbPath);
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Table USERS
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table COURSES
    db.run(`CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      duration_hours INTEGER DEFAULT 0,
      price REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table ENROLLMENTS
    db.run(`CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      progress REAL DEFAULT 0.0,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      UNIQUE(user_id, course_id)
    )`, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.log('Table enrollments error:', err.message);
      }
    });
  });
}

module.exports = db;