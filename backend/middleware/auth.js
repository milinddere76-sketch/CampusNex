const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Main Authenticate Middleware
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_campusnex_token_99981');

      // Fetch user from DB
      const userRes = await db.query(
        'SELECT id, email, full_name, role, is_active FROM public.tenant_users WHERE id = $1',
        [decoded.id]
      );

      if (userRes.rowCount === 0) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      req.user = userRes.rows[0];
      
      // Inject Tenant Subdomain Header/Value
      req.tenantId = req.headers['x-tenant-id'] || 'apex'; // fallback to apex for demo
      
      next();
    } catch (error) {
      console.error('Token validation failed:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Role Access Restriction Middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role [${req.user ? req.user.role : 'GUEST'}] is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
