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

document.querySelectorAll('.nav').forEach(b => {
  b.onclick = async () => {
    document.querySelectorAll('.nav').forEach(x =>
      x.classList.remove('active')
    );

    b.classList.add('active');

    document.querySelectorAll('.page').forEach(p =>
      p.hidden = true
    );

  $(b.dataset.page).hidden = false;
$('pageTitle').textContent = b.textContent.trim();

if (b.dataset.page === 'programs' || b.dataset.page === 'students') {
  await loadPrograms();
}
  };
});
async function loadStudents(){const {data,error}=await client.from('students').select('*').order('student_code');if(error){alert(error.message);return}students=data||[];renderStudents()}


// Student search, programme filtering, editing and deleting
function renderStudents() {

  if (!$('studentSearch')) {
    $('studentsRows').insertAdjacentHTML(
      'beforebegin',
      '<input id="studentSearch" type="text" placeholder="Search by student name, ID, semester or program..." style="width:100%;padding:12px;margin-bottom:12px;">'
    );

    $('studentSearch').addEventListener('input', renderStudents);
  }

  const term = $('studentSearch').value.toLowerCase();
  const selectedProgram = $('programFilter').value;

  const filtered = students.filter(s => {
    const matchesSearch = [
      s.full_name,
      s.student_code,
      s.class_name,
      s.program
    ].some(value =>
      String(value || '').toLowerCase().includes(term)
    );

    const matchesProgram =
      !selectedProgram || String(s.program_id) === selectedProgram;

    return matchesSearch && matchesProgram;
  });

  $('studentsRows').innerHTML = filtered.map(s => `
    <tr>
      <td>${esc(s.student_code)}</td>
      <td>${esc(s.full_name)}</td>
      <td>${esc(s.class_name || '—')}</td>
      <td>${esc(s.program || '—')}</td>
      <td>
        <button data-edit="${s.id}">Edit</button>
        <button class="danger" data-del="${s.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  // Edit student
  document.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = async () => {
      const student = students.find(s => s.id == b.dataset.edit);
      if (!student) return;

      const name = prompt('Enter student full name:', student.full_name);
      if (name === null) return;

      const code = prompt('Enter student ID:', student.student_code);
      if (code === null) return;

      const semester = prompt('Enter semester:', student.class_name || '');
      if (semester === null) return;

      const program = prompt('Enter program:', student.program || '');
      if (program === null) return;

      const { error } = await client.from('students')
        .update({
          full_name: name.trim(),
          student_code: code.trim(),
          class_name: semester.trim(),
          program: program.trim()
        })
        .eq('id', student.id);

      if (error) {
        alert(error.message);
      } else {
        alert('Student updated successfully!');
        await loadStudents();
        await loadDashboard();
        await renderAttendance();
      }
    };
  });

  // Delete student
  document.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = async () => {
      if (confirm('Delete this student and their attendance records?')) {
        const { error } = await client.from('students')
          .delete()
          .eq('id', b.dataset.del);

        if (error) {
          alert(error.message);
        } else {
          await loadStudents();
          await loadDashboard();
          await renderAttendance();
        }
      }
    };
  });
}

// Update list when programme changes
$('programFilter').addEventListener('change', renderStudents);

 // Open and close student registration form
$('addStudentBtn').onclick = () => {
  $('studentFormWrap').hidden = false;
};

$('cancelStudent').onclick = () => {
  $('studentFormWrap').hidden = true;
};


 // Register a new student
$('studentForm').onsubmit = async e => {
  e.preventDefault();

  const programSelect = $('studentProgram');
  const programId = programSelect.value;

  if (!programId) {
    alert('Please select a programme.');
    return;
  }

  const programName =
    programSelect.options[programSelect.selectedIndex].text;

  const row = {
    full_name: $('studentName').value.trim(),
    student_code: $('studentCode').value.trim(),
    class_name: $('studentClass').value.trim(),
    program: programName,
    program_id: Number(programId)
  };

  const { error } = await client
    .from('students')
    .insert(row);

  if (error) {
    alert(error.message);
    return;
  }

  alert('Student registered successfully!');

  e.target.reset();
  $('studentFormWrap').hidden = true;

  await loadStudents();
  await loadDashboard();
  await renderAttendance();
  await loadPrograms();
};


// Load university programmes from Supabase
async function loadPrograms() {
  const { data, error } = await client
    .from('programs')
    .select('*')
    .order('program_name');

  if (error) {
    alert(error.message);
    return;
  }

  // Fill the student registration dropdown
  $('studentProgram').innerHTML =
    '<option value="">Select Programme</option>' +
    (data || []).map(program => `
      <option value="${program.id}">
        ${esc(program.program_name)}
      </option>
    `).join('');

  // Fill the programme filter dropdown
  $('programFilter').innerHTML =
    '<option value="">All Programmes</option>' +
    (data || []).map(program => `
      <option value="${program.id}">
        ${esc(program.program_name)}
      </option>
    `).join('');
  

  // Count students in each programme
  const { data: studentData, error: studentError } = await client
    .from('students')
    .select('program_id');

  if (studentError) {
    alert(studentError.message);
    return;
  }

  const counts = {};

  (studentData || []).forEach(student => {
    if (student.program_id) {
      counts[student.program_id] =
        (counts[student.program_id] || 0) + 1;
    }
  });

  $('programsRows').innerHTML = (data || []).map((program, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${esc(program.program_name)}</td>
      <td>${counts[program.id] || 0}</td>
    </tr>
  `).join('');
  // Display programme summary on Dashboard
  $('programmeSummary').innerHTML = (data || []).map(program => `
    <div style="padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;">
      <strong>${esc(program.program_name)}</strong>
      <span style="float:right;font-weight:bold;">
        ${counts[program.id] || 0} Students
      </span>
    </div>
  `).join('');
}
// Get attendance records for a selected date
async function getDayRecords(date) {
  const { data, error } = await client
    .from('attendance')
    .select('*,students(full_name,student_code,class_name)')
    .eq('attendance_date', date);

  if (error) {
    alert(error.message);
    return [];
  }

  return data || [];
}

// Load dashboard information
async function loadDashboard() {
  const { count, error } = await client
    .from('students')
    .select('*', { count: 'exact', head: true });

  if (error) return;

  const records = await getDayRecords(today());

  const present = records.filter(
    r => r.status === 'Present' || r.status === 'Late'
  ).length;

  const absent = records.filter(
    r => r.status === 'Absent'
  ).length;

  $('totalStudents').textContent = count || 0;
  $('presentToday').textContent = present;
  $('absentToday').textContent = absent;

  $('rateToday').textContent = records.length
    ? Math.round(present / records.length * 100) + '%'
    : '0%';

  $('todaySummary').innerHTML = records.length
    ? `<p><b>${records.length}</b> records · ${present} present/late · ${absent} absent · ${records.filter(r => r.status === 'Excused').length} excused</p>`
    : 'No attendance records for today yet.';
}


 // Display and save student attendance
async function renderAttendance() {
  const date = $('attendanceDate').value || today();
  const list = $('attendanceList');

  if (!students.length) {
    list.innerHTML = 'Add students first to record attendance.';
    return;
  }

  const records = await getDayRecords(date);
  const saved = {};

  records.forEach(record => {
    saved[record.student_id] = record.status;
  });

  const statuses = ['Present', 'Absent', 'Late', 'Excused'];

  list.innerHTML = students.map(student => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #ddd;">
      <div>
        <strong>${esc(student.full_name)}</strong>
        <small style="display:block;">${esc(student.student_code)}</small>
      </div>

      <select data-attendance-student="${student.id}">
        ${statuses.map(status => `
          <option value="${status}"
            ${saved[student.id] === status ? 'selected' : ''}>
            ${status}
          </option>
        `).join('')}
      </select>
    </div>
  `).join('');

  $('attendanceDate').onchange = renderAttendance;

  $('saveAttendance').onclick = async () => {
    const selects = list.querySelectorAll('[data-attendance-student]');

    const rows = Array.from(selects).map(select => ({
      student_id: select.dataset.attendanceStudent,
      attendance_date: $('attendanceDate').value,
      status: select.value
    }));

    const { error } = await client
      .from('attendance')
      .upsert(rows, {
        onConflict: 'student_id,attendance_date'
      });

    if (error) {
      $('recordMsg').textContent = error.message;
      return;
    }

    $('recordMsg').textContent = 'Attendance saved successfully!';

    await loadDashboard();
    await renderWeeklyAttendance();
  };
}


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



// Update list when programme changes
$('programFilter').addEventListener('change', renderStudents);


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
    <h3 style="color:#6b21a8;">Attendance Statistics</h3>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:15px 0;">

      <div style="background:#dcfce7;padding:18px;border-radius:12px;">
        <p style="color:#166534;">Present</p>
        <h2 style="color:#15803d;">${present}</h2>
      </div>

      <div style="background:#fee2e2;padding:18px;border-radius:12px;">
        <p style="color:#991b1b;">Absent</p>
        <h2 style="color:#dc2626;">${absent}</h2>
      </div>

      <div style="background:#ffedd5;padding:18px;border-radius:12px;">
        <p style="color:#9a3412;">Late</p>
        <h2 style="color:#ea580c;">${late}</h2>
      </div>

      <div style="background:#f3e8ff;padding:18px;border-radius:12px;">
        <p style="color:#6b21a8;">Excused</p>
        <h2 style="color:#9333ea;">${excused}</h2>
      </div>

    </div>

    <div style="background:#f5f3ff;padding:18px;border-radius:12px;margin:15px 0;">
      <p><b>Attendance rate: ${rate}%</b></p>
      <div style="height:12px;background:#ddd6fe;border-radius:10px;overflow:hidden;">
        <div style="height:100%;width:${rate}%;background:#7e22ce;"></div>
      </div>
      <p>Total records: ${data.length}</p>
    </div>

    <h3 style="color:#6b21a8;">Attendance History</h3>

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
