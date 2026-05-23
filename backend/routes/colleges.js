const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @desc    Register a new college (SaaS self-onboarding portal)
// @route   POST /api/colleges/onboard
// @access  Public
router.post('/onboard', async (req, res) => {
  const { name, subdomain, logo_url, primary_color, secondary_color, admin_email, admin_phone, plan, requested_streams } = req.body;

  if (!name || !subdomain || !admin_email) {
    return res.status(400).json({ success: false, message: 'Please provide college name, subdomain and admin email' });
  }

  if (!requested_streams || !Array.isArray(requested_streams) || requested_streams.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one requested educational stream selection is compulsory' });
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

    // Insert College details with requested streams compulsory list and initial empty assigned streams
    const result = await db.query(
      'INSERT INTO public.colleges (name, subdomain, branding_logo_url, branding_primary_color, branding_secondary_color, admin_email, admin_phone, plan, requested_streams, assigned_streams) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        name, 
        subdomain.toLowerCase().trim(), 
        logo_url || '', 
        primary_color || '#4F46E5', 
        secondary_color || '#06B6D4', 
        admin_email, 
        admin_phone || '', 
        plan || 'FREE_TRIAL',
        JSON.stringify(requested_streams),
        '[]' // empty initially until approved by Super Admin
      ]
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
      'SELECT id, name, subdomain, branding_logo_url, branding_primary_color, branding_secondary_color, plan, billing_status, requested_streams, assigned_streams FROM public.colleges WHERE subdomain = $1',
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

// @desc    Assign active streams to a college
// @route   POST /api/colleges/:id/assign-streams
// @access  Private (Super Admin only)
router.post('/:id/assign-streams', protect, async (req, res) => {
  const { assigned_streams } = req.body;

  if (!assigned_streams || !Array.isArray(assigned_streams)) {
    return res.status(400).json({ success: false, message: 'Please provide assigned_streams array' });
  }

  // Authorize: Only SUPER_ADMIN (or seeded College Admin serving as Super Admin in UI) can assign streams
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COLLEGE_ADMIN' && req.user.email !== 'admin@apex.edu') {
    return res.status(403).json({ success: false, message: 'Access denied: only Platform Super-Admins can assign academic streams' });
  }

  try {
    const result = await db.query(
      'UPDATE public.colleges SET assigned_streams = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(assigned_streams), req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Academic streams updated successfully!',
      college: result.rows[0]
    });
  } catch (err) {
    console.error('Assign streams failure:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign academic streams' });
  }
});

// @desc    Get assigned streams for the active college workspace
// @route   GET /api/colleges/streams
// @access  Private
router.get('/streams', protect, async (req, res) => {
  const tenant = req.tenantId || 'apex';
  try {
    const colRes = await db.query('SELECT assigned_streams FROM public.colleges WHERE subdomain = $1', [tenant]);
    if (colRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College tenant not found' });
    }
    const assignedIds = JSON.parse(colRes.rows[0].assigned_streams || '[]');
    
    let streamsRes;
    if (db.isFallback()) {
      streamsRes = { rows: db.getMockDb().streams || [] };
    } else {
      streamsRes = await db.query('SELECT * FROM public.tenant_streams ORDER BY id ASC');
    }
    
    const filtered = streamsRes.rows.filter(s => assignedIds.includes(s.id));
    return res.status(200).json({ success: true, nodes: filtered });
  } catch (err) {
    console.error('Fetch college streams failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch academic streams' });
  }
});

// @desc    Get departments belonging to assigned streams for the active college workspace
// @route   GET /api/colleges/departments
// @access  Private
router.get('/departments', protect, async (req, res) => {
  const tenant = req.tenantId || 'apex';
  try {
    const colRes = await db.query('SELECT assigned_streams FROM public.colleges WHERE subdomain = $1', [tenant]);
    if (colRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College tenant not found' });
    }
    const assignedIds = JSON.parse(colRes.rows[0].assigned_streams || '[]');
    
    let deptsRes;
    if (db.isFallback()) {
      deptsRes = { rows: db.getMockDb().departments || [] };
    } else {
      deptsRes = await db.query('SELECT * FROM public.tenant_departments ORDER BY id ASC');
    }
    
    const filtered = deptsRes.rows.filter(d => assignedIds.includes(Number(d.stream_id)));
    return res.status(200).json({ success: true, nodes: filtered });
  } catch (err) {
    console.error('Fetch departments failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// @desc    Get courses belonging to departments under assigned streams
// @route   GET /api/colleges/courses
// @access  Private
router.get('/courses', protect, async (req, res) => {
  const tenant = req.tenantId || 'apex';
  try {
    const colRes = await db.query('SELECT assigned_streams FROM public.colleges WHERE subdomain = $1', [tenant]);
    if (colRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College tenant not found' });
    }
    const assignedIds = JSON.parse(colRes.rows[0].assigned_streams || '[]');
    
    let deptsRes, coursesRes;
    if (db.isFallback()) {
      deptsRes = { rows: db.getMockDb().departments || [] };
      coursesRes = { rows: db.getMockDb().courses || [] };
    } else {
      deptsRes = await db.query('SELECT * FROM public.tenant_departments');
      coursesRes = await db.query('SELECT * FROM public.tenant_courses ORDER BY id ASC');
    }
    
    const activeDeptIds = deptsRes.rows.filter(d => assignedIds.includes(Number(d.stream_id))).map(d => d.id);
    const filtered = coursesRes.rows.filter(c => activeDeptIds.includes(Number(c.department_id)));
    return res.status(200).json({ success: true, nodes: filtered });
  } catch (err) {
    console.error('Fetch courses failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

// @desc    Add academic hierarchy node under assigned constraints
// @route   POST /api/colleges/hierarchy
// @access  Private
router.post('/hierarchy', protect, async (req, res) => {
  const { level, name, code, stream_id, department_id, course_id, credits, degree_level, units } = req.body;
  const tenant = req.tenantId || 'apex';
  
  if (level === 'STREAM') {
    return res.status(403).json({ success: false, message: 'Only Super-Admin has permissions to create or assign educational streams.' });
  }
  
  try {
    const colRes = await db.query('SELECT assigned_streams FROM public.colleges WHERE subdomain = $1', [tenant]);
    if (colRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College tenant not found' });
    }
    const assignedIds = JSON.parse(colRes.rows[0].assigned_streams || '[]');
    
    if (level === 'DEPARTMENT') {
      if (!assignedIds.includes(Number(stream_id))) {
        return res.status(403).json({ success: false, message: 'Cannot create department under an unassigned stream.' });
      }
      let result;
      if (db.isFallback()) {
        const mockDb = db.getMockDb();
        const newDept = { id: mockDb.departments.length + 1, stream_id: Number(stream_id), name, code, hod_id: null };
        mockDb.departments.push(newDept);
        db.saveMockDb();
        result = { rows: [newDept] };
      } else {
        result = await db.query(
          'INSERT INTO public.tenant_departments (stream_id, name, code) VALUES ($1, $2, $3) RETURNING *',
          [Number(stream_id), name, code]
        );
      }
      return res.status(201).json({ success: true, message: 'Department added successfully!', node: result.rows[0] });
    } 
    
    else if (level === 'COURSE') {
      let deptsRes;
      if (db.isFallback()) {
        deptsRes = { rows: db.getMockDb().departments || [] };
      } else {
        deptsRes = await db.query('SELECT * FROM public.tenant_departments');
      }
      const dept = deptsRes.rows.find(d => d.id === Number(department_id));
      if (!dept || !assignedIds.includes(Number(dept.stream_id))) {
        return res.status(403).json({ success: false, message: 'Cannot create course under department of an unassigned stream.' });
      }
      
      let result;
      if (db.isFallback()) {
        const mockDb = db.getMockDb();
        const newCourse = { id: mockDb.courses.length + 1, department_id: Number(department_id), name, code, credits: Number(credits || 4) };
        mockDb.courses.push(newCourse);
        db.saveMockDb();
        result = { rows: [newCourse] };
      } else {
        result = await db.query(
          'INSERT INTO public.tenant_courses (department_id, name, code, credits, degree_level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [Number(department_id), name, code, Number(credits || 4), degree_level || 'UG']
        );
      }
      return res.status(201).json({ success: true, message: 'Course added successfully!', node: result.rows[0] });
    }
    
    else if (level === 'SUBJECT') {
      let result;
      if (db.isFallback()) {
        const mockDb = db.getMockDb();
        const newSub = { id: mockDb.subjects.length + 1, course_id: Number(course_id), name, code, credits: Number(credits || 4), units: units || [] };
        mockDb.subjects.push(newSub);
        db.saveMockDb();
        result = { rows: [newSub] };
      } else {
        result = await db.query(
          'INSERT INTO public.tenant_subjects (course_id, name, code, credits, units) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [Number(course_id), name, code, Number(credits || 4), JSON.stringify(units || [])]
        );
      }
      return res.status(201).json({ success: true, message: 'Subject added successfully!', node: result.rows[0] });
    }
    
    return res.status(400).json({ success: false, message: 'Invalid hierarchy level' });
  } catch (err) {
    console.error('Add hierarchy failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to add hierarchy node' });
  }
});

// @desc    Get restricted unified hierarchy tree for active college workspace
// @route   GET /api/colleges/hierarchy-tree
// @access  Private
router.get('/hierarchy-tree', protect, async (req, res) => {
  const tenant = req.tenantId || 'apex';
  try {
    const colRes = await db.query('SELECT assigned_streams FROM public.colleges WHERE subdomain = $1', [tenant]);
    if (colRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'College tenant not found' });
    }
    const assignedIds = JSON.parse(colRes.rows[0].assigned_streams || '[]');
    
    let streams, depts, courses, subjects;
    if (db.isFallback()) {
      const mockDb = db.getMockDb();
      streams = mockDb.streams || [];
      depts = mockDb.departments || [];
      courses = mockDb.courses || [];
      subjects = mockDb.subjects || [];
    } else {
      const sRes = await db.query('SELECT * FROM public.tenant_streams ORDER BY id ASC');
      const dRes = await db.query('SELECT * FROM public.tenant_departments ORDER BY id ASC');
      const cRes = await db.query('SELECT * FROM public.tenant_courses ORDER BY id ASC');
      const subRes = await db.query('SELECT * FROM public.tenant_subjects ORDER BY id ASC');
      streams = sRes.rows;
      depts = dRes.rows;
      courses = cRes.rows;
      subjects = subRes.rows;
    }
    
    const activeStreams = streams.filter(s => assignedIds.includes(s.id));
    const tree = activeStreams.map(s => {
      const streamDepts = depts.filter(d => Number(d.stream_id) === s.id);
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        level: 'STREAM',
        departments: streamDepts.map(d => {
          const deptCourses = courses.filter(c => Number(c.department_id) === d.id);
          return {
            id: d.id,
            name: d.name,
            code: d.code,
            level: 'DEPARTMENT',
            courses: deptCourses.map(c => {
              const courseSubs = subjects.filter(sub => Number(sub.course_id) === c.id);
              return {
                id: c.id,
                name: c.name,
                code: c.code,
                credits: c.credits,
                level: 'COURSE',
                subjects: courseSubs.map(sub => ({
                  id: sub.id,
                  name: sub.name,
                  code: sub.code,
                  credits: sub.credits,
                  units: typeof sub.units === 'string' ? JSON.parse(sub.units) : (sub.units || []),
                  level: 'SUBJECT'
                }))
              };
            })
          };
        })
      };
    });
    
    return res.status(200).json({ success: true, tree });
  } catch (err) {
    console.error('Fetch hierarchy tree failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to construct hierarchy tree' });
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
