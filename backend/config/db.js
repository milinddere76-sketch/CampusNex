const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const net = require('net');

// Loaded from Environment
let dbConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'campusnex',
  connectionTimeoutMillis: 2000 // Fail fast in 2 seconds if PG is not active
};

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.substring(1),
      connectionTimeoutMillis: 2000
    };
  } catch (err) {
    console.error('⚠️ Failed to parse DATABASE_URL environment variable:', err);
  }
}

let pool = null;
let useFallback = false;
let fallbackDbPath = path.join(__dirname, '..', 'database_fallback.json');

// In-Memory/JSON File Database Fallback
let mockDb = {
  colleges: [],
  billing_transactions: [],
  support_tickets: [],
  users: [],
  departments: [],
  courses: [],
  semesters: [],
  classes: [],
  students: [],
  attendance: [],
  assignments: [],
  assignment_submissions: [],
  exams: [],
  exam_results: [],
  fees: [],
  fee_payments: [],
  library_books: [],
  library_issues: [],
  hostel_rooms: [],
  hostel_allocations: [],
  hostel_visitors: [],
  transport_buses: [],
  transport_routes: [],
  transport_allocations: [],
  placements: [],
  placement_applications: [],
  chat_messages: [],
  notices: [],
  admissions: [],
  job_openings: [],
  job_applications: [],
  interview_scores: [],
  streams: [],
  subjects: [],
  leaves: [],
  offline_sync_queue: []
};

// Initialize Mock Fallback Seed Data
function initMockDb() {
  if (fs.existsSync(fallbackDbPath)) {
    try {
      mockDb = JSON.parse(fs.readFileSync(fallbackDbPath, 'utf8'));
      console.log('📦 Fallback JSON Database loaded from ' + fallbackDbPath);

      // Robust Dynamic Backfill Logic for existing offline database stores
      let modified = false;
      if (mockDb.colleges) {
        mockDb.colleges.forEach(c => {
          if (c.id === 1) {
            if (!c.requested_streams) { c.requested_streams = '[1,2]'; modified = true; }
            if (!c.assigned_streams) { c.assigned_streams = '[1,2]'; modified = true; }
          }
          if (c.id === 2) {
            if (!c.requested_streams) { c.requested_streams = '[6]'; modified = true; }
            if (!c.assigned_streams) { c.assigned_streams = '[6]'; modified = true; }
          }
        });
      }
      if (mockDb.departments) {
        if (mockDb.departments[0] && mockDb.departments[0].stream_id === undefined) {
          mockDb.departments[0].stream_id = 2; // Engineering
          modified = true;
        }
        if (mockDb.departments[1] && mockDb.departments[1].stream_id === undefined) {
          mockDb.departments[1].stream_id = 2; // Engineering
          modified = true;
        }
        if (!mockDb.departments.find(d => d.id === 3)) {
          mockDb.departments.push({ id: 3, stream_id: 1, name: 'Physics & Applied Sciences', code: 'PHY', hod_id: null });
          modified = true;
        }
      }
      if (!mockDb.hostel_rooms || mockDb.hostel_rooms.length === 0) {
        mockDb.hostel_rooms = [
          { id: 1, block_name: 'Aryabhata Block A', room_number: '203', capacity: 2, occupied_count: 1, fee_amount: 1500.00 },
          { id: 2, block_name: 'Aryabhata Block A', room_number: '204', capacity: 2, occupied_count: 0, fee_amount: 1500.00 },
          { id: 3, block_name: 'Aryabhata Block A', room_number: '205', capacity: 3, occupied_count: 0, fee_amount: 1200.00 },
          { id: 4, block_name: 'Vashishta Block B', room_number: '101', capacity: 2, occupied_count: 0, fee_amount: 1600.00 }
        ];
        modified = true;
      }
      if (!mockDb.hostel_allocations) {
        mockDb.hostel_allocations = [
          { id: 1, room_id: 1, student_id: '44444444-4444-4444-4444-444444444444', allocated_at: new Date() }
        ];
        modified = true;
      }
      if (!mockDb.hostel_visitors) {
        mockDb.hostel_visitors = [];
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(fallbackDbPath, JSON.stringify(mockDb, null, 2), 'utf8');
        console.log('🌱 Fallback database updated with new multi-stream fields.');
      }
      return;
    } catch (e) {
      console.error('⚠️ Failed to parse fallback DB, re-generating...', e);
    }
  }

  console.log('🌱 Initializing Fallback Database with Seed Data...');
  
  // Colleges
  mockDb.colleges = [
    { id: 1, name: 'Apex Institute of Technology', subdomain: 'apex', domain: 'apex.campusone.app', branding_logo_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop&q=80', branding_primary_color: '#4F46E5', branding_secondary_color: '#06B6D4', admin_email: 'admin@apex.edu', admin_phone: '+1 (555) 019-2834', plan: 'PREMIUM', billing_status: 'ACTIVE', requested_streams: '[1,2]', assigned_streams: '[1,2]', created_at: new Date() },
    { id: 2, name: 'Beacon University of Medical Sciences', subdomain: 'beacon', domain: 'beacon.campusone.app', branding_logo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop&q=80', branding_primary_color: '#059669', branding_secondary_color: '#10B981', admin_email: 'admin@beacon.edu', admin_phone: '+1 (555) 018-9900', plan: 'ENTERPRISE', billing_status: 'ACTIVE', requested_streams: '[6]', assigned_streams: '[6]', created_at: new Date() }
  ];

  // Billing
  mockDb.billing_transactions = [
    { id: 1, college_id: 1, amount: 1200.00, currency: 'USD', payment_method: 'STRIPE', transaction_id: 'txn_apex_2026_01', status: 'SUCCESS', paid_at: new Date() }
  ];

  // Support
  mockDb.support_tickets = [
    { id: 1, college_id: 1, subject: 'Payment receipt mismatch', description: 'We paid our premium tier billing but the invoice shows partial discount is missing.', status: 'OPEN', created_at: new Date() }
  ];

  // Users
  const salt = bcrypt.genSaltSync(10);
  const hashedPw = bcrypt.hashSync('password123', salt);

  mockDb.users = [
    { id: '77777777-7777-7777-7777-777777777777', email: 'admin@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0001', full_name: 'Dr. Donald Vance', role: 'COLLEGE_ADMIN', device_id: 'dev_admin_mac', is_active: true },
    { id: '11111111-1111-1111-1111-111111111111', email: 'principal@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0002', full_name: 'Dr. Arthur Pendelton', role: 'PRINCIPAL', device_id: 'dev_principal_ipad', is_active: true, assigned_streams: '[1,2]' },
    { id: '22222222-2222-2222-2222-222222222222', email: 'hod.cs@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0003', full_name: 'Dr. Elizabeth Hopper', role: 'HOD', device_id: 'dev_hod_desktop', is_active: true },
    { id: '33333333-3333-3333-3333-333333333333', email: 'faculty.smith@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0004', full_name: 'Prof. Marcus Smith', role: 'FACULTY', device_id: 'dev_fac_phone', is_active: true },
    { id: '44444444-4444-4444-4444-444444444444', email: 'student.alex@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0005', full_name: 'Alex Doe', role: 'STUDENT', device_id: 'dev_student_alex_android', is_active: true },
    { id: '55555555-5555-5555-5555-555555555555', email: 'student.sam@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0006', full_name: 'Samantha Jenkins', role: 'STUDENT', device_id: 'dev_student_sam_iphone', is_active: true },
    { id: '66666666-6666-6666-6666-666666666666', email: 'parent.doe@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0007', full_name: 'Robert Doe', role: 'PARENT', device_id: 'dev_parent_phone', is_active: true },
    { id: '88888888-8888-8888-8888-888888888888', email: 'librarian@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0008', full_name: 'Albert Bookman', role: 'LIBRARIAN', device_id: 'dev_lib_desk', is_active: true },
    { id: '99999999-9999-9999-9999-999999999999', email: 'warden@apex.edu', password_hash: hashedPw, phone: '+1 (555) 010-0009', full_name: 'Warden Jenkins', role: 'HOSTEL_WARDEN', device_id: 'dev_warden_tab', is_active: true }
  ];

  // Departments
  mockDb.departments = [
    { id: 1, stream_id: 2, name: 'Computer Science & Engineering', code: 'CSE', hod_id: '22222222-2222-2222-2222-222222222222' },
    { id: 2, stream_id: 2, name: 'Electrical & Electronics Engineering', code: 'EEE', hod_id: null },
    { id: 3, stream_id: 1, name: 'Physics & Applied Sciences', code: 'PHY', hod_id: null }
  ];

  // Courses
  mockDb.courses = [
    { id: 1, department_id: 1, name: 'Data Structures and Algorithms', code: 'CS-201', credits: 4 },
    { id: 2, department_id: 1, name: 'Database Management Systems', code: 'CS-302', credits: 4 },
    { id: 3, department_id: 2, name: 'Signals and Systems', code: 'EE-204', credits: 3 }
  ];

  // Semesters
  mockDb.semesters = [
    { id: 1, name: 'Fall Semester 2026', start_date: '2026-08-01', end_date: '2026-12-15', is_active: true },
    { id: 2, name: 'Spring Semester 2027', start_date: '2027-01-10', end_date: '2027-05-20', is_active: false }
  ];

  // Classes
  mockDb.classes = [
    { id: 1, course_id: 1, semester_id: 1, faculty_id: '33333333-3333-3333-3333-333333333333', room_number: 'Lab 3, CS Block', timetable_day: 'MONDAY', start_time: '09:00', end_time: '10:30' },
    { id: 2, course_id: 2, semester_id: 1, faculty_id: '33333333-3333-3333-3333-333333333333', room_number: 'Room 102, CSE Block', timetable_day: 'WEDNESDAY', start_time: '11:00', end_time: '12:30' },
    { id: 3, course_id: 3, semester_id: 1, faculty_id: '22222222-2222-2222-2222-222222222222', room_number: 'Room 304, EEE Block', timetable_day: 'TUESDAY', start_time: '14:00', end_time: '15:30' }
  ];

  // Students
  mockDb.students = [
    { user_id: '44444444-4444-4444-4444-444444444444', roll_number: 'APEX-2024-CSE-004', department_id: 1, admission_year: 2024, current_semester_id: 1, parent_id: '66666666-6666-6666-6666-666666666666', cgpa: 3.84 },
    { user_id: '55555555-5555-5555-5555-555555555555', roll_number: 'APEX-2024-CSE-012', department_id: 1, admission_year: 2024, current_semester_id: 1, parent_id: null, cgpa: 3.25 }
  ];

  // Attendance
  mockDb.attendance = [
    { id: 1, student_id: '44444444-4444-4444-4444-444444444444', class_id: 1, date: '2026-05-18', status: 'PRESENT', method: 'QR', verified_by_faculty_id: '33333333-3333-3333-3333-333333333333' },
    { id: 2, student_id: '55555555-5555-5555-5555-555555555555', class_id: 1, date: '2026-05-18', status: 'ABSENT', method: 'MANUAL', verified_by_faculty_id: '33333333-3333-3333-3333-333333333333' },
    { id: 3, student_id: '44444444-4444-4444-4444-444444444444', class_id: 2, date: '2026-05-20', status: 'PRESENT', method: 'GEOFENCE', verified_by_faculty_id: '33333333-3333-3333-3333-333333333333' },
    { id: 4, student_id: '55555555-5555-5555-5555-555555555555', class_id: 2, date: '2026-05-20', status: 'PRESENT', method: 'QR', verified_by_faculty_id: '33333333-3333-3333-3333-333333333333' }
  ];

  // Assignments
  mockDb.assignments = [
    { id: 1, class_id: 1, title: 'Red-Black Tree Balance Implementation', description: 'Write clean implementation of RB-Tree insertion algorithms in Java or C++', due_date: '2026-05-28T23:59:00Z', max_points: 100, attachment_url: 'https://apex.campusone.app/storage/assignments/rbtree.pdf' },
    { id: 2, class_id: 2, title: 'SQL Normalization Assignment', description: 'Complete normalization tables up to 3NF & BCNF for given transactional fields.', due_date: '2026-05-30T18:00:00Z', max_points: 50, attachment_url: 'https://apex.campusone.app/storage/assignments/sql_norm.pdf' }
  ];

  // Submissions
  mockDb.assignment_submissions = [
    { id: 1, assignment_id: 2, student_id: '44444444-4444-4444-4444-444444444444', submitted_at: new Date(), file_url: 'https://apex.campusone.app/storage/submissions/alex_sql.pdf', points_obtained: 48, feedback: 'Excellent work! Database keys identified correctly.', is_graded: true }
  ];

  // Exams
  mockDb.exams = [
    { id: 1, class_id: 1, title: 'DSA Midterm Examination', date: '2026-05-10', max_marks: 100 }
  ];
  mockDb.exam_results = [
    { id: 1, exam_id: 1, student_id: '44444444-4444-4444-4444-444444444444', marks_obtained: 92, grade: 'A+', remarks: 'Outstanding problem-solving logic' },
    { id: 2, exam_id: 1, student_id: '55555555-5555-5555-5555-555555555555', marks_obtained: 76, grade: 'B', remarks: 'Needs optimization study on trees' }
  ];

  // Fees
  mockDb.fees = [
    { id: 1, student_id: '44444444-4444-4444-4444-444444444444', title: 'Tuition Fees - Term 1', amount_due: 4500.00, amount_paid: 4500.00, status: 'PAID', billing_category: 'TUITION', due_date: '2026-05-01' },
    { id: 2, student_id: '44444444-4444-4444-4444-444444444444', title: 'Hostel Mess Charges', amount_due: 800.00, amount_paid: 300.00, status: 'PARTIAL', billing_category: 'HOSTEL', due_date: '2026-05-30' },
    { id: 3, student_id: '55555555-5555-5555-5555-555555555555', title: 'Tuition Fees - Term 1', amount_due: 4500.00, amount_paid: 0.00, status: 'UNPAID', billing_category: 'TUITION', due_date: '2026-05-01' }
  ];

  mockDb.fee_payments = [
    { id: 1, fee_id: 1, payment_method: 'STRIPE', transaction_id: 'ch_stripe_apex_tuition_01', amount_paid: 4500.00, paid_at: new Date() },
    { id: 2, fee_id: 2, payment_method: 'UPI', transaction_id: 'upi_pay_apex_mess_01', amount_paid: 300.00, paid_at: new Date() }
  ];

  // Library
  mockDb.library_books = [
    { id: 1, title: 'Introduction to Algorithms (CLRS)', author: 'Thomas H. Cormen', barcode_isbn: '9780262033848', total_copies: 12, available_copies: 11 },
    { id: 2, title: 'Database System Concepts', author: 'Abraham Silberschatz', barcode_isbn: '9780073523323', total_copies: 8, available_copies: 8 }
  ];
  mockDb.library_issues = [
    { id: 1, book_id: 1, student_id: '44444444-4444-4444-4444-444444444444', issued_at: new Date(), due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), returned_at: null, fine_amount: 0.00, fine_status: 'NONE' }
  ];

  // Hostel
  mockDb.hostel_rooms = [
    { id: 1, block_name: 'Aryabhata Block A', room_number: '203', capacity: 2, occupied_count: 1, fee_amount: 1500.00 },
    { id: 2, block_name: 'Aryabhata Block A', room_number: '204', capacity: 2, occupied_count: 0, fee_amount: 1500.00 }
  ];
  mockDb.hostel_allocations = [
    { id: 1, room_id: 1, student_id: '44444444-4444-4444-4444-444444444444', allocated_at: new Date() }
  ];
  mockDb.hostel_visitors = [];

  // Transport
  mockDb.transport_buses = [
    { id: 1, bus_number: 'NY-72B-9102', driver_name: 'Mr. Jerry Nelson', driver_phone: '+1 (555) 012-9844', capacity: 40, gps_latitude: 40.7128, gps_longitude: -74.0060 }
  ];
  mockDb.transport_routes = [
    { id: 1, route_name: 'Downtown to North Campus Line', start_point: 'Grand Station', end_point: 'Apex North Gate', stops: [{ name: 'Metro Hub', lat: 40.7150, lng: -74.0080 }, { name: 'Central Library', lat: 40.7210, lng: -74.0120 }] }
  ];
  mockDb.transport_allocations = [
    { id: 1, bus_id: 1, route_id: 1, student_id: '55555555-5555-5555-5555-555555555555', pickup_point: 'Central Library' }
  ];

  // Placement
  mockDb.placements = [
    { id: 1, company_name: 'Google', job_title: 'Associate Software Engineer', eligibility_criteria_cgpa: 3.50, package_lpa: 24.50, interview_date: '2026-06-15', eligibility_departments: [1] },
    { id: 2, company_name: 'Tesla', job_title: 'Embedded Control Systems Intern', eligibility_criteria_cgpa: 3.20, package_lpa: 18.00, interview_date: '2026-06-20', eligibility_departments: [1, 2] }
  ];
  mockDb.placement_applications = [
    { id: 1, placement_id: 1, student_id: '44444444-4444-4444-4444-444444444444', resume_url: 'https://apex.campusone.app/storage/resumes/alex_doe_resume.pdf', status: 'APPLIED' }
  ];

  // Notices
  mockDb.notices = [
    { id: 1, title: 'Midterm Review Seminar', content: 'Prof Marcus is conducting a DSA review lecture on Binary Search Tree rebalancing algorithms this Friday evening at 5 PM in Room 102. Attendance is highly recommended.', audience_roles: ['STUDENT'], attachment_url: 'https://apex.campusone.app/notices/dsa_session.pdf', created_at: new Date() },
    { id: 2, title: 'Annual Cultural Tech Fest 2026', content: 'Registrations are now officially open for ApexTechFest 2026. Cash rewards up to $15,000 for standard hackathon submissions.', audience_roles: ['STUDENT', 'FACULTY', 'COLLEGE_ADMIN'], attachment_url: null, created_at: new Date() }
  ];

  // Chats
  mockDb.chat_messages = [
    { id: 1, sender_id: '33333333-3333-3333-3333-333333333333', receiver_id: '44444444-4444-4444-4444-444444444444', message: 'Hey Alex, please submit your Red-Black tree insertion code by tomorrow evening.', sent_at: new Date(Date.now() - 3 * 3600000), is_read: true },
    { id: 2, sender_id: '44444444-4444-4444-4444-444444444444', receiver_id: '33333333-3333-3333-3333-333333333333', message: 'Yes Professor, finishing up the balance node rotation tests now. Will send PDF submission soon.', sent_at: new Date(Date.now() - 2 * 3600000), is_read: false }
  ];

  // Admissions Seed
  mockDb.admissions = [
    { id: 1, full_name: 'Rohan Sharma', dob: '2006-04-12', gender: 'MALE', address: '124 Park Ave, Delhi', mobile: '+91 9876543210', email: 'rohan.sharma@gmail.com', aadhaar_id: '123456789012', previous_education: 'High School CBSE', marks_percentage: 92.40, category: 'OBC', course_id: 1, status: 'CONFIRMED', roll_number: 'APEX-2026-CSE-109', class_id: 1, payment_status: 'PAID', created_at: new Date() },
    { id: 2, full_name: 'Priya Nair', dob: '2006-09-25', gender: 'FEMALE', address: '54 Gandhi St, Bangalore', mobile: '+91 8765432109', email: 'priya.nair@gmail.com', aadhaar_id: '987654321098', previous_education: 'State Board Karnataka', marks_percentage: 88.50, category: 'GENERAL', course_id: 1, status: 'SUBMITTED', roll_number: null, class_id: null, payment_status: 'UNPAID', created_at: new Date() },
    { id: 3, full_name: 'Aditya Verma', dob: '2005-11-05', gender: 'MALE', address: '78 Nehru Road, Mumbai', mobile: '+91 7654321098', email: 'aditya.v@gmail.com', aadhaar_id: '456789012345', previous_education: 'CBSE Class XII', marks_percentage: 95.00, category: 'GENERAL', course_id: 2, status: 'REVIEW', roll_number: null, class_id: null, payment_status: 'PAID', created_at: new Date() }
  ];

  // Job Openings Seed
  mockDb.job_openings = [
    { id: 1, role_title: 'LECTURER', department_id: 1, eligibility: 'M.Tech in CS/IT with first-class grades. Teaching experience is optional.', salary_lpa: 8.50, last_date: '2026-06-30', interview_mode: 'ONLINE', created_at: new Date() },
    { id: 2, role_title: 'ASSOCIATE_PROFESSOR', department_id: 1, eligibility: 'Ph.D. in Computer Science with minimum 8 publications and 5 years experience.', salary_lpa: 18.00, last_date: '2026-06-15', interview_mode: 'OFFLINE', created_at: new Date() },
    { id: 3, role_title: 'LIBRARIAN', department_id: 2, eligibility: 'Masters in Library Science, well versed with digital barcode systems.', salary_lpa: 6.00, last_date: '2026-07-10', interview_mode: 'OFFLINE', created_at: new Date() }
  ];

  // Job Applications Seed
  mockDb.job_applications = [
    { id: 1, job_opening_id: 1, full_name: 'Dr. Sarah Connor', qualification: 'Ph.D in AI/ML', experience_years: 4, email: 'sarah.connor@gmail.com', phone: '+1 (555) 901-2345', resume_url: 'https://campusnex.fly.dev/uploads/resumes/sarah_resume.pdf', status: 'SHORTLISTED', remarks: 'Strong research background in deep learning models.', created_at: new Date() },
    { id: 2, job_opening_id: 2, full_name: 'Prof. Alan Turing', qualification: 'Ph.D. in Computer Science', experience_years: 12, email: 'alan.turing@gmail.com', phone: '+1 (555) 890-1234', resume_url: 'https://campusnex.fly.dev/uploads/resumes/alan_resume.pdf', status: 'INTERVIEWED', remarks: 'Pioneer in computing algorithms, excellent panel marks.', created_at: new Date() },
    { id: 3, job_opening_id: 1, full_name: 'John Doe', qualification: 'B.Tech in CS', experience_years: 1, email: 'john.recruits@gmail.com', phone: '+1 (555) 789-0123', resume_url: null, status: 'APPLIED', remarks: 'Entry level candidate.', created_at: new Date() }
  ];

  // Interview Scores Seed
  mockDb.interview_scores = [
    { id: 1, application_id: 2, interviewer_role: 'HOD', score: 10, comments: 'Outstanding candidate. Incomparable experience.', created_at: new Date() },
    { id: 2, application_id: 2, interviewer_role: 'PRINCIPAL', score: 9, comments: 'Highly recommended for immediate appointment.', created_at: new Date() },
    { id: 3, application_id: 1, interviewer_role: 'HOD', score: 8, comments: 'Good coding ability, demonstrated solid AI knowledge.', created_at: new Date() }
  ];

  // Streams Seed
  mockDb.streams = [
    { id: 1, name: 'Science', code: 'SCI', created_at: new Date() },
    { id: 2, name: 'Engineering', code: 'ENG', created_at: new Date() },
    { id: 3, name: 'Commerce', code: 'COM', created_at: new Date() },
    { id: 4, name: 'Arts & Humanities', code: 'ART', created_at: new Date() },
    { id: 5, name: 'Law', code: 'LAW', created_at: new Date() },
    { id: 6, name: 'Medical & Health', code: 'MED', created_at: new Date() },
    { id: 7, name: 'Agriculture', code: 'AGR', created_at: new Date() },
    { id: 8, name: 'Management', code: 'MGT', created_at: new Date() },
    { id: 9, name: 'Design & Architecture', code: 'DSG', created_at: new Date() },
    { id: 10, name: 'Vocational', code: 'VOC', created_at: new Date() }
  ];

  // Subjects Seed
  mockDb.subjects = [
    { id: 1, course_id: 1, name: 'Programming Fundamentals', code: 'CS-201-SUB1', credits: 4, units: ["Syntax & Variables", "Control Flows", "Arrays", "Functions"], faculty_id: '33333333-3333-3333-3333-333333333333', created_at: new Date() },
    { id: 2, course_id: 1, name: 'Object-Oriented Design', code: 'CS-201-SUB2', credits: 4, units: ["Classes & Objects", "Inheritance", "Polymorphism", "Exception Handling"], faculty_id: '33333333-3333-3333-3333-333333333333', created_at: new Date() },
    { id: 3, course_id: 2, name: 'SQL Relational Schemas', code: 'CS-302-SUB1', credits: 4, units: ["ER Models", "Normalization (1NF-3NF)", "Joins & Subqueries", "Indexing"], faculty_id: '22222222-2222-2222-2222-222222222222', created_at: new Date() }
  ];

  // Leaves Seed
  mockDb.leaves = [
    { id: 1, user_id: '44444444-4444-4444-4444-444444444444', dates: 'May 26th - May 28th', reason: 'Attending National Hackathon Championship', status: 'PENDING', created_at: new Date() },
    { id: 2, user_id: '33333333-3333-3333-3333-333333333333', dates: 'June 2nd - June 3rd', reason: 'Medical check-up & wellness rest', status: 'PENDING', created_at: new Date() }
  ];

  mockDb.offline_sync_queue = [];

  saveMockDb();
}

function saveMockDb() {
  fs.writeFileSync(fallbackDbPath, JSON.stringify(mockDb, null, 2), 'utf8');
}

// Database Connection Attempt
const testPoolConnection = async () => {
  console.log('🔍 Checking PostgreSQL port availability...');
  const checkPostgresPort = () => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      socket.setTimeout(1000); // 1-second connection timeout

      socket.on('connect', () => {
        socket.destroy();
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      });

      const handleFail = () => {
        socket.destroy();
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      };

      socket.on('error', handleFail);
      socket.on('timeout', handleFail);

      socket.connect(dbConfig.port, dbConfig.host);
    });
  };

  const isPgOnline = await checkPostgresPort();

  if (isPgOnline) {
    try {
      pool = new Pool(dbConfig);
      // Attempt small query to test connection
      const res = await pool.query('SELECT NOW()');
      console.log('🚀 PostgreSQL connected successfully at ' + res.rows[0].now);

      // Perform Automated Auto-migration and Auto-seeding
      const tableCheck = await pool.query("SELECT to_regclass('public.colleges') AS exists");
      if (!tableCheck.rows[0].exists) {
        console.log('🌱 Empty database detected! Running automated migrations and seeding...');
        const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
        const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

        if (fs.existsSync(schemaPath) && fs.existsSync(seedPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          const seedSql = fs.readFileSync(seedPath, 'utf8');

          console.log('📊 Injecting schemas...');
          await pool.query(schemaSql);
          
          console.log('🌾 Populating seed records...');
          await pool.query(seedSql);
          
          console.log('🚀 Automated database provisioning completed successfully!');
        } else {
          console.warn('⚠️ Migration SQL files not found in container at paths:');
          console.warn(` - Schema: ${schemaPath}`);
          console.warn(` - Seed: ${seedPath}`);
        }
      } else {
        console.log('✅ PostgreSQL database tables verified.');
      }
    } catch (err) {
      console.error('⚠️ PostgreSQL connection failed or migration errored:', err);
      console.log('⚠️ Activating local JSON DB database fallback engine.');
      useFallback = true;
      initMockDb();
    }
  } else {
    console.log('⚠️ PostgreSQL port is unreachable. Instantly activating local JSON DB database fallback engine.');
    useFallback = true;
    initMockDb();
  }
};

testPoolConnection();

// Core Query executor compatible with both PostgreSQL and Fallback Database
const query = async (text, params) => {
  if (useFallback) {
    return mockQuery(text, params);
  } else {
    return pool.query(text, params);
  }
};

// Fallback JSON-DB Query Engine Simulator
// Supports lightweight SQL pattern queries used in authentication and dashboards
const mockQuery = async (text, params = []) => {
  const normText = text.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Return wrapper matching standard pg result format
  const result = { rows: [], rowCount: 0 };

  try {
    // 1. SELECT * FROM public.colleges WHERE subdomain = $1
    if (normText.includes('select * from public.colleges where subdomain =')) {
      const sub = params[0];
      result.rows = mockDb.colleges.filter(c => c.subdomain === sub);
    }
    // 2. SELECT * FROM public.colleges
    else if (normText.includes('select * from public.colleges')) {
      result.rows = mockDb.colleges;
    }
    // 3. SELECT * FROM public.tenant_users WHERE email = $1
    else if (normText.includes('select * from public.tenant_users where email =')) {
      const email = params[0];
      result.rows = mockDb.users.filter(u => u.email.toLowerCase() === email.toLowerCase());
    }
    // 4. SELECT * FROM public.tenant_users WHERE id = $1
    else if (normText.includes('select * from public.tenant_users where id =')) {
      const id = params[0];
      result.rows = mockDb.users.filter(u => u.id === id);
    }
    // 5. SELECT * FROM public.tenant_students WHERE user_id = $1
    else if (normText.includes('select * from public.tenant_students where user_id =')) {
      const uid = params[0];
      result.rows = mockDb.students.filter(s => s.user_id === uid);
    }
    // 6. INSERT INTO public.colleges
    else if (normText.includes('insert into public.colleges')) {
      // params: [name, subdomain, logo, primary_color, secondary_color, admin_email, admin_phone, plan, requested_streams, assigned_streams]
      const newCol = {
        id: mockDb.colleges.length + 1,
        name: params[0],
        subdomain: params[1],
        domain: `${params[1]}.campusone.app`,
        branding_logo_url: params[2],
        branding_primary_color: params[3] || '#4F46E5',
        branding_secondary_color: params[4] || '#06B6D4',
        admin_email: params[5],
        admin_phone: params[6],
        plan: params[7] || 'FREE_TRIAL',
        billing_status: 'ACTIVE',
        requested_streams: params[8] || '[]',
        assigned_streams: params[9] || '[]',
        created_at: new Date()
      };
      mockDb.colleges.push(newCol);
      saveMockDb();
      result.rows = [newCol];
    }
    // 6b. UPDATE public.colleges SET assigned_streams
    else if (normText.includes('update public.colleges set assigned_streams =')) {
      const assigned = params[0];
      const id = parseInt(params[1]);
      const college = mockDb.colleges.find(c => c.id === id);
      if (college) {
        college.assigned_streams = assigned;
        saveMockDb();
        result.rows = [college];
      }
    }
    // 7. INSERT INTO public.tenant_users
    else if (normText.includes('insert into public.tenant_users')) {
      // params: [id, email, password_hash, phone, full_name, role, assigned_streams]
      const newUser = {
        id: params[0],
        email: params[1],
        password_hash: params[2],
        phone: params[3],
        full_name: params[4],
        role: params[5],
        device_id: null,
        is_active: true,
        assigned_streams: params[6] || '[]',
        created_at: new Date()
      };
      mockDb.users.push(newUser);
      saveMockDb();
      result.rows = [newUser];
    }
    // 8. SELECT * FROM public.tenant_attendance
    else if (normText.includes('select * from public.tenant_attendance')) {
      result.rows = mockDb.attendance;
    }
    // 9. INSERT INTO public.tenant_attendance
    else if (normText.includes('insert into public.tenant_attendance')) {
      // params: [student_id, class_id, date, status, method, verified_by_faculty_id]
      const newAtt = {
        id: mockDb.attendance.length + 1,
        student_id: params[0],
        class_id: params[1],
        date: params[2],
        status: params[3],
        method: params[4],
        verified_by_faculty_id: params[5],
        created_at: new Date()
      };
      mockDb.attendance.push(newAtt);
      saveMockDb();
      result.rows = [newAtt];
    }
    // 10. SELECT * FROM public.tenant_fees
    else if (normText.includes('select * from public.tenant_fees')) {
      if (params.length > 0) {
        result.rows = mockDb.fees.filter(f => f.student_id === params[0]);
      } else {
        result.rows = mockDb.fees;
      }
    }
    // 11. SELECT * FROM public.tenant_notices
    else if (normText.includes('select * from public.tenant_notices')) {
      result.rows = mockDb.notices;
    }
    // 12. SELECT * FROM public.tenant_chat_messages
    else if (normText.includes('select * from public.tenant_chat_messages')) {
      const uid = params[0];
      result.rows = mockDb.chat_messages.filter(m => m.sender_id === uid || m.receiver_id === uid);
    }
    // 13. INSERT INTO public.tenant_chat_messages
    else if (normText.includes('insert into public.tenant_chat_messages')) {
      const newMsg = {
        id: mockDb.chat_messages.length + 1,
        sender_id: params[0],
        receiver_id: params[1],
        message: params[2],
        file_url: params[3] || null,
        sent_at: new Date(),
        is_read: false
      };
      mockDb.chat_messages.push(newMsg);
      saveMockDb();
      result.rows = [newMsg];
    }
    // 13a. INSERT INTO public.tenant_admissions
    else if (normText.includes('insert into public.tenant_admissions')) {
      const newAdm = {
        id: mockDb.admissions.length + 1,
        full_name: params[0],
        dob: params[1],
        gender: params[2],
        address: params[3],
        mobile: params[4],
        email: params[5],
        aadhaar_id: params[6],
        previous_education: params[7],
        marks_percentage: parseFloat(params[8]),
        category: params[9] || 'GENERAL',
        course_id: parseInt(params[10]),
        status: 'SUBMITTED',
        roll_number: null,
        class_id: null,
        payment_status: params[11] || 'UNPAID',
        created_at: new Date()
      };
      mockDb.admissions.push(newAdm);
      saveMockDb();
      result.rows = [newAdm];
    }
    // 13b. UPDATE public.tenant_admissions
    else if (normText.includes('update public.tenant_admissions')) {
      const id = params[params.length - 1];
      const adm = mockDb.admissions.find(a => a.id === parseInt(id));
      if (adm) {
        if (params.length === 4) {
          const [status, roll_number, class_id] = params;
          adm.status = status;
          adm.roll_number = roll_number;
          adm.class_id = class_id ? parseInt(class_id) : null;
          if (status === 'CONFIRMED') {
            adm.payment_status = 'PAID';
            const existingUser = mockDb.users.find(u => u.email === adm.email);
            if (!existingUser) {
              const newId = require('uuid').v4();
              mockDb.users.push({
                id: newId,
                email: adm.email,
                password_hash: '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', // password123
                phone: adm.mobile,
                full_name: adm.full_name,
                role: 'STUDENT',
                device_id: null,
                is_active: true
              });
              mockDb.students.push({
                user_id: newId,
                roll_number: roll_number || `APEX-2026-CSE-${100 + adm.id}`,
                department_id: 1,
                admission_year: 2026,
                current_semester_id: 1,
                parent_id: null,
                cgpa: 0.00
              });
            }
          }
        } else if (params.length === 2) {
          const [status] = params;
          adm.status = status;
        }
      }
      saveMockDb();
      result.rows = [];
    }
    // 13c. INSERT INTO public.tenant_job_openings
    else if (normText.includes('insert into public.tenant_job_openings')) {
      const newJob = {
        id: mockDb.job_openings.length + 1,
        role_title: params[0],
        department_id: parseInt(params[1]),
        eligibility: params[2],
        salary_lpa: parseFloat(params[3]),
        last_date: params[4],
        interview_mode: params[5] || 'ONLINE',
        created_at: new Date()
      };
      mockDb.job_openings.push(newJob);
      saveMockDb();
      result.rows = [newJob];
    }
    // 13d. INSERT INTO public.tenant_job_applications
    else if (normText.includes('insert into public.tenant_job_applications')) {
      const newApp = {
        id: mockDb.job_applications.length + 1,
        job_opening_id: parseInt(params[0]),
        full_name: params[1],
        qualification: params[2],
        experience_years: parseInt(params[3] || 0),
        email: params[4],
        phone: params[5],
        resume_url: params[6] || null,
        status: 'APPLIED',
        remarks: null,
        created_at: new Date()
      };
      mockDb.job_applications.push(newApp);
      saveMockDb();
      result.rows = [newApp];
    }
    // 13e. UPDATE public.tenant_job_applications
    else if (normText.includes('update public.tenant_job_applications')) {
      const [status, remarks, id] = params;
      const appObj = mockDb.job_applications.find(a => a.id === parseInt(id));
      if (appObj) {
        appObj.status = status;
        appObj.remarks = remarks || appObj.remarks;
        if (status === 'CONFIRMED') {
          const existingUser = mockDb.users.find(u => u.email === appObj.email);
          if (!existingUser) {
            mockDb.users.push({
              id: require('uuid').v4(),
              email: appObj.email,
              password_hash: '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', // password123
              phone: appObj.phone,
              full_name: appObj.full_name,
              role: 'FACULTY',
              device_id: null,
              is_active: true
            });
          }
        }
      }
      saveMockDb();
      result.rows = [];
    }
    // 13f. INSERT INTO public.tenant_interview_scores
    else if (normText.includes('insert into public.tenant_interview_scores')) {
      const newScore = {
        id: mockDb.interview_scores.length + 1,
        application_id: parseInt(params[0]),
        interviewer_role: params[1],
        score: parseInt(params[2]),
        comments: params[3],
        created_at: new Date()
      };
      mockDb.interview_scores.push(newScore);
      saveMockDb();
      result.rows = [newScore];
    }
    // 14. INSERT INTO public.tenant_offline_sync_queue
    else if (normText.includes('insert into public.tenant_offline_sync_queue')) {
      // params: [device_id, user_id, action_type, target_table, record_id, payload, client_timestamp]
      const newSync = {
        id: mockDb.offline_sync_queue.length + 1,
        device_id: params[0],
        user_id: params[1],
        action_type: params[2],
        target_table: params[3],
        record_id: params[4],
        payload: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
        client_timestamp: params[6],
        created_at: new Date(),
        sync_status: 'PENDING'
      };
      mockDb.offline_sync_queue.push(newSync);
      saveMockDb();
      result.rows = [newSync];
    }
    // 14a. INSERT INTO public.tenant_streams
    else if (normText.includes('insert into public.tenant_streams')) {
      const newStream = {
        id: mockDb.streams.length + 1,
        name: params[0],
        code: params[1],
        created_at: new Date()
      };
      mockDb.streams.push(newStream);
      saveMockDb();
      result.rows = [newStream];
    }
    // 14b. INSERT INTO public.tenant_subjects
    else if (normText.includes('insert into public.tenant_subjects')) {
      const newSubject = {
        id: mockDb.subjects.length + 1,
        course_id: parseInt(params[0]),
        name: params[1],
        code: params[2],
        credits: parseInt(params[3] || 4),
        units: typeof params[4] === 'string' ? JSON.parse(params[4]) : (params[4] || []),
        faculty_id: params[5] || null,
        created_at: new Date()
      };
      mockDb.subjects.push(newSubject);
      saveMockDb();
      result.rows = [newSubject];
    }
    // 14c. INSERT INTO public.tenant_leaves
    else if (normText.includes('insert into public.tenant_leaves')) {
      const newLeave = {
        id: mockDb.leaves.length + 1,
        user_id: params[0],
        dates: params[1],
        reason: params[2],
        status: 'PENDING',
        created_at: new Date()
      };
      mockDb.leaves.push(newLeave);
      saveMockDb();
      result.rows = [newLeave];
    }
    // 14d. UPDATE public.tenant_leaves
    else if (normText.includes('update public.tenant_leaves')) {
      const [status, id] = params;
      const leaveObj = mockDb.leaves.find(l => l.id === parseInt(id));
      if (leaveObj) {
        leaveObj.status = status;
      }
      saveMockDb();
      result.rows = [];
    }
    // 14e. Hostel allocations insert/delete/update
    else if (normText.includes('insert into public.tenant_hostel_allocations')) {
      const newAlloc = {
        id: mockDb.hostel_allocations.length + 1,
        room_id: parseInt(params[0]),
        student_id: params[1],
        allocated_at: new Date()
      };
      mockDb.hostel_allocations.push(newAlloc);
      saveMockDb();
      result.rows = [newAlloc];
    }
    else if (normText.includes('delete from public.tenant_hostel_allocations')) {
      const id = parseInt(params[0]);
      mockDb.hostel_allocations = mockDb.hostel_allocations.filter(a => a.id !== id);
      saveMockDb();
      result.rows = [];
    }
    else if (normText.includes('update public.tenant_hostel_rooms')) {
      const roomId = parseInt(params[0]);
      const rm = mockDb.hostel_rooms.find(r => r.id === roomId);
      if (rm) {
        if (normText.includes('occupied_count + 1') || normText.includes('occupied_count = occupied_count + 1')) {
          rm.occupied_count = (rm.occupied_count || 0) + 1;
        } else if (normText.includes('greatest(0, occupied_count - 1)') || normText.includes('occupied_count - 1')) {
          rm.occupied_count = Math.max(0, (rm.occupied_count || 1) - 1);
        }
      }
      saveMockDb();
      result.rows = [];
    }
    // 15. Catch all generic selects for demo dashboards
    else {
      // Return full dataset matching table name inside query
      const matchTable = Object.keys(mockDb).find(tbl => normText.includes(`public.tenant_${tbl}`) || normText.includes(`public.${tbl}`));
      if (matchTable) {
        result.rows = mockDb[matchTable];
      } else {
        result.rows = [];
      }
    }
  } catch (err) {
    console.error('Fallback query simulation error: ', err);
  }

  result.rowCount = result.rows.length;
  return result;
};

module.exports = {
  query,
  getMockDb: () => mockDb,
  saveMockDb,
  isFallback: () => useFallback
};
