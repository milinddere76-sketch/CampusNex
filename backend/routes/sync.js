const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    Process client queued offline actions & synchronize DB state
// @route   POST /api/sync/process
// @access  Private
router.post('/process', protect, async (req, res) => {
  const { device_id, queue } = req.body; // queue is an array of offline actions

  if (!queue || !Array.isArray(queue)) {
    return res.status(400).json({ success: false, message: 'Invalid sync payload' });
  }

  const results = [];
  console.log(`🔄 Sync Engine: Processing ${queue.length} actions from device [${device_id}]...`);

  // Process actions chronologically (FIFO)
  for (const action of queue) {
    const { action_type, target_table, record_id, payload, client_timestamp } = action;
    let syncStatus = 'SUCCESS';
    let resolution = 'COMMITTED';

    try {
      // Begin routing based on target table
      if (target_table === 'tenant_attendance') {
        const { student_id, class_id, date, status, method } = payload;

        // Check if an entry already exists
        const existRes = await db.query(
          'SELECT * FROM public.tenant_attendance WHERE student_id = $1 AND class_id = $2 AND date = $3',
          [student_id, class_id, date]
        );

        if (existRes.rowCount > 0) {
          const existing = existRes.rows[0];

          // Conflict resolution logic:
          // If existing status is already marked by Faculty, and this sync is by a student, ignore (override)
          if (existing.verified_by_faculty_id && req.user.role === 'STUDENT') {
            syncStatus = 'CONFLICT';
            resolution = 'OVERRIDDEN_BY_FACULTY_RECORD';
          } else {
            // Update attendance record (Last-Write-Wins or Teacher update)
            await db.query(
              'UPDATE public.tenant_attendance SET status = $1, method = $2, verified_by_faculty_id = $3 WHERE student_id = $4 AND class_id = $5 AND date = $6',
              [status, method, req.user.role === 'FACULTY' ? req.user.id : existing.verified_by_faculty_id, student_id, class_id, date]
            );
            resolution = 'UPDATED_EXISTING';
          }
        } else {
          // Normal creation
          await db.query(
            'INSERT INTO public.tenant_attendance (student_id, class_id, date, status, method, verified_by_faculty_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [student_id, class_id, date, status, method, req.user.role === 'FACULTY' ? req.user.id : '33333333-3333-3333-3333-333333333333']
          );
          resolution = 'CREATED_NEW';
        }
      } 
      else if (target_table === 'tenant_chat_messages') {
        const { receiver_id, message } = payload;
        await db.query(
          'INSERT INTO public.tenant_chat_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)',
          [req.user.id, receiver_id, message]
        );
        resolution = 'MESSAGE_SENT';
      }
      else if (target_table === 'tenant_assignment_submissions') {
        const { assignment_id, file_url } = payload;
        await db.query(
          `INSERT INTO public.tenant_assignment_submissions (assignment_id, student_id, file_url) 
           VALUES ($1, $2, $3)
           ON CONFLICT (student_id, assignment_id) 
           DO UPDATE SET file_url = EXCLUDED.file_url, submitted_at = CURRENT_TIMESTAMP`,
          [assignment_id, req.user.id, file_url]
        );
        resolution = 'SUBMISSION_SYNCED';
      }
      else {
        syncStatus = 'CONFLICT';
        resolution = 'UNSUPPORTED_OFFLINE_MUTATION';
      }

      // Log the synced transaction
      await db.query(
        'INSERT INTO public.tenant_offline_sync_queue (device_id, user_id, action_type, target_table, record_id, payload, client_timestamp, processed_at, sync_status, conflict_resolution) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)',
        [device_id, req.user.id, action_type, target_table, record_id, JSON.stringify(payload), client_timestamp, syncStatus, resolution]
      );

      results.push({
        record_id,
        sync_status: syncStatus,
        conflict_resolution: resolution
      });

    } catch (err) {
      console.error(`Sync error on record ${record_id}:`, err);
      results.push({
        record_id,
        sync_status: 'CONFLICT',
        conflict_resolution: 'DATABASE_ERROR: ' + err.message
      });
    }
  }

  return res.status(200).json({
    success: true,
    sync_results: results
  });
});

// @desc    Retrieve device sync logs
// @route   GET /api/sync/logs/:device_id
// @access  Private
router.get('/logs/:device_id', protect, async (req, res) => {
  try {
    const logs = await db.query(
      'SELECT * FROM public.tenant_offline_sync_queue WHERE device_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.params.device_id]
    );
    return res.status(200).json({ success: true, logs: logs.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

module.exports = router;
