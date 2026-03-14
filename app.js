/* ===========================
   app.js — ReliefNet Logic
   =========================== */

// ======= DATA STORE =======
const store = {
  camps: [
    { id:1, name:'Camp Alpha', district:'District 3', capacity:350, occupied:280, contact:'Rajan Iyer', status:'active', needs:['Food','Medicine'], zone:'critical' },
    { id:2, name:'Camp Beta',  district:'District 7', capacity:200, occupied:110, contact:'Priya Shah',  status:'active', needs:['Water','Clothes'],  zone:'moderate' },
    { id:3, name:'Camp Gamma', district:'District 11',capacity:500, occupied:490, contact:'Arjun Mehta', status:'full',   needs:['Food','Water','Medicine'], zone:'critical' },
    { id:4, name:'Camp Delta', district:'District 2', capacity:150, occupied:60,  contact:'Kavya Nair',  status:'active', needs:['Blankets'],  zone:'moderate' },
    { id:5, name:'Camp Echo',  district:'District 14',capacity:300, occupied:95,  contact:'Vikram Das',  status:'active', needs:[],            zone:'stable' },
  ],
  requests: [
    { id:1, location:'Sector 4, Chennai',   pin:'600001', type:'Food',     people:45, urgency:'critical', status:'pending',   time:'2m ago' },
    { id:2, location:'Anna Nagar, Chennai', pin:'600040', type:'Water',    people:120, urgency:'critical', status:'pending',  time:'5m ago' },
    { id:3, location:'Guindy, Chennai',     pin:'600032', type:'Medicine', people:28,  urgency:'critical', status:'pending',  time:'9m ago' },
    { id:4, location:'T Nagar, Chennai',    pin:'600017', type:'Clothes',  people:80,  urgency:'moderate', status:'pending',  time:'18m ago' },
    { id:5, location:'Velachery, Chennai',  pin:'600042', type:'Food',     people:35,  urgency:'moderate', status:'fulfilled',time:'32m ago' },
    { id:6, location:'Tambaram, Chennai',   pin:'600045', type:'Shelter',  people:60,  urgency:'low',      status:'pending',  time:'47m ago' },
  ],
  donors: [
    { id:1, name:'Aid India Trust',    phone:'+91 9800000001', resource:'Food',      contributions:12 },
    { id:2, name:'WaterFirst NGO',     phone:'+91 9800000002', resource:'Water',     contributions:8  },
    { id:3, name:'MediHelp Foundation',phone:'+91 9800000003', resource:'Medicine',  contributions:5  },
    { id:4, name:'Relief Corps',       phone:'+91 9800000004', resource:'Clothes',   contributions:20 },
    { id:5, name:'Suresh Kumar',       phone:'+91 9800000005', resource:'Funds',     contributions:3  },
    { id:6, name:'Chennai Gives',      phone:'+91 9800000006', resource:'Food',      contributions:9  },
  ],
  volunteers: [
    { id:1, name:'Ananya Roy',    phone:'+91 9700000001', skill:'Delivery',        status:'available', camp:'Camp Alpha' },
    { id:2, name:'Rahul Singh',   phone:'+91 9700000002', skill:'Medical',         status:'deployed',  camp:'Camp Gamma' },
    { id:3, name:'Deepa Menon',   phone:'+91 9700000003', skill:'Logistics',       status:'available', camp:'Camp Beta'  },
    { id:4, name:'Kartik Pillai', phone:'+91 9700000004', skill:'Communication',   status:'available', camp:'Camp Delta' },
    { id:5, name:'Sonia Arora',   phone:'+91 9700000005', skill:'Search & Rescue', status:'deployed',  camp:'Camp Alpha' },
    { id:6, name:'Mohan Krishnan',phone:'+91 9700000006', skill:'Delivery',        status:'available', camp:'Camp Echo'  },
  ],
  activity: [
    { text:'Donation: 200 food packets received at Camp Alpha', color:'green',  time:'2m ago' },
    { text:'New request: Water · 120 people · Anna Nagar',      color:'red',    time:'5m ago' },
    { text:'Volunteer Rahul Singh deployed to Camp Gamma',       color:'amber',  time:'12m ago'},
    { text:'Camp Echo updated needs — Shelter required',         color:'amber',  time:'25m ago'},
    { text:'SMS received: HELP FOOD 5 PEOPLE LOCATION 600001',  color:'gray',   time:'29m ago'},
    { text:'Request #5 fulfilled — Velachery Food aid delivered',color:'green',  time:'45m ago'},
  ],
  smsLog: [],
};

// Track SMS-parsed requests
let smsParsed = [
  { type:'Food',  people:5,  pin:'600001', time:'29m ago' },
  { type:'Water', people:12, pin:'600032', time:'18m ago' },
];

// ======= NAVIGATION =======
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ======= MODAL =======
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ======= TOAST =======
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ======= RENDER DASHBOARD =======
function renderDashboard() {
  // Stats
  document.getElementById('statCamps').textContent = store.camps.filter(c => c.status === 'active').length;
  document.getElementById('statRequests').textContent = store.requests.filter(r => r.status === 'pending').length;
  document.getElementById('statDonors').textContent = store.donors.length;
  document.getElementById('statVolunteers').textContent = store.volunteers.length;

  // Priority list
  const pl = document.getElementById('priorityList');
  const sorted = [...store.requests]
    .filter(r => r.status === 'pending')
    .sort((a, b) => {
      const rank = { critical: 0, moderate: 1, low: 2 };
      return rank[a.urgency] - rank[b.urgency] || b.people - a.people;
    })
    .slice(0, 5);

  pl.innerHTML = sorted.map(r => `
    <div class="req-item">
      <span class="req-badge ${r.urgency}">${r.urgency}</span>
      <div>
        <div class="req-title">${r.type} · ${r.people} people</div>
        <div class="req-meta">${r.location} · ${r.pin}</div>
      </div>
    </div>
  `).join('');

  // Activity
  const al = document.getElementById('activityList');
  al.innerHTML = store.activity.map(a => `
    <div class="activity-item">
      <span class="activity-dot ${a.color}"></span>
      <span>${a.text}</span>
      <span class="activity-time">${a.time}</span>
    </div>
  `).join('');
}

// ======= MAP TOOLTIP =======
function showZoneInfo(name) {
  const tip = document.getElementById('mapTooltip');
  tip.textContent = name;
  tip.style.display = 'block';
  clearTimeout(tip._t);
  tip._t = setTimeout(() => { tip.style.display = 'none'; }, 2500);
}

// ======= RENDER CAMPS =======
function renderCamps(filter = '') {
  const grid = document.getElementById('campsGrid');
  const data = filter
    ? store.camps.filter(c =>
        c.name.toLowerCase().includes(filter) ||
        c.district.toLowerCase().includes(filter)
      )
    : store.camps;

  grid.innerHTML = data.map(c => {
    const pct = Math.round((c.occupied / c.capacity) * 100);
    const barClass = pct >= 90 ? 'red' : pct >= 70 ? 'amber' : '';
    const needs = c.needs.length
      ? c.needs.map(n => `<span class="need-tag ${['Food','Water','Medicine'].includes(n) ? 'urgent' : ''}">${n}</span>`).join('')
      : `<span class="need-tag">No urgent needs</span>`;

    return `
      <div class="camp-card">
        <div class="camp-name">${c.name}</div>
        <div class="camp-district">${c.district}</div>
        <div class="camp-stats">
          <div class="camp-stat">
            <div class="camp-stat-val">${c.occupied}</div>
            <div class="camp-stat-lbl">Occupied</div>
          </div>
          <div class="camp-stat">
            <div class="camp-stat-val">${c.capacity}</div>
            <div class="camp-stat-lbl">Capacity</div>
          </div>
          <div class="camp-stat">
            <div class="camp-stat-val">${pct}%</div>
            <div class="camp-stat-lbl">Full</div>
          </div>
        </div>
        <div class="capacity-bar">
          <div class="capacity-fill ${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="camp-needs">${needs}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-outline-green" onclick="showToast('Donating to ${c.name}...')">Donate</button>
          <button class="btn btn-sm btn-ghost" onclick="showToast('Contact: ${c.contact}')">Contact</button>
        </div>
      </div>
    `;
  }).join('') || '<p style="padding:20px;color:var(--text-3)">No camps found.</p>';
}

function filterCamps() {
  renderCamps(document.getElementById('campSearch').value.toLowerCase());
}

// ======= RENDER REQUESTS =======
let currentFilter = 'all';

function renderRequests(filter) {
  currentFilter = filter;
  const tbody = document.getElementById('requestsBody');
  const data = filter === 'all'
    ? store.requests
    : store.requests.filter(r => r.urgency === filter || r.status === filter);

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>
        <div style="font-weight:500">${r.location}</div>
        <div style="color:var(--text-3);font-size:.78rem">PIN ${r.pin}</div>
      </td>
      <td>${r.type}</td>
      <td>${r.people}</td>
      <td><span class="badge ${r.urgency}">${r.urgency}</span></td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>
        ${r.status === 'pending'
          ? `<button class="btn btn-sm btn-outline-green" onclick="fulfillRequest(${r.id})">Fulfil</button>`
          : `<span style="color:var(--text-3);font-size:.8rem">${r.time}</span>`
        }
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="padding:20px;color:var(--text-3)">No requests.</td></tr>';
}

function filterRequests(f, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRequests(f);
}

function fulfillRequest(id) {
  const req = store.requests.find(r => r.id === id);
  if (req) {
    req.status = 'fulfilled';
    store.activity.unshift({ text:`Request #${id} fulfilled — ${req.type} aid to ${req.location}`, color:'green', time:'just now' });
    renderRequests(currentFilter);
    renderDashboard();
    showToast('Request marked as fulfilled ✓');
  }
}

// ======= RENDER DONORS =======
function renderDonors() {
  const grid = document.getElementById('donorsGrid');
  grid.innerHTML = store.donors.map(d => `
    <div class="donor-card">
      <div class="donor-avatar">${d.name.charAt(0)}</div>
      <div>
        <div class="donor-name">${d.name}</div>
        <span class="donor-resource">${d.resource}</span>
        <div class="donor-phone">${d.phone}</div>
      </div>
    </div>
  `).join('');
}

// ======= RENDER VOLUNTEERS =======
function renderVolunteers() {
  const grid = document.getElementById('volunteersGrid');
  grid.innerHTML = store.volunteers.map(v => `
    <div class="vol-card">
      <div class="vol-header">
        <div class="vol-avatar">${v.name.charAt(0)}</div>
        <div>
          <div class="vol-name">${v.name}</div>
          <span class="vol-skill">${v.skill}</span>
        </div>
        <span class="vol-status-badge ${v.status}">${v.status}</span>
      </div>
      <div class="vol-meta">
        <span>${v.camp}</span>
        <span>·</span>
        <span>${v.phone}</span>
      </div>
    </div>
  `).join('');
}

// ======= SMS GATEWAY =======
function renderSMSParsed() {
  const list = document.getElementById('smsParsedList');
  list.innerHTML = smsParsed.map(s => `
    <div class="req-item">
      <span class="req-badge moderate">SMS</span>
      <div>
        <div class="req-title">${s.type} · ${s.people} people</div>
        <div class="req-meta">PIN ${s.pin} · ${s.time}</div>
      </div>
    </div>
  `).join('') || '<p style="padding:12px;color:var(--text-3)">No SMS parsed yet.</p>';
}

function sendSMS() {
  const input = document.getElementById('smsInput');
  const raw = input.value.trim().toUpperCase();
  if (!raw) return;

  const terminal = document.getElementById('smsTerminal');
  const received = document.createElement('div');
  received.className = 'sms-line received';
  received.textContent = '← ' + raw;
  terminal.appendChild(received);

  // Parse: HELP [TYPE] [NUM] PEOPLE LOCATION [PIN]
  const match = raw.match(/HELP\s+(\w+)\s+(\d+)\s+PEOPLE\s+LOCATION\s+(\d+)/);
  const resp = document.createElement('div');

  if (match) {
    const [, type, people, pin] = match;
    const typeNorm = type.charAt(0) + type.slice(1).toLowerCase();
    resp.className = 'sms-line system';
    resp.textContent = `OK Parsed: ${typeNorm} · ${people} people · PIN ${pin} · Added to queue`;

    // Add to store
    const newId = store.requests.length + 1;
    store.requests.push({
      id: newId, location:`PIN ${pin}`, pin, type: typeNorm,
      people: parseInt(people), urgency:'moderate', status:'pending', time:'just now'
    });
    smsParsed.unshift({ type: typeNorm, people, pin, time: 'just now' });

    // Duplicate check
    const samePin = store.requests.filter(r => r.pin === pin);
    if (samePin.length > 1) {
      const warn = document.createElement('div');
      warn.className = 'sms-line error';
      warn.textContent = `WARN Duplicate PIN ${pin} detected — request flagged for review`;
      terminal.appendChild(resp);
      terminal.appendChild(warn);
    } else {
      terminal.appendChild(resp);
    }

    store.activity.unshift({ text:`SMS received: ${raw}`, color:'gray', time:'just now' });
    renderDashboard();
    renderRequests(currentFilter);
    renderSMSParsed();
    showToast('SMS parsed and added to queue ✓');
  } else {
    resp.className = 'sms-line error';
    resp.textContent = `ERR Invalid format. Use: HELP [TYPE] [NUM] PEOPLE LOCATION [PIN]`;
    terminal.appendChild(resp);
  }

  terminal.scrollTop = terminal.scrollHeight;
  input.value = '';
}

// Allow Enter key in SMS input
document.getElementById('smsInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendSMS();
});

// ======= FORM SUBMISSIONS =======
function submitNeedRequest(e) {
  e.preventDefault();
  const location = document.getElementById('needLocation').value;
  const pin = document.getElementById('needPin').value;
  const type = document.getElementById('needType').value;
  const people = parseInt(document.getElementById('needPeople').value);
  const urgency = document.querySelector('input[name=urgency]:checked').value;

  // Duplicate PIN check
  const dup = store.requests.find(r => r.pin === pin && r.status === 'pending');
  if (dup) {
    showToast(`⚠ A pending request already exists for PIN ${pin}`);
    closeModal('reportNeedModal');
    e.target.reset();
    return;
  }

  const newId = store.requests.length + 1;
  store.requests.push({ id:newId, location, pin, type, people, urgency, status:'pending', time:'just now' });
  store.activity.unshift({ text:`New request: ${type} · ${people} people · ${location}`, color: urgency === 'critical' ? 'red' : 'amber', time:'just now' });

  closeModal('reportNeedModal');
  e.target.reset();
  renderDashboard();
  renderRequests(currentFilter);
  showToast('Need request submitted ✓');
}

function submitCamp(e) {
  e.preventDefault();
  const name     = document.getElementById('campName').value;
  const district = document.getElementById('campDistrict').value;
  const capacity = parseInt(document.getElementById('campCapacity').value);
  const contact  = document.getElementById('campContact').value;

  store.camps.push({ id: store.camps.length+1, name, district, capacity, occupied:0, contact, status:'active', needs:[], zone:'stable' });
  store.activity.unshift({ text:`Camp registered: ${name} · ${district}`, color:'green', time:'just now' });
  closeModal('addCampModal');
  e.target.reset();
  renderCamps();
  renderDashboard();

  // Update donation select
  const sel = document.getElementById('donateCamp');
  const opt = document.createElement('option');
  opt.textContent = `${name} · ${district}`;
  sel.appendChild(opt);

  showToast(`${name} registered successfully ✓`);
}

function submitDonor(e) {
  e.preventDefault();
  const name     = document.getElementById('donorName').value;
  const phone    = document.getElementById('donorPhone').value;
  const resource = document.getElementById('donorResource').value;

  store.donors.push({ id: store.donors.length+1, name, phone, resource, contributions:0 });
  store.activity.unshift({ text:`Donor registered: ${name} (${resource})`, color:'green', time:'just now' });
  closeModal('addDonorModal');
  e.target.reset();
  renderDonors();
  renderDashboard();
  showToast(`${name} registered as donor ✓`);
}

function submitVolunteer(e) {
  e.preventDefault();
  const name  = document.getElementById('volName').value;
  const phone = document.getElementById('volPhone').value;
  const skill = document.getElementById('volSkill').value;

  store.volunteers.push({ id: store.volunteers.length+1, name, phone, skill, status:'available', camp:'Unassigned' });
  store.activity.unshift({ text:`Volunteer registered: ${name} · ${skill}`, color:'green', time:'just now' });
  closeModal('addVolunteerModal');
  e.target.reset();
  renderVolunteers();
  renderDashboard();
  showToast(`${name} registered as volunteer ✓`);
}

function submitDonation(e) {
  e.preventDefault();
  const camp = document.getElementById('donateCamp').value;
  const type = document.getElementById('donateType').value;
  const qty  = document.getElementById('donateQty').value;

  if (!camp || !qty) { showToast('Please fill all fields'); return; }

  store.activity.unshift({ text:`Donation: ${qty} ${type} → ${camp}`, color:'green', time:'just now' });
  renderDashboard();
  e.target.reset();
  showToast(`Donation of ${qty} ${type} confirmed for ${camp} ✓`);
}

// ======= INIT =======
function init() {
  renderDashboard();
  renderCamps();
  renderRequests('all');
  renderDonors();
  renderVolunteers();
  renderSMSParsed();
}

init();
