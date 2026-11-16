// Fill these two values from Supabase: Project Settings > API
const SUPABASE_URL = "https://jknunotwyultgevdnecj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kvxiC12zDPT5i160RKoToA_2eDyXf1U";
const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const client = configured ? window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY) : null;
const $=id=>document.getElementById(id);
let students=[], attendanceCache=[];
const today=()=>new Date().toLocaleDateString('en-CA');
$('attendanceDate').value=today();$('reportDate').value=today();
function notice(el,msg){$(el).textContent=msg}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!configured){notice('loginMsg','Setup required: add your Supabase URL and anon key in app.js.');return}
const {error}=await client.auth.signInWithPassword({email:$('email').value,password:$('password').value});notice('loginMsg',error?error.message:'');if(!error)await startApp()});
$('logout').onclick=async()=>{await client.auth.signOut();$('app').hidden=true;$('login').hidden=false};
async function startApp(){if(!configured)return;const {data:{session}}=await client.auth.getSession();if(!session){$('app').hidden=true;$('login').hidden=false;return}
$('login').hidden=true;$('app').hidden=false;$('userEmail').textContent=session.user.email;await loadStudents();await loadDashboard();await renderAttendance()}
client?.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(startApp,0)});
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(p=>p.hidden=true);$(b.dataset.page).hidden=false;$('pageTitle').textContent=b.textContent.trim()});
async function loadStudents(){const {data,error}=await client.from('students').select('*').order('student_code');if(error){alert(error.message);return}students=data||[];renderStudents()}
function renderStudents(){$('studentsRows').innerHTML=students.map(s=>`<tr><td>${esc(s.student_code)}</td><td>${esc(s.full_name)}</td><td>${esc(s.class_name||'—')}</td><td><button class="danger" data-del="${s.id}">Delete</button></td></tr>`).join('');document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this student and their attendance records?')){const {error}=await client.from('students').delete().eq('id',b.dataset.del);if(error)alert(error.message);else{await loadStudents();await loadDashboard();await renderAttendance()}}})}
$('addStudentBtn').onclick=()=>$('studentFormWrap').hidden=false;$('cancelStudent').onclick=()=>$('studentFormWrap').hidden=true;
$('studentForm').onsubmit=async e=>{e.preventDefault();const row={full_name:$('studentName').value.trim(),student_code:$('studentCode').value.trim(),class_name:$('studentClass').value.trim()};const {error}=await client.from('students').insert(row);if(error){alert(error.message);return}e.target.reset();$('studentFormWrap').hidden=true;await loadStudents();await loadDashboard();await renderAttendance()};
async function getDayRecords(date){const {data,error}=await client.from('attendance').select('*,students(full_name,student_code,class_name)').eq('attendance_date',date);if(error){alert(error.message);return[]}return data||[]}
async function renderAttendance(){const records=await getDayRecords($('attendanceDate').value);const byId=Object.fromEntries(records.map(r=>[r.student_id,r.status]));$('attendanceList').innerHTML=students.length?students.map(s=>`<div class="attendance-row"><div><span class="student">${esc(s.full_name)}</span><small>${esc(s.student_code)} · ${esc(s.class_name||'No class')}</small></div><select class="status-select" data-student="${s.id}"><option ${byId[s.id]==='Present'?'selected':''}>Present</option><option ${byId[s.id]==='Absent'?'selected':''}>Absent</option><option ${byId[s.id]==='Late'?'selected':''}>Late</option><option ${byId[s.id]==='Excused'?'selected':''}>Excused</option></select></div>`).join(''):'<div class="empty">Add students first to record attendance.</div>'}
$('attendanceDate').onchange=renderAttendance;
$('saveAttendance').onclick=async()=>{if(!students.length)return notice('recordMsg','Please add students first.');const date=$('attendanceDate').value;if(!date)return notice('recordMsg','Choose a date.');const rows=[...document.querySelectorAll('[data-student]')].map(sel=>({student_id:sel.dataset.student,attendance_date:date,status:sel.value}));const {error}=await client.from('attendance').upsert(rows,{onConflict:'student_id,attendance_date'});notice('recordMsg',error?error.message:'Attendance saved successfully.');if(!error)await loadDashboard()};
async function loadDashboard() {
  const { count, error } = await client
    .from('students')
    .select('*', { count: 'exact', head: true });

  if (error) {
    alert(error.message);
    return;
  }

  const records = await getDayRecords(today());

  const present = records.filter(r => r.status === 'Present').length;
  const late = records.filter(r => r.status === 'Late').length;
  const absent = records.filter(r => r.status === 'Absent').length;
  const excused = records.filter(r => r.status === 'Excused').length;

  const totalPresent = present + late;
  const rate = records.length
    ? Math.round(totalPresent / records.length * 100)
    : 0;

  $('totalStudents').textContent = count || 0;
  $('presentToday').textContent = totalPresent;
  $('absentToday').textContent = absent;
  $('rateToday').textContent = rate + '%';

  $('todaySummary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:15px;">
      <div class="panel">
        <h3>Present</h3>
        <h2>${present}</h2>
      </div>
      <div class="panel">
        <h3>Late</h3>
        <h2>${late}</h2>
      </div>
      <div class="panel">
        <h3>Absent</h3>
        <h2>${absent}</h2>
      </div>
      <div class="panel">
        <h3>Excused</h3>
        <h2>${excused}</h2>
      </div>
    </div>
    <p style="margin-top:20px;">
      Attendance rate: <b>${rate}%</b>
    </p>
    <div style="background:#e5e7eb;height:12px;border-radius:10px;overflow:hidden;">
      <div style="background:#16a34a;width:${rate}%;height:100%;"></div>
    </div>
  `;

  await renderWeeklyAttendance();
}

$('loadReport').onclick = async () => {
  const records = await getDayRecords($('reportDate').value);

  const schoolName = localStorage.getItem('schoolName') || 'School Name';
  const schoolAddress = localStorage.getItem('schoolAddress') || '';
  const schoolContact = localStorage.getItem('schoolContact') || '';

  $('reportContent').innerHTML = records.length
    ? `
      <div class="table-wrap">

        <div style="text-align:center;margin-bottom:20px;">
          <h2>${esc(schoolName)}</h2>
          <p>${esc(schoolAddress)}</p>
          <p>Contact: ${esc(schoolContact)}</p>
          <h3>ATTENDANCE REPORT</h3>
          <p>Date: ${esc($('reportDate').value)}</p>
          <hr>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Class</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${records.map(r => `
              <tr>
                <td>${esc(r.students?.student_code || '')}</td>
                <td>${esc(r.students?.full_name || '')}</td>
                <td>${esc(r.students?.class_name || '—')}</td>
                <td>${esc(r.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p><b>${records.length} attendance records</b></p>
      </div>
    `
    : '<div class="empty">No records for this date.</div>';
};

// Weekly attendance chart
async function renderWeeklyAttendance() {
  const container = $('weeklyChartContent');

  container.innerHTML = 'Loading weekly attendance...';

  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dateString =
      date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');

    const records = await getDayRecords(dateString);

    const present = records.filter(
      r => r.status === 'Present' || r.status === 'Late'
    ).length;

    const rate = records.length
      ? Math.round(present / records.length * 100)
      : 0;

    days.push({
      label: date.toLocaleDateString('en', { weekday: 'short' }),
      present,
      rate
    });
  }

  container.innerHTML = `
    <div style="display:flex;align-items:end;gap:12px;height:190px;padding:15px 5px 0;">
      ${days.map(day => `
        <div style="flex:1;text-align:center;">
          <div style="font-size:12px;margin-bottom:6px;">
            ${day.rate}%
          </div>
          <div style="height:130px;display:flex;align-items:end;">
            <div style="width:100%;height:${day.rate}%;min-height:${day.rate ? 4 : 0}px;background:#16a34a;border-radius:6px 6px 0 0;">
            </div>
          </div>
          <small>${day.label}</small>
        </div>
      `).join('')}
    </div>
    <p class="muted" style="margin-top:15px;">
      Daily attendance rate for the last 7 days.
    </p>
  `;
}

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// Export attendance report to CSV
$('loadReport').insertAdjacentHTML(
  'afterend',
  '<button id="exportReport">Export Report to Excel</button>'
);

$('exportReport').onclick = async () => {
  const date = $('reportDate').value;
  const records = await getDayRecords(date);

  if (!records.length) {
    alert('No attendance records to export.');
    return;
  }

  const csv = [
    ['Student ID', 'Name', 'Class', 'Status'],
    ...records.map(r => [
      r.students?.student_code || '',
      r.students?.full_name || '',
      r.students?.class_name || '',
      r.status
    ])
  ].map(row =>
    row.map(value =>
      '"' + String(value).replace(/"/g, '""') + '"'
    ).join(',')
  ).join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'attendance-report-' + date + '.csv';
  link.click();

  URL.revokeObjectURL(url);
};
// Student search feature
function renderStudents() {
  if (!$('studentSearch')) {
    $('studentsRows').insertAdjacentHTML(
      'beforebegin',
      '<input id="studentSearch" type="text" placeholder="Search by student name, ID or class..." style="width:100%;padding:12px;margin-bottom:12px;">'
    );
    $('studentSearch').addEventListener('input', renderStudents);
  }

  const term = $('studentSearch').value.toLowerCase();

  const filtered = students.filter(s =>
    [s.full_name, s.student_code, s.class_name]
      .some(value => String(value || '').toLowerCase().includes(term))
  );

  $('studentsRows').innerHTML = filtered.map(s =>
    `<tr>
      <td>${esc(s.student_code)}</td>
      <td>${esc(s.full_name)}</td>
      <td>${esc(s.class_name || '—')}</td>
      <td><button class="danger" data-del="${s.id}">Delete</button></td>
    </tr>`
  ).join('');

  document.querySelectorAll('[data-del]').forEach(b =>
    b.onclick = async () => {
      if (confirm('Delete this student and their attendance records?')) {
        const {error} = await client.from('students').delete().eq('id', b.dataset.del);
        if (error) alert(error.message);
        else {
          await loadStudents();
          await loadDashboard();
          await renderAttendance();
        }
      }
    }
  );
}
// Student attendance history
document.querySelector('[data-page="history"]')
  ?.addEventListener('click', showHistory);

function showHistory() {
  $('historyContent').innerHTML = `
    <div style="margin:15px 0;padding:15px;border:1px solid #ddd;border-radius:10px;">
      <label>Select Student</label>
      <select id="historyStudent" style="width:100%;padding:10px;">
        <option value="">Select a student</option>
        ${students.map(s => `
          <option value="${s.id}">
            ${esc(s.full_name)} (${esc(s.student_code)})
          </option>
        `).join('')}
      </select>

      <button id="loadHistory" style="margin-top:10px;">
        View History
      </button>

      <div id="historyResults" style="margin-top:15px;"></div>
    </div>
  `;

  $('loadHistory').onclick = async () => {
    const id = $('historyStudent').value;

    if (!id) return alert('Please select a student.');

    const {data, error} = await client
      .from('attendance')
      .select('attendance_date,status')
      .eq('student_id', id)
      .order('attendance_date', {ascending:false});

    if (error) return alert(error.message);

    const present = data.filter(r => r.status === 'Present').length;
    const late = data.filter(r => r.status === 'Late').length;
    const absent = data.filter(r => r.status === 'Absent').length;
    const excused = data.filter(r => r.status === 'Excused').length;

    const rate = data.length
      ? Math.round((present + late) / data.length * 100)
      : 0;

    $('historyResults').innerHTML = data.length
      ? `
        <h3>Attendance Statistics</h3>
        <p><b>Attendance rate:</b> ${rate}%</p>
        <p><b>Total records:</b> ${data.length}</p>
        <p>Present: ${present}</p>
        <p>Absent: ${absent}</p>
        <p>Late: ${late}</p>
        <p>Excused: ${excused}</p>

        <h4>Attendance History</h4>
        <table>
          <tr><th>Date</th><th>Status</th></tr>
          ${data.map(r => `
            <tr>
              <td>${esc(r.attendance_date)}</td>
              <td>${esc(r.status)}</td>
            </tr>
          `).join('')}
        </table>
      `
      : 'No attendance history found.';
  };
}

// School Information Settings
const settingsForm = $('settingsForm');
const savedSchoolInfo = $('savedSchoolInfo');
const editSchoolInfo = $('editSchoolInfo');

function displaySchoolInfo() {
  const name = localStorage.getItem('schoolName') || '';
  const address = localStorage.getItem('schoolAddress') || '';
  const contact = localStorage.getItem('schoolContact') || '';

  if (name) {
    savedSchoolInfo.innerHTML = `
      <div class="panel">
        <h3>${esc(name)}</h3>
        <p>${esc(address)}</p>
        <p>Contact: ${esc(contact)}</p>
      </div>
    `;

    savedSchoolInfo.hidden = false;
    settingsForm.hidden = true;
    editSchoolInfo.hidden = false;
  } else {
    savedSchoolInfo.hidden = true;
    settingsForm.hidden = false;
    editSchoolInfo.hidden = true;
  }
}

if (settingsForm) {
  displaySchoolInfo();

  settingsForm.onsubmit = function(e) {
    e.preventDefault();

    localStorage.setItem('schoolName', $('schoolName').value.trim());
    localStorage.setItem('schoolAddress', $('schoolAddress').value.trim());
    localStorage.setItem('schoolContact', $('schoolContact').value.trim());

    settingsForm.reset();

    $('settingsMsg').textContent =
      'School information saved successfully!';

    displaySchoolInfo();
  };

  editSchoolInfo.onclick = function() {
    $('schoolName').value = localStorage.getItem('schoolName') || '';
    $('schoolAddress').value = localStorage.getItem('schoolAddress') || '';
    $('schoolContact').value = localStorage.getItem('schoolContact') || '';

    settingsForm.hidden = false;
    savedSchoolInfo.hidden = true;
    editSchoolInfo.hidden = true;
    $('settingsMsg').textContent = '';
  };
}

// Application Settings
const appSettingsForm = $('appSettingsForm');

if (appSettingsForm) {
  $('academicYear').value =
    localStorage.getItem('academicYear') || '2026';

  $('attendanceSession').value =
    localStorage.getItem('attendanceSession') || 'Morning';

  $('defaultAttendance').value =
    localStorage.getItem('defaultAttendance') || 'Present';

  $('dateFormat').value =
    localStorage.getItem('dateFormat') || 'YYYY-MM-DD';

  appSettingsForm.onsubmit = function(e) {
    e.preventDefault();

    localStorage.setItem('academicYear', $('academicYear').value);
    localStorage.setItem('attendanceSession', $('attendanceSession').value);
    localStorage.setItem('defaultAttendance', $('defaultAttendance').value);
    localStorage.setItem('dateFormat', $('dateFormat').value);

    $('appSettingsMsg').textContent =
      'Application settings saved successfully!';
  };
}  

$('printReport').addEventListener('click', function() {
  window.print();
});
if(configured)startApp();
