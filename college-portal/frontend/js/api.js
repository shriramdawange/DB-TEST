/* =========================================================================
 * api.js — College Students Record Portal
 * -------------------------------------------------------------------------
 * Single place for every HTTP call made by the frontend.
 *
 * The API base URL is configured at the TOP of this file. Change it if your
 * backend runs on a different host or port.
 *
 * Exposed as:
 *   - browser global:  window.CollegePortalAPI.getStudents(...)
 *   - CommonJS:        require('./api.js').getStudents(...)
 * ========================================================================= */

/* ========================== CONFIGURATION ================================ */
const API_BASE_URL = 'http://localhost:5000';
/* ========================================================================== */

/** Columns of the students table, used to build safe SELECT statements. */
const STUDENT_FIELDS = [
  'id',
  'name',
  'class_year',
  'degree',
  'mobile',
  'email',
  'profile_photo',
  'created_at'
];

/**
 * Low-level fetch wrapper.
 * - resolves with the parsed JSON body on 2xx
 * - throws an Error carrying `.status` and `.data` on any non-2xx response
 */
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        options.headers || {}
      ),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (networkError) {
    throw new Error(
      `Cannot reach the API at ${API_BASE_URL}. Make sure the backend is running (npm start).`
    );
  }

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      data = { raw: rawText };
    }
  }

  if (!response.ok) {
    const message =
      (data && data.error) || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * GET /api/students
 * @param {string} [search] Optional filter on name or mobile.
 * @returns {Promise<Array<object>>}
 */
async function getStudents(search = '') {
  const term = String(search || '').trim();
  const query = term ? `?search=${encodeURIComponent(term)}` : '';
  const data = await request(`/api/students${query}`);

  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.students)) return data.students;
  return [];
}

/**
 * GET /api/students/:id
 * @param {number|string} id
 * @returns {Promise<object>}
 */
async function getStudent(id) {
  return request(`/api/students/${encodeURIComponent(id)}`);
}

/**
 * POST /api/students
 * @param {object} student
 * @returns {Promise<object>} the created student
 */
async function createStudent(student) {
  return request('/api/students', { method: 'POST', body: student });
}

/**
 * PUT /api/students/:id
 * @param {number|string} id
 * @param {object} student
 * @returns {Promise<object>} the updated student
 */
async function updateStudent(id, student) {
  return request(`/api/students/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: student
  });
}

/**
 * DELETE /api/students/:id
 * @param {number|string} id
 * @returns {Promise<object>}
 */
async function deleteStudent(id) {
  return request(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Builds the payload sent to the API (drops empty optional fields). */
function toPayload(student) {
  const payload = {
    name: student.name,
    class_year: student.class_year,
    degree: student.degree,
    mobile: student.mobile
  };

  if (student.email) payload.email = student.email;
  if (student.profile_photo) payload.profile_photo = student.profile_photo;

  return payload;
}

// Public surface.
const CollegePortalAPI = {
  API_BASE_URL,
  STUDENT_FIELDS,
  request,
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  toPayload
};

if (typeof window !== 'undefined') {
  window.CollegePortalAPI = CollegePortalAPI;
  // Convenience aliases so pages can call getStudents(...) directly.
  window.getStudents = getStudents;
  window.getStudent = getStudent;
  window.createStudent = createStudent;
  window.updateStudent = updateStudent;
  window.deleteStudent = deleteStudent;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollegePortalAPI;
}
