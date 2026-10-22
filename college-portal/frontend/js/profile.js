/* =========================================================================
 * profile.js — single student profile page (profile.html)
 * Reads ?id=<studentId> from the URL, loads the student and renders a card.
 * ========================================================================= */

(function () {
  'use strict';

  const api = window.CollegePortalAPI;

  const els = {
    loader: document.getElementById('profile-loader'),
    card: document.getElementById('profile-card'),
    notFound: document.getElementById('not-found'),
    avatar: document.getElementById('avatar'),
    name: document.getElementById('profile-name'),
    degree: document.getElementById('profile-degree'),
    degreeValue: document.getElementById('profile-degree-value'),
    year: document.getElementById('profile-year'),
    mobile: document.getElementById('profile-mobile'),
    email: document.getElementById('profile-email'),
    created: document.getElementById('profile-created'),
    photo: document.getElementById('profile-photo'),
    editBtn: document.getElementById('edit-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    backBtn: document.getElementById('back-btn')
  };

  let student = null;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function showNotFound() {
    if (els.loader) els.loader.hidden = true;
    if (els.card) els.card.hidden = true;
    if (els.notFound) els.notFound.hidden = false;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function render(data) {
    els.avatar.textContent = initials(data.name);
    els.name.textContent = data.name;
    els.degree.textContent = data.degree;
    els.degreeValue.textContent = data.degree;
    els.year.textContent = data.class_year;
    els.mobile.textContent = data.mobile;
    els.email.textContent = data.email || 'Not provided';
    els.created.textContent = formatDate(data.created_at);

    if (data.profile_photo) {
      els.photo.src = data.profile_photo;
      els.photo.alt = `${data.name} profile photo`;
      els.photo.hidden = false;
    } else {
      els.photo.hidden = true;
    }

    els.editBtn.href = `add.html?id=${encodeURIComponent(data.id)}`;

    if (els.loader) els.loader.hidden = true;
    if (els.notFound) els.notFound.hidden = true;
    if (els.card) els.card.hidden = false;
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  async function handleDelete() {
    if (!student) return;

    const confirmed = window.confirm(
      `Delete ${student.name}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    els.deleteBtn.disabled = true;
    try {
      await api.deleteStudent(student.id);
      window.location.href = 'index.html?deleted=1';
    } catch (err) {
      els.deleteBtn.disabled = false;
      window.alert(err.message || 'Could not delete the student.');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  async function init() {
    // Primary: ?id=123 (also accepts #id=123 as a fallback for static
    // servers that rewrite .html URLs and drop the query string).
    const query = new URLSearchParams(window.location.search).get('id');
    const rawId =
      query ||
      (window.location.hash || '').replace(/^#/, '').match(/(?:^|&)id=(\d+)/)?.[1];

    if (!rawId || !/^\d+$/.test(rawId)) {
      showNotFound();
      return;
    }

    try {
      student = await api.getStudent(rawId);
      render(student);
    } catch (err) {
      if (err.status === 404) {
        showNotFound();
      } else {
        showNotFound();
        const message = els.notFound.querySelector('[data-not-found-message]');
        if (message) {
          message.textContent = err.message || 'Could not load the student.';
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    els.deleteBtn.addEventListener('click', handleDelete);
    els.backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    init();
  });
})();
