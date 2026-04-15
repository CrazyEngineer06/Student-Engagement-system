const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db.cjs');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'student-engagement-secret-key-2026';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images and PDFs are allowed'));
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/api/uploads', express.static(uploadsDir));

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, year } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const id = `s${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, year, total_points)
      VALUES (?, ?, ?, ?, 'student', ?, 0)
    `).run(id, name, email, passwordHash, year || '');

    const user = db.prepare('SELECT id, name, email, role, year, total_points FROM users WHERE id = ?').get(id);

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, year, total_points FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────
app.get('/api/students', authenticate, (req, res) => {
  const students = db.prepare(`
    SELECT id, name, email, year, total_points 
    FROM users 
    WHERE role = 'student' 
    ORDER BY total_points DESC
  `).all();
  res.json(students);
});

app.get('/api/students/:id', authenticate, (req, res) => {
  const student = db.prepare(`
    SELECT id, name, email, year, total_points 
    FROM users 
    WHERE id = ? AND role = 'student'
  `).get(req.params.id);

  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// ─────────────────────────────────────────────
// EVENT ROUTES
// ─────────────────────────────────────────────
app.get('/api/events', authenticate, (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
  res.json(events);
});

app.post('/api/events', authenticate, adminOnly, (req, res) => {
  try {
    const { name, description, participationPoints, winningPoints, category } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({ error: 'Name, description, and category are required' });
    }

    const id = `e${Date.now()}`;
    db.prepare(`
      INSERT INTO events (id, name, description, participation_points, winning_points, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description, participationPoints || 0, winningPoints || 0, category);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(event);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ─────────────────────────────────────────────
// STUDENT EVENT (PARTICIPATION) ROUTES
// ─────────────────────────────────────────────
app.get('/api/student-events', authenticate, (req, res) => {
  const studentId = req.query.studentId || req.user.id;
  const events = db.prepare('SELECT * FROM student_events WHERE student_id = ?').all(studentId);
  res.json(events);
});

app.post('/api/student-events', authenticate, (req, res) => {
  try {
    const { eventId } = req.body;
    const studentId = req.user.id;

    // Check if already participated
    const existing = db.prepare('SELECT * FROM student_events WHERE student_id = ? AND event_id = ?').get(studentId, eventId);
    if (existing) {
      return res.status(400).json({ error: 'Already participated in this event' });
    }

    const student = db.prepare('SELECT year FROM users WHERE id = ?').get(studentId);

    db.prepare(`
      INSERT INTO student_events (student_id, event_id, status, points_collected, academic_year)
      VALUES (?, ?, 'participated', 0, ?)
    `).run(studentId, eventId, student.year || 'Unknown');

    res.json({ success: true });
  } catch (err) {
    console.error('Participate error:', err);
    res.status(500).json({ error: 'Participation failed' });
  }
});

// ─────────────────────────────────────────────
// SUBMISSION ROUTES
// ─────────────────────────────────────────────
app.post('/api/submissions', authenticate, upload.single('proofFile'), (req, res) => {
  try {
    const { eventId, claimType } = req.body;
    const studentId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Proof file is required' });
    }

    const student = db.prepare('SELECT name FROM users WHERE id = ?').get(studentId);
    const event = db.prepare('SELECT name FROM events WHERE id = ?').get(eventId);

    if (!student || !event) {
      return res.status(404).json({ error: 'Student or event not found' });
    }

    const id = `sub-${Date.now()}`;
    db.prepare(`
      INSERT INTO submissions (id, student_id, student_name, event_id, event_name, claim_type, proof_file, proof_file_original, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, studentId, student.name, eventId, event.name, claimType, req.file.filename, req.file.originalname);

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
    res.json(submission);
  } catch (err) {
    console.error('Submit proof error:', err);
    res.status(500).json({ error: 'Submission failed' });
  }
});

app.get('/api/submissions', authenticate, adminOnly, (req, res) => {
  const status = req.query.status;
  let submissions;
  if (status) {
    submissions = db.prepare('SELECT * FROM submissions WHERE status = ? ORDER BY submitted_at DESC').all(status);
  } else {
    submissions = db.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all();
  }
  res.json(submissions);
});

app.patch('/api/submissions/:id/approve', authenticate, adminOnly, (req, res) => {
  try {
    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(submission.event_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const pointsToAdd = submission.claim_type === 'won' ? event.winning_points : event.participation_points;

    // Use a transaction for atomicity
    const approve = db.transaction(() => {
      // Update submission status
      db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run('approved', req.params.id);

      // Update student points
      db.prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?').run(pointsToAdd, submission.student_id);

      // Update student_events
      const student = db.prepare('SELECT year FROM users WHERE id = ?').get(submission.student_id);
      const se = db.prepare('SELECT * FROM student_events WHERE student_id = ? AND event_id = ?').get(submission.student_id, submission.event_id);
      if (se) {
        db.prepare('UPDATE student_events SET points_collected = 1, status = ? WHERE student_id = ? AND event_id = ?')
          .run(submission.claim_type === 'won' ? 'won' : 'participated', submission.student_id, submission.event_id);
      } else {
        db.prepare('INSERT INTO student_events (student_id, event_id, status, points_collected, academic_year) VALUES (?, ?, ?, 1, ?)')
          .run(submission.student_id, submission.event_id, submission.claim_type === 'won' ? 'won' : 'participated', student.year || 'Unknown');
      }
    });

    approve();

    res.json({ success: true, pointsAdded: pointsToAdd });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Approval failed' });
  }
});

app.patch('/api/submissions/:id/reject', authenticate, adminOnly, (req, res) => {
  try {
    db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run('rejected', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Student Engagement API running at http://localhost:${PORT}`);
  console.log(`📁 File uploads served from ${uploadsDir}`);
  console.log(`\n📋 Default accounts:`);
  console.log(`   Admin:   admin@college.edu / admin123`);
  console.log(`   Student: piyush@college.edu / student123`);
  console.log(`   (All seeded students use password: student123)\n`);
});
