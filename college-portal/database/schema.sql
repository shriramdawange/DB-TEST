-- ---------------------------------------------------------------------------
-- College Students Record Portal — SQLite schema
--
-- The backend applies this file automatically on startup (the database file
-- and the table are created if they do not exist yet), so you normally do
-- not have to run it by hand.
--
-- To apply it manually, run:
--   sqlite3 backend/data/college_portal.db < database/schema.sql
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  class_year VARCHAR(50) NOT NULL,
  degree VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(100) NULL,
  profile_photo VARCHAR(255) NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Speeds up the name/mobile search performed by GET /api/students?search=
CREATE INDEX IF NOT EXISTS idx_students_name ON students (name);
CREATE INDEX IF NOT EXISTS idx_students_mobile ON students (mobile);

-- SEED:
-- Sample data. Inserted on startup with INSERT OR IGNORE, so it is safe to
-- run again — existing rows are never duplicated. Set SEED_DATA=false in
-- backend/.env to skip it.
INSERT OR IGNORE INTO students (name, class_year, degree, mobile, email) VALUES
  ('Aarav Sharma',  'FY', 'B.Tech CSE', '9876543210', 'aarav.sharma@example.com'),
  ('Diya Patel',    'SY', 'B.Tech IT',  '9876543211', 'diya.patel@example.com'),
  ('Rohan Verma',   'TY', 'BCA',        '9876543212', 'rohan.verma@example.com'),
  ('Ananya Iyer',   'LY', 'MCA',        '9876543213', 'ananya.iyer@example.com'),
  ('Kabir Singh',   'FY', 'MBA',        '9876543214', NULL),
  ('Meera Nair',    'SY', 'BSc',        '9876543215', 'meera.nair@example.com');
