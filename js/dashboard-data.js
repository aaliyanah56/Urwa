import { supabase } from './supabase.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';
const status = (id, title, message, bad = false) => {
  const node = document.getElementById(id);
  if (!node) return;
  node.replaceChildren();
  const heading = document.createElement('strong');
  heading.textContent = title;
  const detail = document.createElement('p');
  detail.textContent = message;
  node.append(heading, detail);
  node.classList.toggle('is-error', bad);
};
const fail = (error) => { throw new Error(error?.message || 'The request could not be completed.'); };

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) fail(error);
  if (!data.user) throw new Error('Please sign in again.');
  return data.user;
}

async function adminLoad(user) {
  try {
    const [peopleQ, enrollQ, halaqaQ, assignmentQ, attendanceQ] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,role,status'),
      supabase.from('student_enrollments').select('*'),
      supabase.from('halaqas').select('*').order('name'),
      supabase.from('teacher_assignments').select('*'),
      supabase.from('attendance').select('id,status')
    ]);
    [peopleQ, enrollQ, halaqaQ, assignmentQ, attendanceQ].forEach(q => { if (q.error) fail(q.error); });
    const people = peopleQ.data || [], enroll = enrollQ.data || [], halaqas = halaqaQ.data || [];
    const assignments = assignmentQ.data || [], attendance = attendanceQ.data || [];
    const students = people.filter(p => p.role === 'student');
    const teachers = people.filter(p => p.role === 'teacher');
    const byStudent = new Map(enroll.map(e => [e.student_id, e]));
    const byId = new Map(people.map(p => [p.id, p]));
    const byHalaqa = new Map(halaqas.map(h => [h.id, h]));
    const options = (selected) => '<option value="">Choose halaqa</option>' +
      halaqas.filter(h => h.is_active).map(h => '<option value="' + h.id + '" ' +
      (h.id === selected ? 'selected' : '') + '>' + esc(h.name) + '</option>').join('');
    const pending = students.filter(p => (byStudent.get(p.id)?.status || p.status) === 'pending');
    const put = (selector, html, empty) => { const node = $(selector); if (node) node.innerHTML = html || empty; };

    put('#admin-admissions-body', pending.map(p => {
      const e = byStudent.get(p.id) || {};
      return '<tr><td><b>' + esc(p.full_name) + '</b><small>' + esc(p.email) +
        '</small></td><td>' + esc(e.programme || '—') + '</td><td>' + date(e.created_at) +
        '</td><td>Pending</td><td class="urwa-admin-actions"><select data-admission-halaqa="' +
        p.id + '">' + options(e.halaqa_id) + '</select><button class="urwa-btn urwa-btn-primary urwa-btn-small" data-accept="' +
        p.id + '">Accept</button><button class="urwa-btn urwa-btn-outline urwa-btn-small" data-decline="' +
        p.id + '">Decline</button></td></tr>';
    }).join(''), '<tr><td colspan="5">No pending student applications.</td></tr>');

    put('#admin-students-body', students.map(p => {
      const e = byStudent.get(p.id) || {}, h = byHalaqa.get(e.halaqa_id);
      const ta = assignments.find(a => a.halaqa_id === e.halaqa_id);
      const teacher = ta ? byId.get(ta.teacher_id) : null;
      return '<tr><td><b>' + esc(p.full_name) + '</b><small>' + esc(p.email) +
        '</small></td><td>' + esc(e.programme || '—') + '</td><td>' +
        esc(h?.name || 'Not assigned') + '</td><td>' + esc(teacher?.full_name || 'Not assigned') +
        '</td><td>' + esc(e.status || p.status) + '</td></tr>';
    }).join(''), '<tr><td colspan="5">No student accounts yet.</td></tr>');

    put('#admin-teachers-body', teachers.map(p => {
      const assigned = assignments.filter(a => a.teacher_id === p.id);
      const names = assigned.map(a => byHalaqa.get(a.halaqa_id)?.name).filter(Boolean);
      const learnerCount = enroll.filter(e => e.status === 'approved' &&
        assigned.some(a => a.halaqa_id === e.halaqa_id)).length;
      return '<tr><td><b>' + esc(p.full_name) + '</b><small>' + esc(p.email) +
        '</small></td><td>Qur’an / Islamic Studies</td><td>' + esc(names.join(', ') || 'Not assigned') +
        '</td><td>' + learnerCount + '</td><td>' + esc(p.status) +
        (p.status === 'pending' ? ' <button class="urwa-btn urwa-btn-primary urwa-btn-small" data-approve-teacher="' + p.id + '">Approve</button>' : '') +
        '<div class="urwa-admin-actions"><select data-teacher-halaqa="' + p.id + '">' +
        options('') + '</select><button class="urwa-btn urwa-btn-outline urwa-btn-small" data-assign="' +
        p.id + '">Assign</button></div></td></tr>';
    }).join(''), '<tr><td colspan="5">No Abla accounts. Staff accounts must be created through a trusted administrator workflow.</td></tr>');

    const stats = $$('.urwa-stat-value');
    if (stats[0]) stats[0].textContent = students.filter(p => (byStudent.get(p.id)?.status || p.status) === 'approved').length;
    if (stats[1]) stats[1].textContent = attendance.length
      ? Math.round(attendance.filter(a => ['present', 'late'].includes(a.status)).length / attendance.length * 100) + '%' : '—';
    if (stats[2]) stats[2].textContent = teachers.filter(p => p.status === 'approved').length;
    status('admin-live-status', 'Supabase connection active',
      students.length + ' students · ' + pending.length + ' pending applications · ' +
      teachers.length + ' Ablas · ' + halaqas.length + ' halaqas.');
  } catch (error) {
    status('admin-live-status', 'Unable to load URWA records', error.message, true);
  }
}

async function initAdmin(user) {
  await adminLoad(user);
  document.addEventListener('click', async (event) => {
    try {
      const accept = event.target.closest('[data-accept]');
      const decline = event.target.closest('[data-decline]');
      const approve = event.target.closest('[data-approve-teacher]');
      const assign = event.target.closest('[data-assign]');
      if (accept || decline) {
        const id = (accept || decline).dataset[accept ? 'accept' : 'decline'];
        const halaqaId = $('[data-admission-halaqa="' + id + '"]')?.value || null;
        if (accept && !halaqaId) throw new Error('Choose a halaqa before accepting.');
        const next = accept ? 'approved' : 'suspended';
        const { error } = await supabase.from('student_enrollments').update({
          status: next, halaqa_id: halaqaId, reviewed_by: user.id, reviewed_at: new Date().toISOString()
        }).eq('student_id', id);
        if (error) fail(error);
        const profileUpdate = await supabase.from('profiles').update({ status: next }).eq('id', id);
        if (profileUpdate.error) fail(profileUpdate.error);
        await adminLoad(user);
      }
      if (approve) {
        const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', approve.dataset.approveTeacher);
        if (error) fail(error);
        await adminLoad(user);
      }
      if (assign) {
        const teacherId = assign.dataset.assign;
        const halaqaId = $('[data-teacher-halaqa="' + teacherId + '"]')?.value;
        if (!halaqaId) throw new Error('Choose a halaqa.');
        const { error } = await supabase.from('teacher_assignments').insert({ teacher_id: teacherId, halaqa_id: halaqaId });
        if (error) fail(error);
        await adminLoad(user);
      }
    } catch (error) { status('admin-live-status', 'Could not save change', error.message, true); }
  });

  const form = $('#admin-announcement-form');
  if (form) form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const { error } = await supabase.from('announcements').insert({
        title: $('#announcement-title').value.trim(),
        message: $('#announcement-message').value.trim(),
        audience: $('#announcement-audience').value,
        published_by: user.id
      });
      if (error) fail(error);
      form.reset();
      status('admin-live-status', 'Announcement published', 'Your announcement has been saved to Supabase.');
    } catch (error) { status('admin-live-status', 'Announcement failed', error.message, true); }
  });
}

async function studentLoad(user) {
  const [enrollmentQ, attendanceQ, assignmentQ, hifdhQ, murajaahQ] = await Promise.all([
    supabase.from('student_enrollments').select('*').eq('student_id', user.id).maybeSingle(),
    supabase.from('attendance').select('status').eq('student_id', user.id),
    supabase.from('assignments').select('*').order('created_at', { ascending: false }),
    supabase.from('hifdh_records').select('id').eq('student_id', user.id),
    supabase.from('murajaah_records').select('id').eq('student_id', user.id)
  ]);
  [enrollmentQ, attendanceQ, assignmentQ, hifdhQ, murajaahQ].forEach(q => { if (q.error) fail(q.error); });
  const enrollment = enrollmentQ.data || {};
  const assignments = (assignmentQ.data || []).filter(a => a.halaqa_id === enrollment.halaqa_id);
  let halaqaName = 'Not assigned';
  if (enrollment.halaqa_id) {
    const { data, error } = await supabase.from('halaqas').select('name').eq('id', enrollment.halaqa_id).maybeSingle();
    if (error) fail(error);
    if (data) halaqaName = data.name;
  }
  const panel = $('#student-assignments-list');
  if (panel) panel.innerHTML = assignments.length ? assignments.map(a =>
    '<article><b>' + esc(a.title) + '</b><p>' + esc(a.assignment_type || 'Learning task') +
    ' · Due ' + date(a.due_date) + '</p><p>' + esc(a.instructions || 'Follow your Abla’s instructions.') +
    '</p></article>').join('') : '<b>No assignments yet</b><p>Your Abla’s assignments will appear here.</p>';
  const attendance = attendanceQ.data || [];
  const rate = attendance.length ? Math.round(attendance.filter(a => ['present', 'late'].includes(a.status)).length / attendance.length * 100) + '%' : 'No records';
  status('student-live-overview', 'Your live learning overview',
    (enrollment.programme || 'Programme awaiting confirmation') + ' · ' + halaqaName +
    ' · Admission: ' + (enrollment.status || 'not submitted') + ' · Attendance: ' + rate +
    ' · Assignments: ' + assignments.length + ' · Hifdh entries: ' + hifdhQ.data.length +
    ' · Muraja’ah entries: ' + murajaahQ.data.length);
}

async function teacherLoad(user) {
  const [assignmentLinksQ, assignmentsQ] = await Promise.all([
    supabase.from('teacher_assignments').select('*').eq('teacher_id', user.id),
    supabase.from('assignments').select('*').eq('teacher_id', user.id)
  ]);
  [assignmentLinksQ, assignmentsQ].forEach(q => { if (q.error) fail(q.error); });
  const links = assignmentLinksQ.data || [], halaqaIds = links.map(a => a.halaqa_id);
  let halaqas = [], enrollments = [], attendance = [];
  if (halaqaIds.length) {
    const [h, e, a] = await Promise.all([
      supabase.from('halaqas').select('*').in('id', halaqaIds),
      supabase.from('student_enrollments').select('*').in('halaqa_id', halaqaIds).eq('status', 'approved'),
      supabase.from('attendance').select('*').in('halaqa_id', halaqaIds)
    ]);
    [h, e, a].forEach(q => { if (q.error) fail(q.error); });
    halaqas = h.data || []; enrollments = e.data || []; attendance = a.data || [];
  }
  let studentProfiles = [];
  if (enrollments.length) {
    const { data, error } = await supabase.from('profiles').select('id,full_name,email')
      .in('id', enrollments.map(e => e.student_id));
    if (error) fail(error);
    studentProfiles = data || [];
  }
  const byStudent = new Map(studentProfiles.map(p => [p.id, p]));
  const roster = $('#teacher-attendance-roster');
  if (roster) roster.innerHTML = enrollments.length
    ? '<div class="urwa-table-wrap"><table class="urwa-table"><thead><tr><th>Student</th><th>Halaqa</th><th>Attendance</th></tr></thead><tbody>' +
      enrollments.map(e => {
        const p = byStudent.get(e.student_id) || {};
        return '<tr data-attendance-row="' + e.student_id + '" data-halaqa-id="' + e.halaqa_id +
          '"><td>' + esc(p.full_name || 'Student') + '<small>' + esc(p.email || '') +
          '</small></td><td>' + esc(halaqas.find(h => h.id === e.halaqa_id)?.name || '') +
          '</td><td><select data-attendance-status><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="excused">Excused</option></select></td></tr>';
      }).join('') + '</tbody></table></div><button class="urwa-btn urwa-btn-primary urwa-btn-small" type="button" data-save-attendance>Save attendance</button><p id="teacher-attendance-message" role="status"></p>'
    : '<b>No approved students assigned yet.</b>';

  const select = $('#assignment-students');
  if (select) select.innerHTML = '<option value="">Choose your halaqa</option>' +
    halaqas.map(h => '<option value="' + h.id + '">' + esc(h.name) + '</option>').join('');
  status('teacher-live-overview', 'Your teaching workspace is connected',
    halaqas.length + ' halaqas · ' + enrollments.length + ' approved students · ' +
    attendance.length + ' attendance records · ' + assignmentsQ.data.length + ' assignments.');

  const form = $('#teacher-assignment-form');
  if (form) form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]');
    if (button) button.disabled = true;
    try {
      const halaqaId = select?.value;
      if (!halaqaId) throw new Error('Choose your halaqa first.');
      const { error } = await supabase.from('assignments').insert({
        halaqa_id: halaqaId, teacher_id: user.id,
        title: $('#assignment-title').value.trim(),
        assignment_type: $('#assignment-type').value,
        instructions: $('#assignment-instructions').value.trim(),
        due_date: $('#assignment-due').value || null
      });
      if (error) fail(error);
      $('#teacher-assignment-message').textContent = 'Assignment published.';
      form.reset();
    } catch (error) { $('#teacher-assignment-message').textContent = error.message; }
    finally { if (button) button.disabled = false; }
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save-attendance]');
    if (!button) return;
    button.disabled = true;
    try {
      const classDate = $('#teacher-attendance-date')?.value || new Date().toISOString().slice(0, 10);
      const records = $$('[data-attendance-row]').map(row => ({
        halaqa_id: row.dataset.halaqaId,
        student_id: row.dataset.attendanceRow,
        class_date: classDate,
        status: $('[data-attendance-status]', row).value,
        recorded_by: user.id
      }));
      if (records.length) {
        const { error } = await supabase.from('attendance').insert(records);
        if (error) fail(error);
      }
      $('#teacher-attendance-message').textContent = 'Attendance saved.';
    } catch (error) { $('#teacher-attendance-message').textContent = error.message; }
    finally { button.disabled = false; }
  });
}

(async () => {
  try {
    const user = await currentUser();
    const role = document.body.dataset.urwaRole;
    if (role === 'admin') await initAdmin(user);
    if (role === 'student') await studentLoad(user);
    if (role === 'teacher') await teacherLoad(user);
  } catch (error) {
    const role = document.body.dataset.urwaRole;
    status(role === 'student' ? 'student-live-overview' : role === 'teacher' ? 'teacher-live-overview' : 'admin-live-status',
      'Could not load records', error.message, true);
  }
})();
