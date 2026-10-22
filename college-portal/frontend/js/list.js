/* =========================================================================
 * list.js — student list page (index.html)
 * Handles: loading, searching (server-side via ?search=), row rendering,
 * delete with confirmation and toast notifications.
 * ========================================================================= */

(function () {
  'use strict';

  const api = window.CollegePortalAPI;

  const els = {
    table: document.getElementById('students-table'),
    tbody: document.getElementById('students-body'),
    loading: document.getElementById('loading'),
    empty: document.getElementById('empty-state'),
    error: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    search: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    count: document.getElementById('result-count'),
    addBtn: document.getElementById('add-student-btn'),
    toast: document.getElementById('toast')
  };

  let searchTerm = '';
  let searchTimer = null;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function showToast(message, type = 'success') {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.className = `toast toast-${type} show`;
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      els.toast.className = 'toast';
    }, 3200);
  }

  function setLoading(isLoading) {
    if (els.loading) els.loading.hidden = !isLoading;
    if (els.table) els.table.hidden = isLoading;
    if (els.error) els.error.hidden = true;
    if (isLoading && els.empty) els.empty.hidden = true;
  }

  function setError(message) {
    if (!els.error) return;
    els.errorMessage.textContent = message;
    els.error.hidden = false;
    if (els.empty) els.empty.hidden = true;
  }

  /** Creates an element with text content — never uses innerHTML with data. */
  function cell(text, className) {
    const td = document.createElement('td');
    td.textContent = text === null || text === undefined ? '—' : String(text);
    td.setAttribute('data-label', className);
    if (className) td.className = `col-${className}`;
    return td;
  }

  function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function renderRows(students) {
    els.tbody.textContent = '';

    students.forEach((student) => {
      const tr = document.createElement('tr');

      // ID
      tr.appendChild(cell(student.id, 'id'));

      // Name + avatar
      const nameTd = document.createElement('td');
      nameTd.setAttribute('data-label', 'Name');
      nameTd.className = 'col-name';

      const wrap = document.createElement('div');
      wrap.className = 'cell-flex';

      const avatar = document.createElement('span');
      avatar.className = 'avatar avatar-sm';
      avatar.textContent = initials(student.name);

      const nameText = document.createElement('span');
      nameText.className = 'student-name';
      nameText.textContent = student.name;

      wrap.appendChild(avatar);
      wrap.appendChild(nameText);
      nameTd.appendChild(wrap);
      tr.appendChild(nameTd);

      // Year, degree, mobile
      tr.appendChild(cell(student.class_year, 'year'));
      tr.appendChild(cell(student.degree, 'degree'));
      tr.appendChild(cell(student.mobile, 'mobile'));

      // Actions
      const actionsTd = document.createElement('td');
      actionsTd.setAttribute('data-label', 'Actions');
      actionsTd.className = 'col-actions';

      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-ghost btn-sm';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => {
        window.location.href = `profile.html?id=${encodeURIComponent(student.id)}`;
      });

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-primary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        window.location.href = `add.html?id=${encodeURIComponent(student.id)}`;
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => handleDelete(student));

      actionsTd.appendChild(viewBtn);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);
      tr.appendChild(actionsTd);

      els.tbody.appendChild(tr);
    });
  }

  function render(students) {
    setLoading(false);

    if (els.count) {
      const n = students.length;
      els.count.textContent = searchTerm
        ? `${n} result${n === 1 ? '' : 's'} for "${searchTerm}"`
        : `${n} student${n === 1 ? '' : 's'} recorded`;
    }

    if (!students.length) {
      els.tbody.textContent = '';
      // Hide the table too, otherwise an empty table header is rendered
      // next to the "no students found" message.
      if (els.table) els.table.hidden = true;
      if (els.empty) {
        els.empty.hidden = false;
        els.empty.querySelector('[data-empty-text]').textContent = searchTerm
          ? `No students match "${searchTerm}". Try a different name or mobile number.`
          : 'No students yet. Add your first student to get started.';
      }
      return;
    }

    if (els.empty) els.empty.hidden = true;
    if (els.table) els.table.hidden = false;
    renderRows(students);
  }

  /* ------------------------------------------------------------------ */
  /* Data loading                                                        */
  /* ------------------------------------------------------------------ */

  async function loadStudents() {
    setLoading(true);
    try {
      const students = await api.getStudents(searchTerm);
      render(students);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Something went wrong while loading students.');
      if (els.count) els.count.textContent = '';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  async function handleDelete(student) {
    const confirmed = window.confirm(
      `Delete ${student.name}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.deleteStudent(student.id);
      showToast(`${student.name} was deleted.`, 'success');
      await loadStudents();
    } catch (err) {
      showToast(err.message || 'Could not delete the student.', 'error');
    }
  }

  function handleSearchInput() {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchTerm = els.search.value.trim();
      if (els.searchClear) els.searchClear.hidden = !searchTerm;
      loadStudents();
    }, 300);
  }

  function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
      els.search.value = '';
      searchTerm = '';
      if (els.searchClear) els.searchClear.hidden = true;
      loadStudents();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    els.addBtn.addEventListener('click', () => {
      window.location.href = 'add.html';
    });

    els.search.addEventListener('input', handleSearchInput);
    els.search.addEventListener('keydown', handleSearchKeydown);

    els.searchClear.addEventListener('click', () => {
      els.search.value = '';
      searchTerm = '';
      els.searchClear.hidden = true;
      loadStudents();
    });

    // Show a toast when arriving back from add/edit/delete.
    const params = new URLSearchParams(window.location.search);
    if (params.get('created')) showToast('Student added successfully.', 'success');
    if (params.get('updated')) showToast('Student updated successfully.', 'success');
    if (params.get('deleted')) showToast('Student deleted successfully.', 'success');

    if (params.get('created') || params.get('updated') || params.get('deleted')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadStudents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
