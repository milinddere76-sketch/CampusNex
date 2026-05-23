const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    Get All Approved Notices (For notice board)
// @route   GET /api/notices
// @access  Public
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM public.tenant_notices WHERE is_approved = TRUE ORDER BY created_at DESC');
    return res.status(200).json({ success: true, notices: result.rows });
  } catch (err) {
    console.error('Fetch notices failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notices' });
  }
});

// @desc    Get All Pending Notices for Approval
// @route   GET /api/notices/pending
// @access  Private (Principals)
router.get('/pending', protect, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM public.tenant_notices WHERE is_approved = FALSE ORDER BY created_at DESC');
    return res.status(200).json({ success: true, notices: result.rows });
  } catch (err) {
    console.error('Fetch pending notices failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pending notices' });
  }
});

// @desc    Draft Notice (Awaiting Principal approval)
// @route   POST /api/notices
// @access  Private (Admins, Faculty)
router.post('/', protect, async (req, res) => {
  const { title, content, audience_roles } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required' });
  }

  try {
    const queryText = `
      INSERT INTO public.tenant_notices (title, content, audience_roles, is_approved)
      VALUES ($1, $2, $3, FALSE) RETURNING *
    `;
    const roles = audience_roles ? (typeof audience_roles === 'string' ? audience_roles : JSON.stringify(audience_roles)) : '["STUDENT"]';
    const params = [title, content, roles];
    const result = await db.query(queryText, params);
    return res.status(201).json({ success: true, message: 'Notice drafted and sent to Principal for approval!', notice: result.rows[0] });
  } catch (err) {
    console.error('Draft notice error:', err);
    return res.status(500).json({ success: false, message: 'Failed to draft notice' });
  }
});

// @desc    Approve Notice (Broadcast)
// @route   POST /api/notices/approve/:id
// @access  Private (Principals)
router.post('/approve/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const check = await db.query('SELECT id FROM public.tenant_notices WHERE id = $1', [parseInt(id)]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    await db.query('UPDATE public.tenant_notices SET is_approved = TRUE WHERE id = $1', [parseInt(id)]);
    return res.status(200).json({ success: true, message: 'Notice approved and broadcasted to campus noticeboard!' });
  } catch (err) {
    console.error('Approve notice error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve notice' });
  }
});

module.exports = router;
