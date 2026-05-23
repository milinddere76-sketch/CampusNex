const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { protect, JWT_SECRET } = require('../middleware/auth');

// Helper: get JWT secret safely
const getJwtSecret = () => {
  return JWT_SECRET;
};

// @desc    Register a new college account admin / user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { email, password, full_name, phone, role, assigned_streams } = req.body;

  // Input validation
  if (!email || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Email, password and full name are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

  try {
    const checkUser = await db.query(
      'SELECT id FROM public.tenant_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (checkUser.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO public.tenant_users (id, email, password_hash, phone, full_name, role, assigned_streams) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, full_name, role, assigned_streams',
      [uuidv4(), email.toLowerCase().trim(), passwordHash, phone || '', full_name, role || 'STUDENT', JSON.stringify(assigned_streams || [])]
    );

    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: newUser.rows[0]  // id, email, full_name, role, assigned_streams — no password_hash
    });
  } catch (err) {
    console.error('Registration failed:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

// @desc    Authenticate User & Issue Token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const userRes = await db.query(
      'SELECT id, email, full_name, role, phone, device_id, password_hash, is_active, assigned_streams FROM public.tenant_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      getJwtSecret(),
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
        device_id: user.device_id,
        assigned_streams: user.assigned_streams
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// @desc    Fetch Profile Details
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const userRes = await db.query(
      'SELECT id, email, full_name, role, phone, device_id, assigned_streams FROM public.tenant_users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    console.error('Me endpoint error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// @desc    Get All Users List
// @route   GET /api/auth/users
// @access  Private (Admins and Principals)
router.get('/users', protect, async (req, res) => {
  try {
    const usersRes = await db.query(
      'SELECT id, email, full_name, role, phone, is_active FROM public.tenant_users ORDER BY role, full_name'
    );
    return res.status(200).json({ success: true, users: usersRes.rows });
  } catch (err) {
    console.error('Fetch users failed:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// @desc    Update User Role and Account Status
// @route   POST /api/auth/users/:id/role-status
// @access  Private (College Admin only)
router.post('/users/:id/role-status', protect, async (req, res) => {
  if (req.user.role !== 'COLLEGE_ADMIN' && req.user.email !== 'admin@apex.edu') {
    return res.status(403).json({ success: false, message: 'Access denied: only College Admin can modify user permissions' });
  }

  const { role, is_active } = req.body;
  const userId = req.params.id;

  if (!role) {
    return res.status(400).json({ success: false, message: 'Role is required' });
  }

  try {
    const checkUser = await db.query('SELECT id FROM public.tenant_users WHERE id = $1', [userId]);
    if (checkUser.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isActiveBool = (is_active === true || is_active === 'true' || is_active === 1 || is_active === '1');

    const result = await db.query(
      'UPDATE public.tenant_users SET role = $1, is_active = $2 WHERE id = $3 RETURNING id, email, full_name, role, is_active',
      [role, isActiveBool, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'User permissions updated successfully!',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Update user role-status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user access' });
  }
});

// @desc    Get All Role Feature Permissions Mappings
// @route   GET /api/auth/role-features
// @access  Private
router.get('/role-features', protect, async (req, res) => {
  try {
    let result;
    if (db.isFallback && db.isFallback()) {
      result = { rows: db.getMockDb().role_features || [] };
    } else {
      result = await db.query('SELECT * FROM public.tenant_role_features');
    }
    return res.status(200).json({ success: true, roleFeatures: result.rows });
  } catch (err) {
    console.error('Fetch role features error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch role permissions matrix' });
  }
});

// @desc    Update/Save Feature Mappings for a Specific Role
// @route   POST /api/auth/role-features
// @access  Private (College Admin only)
router.post('/role-features', protect, async (req, res) => {
  if (req.user.role !== 'COLLEGE_ADMIN' && req.user.email !== 'admin@apex.edu') {
    return res.status(403).json({ success: false, message: 'Access denied: only College Admin can modify feature mappings' });
  }

  const { role, allowed_features } = req.body;

  if (!role || !allowed_features || !Array.isArray(allowed_features)) {
    return res.status(400).json({ success: false, message: 'Role and allowed_features array are required' });
  }

  try {
    let result;
    if (db.isFallback && db.isFallback()) {
      const mockDb = db.getMockDb();
      let item = mockDb.role_features.find(rf => rf.role === role);
      if (item) {
        item.allowed_features = allowed_features;
      } else {
        item = { role, allowed_features };
        mockDb.role_features.push(item);
      }
      db.saveMockDb();
      result = { rows: [item] };
    } else {
      const queryText = `
        INSERT INTO public.tenant_role_features (role, allowed_features)
        VALUES ($1, $2)
        ON CONFLICT (role) DO UPDATE SET allowed_features = EXCLUDED.allowed_features
        RETURNING *
      `;
      result = await db.query(queryText, [role, JSON.stringify(allowed_features)]);
    }

    return res.status(200).json({
      success: true,
      message: `Role permissions for [${role}] updated successfully!`,
      roleFeature: result.rows[0]
    });
  } catch (err) {
    console.error('Update role features error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save role feature permissions' });
  }
});

module.exports = router;
