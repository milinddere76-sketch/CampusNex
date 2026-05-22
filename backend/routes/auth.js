const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    Register a new college account admin / user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { email, password, full_name, phone, role } = req.body;

  try {
    // Check if user exists
    const checkUser = await db.query(
      'SELECT id FROM public.tenant_users WHERE email = $1',
      [email]
    );

    if (checkUser.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hashSync(password, salt);

    // Insert User
    const newId = require('uuid').v4();
    const newUser = await db.query(
      'INSERT INTO public.tenant_users (id, email, password_hash, phone, full_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, role',
      [newId, email, passwordHash, phone, full_name, role || 'STUDENT']
    );

    // Generate Token
    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET || 'super_secret_campusnex_token_99981',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.status(210).json({
      success: true,
      token,
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error('Registration failed:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

// @desc    Authenticate User & Issue Token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    const userRes = await db.query(
      'SELECT * FROM public.tenant_users WHERE email = $1',
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userRes.rows[0];

    // Password verification
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // OTP validation simulation (succeeds automatically if otp is "123456" or omitted for easy demo)
    if (otp && otp !== '123456') {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP authentication code' });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'super_secret_campusnex_token_99981',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        device_id: user.device_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// @desc    Fetch Profile Details
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const userRes = await db.query(
      'SELECT id, email, full_name, role, phone, device_id FROM public.tenant_users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: userRes.rows[0]
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
