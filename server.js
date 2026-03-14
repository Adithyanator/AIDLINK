// server.js — ReliefNet Express server
const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');
const { initDB, registerMember, findMemberByPhone, saveOTP, verifyOTP } = require('./db');

const app  = express();
const PORT = 3000;

// -------- Middleware --------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));  // Serve all HTML/CSS/JS files
app.use(session({
  secret: 'reliefnet-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8-hour session
}));

// -------- Helper --------
function generate6DigitOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// -------- Routes --------

// Register a new ward member
app.post('/api/register', (req, res) => {
  const { name, phone, district, ward_number, ward_name } = req.body;

  if (!name || !phone || !district || !ward_number || !ward_name) {
    return res.status(400).json({ ok: false, error: 'All fields are required.' });
  }
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ ok: false, error: 'Phone must be exactly 10 digits.' });
  }

  const result = registerMember({ name, phone, district, ward_number, ward_name });
  if (!result.ok) {
    return res.status(409).json(result);
  }
  res.json({ ok: true, message: 'Registered successfully.' });
});

// Send OTP (generates and returns OTP in response — demo mode)
app.post('/api/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ ok: false, error: 'Valid 10-digit phone number required.' });
  }

  const member = findMemberByPhone(phone);
  if (!member) {
    return res.status(404).json({ ok: false, error: 'Phone number not registered. Please register first.' });
  }

  const otp = generate6DigitOTP();
  saveOTP(phone, otp);

  console.log(`[OTP] Phone: ${phone}  OTP: ${otp}`);

  // In a real app you'd send SMS here.
  // For demo: return OTP in response so UI can display it.
  res.json({ ok: true, otp, name: member.name });
});

// Verify OTP and create session
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ ok: false, error: 'Phone and OTP are required.' });
  }

  const valid = verifyOTP(phone, otp);
  if (!valid) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired OTP. Try again.' });
  }

  const member = findMemberByPhone(phone);
  req.session.user = {
    id:          member.id,
    name:        member.name,
    phone:       member.phone,
    district:    member.district,
    ward_number: member.ward_number,
    ward_name:   member.ward_name,
  };

  res.json({ ok: true, user: req.session.user });
});

// Get current session user
app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' });
  }
  res.json({ ok: true, user: req.session.user });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// -------- Boot --------
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  ReliefNet server running at http://localhost:${PORT}`);
    console.log(`  Register  : http://localhost:${PORT}/register.html`);
    console.log(`  Login     : http://localhost:${PORT}/login.html`);
    console.log(`  Dashboard : http://localhost:${PORT}/index.html\n`);
  });
}).catch(err => {
  console.error('[DB] Failed to initialise SQLite:', err);
  process.exit(1);
});
