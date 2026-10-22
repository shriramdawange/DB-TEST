'use strict';

/**
 * routes/students.js
 * ------------------
 * CRUD endpoints for the `students` table (SQLite via better-sqlite3).
 *
 * All SQL uses placeholders (`?`) and values are bound as parameters —
 * no string interpolation, so SQL injection is impossible.
 */

const express = require('express');
const { db } = require('../db');

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ALLOWED_YEARS = ['FY', 'SY', 'TY', 'LY'];

const SELECT_COLUMNS =
  'id, name, class_year, degree, mobile, email, profile_photo, created_at';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Creates an error carrying an HTTP status code for the error middleware. */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Route ids must be positive integers (avoids nonsense queries). */
function isValidId(raw) {
  return /^\d+$/.test(String(raw)) && Number(raw) > 0;
}

/** Trims strings; leaves everything else untouched. */
function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Validates and normalises a create/update payload.
 * @returns {{valid: boolean, errors: Object, data: Object}}
 */
function validateStudent(body) {
  const errors = {};

  const name = clean(body.name);
  const classYear = clean(body.class_year);
  const degree = clean(body.degree);
  const mobile = clean(body.mobile);
  const email = clean(body.email);
  const profilePhoto = clean(body.profile_photo);

  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  if (!classYear) {
    errors.class_year = 'Class year is required.';
  } else if (!ALLOWED_YEARS.includes(classYear)) {
    errors.class_year = `Class year must be one of: ${ALLOWED_YEARS.join(', ')}.`;
  }

  if (!degree) {
    errors.degree = 'Degree is required.';
  } else if (degree.length > 100) {
    errors.degree = 'Degree must be 100 characters or fewer.';
  }

  if (!mobile) {
    errors.mobile = 'Mobile number is required.';
  } else if (!/^\d{10}$/.test(mobile)) {
    errors.mobile = 'Mobile number must be exactly 10 digits.';
  }

  if (email) {
    if (email.length > 100) {
      errors.email = 'Email must be 100 characters or fewer.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  if (profilePhoto && profilePhoto.length > 255) {
    errors.profile_photo = 'Profile photo must be 255 characters or fewer.';
  }

  const data = {
    name,
    class_year: classYear,
    degree,
    mobile,
    email: email || null,
    profile_photo: profilePhoto || null
  };

  return { valid: Object.keys(errors).length === 0, errors, data };
}

/** Maps a SQLite UNIQUE-constraint error into a friendly 400. */
function isDuplicateKey(err) {
  if (!err) return false;
  const code = String(err.code || '');
  const message = String(err.message || '');
  return code.startsWith('SQLITE_CONSTRAINT') && /UNIQUE|PRIMARY KEY/i.test(message);
}

const DUPLICATE_MOBILE_MESSAGE =
  'Mobile number already exists. Please use a different mobile number.';

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

/**
 * GET /api/students?search=foo
 * Lists all students. `search` matches either the name or the mobile number.
 */
router.get('/', (req, res, next) => {
  try {
    const search = clean(req.query.search);

    let rows;
    if (search) {
      const like = `%${search}%`;
      rows = db
        .prepare(
          `SELECT ${SELECT_COLUMNS}
             FROM students
            WHERE name LIKE ? OR mobile LIKE ?
            ORDER BY id DESC`
        )
        .all(like, like);
    } else {
      rows = db
        .prepare(
          `SELECT ${SELECT_COLUMNS}
             FROM students
            ORDER BY id DESC`
        )
        .all();
    }

    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/students/:id
 * Returns a single student, or 404 when the id does not exist.
 */
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      throw httpError(400, 'Invalid student id. It must be a positive integer.');
    }

    const student = db
      .prepare(`SELECT ${SELECT_COLUMNS} FROM students WHERE id = ?`)
      .get(Number(id));

    if (!student) {
      throw httpError(404, 'Student not found.');
    }

    res.status(200).json(student);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/students
 * Creates a student. Returns 201 with the created row.
 */
router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    const { valid, errors, data } = validateStudent(body);

    if (!valid) {
      const firstMessage = Object.values(errors)[0];
      throw Object.assign(httpError(400, firstMessage), { fieldErrors: errors });
    }

    let info;
    try {
      info = db
        .prepare(
          `INSERT INTO students (name, class_year, degree, mobile, email, profile_photo)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.name,
          data.class_year,
          data.degree,
          data.mobile,
          data.email,
          data.profile_photo
        );
    } catch (err) {
      if (isDuplicateKey(err)) {
        throw httpError(400, DUPLICATE_MOBILE_MESSAGE);
      }
      throw err;
    }

    const student = db
      .prepare(`SELECT ${SELECT_COLUMNS} FROM students WHERE id = ?`)
      .get(info.lastInsertRowid);

    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/students/:id
 * Updates a student. Returns 404 when the id does not exist.
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      throw httpError(400, 'Invalid student id. It must be a positive integer.');
    }
    const studentId = Number(id);

    const body = req.body || {};
    const { valid, errors, data } = validateStudent(body);

    if (!valid) {
      const firstMessage = Object.values(errors)[0];
      throw Object.assign(httpError(400, firstMessage), { fieldErrors: errors });
    }

    const existing = db
      .prepare('SELECT id FROM students WHERE id = ?')
      .get(studentId);
    if (!existing) {
      throw httpError(404, 'Student not found.');
    }

    // Column names come from this hard-coded whitelist only — never from the
    // request body — so the dynamic UPDATE stays injection-safe.
    const updatable = ['name', 'class_year', 'degree', 'mobile', 'email', 'profile_photo'];
    const sets = [];
    const values = [];

    for (const column of updatable) {
      if (!Object.prototype.hasOwnProperty.call(body, column)) continue;
      sets.push(`${column} = ?`);
      values.push(data[column]);
    }

    if (sets.length === 0) {
      throw httpError(400, 'No fields to update.');
    }

    values.push(studentId);

    try {
      db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    } catch (err) {
      if (isDuplicateKey(err)) {
        throw httpError(400, DUPLICATE_MOBILE_MESSAGE);
      }
      throw err;
    }

    const student = db
      .prepare(`SELECT ${SELECT_COLUMNS} FROM students WHERE id = ?`)
      .get(studentId);

    res.status(200).json(student);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/students/:id
 * Removes a student. Returns 404 when the id does not exist.
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      throw httpError(400, 'Invalid student id. It must be a positive integer.');
    }

    const info = db.prepare('DELETE FROM students WHERE id = ?').run(Number(id));

    if (info.changes === 0) {
      throw httpError(404, 'Student not found.');
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully.',
      id: Number(id)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
