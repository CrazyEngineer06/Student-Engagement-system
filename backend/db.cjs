const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'admin')),
    year TEXT DEFAULT '',
    total_points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    participation_points INTEGER DEFAULT 0,
    winning_points INTEGER DEFAULT 0,
    category TEXT NOT NULL CHECK(category IN ('hackathon', 'competition', 'sports', 'cultural')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS student_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'participated' CHECK(status IN ('participated', 'won')),
    points_collected INTEGER DEFAULT 0,
    academic_year TEXT DEFAULT 'Unknown',
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE(student_id, event_id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK(claim_type IN ('participated', 'won')),
    proof_file TEXT NOT NULL,
    proof_file_original TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    submitted_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id)
  );
`);

// Seed data (only if tables are empty)
function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return; // Already seeded

  console.log('🌱 Seeding database with initial data...');

  const defaultPassword = bcrypt.hashSync('student123', 10);
  const adminPassword = bcrypt.hashSync('admin123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, year, total_points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const students = [
    ['s1', 'Bhawesh Joshi', 'bhawesh@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s2', 'Rahul Sharma', 'rahul@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s3', 'Priya Rai', 'priya@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s4', 'Amit Patel', 'amit@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s5', 'Devkaran', 'devkaran@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s6', 'Piyush', 'piyush@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s7', 'Deepanshu', 'deepanshu@college.edu', defaultPassword, 'student', '2nd Year', 0],
    ['s8', 'Raj Shristava', 'raj@college.edu', defaultPassword, 'student', '2nd Year', 0],
  ];

  const insertMany = db.transaction(() => {
    // Insert admin
    insertUser.run('admin1', 'Admin', 'admin@college.edu', adminPassword, 'admin', '', 0);

    // Insert students
    for (const s of students) {
      insertUser.run(...s);
    }
  });

  insertMany();

  // Seed events
  const insertEvent = db.prepare(`
    INSERT INTO events (id, name, description, participation_points, winning_points, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const eventsData = [
    ['e1', 'Spring Hackathon 2026', '48-hour coding marathon to build innovative solutions for real-world problems.', 50, 150, 'hackathon'],
    ['e2', 'Data Science Competition', 'Analyze datasets and present insights using advanced analytics techniques.', 40, 120, 'competition'],
    ['e3', 'Inter-College Basketball Tournament', 'Represent your college in the annual basketball championship.', 30, 100, 'sports'],
    ['e4', 'Annual Cultural Fest', 'Showcase your artistic talents in music, dance, drama, and visual arts.', 25, 80, 'cultural'],
    ['e5', 'Innovation Challenge', 'Present your innovative ideas to solve campus-wide challenges.', 45, 130, 'competition'],
    ['e6', 'Debate Championship', 'Engage in thought-provoking debates on contemporary issues.', 35, 110, 'competition'],
  ];

  const insertEvents = db.transaction(() => {
    for (const e of eventsData) {
      insertEvent.run(...e);
    }
  });

  insertEvents();

  // Seed student events
  const insertSE = db.prepare(`
    INSERT INTO student_events (student_id, event_id, status, points_collected, academic_year)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seData = [
    ['s1', 'e1', 'participated', 1, '2nd Year'],
    ['s1', 'e2', 'won', 1, '2nd Year'],
    ['s1', 'e3', 'participated', 0, '2nd Year'],
    ['s2', 'e4', 'participated', 1, '2nd Year'],
    ['s3', 'e1', 'won', 1, '2nd Year'],
  ];

  const insertSEs = db.transaction(() => {
    for (const se of seData) {
      insertSE.run(...se);
    }
  });

  insertSEs();

  // Run the recalculation of points to make the seed realistic based on actual events
  db.prepare(`
    UPDATE users
    SET total_points = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN se.status = 'won' THEN e.winning_points
          WHEN se.status = 'participated' THEN e.participation_points
          ELSE 0
        END
      ), 0)
      FROM student_events se
      JOIN events e ON se.event_id = e.id
      WHERE se.student_id = users.id AND se.points_collected = 1
    )
    WHERE role = 'student'
  `).run();

  console.log('✅ Database seeded and points recalculated successfully!');
}

seedDatabase();

module.exports = db;
