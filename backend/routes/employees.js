const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// @desc    Bulk Upload Employees via CSV data
// @route   POST /api/employees/bulk-upload
// @access  Private (College Admins)
router.post('/bulk-upload', protect, async (req, res) => {
  const { csvData } = req.body; // Expects CSV string: full_name,email,phone,role

  if (!csvData) {
    return res.status(400).json({ success: false, message: 'CSV data stream is required' });
  }

  try {
    const rows = csvData.split('\n').map(r => r.trim()).filter(Boolean);
    const importedUsers = [];
    const skippedUsers = [];

    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('password123', salt);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Skip header if matches full_name or email
      if (row.toLowerCase().startsWith('full_name') || row.toLowerCase().startsWith('name')) {
        continue;
      }

      const [full_name, email, phone, role] = row.split(',').map(item => item ? item.trim() : '');

      if (!full_name || !email || !role) {
        skippedUsers.push({ rowNumber: i + 1, error: 'Missing name, email, or role' });
        continue;
      }

      // Check if user already exists
      const checkUser = await db.query('SELECT id FROM public.tenant_users WHERE email = $1', [email.toLowerCase()]);
      if (checkUser.rowCount > 0) {
        skippedUsers.push({ email, error: 'User already exists' });
        continue;
      }

      const userId = uuidv4();
      await db.query(
        'INSERT INTO public.tenant_users (id, email, password_hash, phone, full_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, role',
        [userId, email.toLowerCase(), defaultHashedPassword, phone || '', full_name, role.toUpperCase()]
      );

      importedUsers.push({ full_name, email, role: role.toUpperCase() });
    }

    return res.status(200).json({
      success: true,
      message: `Bulk import completed: ${importedUsers.length} users successfully loaded.`,
      imported_count: importedUsers.length,
      skipped_count: skippedUsers.length,
      imported: importedUsers,
      skipped: skippedUsers
    });
  } catch (err) {
    console.error('Bulk upload failure:', err);
    return res.status(500).json({ success: false, message: 'Failed to process bulk upload spreadsheet' });
  }
});

module.exports = router;
