const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get All Pending Leaves for Principal Review
// @route   GET /api/leaves/pending
// @access  Private (Principal and College Admin only)
router.get('/pending', protect, authorize('PRINCIPAL', 'COLLEGE_ADMIN'), async (req, res) => {
  try {
    const queryText = `
      SELECT l.id, l.dates, l.reason, l.status, l.created_at, u.full_name, u.role, s.roll_number
      FROM public.tenant_leaves l
      JOIN public.tenant_users u ON l.user_id = u.id
      LEFT JOIN public.tenant_students s ON u.id = s.user_id
      WHERE l.status = 'PENDING'
      ORDER BY l.created_at DESC
    `;
    const result = await db.query(queryText);
    
    // In local fallback mode, db.query handles it conceptually, 
    // but if it's fallback mode and query returns a flat array of mockDb.leaves, 
    // we want to make sure it includes student name details.
    if (db.isFallback && db.isFallback()) {
      const mockDb = db.getMockDb();
      const mappedLeaves = mockDb.leaves
        .filter(l => l.status === 'PENDING')
        .map(l => {
          const userObj = mockDb.users.find(u => u.id === l.user_id) || {};
          const studentObj = mockDb.students.find(s => s.user_id === l.user_id) || {};
          return {
            id: l.id,
            dates: l.dates,
            reason: l.reason,
            status: l.status,
            created_at: l.created_at,
            full_name: userObj.full_name || 'System User',
            role: userObj.role || 'STUDENT',
            roll_number: studentObj.roll_number || 'APEX-2026-CSE-MOCK'
          };
        });
      return res.status(200).json({ success: true, leaves: mappedLeaves });
    }

    return res.status(200).json({ success: true, leaves: result.rows });
  } catch (err) {
    console.error('Fetch pending leaves error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pending leave requests' });
  }
});

// @desc    Apply for Student/Faculty Leave
// @route   POST /api/leaves/apply
// @access  Private (Student, Faculty, HOD)
router.post('/apply', protect, async (req, res) => {
  const { dates, reason } = req.body;

  if (!dates || !reason) {
    return res.status(400).json({ success: false, message: 'Leave dates and reason are required' });
  }

  try {
    const queryText = `
      INSERT INTO public.tenant_leaves (user_id, dates, reason, status)
      VALUES ($1, $2, $3, 'PENDING') RETURNING *
    `;
    const params = [req.user.id, dates, reason];
    const result = await db.query(queryText, params);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Leave request submitted successfully and queued in Principal approvals!', 
      leave: result.rows[0] 
    });
  } catch (err) {
    console.error('Apply leave error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
});

// @desc    Review Leave Request (Approve/Reject)
// @route   POST /api/leaves/review/:id
// @access  Private (Principal only)
router.post('/review/:id', protect, authorize('PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' or 'REJECTED'

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'A valid review status (APPROVED or REJECTED) is required' });
  }

  try {
    const check = await db.query('SELECT id FROM public.tenant_leaves WHERE id = $1', [parseInt(id)]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    await db.query('UPDATE public.tenant_leaves SET status = $1 WHERE id = $2', [status, parseInt(id)]);
    
    return res.status(200).json({ 
      success: true, 
      message: `Leave request has been successfully [${status}] by the Principal!` 
    });
  } catch (err) {
    console.error('Review leave error:', err);
    return res.status(500).json({ success: false, message: 'Failed to review leave request' });
  }
});

module.exports = router;
