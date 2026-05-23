const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Enforce or generate JWT_SECRET at startup
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    const crypto = require('crypto');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set. Generated a random secure fallback secret for this session to ensure stability.');
  } else {
    JWT_SECRET = 'campusnex_dev_secret_change_in_production';
  }
}

// Main Authentication Middleware
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const userRes = await db.query(
        'SELECT id, email, full_name, role, is_active FROM public.tenant_users WHERE id = $1',
        [decoded.id]
      );

      if (userRes.rowCount === 0) {
        return res.status(401).json({ success: false, message: 'Not authorized — user not found' });
      }

      if (!userRes.rows[0].is_active) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      req.user = userRes.rows[0];
      req.tenantId = req.headers['x-tenant-id'] || 'apex';
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, message: 'Not authorized — invalid token' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
  }
};

// Role Access Restriction Middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: role [${req.user ? req.user.role : 'GUEST'}] is not permitted to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize, JWT_SECRET };
