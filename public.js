// Haversine distance formula (returns distance in km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

document.addEventListener('DOMContentLoaded', () => {
  const statusPanel = document.getElementById('statusPanel');
  const statusText = document.getElementById('statusText');
  const spinner = document.getElementById('spinner');
  const mapEl = document.getElementById('map');
  
  // Radius threshold to consider camps "nearby" (in kilometers)
  const MAX_RADIUS_KM = 50;

  if (!navigator.geolocation) {
    spinner.style.display = 'none';
    statusText.textContent = 'Geolocation is not supported by your browser. Please log in manually.';
    return;
  }

  // Request location
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      
      // Calculate distances to all active camps
      const nearbyCamps = store.camps
        .filter(c => c.status !== 'closed')
        .map(c => ({
          ...c,
          distance: getDistance(userLat, userLng, c.lat, c.lng)
        }))
        .filter(c => c.distance <= MAX_RADIUS_KM)
        .sort((a, b) => a.distance - b.distance);

      if (nearbyCamps.length === 0) {
        // User is too far away from default camps.
        // For the demo, we'll translate the camps to their location so it looks local.
        spinner.style.display = 'none';
        statusText.style.display = 'none';
        statusPanel.style.display = 'none';
        mapEl.style.display = 'block';
        
        const defaultLat = 13.0827; 
        const defaultLng = 80.2707;
        
        // Calculate the vector offset from the default center to the user's location
        const offsetLat = userLat - defaultLat;
        const offsetLng = userLng - defaultLng;

        // Shift all camps by this offset so they cluster around the user
        const shiftedCamps = store.camps.filter(c => c.status !== 'closed').map(c => {
          const newLat = c.lat + offsetLat;
          const newLng = c.lng + offsetLng;
          return {
            ...c,
            lat: newLat,
            lng: newLng,
            distance: getDistance(userLat, userLng, newLat, newLng)
          }
        });
        
        // Pass userLat, userLng so the map centers on the user
        initPublicMap(userLat, userLng, shiftedCamps, false, userLat, userLng);
      } else {
        // Camps found! Hide status panel and show map
        statusPanel.style.display = 'none';
        mapEl.style.display = 'block';
        initPublicMap(userLat, userLng, nearbyCamps, false, userLat, userLng);
      }
    },
    (error) => {
      spinner.style.display = 'none';
      statusText.style.display = 'none';
      statusPanel.style.display = 'none';
      mapEl.style.display = 'block';
      console.warn("Geolocation failed or denied. Showing default map.", error);
      
      // Fallback: If location is denied, we HAVE to use the default Chennai coordinates.
      const defaultLat = 13.0827; 
      const defaultLng = 80.2707;
      
      // Calculate distances from the default center just for display purposes
      const allCamps = store.camps.filter(c => c.status !== 'closed').map(c => ({
        ...c,
        distance: getDistance(defaultLat, defaultLng, c.lat, c.lng)
      }));
      
      // isFallback = true hides the blue user dot, since we don't know where the user is
      initPublicMap(defaultLat, defaultLng, allCamps, true, null, null);
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
});

function initPublicMap(centerLat, centerLng, nearbyCamps, isFallback = false, realUserLat = null, realUserLng = null) {
  // Center map on given coordinates (either user or default fallback center)
  const map = L.map('map').setView([centerLat, centerLng], 11);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  const bounds = L.latLngBounds();

  // Plot User Location if we have real geolocation (even if we are in fallback mode)
  if (realUserLat !== null && realUserLng !== null) {
    const userIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div class="marker-user"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    L.marker([realUserLat, realUserLng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<strong>Your Location</strong>');
    bounds.extend([realUserLat, realUserLng]);
  }

  // Plot Nearby Camps
  nearbyCamps.forEach(c => {
    let colorHex = '#4c9964'; // stable
    if (c.zone === 'critical') colorHex = '#dc3535';
    if (c.zone === 'moderate') colorHex = '#ffa000';

    const campIcon = L.divIcon({
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

    L.marker([c.lat, c.lng], { icon: campIcon })
      .addTo(map)
      .bindPopup(`
        <strong>${c.name}</strong><br>
        ${!isFallback ? `<span style="color:#666;font-size:0.9em;">${c.distance.toFixed(1)} km away</span><br>` : ''}
        District: ${c.district}<br>
        Status: ${c.status}<br>
        Urgent Needs: ${c.needs.length ? c.needs.join(', ') : 'None'}
      `);
  });

  // Add "Focus on My Location" control if we have real user coords
  if (realUserLat !== null && realUserLng !== null) {
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
          map.setView([realUserLat, realUserLng], 14, { animate: true });
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
        <div class="legend-item"><span class="legend-dot" style="background:#dc3535"></span> Critical Zone</div>
        <div class="legend-item"><span class="legend-dot" style="background:#ffa000"></span> Moderate Zone</div>
        <div class="legend-item"><span class="legend-dot" style="background:#4c9964"></span> Stable Zone</div>
        <div class="legend-item"><span class="legend-dot" style="background:#4285F4"></span> Your Location</div>
      `;
      return div;
    }
  });
  map.addControl(new LegendControl());

  // Fit map to show all plotted points
  if (nearbyCamps.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }
}

// ======= DONATE MODAL =======

function openDonateModal() {
  // Populate camp dropdown
  const campSelect = document.getElementById('donorCamp');
  campSelect.innerHTML = '<option value="" disabled selected>Choose a camp</option>';
  store.camps.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} — ${c.district}`;
    campSelect.appendChild(opt);
  });
  document.getElementById('donateOverlay').classList.add('open');
}

function closeDonateModal() {
  document.getElementById('donateOverlay').classList.remove('open');
  document.getElementById('donateForm').reset();
  // Reset toggle
  document.querySelectorAll('.toggle-btn').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });
  document.getElementById('donorType').value = 'personal';
  document.getElementById('nameLabel').textContent = 'Your Name';
  document.getElementById('donorName').placeholder = 'Enter your name';
}

function setDonorType(type, btn) {
  document.getElementById('donorType').value = type;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (type === 'organisation') {
    document.getElementById('nameLabel').textContent = 'Organisation Name';
    document.getElementById('donorName').placeholder = 'Enter organisation name';
  } else {
    document.getElementById('nameLabel').textContent = 'Your Name';
    document.getElementById('donorName').placeholder = 'Enter your name';
  }
}

function submitDonation(e) {
  e.preventDefault();
  const type = document.getElementById('donorType').value;
  const name = document.getElementById('donorName').value.trim();
  const phone = document.getElementById('donorPhone').value.trim();
  const resource = document.getElementById('donorResource').value;
  const qty = document.getElementById('donorQty').value.trim();
  const campId = parseInt(document.getElementById('donorCamp').value);
  const notes = document.getElementById('donorNotes').value.trim();

  const camp = store.camps.find(c => c.id === campId);

  // Add to donations list as a pending request
  store.donations.push({
    id: Date.now(),
    type: type,
    name: name,
    phone: phone,
    resource: resource,
    qty: qty,
    campId: campId,
    campName: camp ? camp.name : 'Unknown Camp',
    notes: notes,
    status: 'pending',
    time: 'just now'
  });

  // Add activity log
  store.activity.unshift({
    text: `New PLEDGE: ${qty} ${resource} for ${camp ? camp.name : 'a camp'} from ${name}`,
    color: 'amber',
    time: 'just now'
  });

  saveStore();
  closeDonateModal();
  showPublicToast(`Thank you, ${name}! Your donation pledge for ${resource} is pending review by ward members. ✓`);
}

function showPublicToast(msg) {
  const t = document.getElementById('toastPublic');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ======= VOLUNTEER MODAL =======
function openVolunteerModal() {
  document.getElementById('volunteerModal').classList.add('open');
}

function closeVolunteerModal() {
  document.getElementById('volunteerModal').classList.remove('open');
  // Reset state
  backToVolStep1();
  document.getElementById('volName').value = '';
  document.getElementById('volPhone').value = '';
  document.getElementById('volLocation').value = '';
  document.getElementById('volHelp').value = '';
  document.getElementById('volOtpInput').value = '';
}

function requestVolOtp() {
  const name = document.getElementById('volName').value.trim();
  const phone = document.getElementById('volPhone').value.trim();
  const loc = document.getElementById('volLocation').value.trim();
  const help = document.getElementById('volHelp').value;

  if (!name || !phone || !loc || !help) {
    showPublicToast('Please fill all fields first.');
    return;
  }

  // Simulate OTP request
  showPublicToast(`Sending OTP to ${phone}...`);
  setTimeout(() => {
    document.getElementById('volStep1').style.display = 'none';
    document.getElementById('volStep2').style.display = 'block';
    document.getElementById('volOTPTarget').textContent = phone;
  }, 1000);
}

function backToVolStep1() {
  document.getElementById('volStep1').style.display = 'block';
  document.getElementById('volStep2').style.display = 'none';
  document.getElementById('volOtpInput').value = '';
}

function submitVolunteer() {
  const otp = document.getElementById('volOtpInput').value.trim();
  if (otp.length < 6) {
    showPublicToast('Please enter a valid 6-digit OTP');
    return;
  }

  const name = document.getElementById('volName').value.trim();
  const phone = document.getElementById('volPhone').value.trim();
  const loc = document.getElementById('volLocation').value.trim();
  const help = document.getElementById('volHelp').value;

  // Add volunteer to store
  if (!store.volunteers) store.volunteers = [];
  store.volunteers.push({
    id: Date.now(),
    name,
    phone,
    location: loc,
    help,
    joined: 'just now',
    status: 'active'
  });

  // Log activity
  store.activity.unshift({
    text: `New Volunteer: ${name} (${help}) near ${loc}`,
    color: 'blue',
    time: 'just now'
  });

  saveStore();
  closeVolunteerModal();
  showPublicToast(`Welcome to the team, ${name}! We'll contact you soon.`);
}
