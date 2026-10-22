/* =========================================================================
 * form.js — add / edit student form (add.html)
 *
 * ?id=<studentId>  ->  edit mode (loads the student, uses PUT)
 * no ?id            ->  add mode (uses POST)
 * ========================================================================= */

(function () {
  'use strict';

  const api = window.CollegePortalAPI;

  const els = {
    form: document.getElementById('student-form'),
    title: document.getElementById('form-title'),
    subtitle: document.getElementById('form-subtitle'),
    submitBtn: document.getElementById('submit-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    banner: document.getElementById('form-banner'),
    loader: document.getElementById('form-loader'),

    name: document.getElementById('name'),
    class_year: document.getElementById('class_year'),
    degree: document.getElementById('degree'),
    mobile: document.getElementById('mobile'),
    email: document.getElementById('email'),

    errors: {
      name: document.getElementById('error-name'),
      class_year: document.getElementById('error-class_year'),
      degree: document.getElementById('error-degree'),
      mobile: document.getElementById('error-mobile'),
      email: document.getElementById('error-email')
    }
  };

  const YEARS = ['FY', 'SY', 'TY', 'LY'];
  const DEGREES = [
    'B.Tech CSE',
    'B.Tech IT',
    'BCA',
    'BSc',
    'MCA',
    'MBA'
  ];

  let studentId = null; // null = create mode
  let isEditMode = false;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function getStudentIdFromUrl() {
    // Primary: ?id=123 (also accepts #id=123 as a fallback for static
    // servers that rewrite .html URLs and drop the query string).
    const query = new URLSearchParams(window.location.search).get('id');
    const raw = query || (window.location.hash || '').replace(/^#/, '').match(/(?:^|&)id=(\d+)/)?.[1];
    if (!raw) return null;
    if (!/^\d+$/.test(raw)) return null;
    return Number(raw);
  }

  function setFieldError(field, message) {
    const target = els.errors[field];
    const input = els[field];
    if (!target) return;

    target.textContent = message || '';
    if (input) {
      input.classList.toggle('invalid', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
  }

  function clearErrors() {
    Object.keys(els.errors).forEach((field) => setFieldError(field, ''));
    if (els.banner) {
      els.banner.hidden = true;
      els.banner.textContent = '';
      els.banner.className = 'banner';
    }
  }

  function showBanner(message, type = 'error') {
    if (!els.banner) return;
    els.banner.textContent = message;
    els.banner.className = `banner banner-${type}`;
    els.banner.hidden = false;
  }

  function setLoading(isLoading) {
    if (els.loader) els.loader.hidden = !isLoading;
    if (els.form) els.form.hidden = isLoading;
  }

  /* ------------------------------------------------------------------ */
  /* Validation                                                          */
  /* ------------------------------------------------------------------ */

  /** Per-field validation rules — each returns an error message or ''. */
  const VALIDATORS = {
    name(value) {
      if (!value) return 'Name is required.';
      if (value.length > 100) return 'Name must be 100 characters or fewer.';
      return '';
    },
    class_year(value) {
      if (!value) return 'Class year is required.';
      if (!YEARS.includes(value)) return 'Class year must be FY, SY, TY or LY.';
      return '';
    },
    degree(value) {
      if (!value) return 'Degree is required.';
      if (!DEGREES.includes(value)) return 'Please pick one of the listed degrees.';
      return '';
    },
    mobile(value) {
      if (!value) return 'Mobile number is required.';
      if (!/^\d{10}$/.test(value)) return 'Mobile number must be exactly 10 digits.';
      return '';
    },
    email(value) {
      if (!value) return '';
      if (value.length > 100) return 'Email must be 100 characters or fewer.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address.';
      }
      return '';
    }
  };

  function currentValues() {
    return {
      name: els.name.value.trim(),
      class_year: els.class_year.value,
      degree: els.degree.value,
      mobile: els.mobile.value.trim(),
      email: els.email.value.trim()
    };
  }

  /** Validates one field and paints its inline message. */
  function validateField(field, values) {
    const message = VALIDATORS[field](values[field]);
    setFieldError(field, message);
    return message;
  }

  function validate() {
    const values = currentValues();
    let firstInvalidField = null;

    Object.keys(VALIDATORS).forEach((field) => {
      const message = validateField(field, values);
      if (message && !firstInvalidField) firstInvalidField = field;
    });

    return {
      valid: !firstInvalidField,
      firstInvalidField,
      values
    };
  }

  /* ------------------------------------------------------------------ */
  /* Fill the form                                                       */
  /* ------------------------------------------------------------------ */

  function fillForm(student) {
    els.name.value = student.name || '';
    els.class_year.value = student.class_year || '';
    els.degree.value = student.degree || '';
    els.mobile.value = student.mobile || '';
    els.email.value = student.email || '';
  }

  function setMode(mode) {
    isEditMode = mode === 'edit';
    if (isEditMode) {
      els.title.textContent = 'Edit Student';
      els.subtitle.textContent = 'Update the details of this student record.';
      els.submitBtn.textContent = 'Update Student';
    } else {
      els.title.textContent = 'Add Student';
      els.subtitle.textContent = 'Fill in the details to create a new student record.';
      els.submitBtn.textContent = 'Add Student';
    }
    document.title = isEditMode
      ? 'Edit Student | College Portal'
      : 'Add Student | College Portal';
  }

  /* ------------------------------------------------------------------ */
  /* Load an existing student (edit mode)                                */
  /* ------------------------------------------------------------------ */

  async function loadStudent(id) {
    setLoading(true);
    try {
      const student = await api.getStudent(id);
      fillForm(student);
      setMode('edit');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      showBanner(err.message || 'Could not load the student.');
      if (err.status === 404) {
        els.form.hidden = true;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Submit                                                              */
  /* ------------------------------------------------------------------ */

  async function handleSubmit(event) {
    event.preventDefault();
    clearErrors();

    const { valid, values, firstInvalidField } = validate();
    if (!valid) {
      showBanner('Please fix the highlighted fields and try again.');
      if (firstInvalidField && els[firstInvalidField]) {
        els[firstInvalidField].focus();
      }
      return;
    }

    els.submitBtn.disabled = true;
    els.submitBtn.textContent = isEditMode ? 'Saving...' : 'Saving...';

    const payload = {
      name: values.name,
      class_year: values.class_year,
      degree: values.degree,
      mobile: values.mobile,
      email: values.email || null
    };

    try {
      if (isEditMode) {
        await api.updateStudent(studentId, payload);
        window.location.href = 'index.html?updated=1';
      } else {
        await api.createStudent(payload);
        window.location.href = 'index.html?created=1';
      }
    } catch (err) {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = isEditMode ? 'Update Student' : 'Add Student';

      // Field-level errors coming from the API (e.g. duplicate mobile).
      if (err.data && err.data.errors) {
        Object.keys(err.data.errors).forEach((field) => {
          setFieldError(field, err.data.errors[field]);
        });
      }
      showBanner(err.message || 'Something went wrong. Please try again.');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    // Populate selects from the constants (keeps HTML and JS in sync).
    YEARS.forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      els.class_year.appendChild(option);
    });

    DEGREES.forEach((degree) => {
      const option = document.createElement('option');
      option.value = degree;
      option.textContent = degree;
      els.degree.appendChild(option);
    });

    els.form.addEventListener('submit', handleSubmit);

    els.cancelBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Only allow digits in the mobile field.
    els.mobile.addEventListener('input', () => {
      els.mobile.value = els.mobile.value.replace(/\D/g, '').slice(0, 10);
    });

    // Live validation once a field has been touched.
    Object.keys(VALIDATORS).forEach((field) => {
      const input = els[field];
      if (!input) return;

      input.addEventListener('blur', () => {
        validateField(field, currentValues());
      });

      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => {
          validateField(field, currentValues());
        });
      }

      input.addEventListener('input', () => {
        if (els.errors[field].textContent) {
          setFieldError(field, '');
        }
      });
    });

    studentId = getStudentIdFromUrl();
    if (studentId) {
      setMode('edit');
      loadStudent(studentId);
    } else {
      setMode('add');
      setLoading(false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
