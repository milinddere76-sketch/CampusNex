const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Apply for Student Admission
// @route   POST /api/admissions/apply
// @access  Public
router.post('/apply', async (req, res) => {
  const {
    full_name, dob, gender, address, mobile, email,
    aadhaar_id, previous_education, marks_percentage, course_id, payment_status
  } = req.body;

  if (!full_name || !dob || !gender || !address || !mobile || !email || !aadhaar_id || !previous_education || !marks_percentage || !course_id) {
    return res.status(400).json({ success: false, message: 'All admission fields are required' });
  }

  try {
    const existing = await db.query('SELECT id FROM public.tenant_admissions WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'An admission application already exists with this email address' });
    }

    const queryText = `
      INSERT INTO public.tenant_admissions 
      (full_name, dob, gender, address, mobile, email, aadhaar_id, previous_education, marks_percentage, course_id, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `;
    const params = [
      full_name, dob, gender, address, mobile, email.toLowerCase().trim(),
      aadhaar_id, previous_education, parseFloat(marks_percentage), parseInt(course_id), payment_status || 'UNPAID'
    ];

    const result = await db.query(queryText, params);
    return res.status(201).json({ success: true, message: 'Application submitted successfully!', application: result.rows[0] });
  } catch (err) {
    console.error('Admission submit failure:', err);
    return res.status(500).json({ success: false, message: 'Failed to process admission application' });
  }
});

// @desc    Get All Applications
// @route   GET /api/admissions/all
// @access  Private (College Admins, Principals)
router.get('/all', protect, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM public.tenant_admissions ORDER BY created_at DESC');
    return res.status(200).json({ success: true, applications: result.rows });
  } catch (err) {
    console.error('Fetch admissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

// @desc    Review Admission (Approve/Reject/Confirm Roll & Class)
// @route   POST /api/admissions/review/:id
// @access  Private (College Admins, Principals)
router.post('/review/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { status, roll_number, class_id } = req.body;

  try {
    const check = await db.query('SELECT * FROM public.tenant_admissions WHERE id = $1', [parseInt(id)]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = check.rows[0];

    if (status === 'CONFIRMED') {
      if (!roll_number) {
        return res.status(400).json({ success: false, message: 'Roll number must be assigned to confirm admission' });
      }

      // 1. Update Admission Application
      await db.query(
        'UPDATE public.tenant_admissions SET status = $1, roll_number = $2, class_id = $3 WHERE id = $4',
        [status, roll_number, class_id ? parseInt(class_id) : null, parseInt(id)]
      );

      // 2. Automatically register user into system
      const userCheck = await db.query('SELECT id FROM public.tenant_users WHERE email = $1', [application.email]);
      let userId;

      if (userCheck.rowCount === 0) {
        const { v4: uuidv4 } = require('uuid');
        const bcrypt = require('bcryptjs');
        userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPw = await bcrypt.hash('password123', salt);

        await db.query(
          'INSERT INTO public.tenant_users (id, email, password_hash, phone, full_name, role) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, application.email, hashedPw, application.mobile, application.full_name, 'STUDENT']
        );

        await db.query(
          'INSERT INTO public.tenant_students (user_id, roll_number, department_id, admission_year, current_semester_id) VALUES ($1, $2, $3, $4, $5)',
          [userId, roll_number, 1, new Date().getFullYear(), 1]
        );
      }

      return res.status(200).json({ success: true, message: `Admission confirmed. Assigned Roll Number [${roll_number}]` });
    } else {
      // Direct Status Update (e.g., REVIEW, DOCUMENT_VERIFICATION, REJECTED)
      await db.query('UPDATE public.tenant_admissions SET status = $1 WHERE id = $2', [status, parseInt(id)]);
      return res.status(200).json({ success: true, message: `Application status updated to [${status}]` });
    }
  } catch (err) {
    console.error('Review application error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update application review' });
  }
});

module.exports = router;
