const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get All Hostel Rooms
// @route   GET /api/hostel/rooms
// @access  Private
router.get('/rooms', protect, async (req, res) => {
  try {
    let result;
    if (db.isFallback && db.isFallback()) {
      result = { rows: db.getMockDb().hostel_rooms || [] };
    } else {
      result = await db.query('SELECT * FROM public.tenant_hostel_rooms ORDER BY room_number ASC');
    }
    return res.status(200).json({ success: true, rooms: result.rows });
  } catch (err) {
    console.error('Fetch hostel rooms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch hostel rooms' });
  }
});

// @desc    Get All Hostel Allocations
// @route   GET /api/hostel/allocations
// @access  Private (Warden, Principal, Admin only)
router.get('/allocations', protect, authorize('HOSTEL_WARDEN', 'PRINCIPAL', 'COLLEGE_ADMIN'), async (req, res) => {
  try {
    if (db.isFallback && db.isFallback()) {
      const mockDb = db.getMockDb();
      const mapped = mockDb.hostel_allocations.map(a => {
        const studentUser = mockDb.users.find(u => u.id === a.student_id) || {};
        const studentInfo = mockDb.students.find(s => s.user_id === a.student_id) || {};
        const roomInfo = mockDb.hostel_rooms.find(r => r.id === a.room_id) || {};
        return {
          id: a.id,
          room_id: a.room_id,
          student_id: a.student_id,
          allocated_at: a.allocated_at,
          full_name: studentUser.full_name || 'Unknown Student',
          roll_number: studentInfo.roll_number || 'N/A',
          room_number: roomInfo.room_number || 'N/A',
          block_name: roomInfo.block_name || 'N/A',
          email: studentUser.email || 'N/A'
        };
      });
      return res.status(200).json({ success: true, allocations: mapped });
    }

    const queryText = `
      SELECT a.id, a.room_id, a.student_id, a.allocated_at,
             u.full_name, s.roll_number, u.email,
             r.room_number, r.block_name
      FROM public.tenant_hostel_allocations a
      JOIN public.tenant_users u ON a.student_id = u.id
      JOIN public.tenant_students s ON u.id = s.user_id
      JOIN public.tenant_hostel_rooms r ON a.room_id = r.id
      ORDER BY a.allocated_at DESC
    `;
    const result = await db.query(queryText);
    return res.status(200).json({ success: true, allocations: result.rows });
  } catch (err) {
    console.error('Fetch allocations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch allocations' });
  }
});

// @desc    Allocate room to student
// @route   POST /api/hostel/allocate
// @access  Private (Warden and Admin only)
router.post('/allocate', protect, authorize('HOSTEL_WARDEN', 'COLLEGE_ADMIN'), async (req, res) => {
  const { student_id, room_id } = req.body;

  if (!student_id || !room_id) {
    return res.status(400).json({ success: false, message: 'Student ID and Room ID are required' });
  }

  try {
    let room;
    if (db.isFallback && db.isFallback()) {
      const mockDb = db.getMockDb();
      room = mockDb.hostel_rooms.find(r => r.id === Number(room_id));
    } else {
      const roomRes = await db.query('SELECT * FROM public.tenant_hostel_rooms WHERE id = $1', [Number(room_id)]);
      room = roomRes.rows[0];
    }

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.occupied_count >= room.capacity) {
      return res.status(400).json({ success: false, message: 'Selected room is already at full capacity' });
    }

    // Check if student already has allocation
    let existingAlloc;
    if (db.isFallback && db.isFallback()) {
      existingAlloc = db.getMockDb().hostel_allocations.find(a => a.student_id === student_id);
    } else {
      const checkRes = await db.query('SELECT id FROM public.tenant_hostel_allocations WHERE student_id = $1', [student_id]);
      existingAlloc = checkRes.rows[0];
    }

    if (existingAlloc) {
      return res.status(400).json({ success: false, message: 'Student already has a room allocated' });
    }

    // Perform allocation
    if (db.isFallback && db.isFallback()) {
      const mockDb = db.getMockDb();
      const newAlloc = {
        id: mockDb.hostel_allocations.length + 1,
        room_id: Number(room_id),
        student_id: student_id,
        allocated_at: new Date()
      };
      mockDb.hostel_allocations.push(newAlloc);
      
      const r = mockDb.hostel_rooms.find(rm => rm.id === Number(room_id));
      if (r) r.occupied_count = (r.occupied_count || 0) + 1;
      
      db.saveMockDb();
      return res.status(201).json({ success: true, message: 'Student allocated to room successfully!', allocation: newAlloc });
    }

    // Transaction for Postgres
    await db.query('BEGIN');
    const insertQuery = `
      INSERT INTO public.tenant_hostel_allocations (room_id, student_id)
      VALUES ($1, $2) RETURNING *
    `;
    const allocRes = await db.query(insertQuery, [Number(room_id), student_id]);
    await db.query('UPDATE public.tenant_hostel_rooms SET occupied_count = occupied_count + 1 WHERE id = $1', [Number(room_id)]);
    await db.query('COMMIT');

    return res.status(201).json({ success: true, message: 'Student allocated to room successfully!', allocation: allocRes.rows[0] });

  } catch (err) {
    if (!db.isFallback || !db.isFallback()) {
      await db.query('ROLLBACK');
    }
    console.error('Allocate room error:', err);
    return res.status(500).json({ success: false, message: 'Failed to allocate hostel room' });
  }
});

// @desc    Vacate room allocation (deallocate)
// @route   POST /api/hostel/deallocate
// @access  Private (Warden and Admin only)
router.post('/deallocate', protect, authorize('HOSTEL_WARDEN', 'COLLEGE_ADMIN'), async (req, res) => {
  const { allocation_id } = req.body;

  if (!allocation_id) {
    return res.status(400).json({ success: false, message: 'Allocation ID is required' });
  }

  try {
    let alloc;
    if (db.isFallback && db.isFallback()) {
      alloc = db.getMockDb().hostel_allocations.find(a => a.id === Number(allocation_id));
    } else {
      const checkRes = await db.query('SELECT * FROM public.tenant_hostel_allocations WHERE id = $1', [Number(allocation_id)]);
      alloc = checkRes.rows[0];
    }

    if (!alloc) {
      return res.status(404).json({ success: false, message: 'Allocation record not found' });
    }

    if (db.isFallback && db.isFallback()) {
      const mockDb = db.getMockDb();
      mockDb.hostel_allocations = mockDb.hostel_allocations.filter(a => a.id !== Number(allocation_id));
      const r = mockDb.hostel_rooms.find(rm => rm.id === alloc.room_id);
      if (r) r.occupied_count = Math.max(0, (r.occupied_count || 1) - 1);
      
      db.saveMockDb();
      return res.status(200).json({ success: true, message: 'Room vacated successfully!' });
    }

    // Transaction for Postgres
    await db.query('BEGIN');
    await db.query('DELETE FROM public.tenant_hostel_allocations WHERE id = $1', [Number(allocation_id)]);
    await db.query('UPDATE public.tenant_hostel_rooms SET occupied_count = GREATEST(0, occupied_count - 1) WHERE id = $1', [alloc.room_id]);
    await db.query('COMMIT');

    return res.status(200).json({ success: true, message: 'Room vacated successfully!' });

  } catch (err) {
    if (!db.isFallback || !db.isFallback()) {
      await db.query('ROLLBACK');
    }
    console.error('Deallocate room error:', err);
    return res.status(500).json({ success: false, message: 'Failed to vacate hostel room' });
  }
});

module.exports = router;
