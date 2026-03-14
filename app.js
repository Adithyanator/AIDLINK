/* ===========================
   app.js — AIDLink Logic
   =========================== */


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

// Helper: Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

let map;
function initMap() {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported.");
    renderDashboardMap(13.0827, 80.2707, store.camps, false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const defaultLat = 13.0827; 
      const defaultLng = 80.2707;
      
      const offsetLat = userLat - defaultLat;
      const offsetLng = userLng - defaultLng;

      // Translate camps to the user's location for the demo
      const shiftedCamps = store.camps.map(c => ({
        ...c,
        lat: c.lat + offsetLat,
        lng: c.lng + offsetLng
      }));

      renderDashboardMap(userLat, userLng, shiftedCamps, true, userLat, userLng);
    },
    (error) => {
      console.warn("Geolocation failed/denied.", error);
      renderDashboardMap(13.0827, 80.2707, store.camps, false);
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

function renderDashboardMap(centerLat, centerLng, campsToRender, hasUserLocation = false, userLat = null, userLng = null) {
  if (map) map.remove(); // allow re-initialization if needed
  map = L.map('map').setView([centerLat, centerLng], 12);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  const bounds = L.latLngBounds();

  if (hasUserLocation) {
    const userIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div class="marker-user"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<strong>Ward Member (You)</strong>');
    bounds.extend([userLat, userLng]);
  }

  campsToRender.forEach(c => {
    let colorHex = '#4c9964'; // stable
    if (c.zone === 'critical') colorHex = '#dc3535';
    if (c.zone === 'moderate') colorHex = '#ffa000';

    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="camp-marker-serious">
          <div class="marker-pulse" style="background-color: ${colorHex}"></div>
          <svg class="marker-icon" width="28" height="32" viewBox="0 0 24 24" fill="${colorHex}" stroke="#fff" stroke-width="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v8M8 12h8" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      `,
      iconSize: [28, 32],
      iconAnchor: [14, 16]
    });

    bounds.extend([c.lat, c.lng]);

    L.marker([c.lat, c.lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<strong>${c.name}</strong><br>${c.district}<br>Status: ${c.status}<br>Capacity: ${c.occupied}/${c.capacity} (${Math.round(c.occupied/c.capacity*100)}%)`);
  });

  if (campsToRender.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }

  // Add Locate Me control if user location is known
  if (hasUserLocation) {
    const LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.backgroundColor = '#fff';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.cursor = 'pointer';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.title = 'Focus on my location';
        container.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`;
        container.onclick = function(e) {
          e.stopPropagation();
          map.setView([userLat, userLng], 14, { animate: true });
        }
        return container;
      }
    });
    map.addControl(new LocateControl());
  }

  // Add Legend
  const LegendControl = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function () {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <div class="legend-title">Legend</div>
        <div class="legend-item"><span class="legend-dot" style="background:#dc3535"></span> Critical</div>
        <div class="legend-item"><span class="legend-dot" style="background:#ffa000"></span> Moderate</div>
        <div class="legend-item"><span class="legend-dot" style="background:#4c9964"></span> Stable</div>
        <div class="legend-item"><span class="legend-dot" style="background:#4285F4"></span> You</div>
      `;
      return div;
    }
  });
  map.addControl(new LegendControl());
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
    const urgentTypes = ['Food','Water','Medicine'];

    const needTags = c.needs.length
      ? c.needs.map(n => `
          <span class="need-tag ${urgentTypes.includes(n) ? 'urgent' : ''}">
            ${n}
            <button class="need-remove-btn" onclick="fulfillNeedInline(${c.id}, '${n}')" title="Mark as fulfilled">&#10005;</button>
          </span>`).join('')
      : `<span class="need-tag" style="color:var(--text-3)">No current needs</span>`;

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
        <div class="camp-needs-label">Current Needs</div>
        <div class="camp-needs">${needTags}</div>
        <div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="openAddNeed(${c.id}, '${c.name}')">+ Add Need</button>
          <button class="btn btn-sm btn-outline-green" onclick="openFulfillNeed(${c.id}, '${c.name}')">Fulfill Need</button>
          <button class="btn btn-sm btn-ghost" onclick="showToast('Contact: ${c.contact}')">Contact</button>
        </div>
      </div>
    `;
  }).join('') || '<p style="padding:20px;color:var(--text-3)">No camps found.</p>';
}

function filterCamps() {
  renderCamps(document.getElementById('campSearch').value.toLowerCase());
}

// ======= CAMP NEEDS MANAGEMENT =======

function openAddNeed(campId, campName) {
  document.getElementById('addNeedCampId').value = campId;
  document.getElementById('addNeedModalTitle').textContent = `Add Need — ${campName}`;
  document.querySelector('input[name="needPriority"][value="urgent"]').checked = true;
  openModal('addNeedModal');
}

function submitAddNeed(e) {
  e.preventDefault();
  const campId = parseInt(document.getElementById('addNeedCampId').value);
  const type   = document.getElementById('addNeedType').value;
  const priority = document.querySelector('input[name="needPriority"]:checked').value;
  const camp   = store.camps.find(c => c.id === campId);
  if (!camp) return;

  if (camp.needs.includes(type)) {
    showToast(`${type} is already listed as a need for ${camp.name}`);
    closeModal('addNeedModal');
    return;
  }

  if (priority === 'urgent') {
    camp.needs.unshift(type); // urgent needs go to front
  } else {
    camp.needs.push(type);
  }

  store.activity.unshift({ text:`${camp.name} added need: ${type} (${priority})`, color:'amber', time:'just now' });
  closeModal('addNeedModal');
  e.target.reset();
  renderCamps(document.getElementById('campSearch').value.toLowerCase());
  renderDashboard();
  showToast(`${type} added to ${camp.name}'s needs ✓`);
}

function fulfillNeedInline(campId, needType) {
  const camp = store.camps.find(c => c.id === campId);
  if (!camp) return;
  camp.needs = camp.needs.filter(n => n !== needType);
  store.activity.unshift({ text:`${camp.name}: ${needType} need fulfilled`, color:'green', time:'just now' });
  renderCamps(document.getElementById('campSearch').value.toLowerCase());
  renderDashboard();
  showToast(`${needType} marked as fulfilled for ${camp.name} ✓`);
}

function openFulfillNeed(campId, campName) {
  const camp = store.camps.find(c => c.id === campId);
  if (!camp) return;

  document.getElementById('fulfillNeedModalTitle').textContent = `Fulfill a Need — ${campName}`;
  const body = document.getElementById('fulfillNeedBody');

  if (!camp.needs.length) {
    body.innerHTML = `<p style="color:var(--text-3);font-size:.875rem;padding:4px 0 16px">This camp has no current needs listed.</p>
      <div style="display:flex;justify-content:flex-end"><button class="btn btn-ghost btn-sm" onclick="closeModal('fulfillNeedModal')">Close</button></div>`;
  } else {
    body.innerHTML = `
      <p style="color:var(--text-2);font-size:.83rem;margin-bottom:14px">Select a need that has been supplied:</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${camp.needs.map(n => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:8px">
            <span style="font-weight:500;font-size:.9rem">${n}</span>
            <button class="btn btn-sm btn-outline-green" onclick="fulfillNeedInline(${campId},'${n}');closeModal('fulfillNeedModal')">Mark Fulfilled</button>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-ghost btn-sm" onclick="closeModal('fulfillNeedModal')">Cancel</button>
      </div>`;
  }
  openModal('fulfillNeedModal');
}


// ======= RENDER PLEDGES =======
function renderPledges() {
  const list = document.getElementById('pledgesList');
  const pendingOnes = store.donations.filter(d => d.status === 'pending');
  
  if (pendingOnes.length === 0) {
    list.innerHTML = '<p style="padding:1.5rem;text-align:center;color:var(--text-3);background:var(--bg);border-radius:12px;border:1px dashed var(--border)">No pending donation pledges at the moment.</p>';
    return;
  }

  list.innerHTML = pendingOnes.map(d => `
    <div class="card" style="margin-bottom:1rem; border-left: 4px solid var(--amber)">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:1.25rem">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
            <span class="req-badge moderate">PLEDGE</span>
            <strong style="font-size:1rem">${d.resource} </strong>
          </div>
          <div style="font-size:.9rem; color:var(--text-2); margin-bottom:8px">
            <strong>${d.qty}</strong> for <strong>${d.campName}</strong>
          </div>
          <div style="font-size:.85rem; color:var(--text-3)">
            From: ${d.name} (${d.phone}) · ${d.time}
          </div>
          ${d.notes ? `<div style="margin-top:8px; font-style:italic; font-size:.85rem; color:var(--text-2); background:f9f9f9; padding:6px; border-radius:4px">" ${d.notes} "</div>` : ''}
        </div>
        <div style="display:flex; gap:8px">
          <button class="btn btn-outline" style="padding:6px 12px; font-size:.85rem; border-color:#dc3535; color:#dc3535" onclick="handleDonationAction('${d.id}', 'decline')">Decline</button>
          <button class="btn btn-primary" style="padding:6px 12px; font-size:.85rem" onclick="handleDonationAction('${d.id}', 'accept')">Accept</button>
        </div>
      </div>
    </div>
  `).join('');
}

let activeDonationId = null;
let activeDonationAction = null;

function handleDonationAction(id, action) {
  activeDonationId = id;
  activeDonationAction = action;
  const donation = store.donations.find(d => d.id == id);
  if (!donation) return;

  const title = document.getElementById('donationActionTitle');
  const text = document.getElementById('donationActionText');
  const btn = document.getElementById('confirmDonationBtn');

  if (action === 'accept') {
    title.textContent = 'Accept Resource Pledge?';
    title.style.color = 'var(--green)';
    text.textContent = `Are you sure you want to accept ${donation.qty} of ${donation.resource} for ${donation.campName}? This will update the camp needs automatically.`;
    btn.textContent = 'Accept Donation';
    btn.className = 'btn btn-primary';
  } else {
    title.textContent = 'Decline Resource Pledge?';
    title.style.color = '#dc3535';
    text.textContent = `Are you sure you want to decline this donation from ${donation.name}?`;
    btn.textContent = 'Decline';
    btn.className = 'btn';
    btn.style.backgroundColor = '#dc3535';
    btn.style.color = '#fff';
  }

  openModal('donationActionModal');
}

document.getElementById('confirmDonationBtn').onclick = function() {
  const donation = store.donations.find(d => d.id == activeDonationId);
  if (!donation) return;

  if (activeDonationAction === 'accept') {
    donation.status = 'accepted';
    
    // 1. Sync Camp Needs
    const camp = store.camps.find(c => c.id == donation.campId);
    if (camp && camp.needs) {
      // Remove matching need (case insensitive)
      camp.needs = camp.needs.filter(n => n.toLowerCase() !== donation.resource.toLowerCase());
    }

    // 3. Activity Log
    store.activity.unshift({
      text: `Donation ACCEPTED: ${donation.qty} ${donation.resource} delivered to ${donation.campName}`,
      color: 'green',
      time: 'just now'
    });

    showToast(`Donation for ${donation.campName} accepted and camp needs updated ✓`);
  } else {
    donation.status = 'declined';
    store.activity.unshift({
      text: `Donation DECLINED: ${donation.qty} ${donation.resource} from ${donation.name}`,
      color: 'gray',
      time: 'just now'
    });
    showToast('Donation pledge declined.');
  }

  closeModal('donationActionModal');
  saveStore();
  renderDashboard();
};

// ======= STORAGE SYNC =======
window.addEventListener('storage', (e) => {
  if (e.key === 'aidlink_store') {
    store = JSON.parse(e.newValue);
    renderDashboard();
    renderDonors();
  }
});


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

function submitCamp(e) {
  e.preventDefault();
  const name     = document.getElementById('campName').value;
  const district = document.getElementById('campDistrict').value;
  const capacity = parseInt(document.getElementById('campCapacity').value);
  const contact  = document.getElementById('campContact').value;

  store.camps.push({ id: store.camps.length+1, name, district, capacity, occupied:0, contact, status:'active', needs:[], zone:'stable' });
  saveStore();
  renderDashboard();
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

// ======= INIT =======
function init() {
  renderDashboard();
  initMap();
  renderCamps();
  renderPledges();

  renderSMSParsed();
}

init();

// Sync data across tabs
window.addEventListener('storage', function(e) {
  if (e.key === 'aidlink_store') {
    store = JSON.parse(e.newValue);
    renderDashboard();
    renderCamps();
    renderPledges();
  }
});
