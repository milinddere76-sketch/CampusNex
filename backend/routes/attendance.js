const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private (Students, Faculty, Parents)
router.get('/', protect, async (req, res) => {
  try {
    let queryText = 'SELECT * FROM public.tenant_attendance';
    let params = [];

    // Filter by student if role is STUDENT
    if (req.user.role === 'STUDENT') {
      queryText += ' WHERE student_id = $1';
      params.push(req.user.id);
    } 
    // Filter by child if parent is accessing
    else if (req.user.role === 'PARENT') {
      // Find children
      const childRes = await db.query('SELECT user_id FROM public.tenant_students WHERE parent_id = $1', [req.user.id]);
      if (childRes.rowCount > 0) {
        queryText += ' WHERE student_id = $1';
        params.push(childRes.rows[0].user_id);
      } else {
        return res.status(200).json({ success: true, attendance: [] });
      }
    }

    const attRes = await db.query(queryText, params);
    return res.status(200).json({ success: true, attendance: attRes.rows });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

// @desc    Mark attendance (manual or QR/Geofence scan)
// @route   POST /api/attendance/mark
// @access  Private (Students, Faculty)
router.post('/mark', protect, async (req, res) => {
  const { student_id, class_id, date, status, method, latitude, longitude } = req.body;

  try {
    const targetStudentId = student_id || req.user.id;
    const todayStr = date || new Date().toISOString().split('T')[0];

    // Geo-fencing check (mocked: if method is GEOFENCE, verify coords near 40.71)
    if (method === 'GEOFENCE') {
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Geofence requires coordinates' });
      }
      const dist = Math.sqrt(Math.pow(latitude - 40.7128, 2) + Math.pow(longitude - (-74.0060), 2));
      if (dist > 0.05) {
        return res.status(400).json({ success: false, message: 'Location outside of geo-fenced classroom zone' });
      }
    }

    // Insert or update attendance record
    const result = await db.query(
      `INSERT INTO public.tenant_attendance (student_id, class_id, date, status, method, verified_by_faculty_id, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, class_id, date) 
       DO UPDATE SET status = EXCLUDED.status, method = EXCLUDED.method, verified_by_faculty_id = EXCLUDED.verified_by_faculty_id
       RETURNING *`,
      [
        targetStudentId,
        class_id || 1,
        todayStr,
        status || 'PRESENT',
        method || 'MANUAL',
        req.user.role === 'FACULTY' ? req.user.id : '33333333-3333-3333-3333-333333333333',
        latitude || null,
        longitude || null
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      record: result.rows[0]
    });
  } catch (err) {
    console.error('Mark attendance failure:', err);
    return res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
});

module.exports = router;
