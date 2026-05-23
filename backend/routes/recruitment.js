const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get All Job Openings
// @route   GET /api/recruitment/jobs
// @access  Public
router.get('/jobs', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM public.tenant_job_openings ORDER BY created_at DESC');
    return res.status(200).json({ success: true, jobs: result.rows });
  } catch (err) {
    console.error('Fetch openings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch job openings' });
  }
});

// @desc    Create Job Opening
// @route   POST /api/recruitment/jobs
// @access  Private (College Admins, Principals)
router.post('/jobs', protect, async (req, res) => {
  const { role_title, department_id, eligibility, salary_lpa, last_date, interview_mode } = req.body;

  if (!role_title || !department_id || !eligibility || !salary_lpa || !last_date) {
    return res.status(400).json({ success: false, message: 'All job vacancy details are required' });
  }

  try {
    const queryText = `
      INSERT INTO public.tenant_job_openings (role_title, department_id, eligibility, salary_lpa, last_date, interview_mode)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    const params = [role_title, parseInt(department_id), eligibility, parseFloat(salary_lpa), last_date, interview_mode || 'ONLINE'];
    const result = await db.query(queryText, params);
    return res.status(201).json({ success: true, message: 'Job vacancy published successfully!', job: result.rows[0] });
  } catch (err) {
    console.error('Publish job vacancy error:', err);
    return res.status(500).json({ success: false, message: 'Failed to publish job opening' });
  }
});

// @desc    Candidate Apply for Job
// @route   POST /api/recruitment/apply
// @access  Public
router.post('/apply', async (req, res) => {
  const { job_opening_id, full_name, qualification, experience_years, email, phone, resume_url } = req.body;

  if (!job_opening_id || !full_name || !qualification || !email) {
    return res.status(400).json({ success: false, message: 'Job opening ID, full name, qualification, and email are required' });
  }

  try {
    const queryText = `
      INSERT INTO public.tenant_job_applications (job_opening_id, full_name, qualification, experience_years, email, phone, resume_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const params = [parseInt(job_opening_id), full_name, qualification, parseInt(experience_years || 0), email.toLowerCase().trim(), phone || '', resume_url || null];
    const result = await db.query(queryText, params);
    return res.status(201).json({ success: true, message: 'Job application submitted successfully!', application: result.rows[0] });
  } catch (err) {
    console.error('Job application submission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process job application' });
  }
});

// @desc    Get All Job Applicants
// @route   GET /api/recruitment/applicants
// @access  Private (College Admins, Principals, HODs)
router.get('/applicants', protect, async (req, res) => {
  try {
    const applicants = await db.query('SELECT * FROM public.tenant_job_applications ORDER BY created_at DESC');
    const scores = await db.query('SELECT * FROM public.tenant_interview_scores');

    // Attach interview scores to corresponding applicants
    const applicantsWithScores = applicants.rows.map(app => {
      const appScores = scores.rows.filter(s => s.application_id === app.id);
      const avgScore = appScores.length > 0 ? (appScores.reduce((acc, curr) => acc + curr.score, 0) / appScores.length).toFixed(1) : null;
      return { ...app, scores: appScores, average_score: avgScore };
    });

    return res.status(200).json({ success: true, applicants: applicantsWithScores });
  } catch (err) {
    console.error('Fetch applicants error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve candidates' });
  }
});

// @desc    Record Interview Panel Score
// @route   POST /api/recruitment/score
// @access  Private (Principals, HODs)
router.post('/score', protect, async (req, res) => {
  const { application_id, interviewer_role, score, comments } = req.body;

  if (!application_id || !interviewer_role || !score) {
    return res.status(400).json({ success: false, message: 'Application ID, interviewer role, and score are required' });
  }

  try {
    const queryText = `
      INSERT INTO public.tenant_interview_scores (application_id, interviewer_role, score, comments)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const params = [parseInt(application_id), interviewer_role, parseInt(score), comments || ''];
    const result = await db.query(queryText, params);
    return res.status(201).json({ success: true, message: 'Interview evaluation recorded successfully!', score: result.rows[0] });
  } catch (err) {
    console.error('Record score error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record interview score' });
  }
});

// @desc    Approve Appointment (Confirm Hire)
// @route   POST /api/recruitment/appoint/:id
// @access  Private (College Admins, Principals)
router.post('/appoint/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // status = 'CONFIRMED' or 'REJECTED'

  try {
    const check = await db.query('SELECT * FROM public.tenant_job_applications WHERE id = $1', [parseInt(id)]);
    if (check.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Application details not found' });
    }

    const application = check.rows[0];

    // Update status
    await db.query(
      'UPDATE public.tenant_job_applications SET status = $1, remarks = $2 WHERE id = $3',
      [status, remarks || 'Appointed by Panel Review', parseInt(id)]
    );

    if (status === 'CONFIRMED') {
      // Auto-insert candidate as employee (FACULTY role)
      const userCheck = await db.query('SELECT id FROM public.tenant_users WHERE email = $1', [application.email]);
      if (userCheck.rowCount === 0) {
        const { v4: uuidv4 } = require('uuid');
        const bcrypt = require('bcryptjs');
        const userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPw = await bcrypt.hash('password123', salt);

        await db.query(
          'INSERT INTO public.tenant_users (id, email, password_hash, phone, full_name, role) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, application.email, hashedPw, application.phone, application.full_name, 'FACULTY']
        );
      }
      return res.status(200).json({ success: true, message: `Candidate appointed successfully! Account created automatically.` });
    }

    return res.status(200).json({ success: true, message: `Applicant status set to [${status}]` });
  } catch (err) {
    console.error('Appoint candidate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to finalize candidate appointment' });
  }
});

module.exports = router;
