const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Register a new college (SaaS self-onboarding portal)
// @route   POST /api/colleges/onboard
// @access  Public
router.post('/onboard', async (req, res) => {
  const { name, subdomain, logo_url, primary_color, secondary_color, admin_email, admin_phone, plan } = req.body;

  if (!name || !subdomain || !admin_email) {
    return res.status(400).json({ success: false, message: 'Please provide college name, subdomain and admin email' });
  }

  try {
    // Check subdomain availability
    const checkSub = await db.query(
      'SELECT id FROM public.colleges WHERE subdomain = $1',
      [subdomain.toLowerCase().trim()]
    );

    if (checkSub.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Subdomain already taken. Try another name.' });
    }

    // Insert College details
    const result = await db.query(
      'INSERT INTO public.colleges (name, subdomain, branding_logo_url, branding_primary_color, branding_secondary_color, admin_email, admin_phone, plan) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, subdomain.toLowerCase().trim(), logo_url || '', primary_color || '#4F46E5', secondary_color || '#06B6D4', admin_email, admin_phone || '', plan || 'FREE_TRIAL']
    );

    // Mock billing receipt transaction trigger
    const newTxId = 'txn_stripe_' + Math.random().toString(36).substring(7);
    const cost = plan === 'PREMIUM' ? 1200 : plan === 'ENTERPRISE' ? 5500 : plan === 'BASIC' ? 499 : 0;
    
    if (cost > 0) {
      await db.query(
        'INSERT INTO public.billing_transactions (college_id, amount, payment_method, transaction_id, status) VALUES ($1, $2, $3, $4, $5)',
        [result.rows[0].id, cost, 'STRIPE', newTxId, 'SUCCESS']
      );
    }

    // Return successfully
    return res.status(201).json({
      success: true,
      message: 'College onboarded successfully!',
      college: result.rows[0]
    });

  } catch (err) {
    console.error('Onboarding failure:', err);
    return res.status(500).json({ success: false, message: 'Failed to onboard college' });
  }
});

// @desc    Get details of all colleges (Super admin control)
// @route   GET /api/colleges
// @access  Public (or Private with Super Admin validation)
router.get('/', async (req, res) => {
  try {
    const colRes = await db.query('SELECT * FROM public.colleges ORDER BY created_at DESC');
    return res.status(200).json({ success: true, colleges: colRes.rows });
  } catch (err) {
    console.error('Fetch colleges failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch colleges' });
  }
});

// @desc    Fetch specific college branding metadata by subdomain
// @route   GET /api/colleges/subdomain/:sub
// @access  Public
router.get('/subdomain/:sub', async (req, res) => {
  try {
    const subRes = await db.query(
      'SELECT id, name, subdomain, branding_logo_url, branding_primary_color, branding_secondary_color, plan, billing_status FROM public.colleges WHERE subdomain = $1',
      [req.params.sub.toLowerCase().trim()]
    );

    if (subRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College subdomain not found.' });
    }

    return res.status(200).json({ success: true, branding: subRes.rows[0] });
  } catch (err) {
    console.error('Fetch subdomain branding error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch branding details' });
  }
});

// @desc    Submit a support ticket
// @route   POST /api/colleges/:id/support
// @access  Private
router.post('/:id/support', protect, async (req, res) => {
  const { subject, description } = req.body;
  try {
    const ticket = await db.query(
      'INSERT INTO public.support_tickets (college_id, subject, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, subject, description, 'OPEN']
    );
    return res.status(201).json({ success: true, ticket: ticket.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to log ticket' });
  }
});

module.exports = router;
