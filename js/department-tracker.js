import { supabase } from './supabase.js';
const DEPARTMENTS = [
  { key: 'halaqa_management', name: 'Halaqa Manager Team' },
  { key: 'finance', name: 'Finance Team' },
  { key: 'social_media', name: 'Social Media Team' },
  { key: 'events', name: 'Event Team' }
];
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deptName = key => DEPARTMENTS.find(d => d.key === key)?.name || key;
let user, profile, memberships = [], goals = [], reports = [], isAdmin = false, profiles = [];
function msg(text, error = false) {
  const node = $('pageMessage'); if (!node) return;
  node.replaceChildren();
  const p = document.createElement('div'); p.className = 'dt-message' + (error ? ' error' : '');
  p.textContent = text; node.append(p);
}
function canHead(key) { return isAdmin || memberships.some(m => m.department_key === key && m.access_level === 'head'); }
function canAccess(key) { return isAdmin || memberships.some(m => m.department_key === key); }
function fill(id, list) {
  const node = $(id);
  node.innerHTML = list.map(d => '<option value="' + d.key + '">' + d.name + '</option>').join('');
  node.disabled = !isAdmin && list.length === 1;
}
function refreshGoals() {
  const department = $('reportDepartment').value;
  $('reportGoal').innerHTML = '<option value="">General department update</option>' +
    goals.filter(g => g.department_key === department).map(g => '<option value="' + g.id + '">' + esc(g.title) + '</option>').join('');
}
function renderGoals() {
  $('goalList').innerHTML = goals.length ? goals.map(g =>
    '<article class="dt-card"><div class="dt-meta"><span class="dt-pill">' + esc(g.status?.replace('_',' ')) +
    '</span><span>' + esc(deptName(g.department_key)) + '</span><span>Due: ' + esc(g.due_date || 'Not set') +
    '</span></div><h3>' + esc(g.title) + '</h3><p>' + esc(g.description || 'No description added.') +
    '</p><div class="dt-meta">' + esc(g.target_metric || 'Target not specified') +
    (g.target_value != null ? ' · ' + esc(g.target_value) + ' ' + esc(g.unit || '') : '') +
    '</div>' + (canHead(g.department_key) ? '<label class="dt-muted">Goal status: <select data-goal-status="' + g.id +
    '"><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="on_hold">On hold</option></select></label>' : '') +
    '</article>').join('') : '<div class="dt-card dt-muted">No goals have been added yet.</div>';
  document.querySelectorAll('[data-goal-status]').forEach(el => {
    const goal = goals.find(g => g.id === el.dataset.goalStatus); el.value = goal.status;
    el.addEventListener('change', async () => {
      try {
        const { error } = await supabase.from('department_goals').update({ status: el.value, updated_at: new Date().toISOString() }).eq('id', goal.id);
        if (error) throw error;
        goal.status = el.value; msg('Goal status updated.');
      } catch (error) { msg(error.message, true); el.value = goal.status; }
    });
  });
  $('statGoals').textContent = goals.filter(g => g.status !== 'completed').length;
}
function renderReports() {
  $('reportList').innerHTML = reports.length ? reports.map(r =>
    '<article class="dt-card"><div class="dt-meta"><span class="dt-pill">' + esc(r.review_status) +
    '</span><span>' + esc(deptName(r.department_key)) + '</span><span>' + esc(r.report_type) +
    '</span></div><h3>' + esc(r.title) + '</h3><p>' + esc(r.details) + '</p>' +
    (r.progress_percent != null ? '<div class="dt-meta">Reported progress: ' + r.progress_percent +
    '%</div><div class="dt-progress"><span style="width:' + r.progress_percent + '%"></span></div>' : '') +
    (r.evidence_url ? '<a href="' + esc(r.evidence_url) + '" target="_blank" rel="noopener noreferrer">Open evidence ↗</a>' : '') +
    (isAdmin && r.review_status === 'submitted' ? '<div style="margin-top:12px"><button class="dt-btn secondary" data-review="' + r.id + '">Mark reviewed</button></div>' : '') +
    '</article>').join('') : '<div class="dt-card dt-muted">No reports submitted yet.</div>';
  document.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { error } = await supabase.from('department_reports').update({ review_status: 'reviewed', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', button.dataset.review);
      if (error) throw error;
      msg('Report marked as reviewed.'); await loadData();
    } catch (error) { msg(error.message, true); button.disabled = false; }
  }));
  $('statReports').textContent = reports.length;
  $('statPending').textContent = reports.filter(r => r.review_status === 'submitted').length;
}
async function loadData() {
  goals = []; reports = [];
  const available = isAdmin ? DEPARTMENTS : DEPARTMENTS.filter(d => canAccess(d.key));
  for (const department of available) {
    const [g, r] = await Promise.all([
      supabase.from('department_goals').select('*').eq('department_key', department.key).order('created_at', { ascending: false }),
      supabase.from('department_reports').select('*').eq('department_key', department.key).order('created_at', { ascending: false })
    ]);
    if (g.error) throw g.error; if (r.error) throw r.error;
    goals.push(...(g.data || [])); reports.push(...(r.data || []));
  }
  renderGoals(); renderReports();
  $('statDepartments').textContent = isAdmin ? DEPARTMENTS.length : memberships.length;
  refreshGoals();
}
async function loadMemberships() {
  let query = supabase.from('department_memberships').select('*');
  if (!isAdmin) query = query.eq('profile_id', user.id);
  const { data, error } = await query;
  if (error) throw error;
  memberships = data || [];
}
async function setupAdmin() {
  $('access').classList.remove('dt-hidden'); $('accessNav').classList.remove('dt-hidden');
  const { data, error } = await supabase.from('profiles').select('id,full_name,email').eq('status','approved').order('full_name');
  if (error) throw error;
  profiles = data || [];
  $('memberProfile').innerHTML = profiles.map(p => '<option value="' + p.id + '">' + esc(p.full_name || p.email || p.id) + '</option>').join('');
  $('memberDepartment').innerHTML = DEPARTMENTS.map(d => '<option value="' + d.key + '">' + d.name + '</option>').join('');
  $('membershipList').innerHTML = '<div style="overflow:auto;margin-top:15px"><table class="dt-table"><thead><tr><th>Member</th><th>Department</th><th>Access</th></tr></thead><tbody>' +
    memberships.map(m => '<tr><td>' + esc(profiles.find(p => p.id === m.profile_id)?.full_name || m.profile_id) +
    '</td><td>' + esc(deptName(m.department_key)) + '</td><td>' + esc(m.access_level) + '</td></tr>').join('') +
    '</tbody></table></div>';
}
async function init() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) { location.replace('/portal/admin/login.html'); return; }
  user = authData.user;
  const { data: p, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!p || p.status !== 'approved') { msg('Your account is not approved.', true); return; }
  profile = p; isAdmin = profile.role === 'admin';
  document.querySelectorAll('[data-profile-name]').forEach(n => n.textContent = profile.full_name || 'URWA member');
  await loadMemberships();
  const available = isAdmin ? DEPARTMENTS : DEPARTMENTS.filter(d => canAccess(d.key));
  if (!available.length) {
    msg('No department access has been assigned. Contact administration.', true);
    $('goalForm').classList.add('dt-hidden'); $('reportForm').classList.add('dt-hidden'); return;
  }
  fill('goalDepartment', available); fill('reportDepartment', available);
  $('createGoalPanel').classList.toggle('dt-hidden', !isAdmin && !memberships.some(m => m.access_level === 'head'));
  await loadData();
  if (isAdmin) await setupAdmin();
  $('reportDepartment').addEventListener('change', refreshGoals);
  $('goalForm').addEventListener('submit', saveGoal);
  $('reportForm').addEventListener('submit', saveReport);
  $('membershipForm').addEventListener('submit', saveMembership);
}
async function saveGoal(event) {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const department = $('goalDepartment').value;
    if (!canHead(department)) throw new Error('Only department heads can create goals.');
    const { error } = await supabase.from('department_goals').insert({
      department_key: department, title: $('goalTitle').value.trim(),
      description: $('goalDescription').value.trim() || null,
      target_metric: $('goalMetric').value.trim() || null,
      target_value: $('goalValue').value ? Number($('goalValue').value) : null,
      unit: $('goalUnit').value.trim() || null, start_date: $('goalStart').value || null,
      due_date: $('goalDue').value || null, status: 'planned', created_by: user.id
    });
    if (error) throw error;
    $('goalForm').reset(); msg('Department goal saved.'); await loadData();
  } catch (error) { msg(error.message, true); } finally { button.disabled = false; }
}
async function saveReport(event) {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const department = $('reportDepartment').value;
    if (!canAccess(department)) throw new Error('You do not have access to this department.');
    const progress = $('reportProgress').value;
    const { error } = await supabase.from('department_reports').insert({
      department_key: department, goal_id: $('reportGoal').value || null,
      report_type: $('reportType').value, title: $('reportTitle').value.trim(),
      details: $('reportDetails').value.trim(), progress_percent: progress === '' ? null : Number(progress),
      evidence_url: $('reportEvidence').value.trim() || null,
      period_start: $('periodStart').value || null, period_end: $('periodEnd').value || null,
      review_status: 'submitted', submitted_by: user.id
    });
    if (error) throw error;
    $('reportForm').reset(); msg('Your report has been submitted for administrative review.'); await loadData();
  } catch (error) { msg(error.message, true); } finally { button.disabled = false; }
}
async function saveMembership(event) {
  event.preventDefault(); if (!isAdmin) return;
  const button = event.submitter; button.disabled = true;
  try {
    const profileId = $('memberProfile').value, department = $('memberDepartment').value;
    const values = { profile_id: profileId, department_key: department, access_level: $('memberLevel').value, assigned_by: user.id };
    const { data: existing, error: findError } = await supabase.from('department_memberships').select('id').eq('profile_id', profileId).eq('department_key', department).maybeSingle();
    if (findError) throw findError;
    const result = existing
      ? await supabase.from('department_memberships').update({ access_level: values.access_level, assigned_by: user.id }).eq('id', existing.id)
      : await supabase.from('department_memberships').insert(values);
    if (result.error) throw result.error;
    msg('Department access assigned.'); await loadMemberships(); await setupAdmin();
  } catch (error) { msg(error.message, true); } finally { button.disabled = false; }
}
init().catch(error => msg(error.message || 'Could not load department tracker.', true));
