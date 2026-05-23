-- ============================================================================
-- CAMPUSNEX SEED DATA - HIGH-FIDELITY DEMO COLLEGE POPULATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEED PUBLIC SaaS PLATFORM LEVEL
-- ----------------------------------------------------------------------------
INSERT INTO public.colleges (name, subdomain, domain, branding_logo_url, branding_primary_color, branding_secondary_color, admin_email, admin_phone, plan, billing_status, requested_streams, assigned_streams)
VALUES 
('Apex Institute of Technology', 'apex', 'apex.campusone.app', 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop&q=80', '#4F46E5', '#06B6D4', 'admin@apex.edu', '+1 (555) 019-2834', 'PREMIUM', 'ACTIVE', '[1,2]', '[1,2]'),
('Beacon University of Medical Sciences', 'beacon', 'beacon.campusone.app', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop&q=80', '#059669', '#10B981', 'admin@beacon.edu', '+1 (555) 018-9900', 'ENTERPRISE', 'ACTIVE', '[6]', '[6]');

INSERT INTO public.billing_transactions (college_id, amount, currency, payment_method, transaction_id, status, paid_at)
VALUES
(1, 1200.00, 'USD', 'STRIPE', 'txn_apex_2026_01', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '30 days'),
(2, 5500.00, 'USD', 'STRIPE', 'txn_beacon_2026_01', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '15 days');

INSERT INTO public.support_tickets (college_id, subject, description, status, created_at, updated_at)
VALUES
(1, 'Payment receipt mismatch', 'We paid our premium tier billing but the invoice shows partial discount is missing.', 'OPEN', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 'Integrate custom SMTP', 'We want to route our email notifications via our medical domain SMTP server.', 'RESOLVED', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '8 days');


-- ----------------------------------------------------------------------------
-- SEED TENANT DATA (SCOPED AS TEMPLATE ENTRIES FOR THE APEX INSTITUTE)
-- ----------------------------------------------------------------------------
-- Precompiled UUID constants for testing credentials:
-- Bcrypt Hash for 'password123': $2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.

-- 1. SEED USERS FOR APEX
-- UUIDs map exactly to testing roles:
-- ADMIN:       77777777-7777-7777-7777-777777777777 -> admin@apex.edu
-- PRINCIPAL:   11111111-1111-1111-1111-111111111111 -> principal@apex.edu
-- HOD CS:      22222222-2222-2222-2222-222222222222 -> hod.cs@apex.edu
-- FACULTY:     33333333-3333-3333-3333-333333333333 -> faculty.smith@apex.edu
-- STUDENT 1:   44444444-4444-4444-4444-444444444444 -> student.alex@apex.edu
-- STUDENT 2:   55555555-5555-5555-5555-555555555555 -> student.sam@apex.edu
-- PARENT:      66666666-6666-6666-6666-666666666666 -> parent.doe@apex.edu
-- LIBRARIAN:   88888888-8888-8888-8888-888888888888 -> librarian@apex.edu
-- WARDEN:      99999999-9999-9999-9999-999999999999 -> warden@apex.edu

INSERT INTO public.tenant_users (id, email, password_hash, phone, full_name, role, device_id, is_active)
VALUES
('77777777-7777-7777-7777-777777777777', 'admin@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0001', 'Dr. Donald Vance', 'COLLEGE_ADMIN', 'dev_admin_mac', TRUE),
('11111111-1111-1111-1111-111111111111', 'principal@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0002', 'Dr. Arthur Pendelton', 'PRINCIPAL', 'dev_principal_ipad', TRUE),
('22222222-2222-2222-2222-222222222222', 'hod.cs@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0003', 'Dr. Elizabeth Hopper', 'HOD', 'dev_hod_desktop', TRUE),
('33333333-3333-3333-3333-333333333333', 'faculty.smith@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0004', 'Prof. Marcus Smith', 'FACULTY', 'dev_fac_phone', TRUE),
('44444444-4444-4444-4444-444444444444', 'student.alex@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0005', 'Alex Doe', 'STUDENT', 'dev_student_alex_android', TRUE),
('55555555-5555-5555-5555-555555555555', 'student.sam@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0006', 'Samantha Jenkins', 'STUDENT', 'dev_student_sam_iphone', TRUE),
('66666666-6666-6666-6666-666666666666', 'parent.doe@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0007', 'Robert Doe', 'PARENT', 'dev_parent_phone', TRUE),
('88888888-8888-8888-8888-888888888888', 'librarian@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0008', 'Albert Bookman', 'LIBRARIAN', 'dev_lib_desk', TRUE),
('99999999-9999-9999-9999-999999999999', 'warden@apex.edu', '$2b$10$T8M2VlE38/a3u.oJ7zN1eO5R9xLwXp/2xN9vE8lPpe2nS80p0S3H.', '+1 (555) 010-0009', 'Warden Jenkins', 'HOSTEL_WARDEN', 'dev_warden_tab', TRUE);

-- 2. SEED STREAMS
INSERT INTO public.tenant_streams (id, name, code)
VALUES
(1, 'Science', 'SCI'),
(2, 'Engineering', 'ENG'),
(3, 'Commerce', 'COM'),
(4, 'Arts & Humanities', 'ART'),
(5, 'Law', 'LAW'),
(6, 'Medical & Health', 'MED'),
(7, 'Agriculture', 'AGR'),
(8, 'Management', 'MGT'),
(9, 'Design & Architecture', 'DSG'),
(10, 'Vocational', 'VOC');

-- 2b. SEED DEPARTMENTS
INSERT INTO public.tenant_departments (id, stream_id, name, code, hod_id)
VALUES
(1, 2, 'Computer Science & Engineering', 'CSE', '22222222-2222-2222-2222-222222222222'),
(2, 2, 'Electrical & Electronics Engineering', 'EEE', NULL),
(3, 1, 'Physics & Applied Sciences', 'PHY', NULL);

-- 3. SEED COURSES
INSERT INTO public.tenant_courses (id, department_id, name, code, credits, degree_level)
VALUES
(1, 1, 'Data Structures and Algorithms', 'CS-201', 4, 'UG'),
(2, 1, 'Database Management Systems', 'CS-302', 4, 'UG'),
(3, 2, 'Signals and Systems', 'EE-204', 3, 'UG');

-- 3b. SEED SUBJECTS (SYLLABUS & UNITS)
INSERT INTO public.tenant_subjects (id, course_id, name, code, credits, units, faculty_id)
VALUES
(1, 1, 'Programming Fundamentals', 'CS-201-SUB1', 4, '["Syntax & Variables", "Control Flows", "Arrays", "Functions"]'::jsonb, '33333333-3333-3333-3333-333333333333'),
(2, 1, 'Object-Oriented Design', 'CS-201-SUB2', 4, '["Classes & Objects", "Inheritance", "Polymorphism", "Exception Handling"]'::jsonb, '33333333-3333-3333-3333-333333333333'),
(3, 2, 'SQL Relational Schemas', 'CS-302-SUB1', 4, '["ER Models", "Normalization (1NF-3NF)", "Joins & Subqueries", "Indexing"]'::jsonb, '22222222-2222-2222-2222-222222222222');

-- 4. SEED SEMESTERS
INSERT INTO public.tenant_semesters (id, name, start_date, end_date, is_active)
VALUES
(1, 'Fall Semester 2026', '2026-08-01', '2026-12-15', TRUE),
(2, 'Spring Semester 2027', '2027-01-10', '2027-05-20', FALSE);

-- 5. SEED CLASSES (TIMETABLE WITH SUBJECT ASSIGNMENT)
INSERT INTO public.tenant_classes (id, course_id, subject_id, semester_id, faculty_id, room_number, timetable_day, start_time, end_time)
VALUES
(1, 1, 1, 1, '33333333-3333-3333-3333-333333333333', 'Lab 3, CS Block', 'MONDAY', '09:00:00', '10:30:00'),
(2, 2, 3, 1, '33333333-3333-3333-3333-333333333333', 'Room 102, CSE Block', 'WEDNESDAY', '11:00:00', '12:30:00'),
(3, 3, NULL, 1, '22222222-2222-2222-2222-222222222222', 'Room 304, EEE Block', 'TUESDAY', '14:00:00', '15:30:00');


-- 6. SEED STUDENTS
INSERT INTO public.tenant_students (user_id, roll_number, department_id, admission_year, current_semester_id, parent_id, cgpa)
VALUES
('44444444-4444-4444-4444-444444444444', 'APEX-2024-CSE-004', 1, 2024, 1, '66666666-6666-6666-6666-666666666666', 3.84),
('55555555-5555-5555-5555-555555555555', 'APEX-2024-CSE-012', 1, 2024, 1, NULL, 3.25);

-- 7. SEED ATTENDANCE
INSERT INTO public.tenant_attendance (student_id, class_id, date, status, method, verified_by_faculty_id)
VALUES
('44444444-4444-4444-4444-444444444444', 1, '2026-05-18', 'PRESENT', 'QR', '33333333-3333-3333-3333-333333333333'),
('55555555-5555-5555-5555-555555555555', 1, '2026-05-18', 'ABSENT', 'MANUAL', '33333333-3333-3333-3333-333333333333'),
('44444444-4444-4444-4444-444444444444', 2, '2026-05-20', 'PRESENT', 'GEOFENCE', '33333333-3333-3333-3333-333333333333'),
('55555555-5555-5555-5555-555555555555', 2, '2026-05-20', 'PRESENT', 'QR', '33333333-3333-3333-3333-333333333333');

-- 8. SEED ASSIGNMENTS
INSERT INTO public.tenant_assignments (id, class_id, title, description, due_date, max_points, attachment_url)
VALUES
(1, 1, 'Red-Black Tree Balance Implementation', 'Write clean implementation of RB-Tree insertion algorithms in Java or C++', '2026-05-28 23:59:00+00', 100, 'https://apex.campusone.app/storage/assignments/rbtree.pdf'),
(2, 2, 'SQL Normalization Assignment', 'Complete normalization tables up to 3NF & BCNF for given transactional fields.', '2026-05-30 18:00:00+00', 50, 'https://apex.campusone.app/storage/assignments/sql_norm.pdf');

-- 9. SEED SUBMISSIONS
INSERT INTO public.tenant_assignment_submissions (assignment_id, student_id, submitted_at, file_url, points_obtained, feedback, is_graded)
VALUES
(2, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '1 day', 'https://apex.campusone.app/storage/submissions/alex_sql.pdf', 48, 'Excellent work! Database keys identified correctly.', TRUE);

-- 10. SEED EXAMS & RESULTS
INSERT INTO public.tenant_exams (id, class_id, title, date, max_marks)
VALUES
(1, 1, 'DSA Midterm Examination', '2026-05-10', 100);

INSERT INTO public.tenant_exam_results (exam_id, student_id, marks_obtained, grade, remarks)
VALUES
(1, '44444444-4444-4444-4444-444444444444', 92, 'A+', 'Outstanding problem-solving logic'),
(1, '55555555-5555-5555-5555-555555555555', 76, 'B', 'Needs optimization study on trees');

-- 11. SEED FEES
INSERT INTO public.tenant_fees (id, student_id, title, amount_due, amount_paid, status, billing_category, due_date)
VALUES
(1, '44444444-4444-4444-4444-444444444444', 'Tuition Fees - Term 1', 4500.00, 4500.00, 'PAID', 'TUITION', '2026-05-01'),
(2, '44444444-4444-4444-4444-444444444444', 'Hostel Mess Charges', 800.00, 300.00, 'PARTIAL', 'HOSTEL', '2026-05-30'),
(3, '55555555-5555-5555-5555-555555555555', 'Tuition Fees - Term 1', 4500.00, 0.00, 'UNPAID', 'TUITION', '2026-05-01');

INSERT INTO public.tenant_fee_payments (fee_id, payment_method, transaction_id, amount_paid, paid_at)
VALUES
(1, 'STRIPE', 'ch_stripe_apex_tuition_01', 4500.00, CURRENT_TIMESTAMP - INTERVAL '25 days'),
(2, 'UPI', 'upi_pay_apex_mess_01', 300.00, CURRENT_TIMESTAMP - INTERVAL '2 days');

-- 12. SEED LIBRARY BOOKS
INSERT INTO public.tenant_library_books (id, title, author, barcode_isbn, total_copies, available_copies)
VALUES
(1, 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen', '9780262033848', 12, 11),
(2, 'Database System Concepts', 'Abraham Silberschatz', '9780073523323', 8, 8);

INSERT INTO public.tenant_library_issues (book_id, student_id, issued_at, due_date, returned_at, fine_amount, fine_status)
VALUES
(1, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '9 days', NULL, 0.00, 'NONE');

-- 13. SEED HOSTEL
INSERT INTO public.tenant_hostel_rooms (id, block_name, room_number, capacity, occupied_count, fee_amount)
VALUES
(1, 'Aryabhata Block A', '203', 2, 1, 1500.00),
(2, 'Aryabhata Block A', '204', 2, 0, 1500.00);

INSERT INTO public.tenant_hostel_allocations (room_id, student_id, allocated_at)
VALUES
(1, '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '120 days');

-- 14. SEED TRANSPORT
INSERT INTO public.tenant_transport_buses (id, bus_number, driver_name, driver_phone, capacity, gps_latitude, gps_longitude)
VALUES
(1, 'NY-72B-9102', 'Mr. Jerry Nelson', '+1 (555) 012-9844', 40, 40.7128, -74.0060);

INSERT INTO public.tenant_transport_routes (id, route_name, start_point, end_point, stops)
VALUES
(1, 'Downtown to North Campus Line', 'Grand Station', 'Apex North Gate', '[{"name":"Metro Hub", "lat": 40.7150, "lng": -74.0080}, {"name": "Central Library", "lat": 40.7210, "lng": -74.0120}]'::jsonb);

INSERT INTO public.tenant_transport_allocations (bus_id, route_id, student_id, pickup_point)
VALUES
(1, 1, '55555555-5555-5555-5555-555555555555', 'Central Library');

-- 15. SEED PLACEMENTS
INSERT INTO public.tenant_placements (id, company_name, job_title, eligibility_criteria_cgpa, package_lpa, interview_date, eligibility_departments)
VALUES
(1, 'Google', 'Associate Software Engineer', 3.50, 24.50, '2026-06-15', '[1]'::jsonb),
(2, 'Tesla', 'Embedded Control Systems Intern', 3.20, 18.00, '2026-06-20', '[1, 2]'::jsonb);

INSERT INTO public.tenant_placement_applications (placement_id, student_id, resume_url, status)
VALUES
(1, '44444444-4444-4444-4444-444444444444', 'https://apex.campusone.app/storage/resumes/alex_doe_resume.pdf', 'APPLIED');

-- 16. SEED NOTICES
INSERT INTO public.tenant_notices (title, content, audience_roles, attachment_url, is_approved)
VALUES
('Midterm Review Seminar', 'Prof Marcus is conducting a DSA review lecture on Binary Search Tree rebalancing algorithms this Friday evening at 5 PM in Room 102. Attendance is highly recommended.', '["STUDENT"]', 'https://apex.campusone.app/notices/dsa_session.pdf', TRUE),
('Annual Cultural Tech Fest 2026', 'Registrations are now officially open for ApexTechFest 2026. Cash rewards up to $15,000 for standard hackathon submissions.', '["STUDENT", "FACULTY", "COLLEGE_ADMIN"]', NULL, TRUE);

-- 17. SEED CHAT
INSERT INTO public.tenant_chat_messages (sender_id, receiver_id, message, file_url, sent_at, is_read)
VALUES
('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'Hey Alex, please submit your Red-Black tree insertion code by tomorrow evening.', NULL, CURRENT_TIMESTAMP - INTERVAL '3 hours', TRUE),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Yes Professor, finishing up the balance node rotation tests now. Will send PDF submission soon.', NULL, CURRENT_TIMESTAMP - INTERVAL '2 hours', FALSE);

-- 18. SEED STUDENT ADMISSIONS
INSERT INTO public.tenant_admissions (full_name, dob, gender, address, mobile, email, aadhaar_id, previous_education, marks_percentage, category, course_id, status, roll_number, class_id, payment_status)
VALUES
('Rohan Sharma', '2006-04-12', 'MALE', '124 Park Ave, Delhi', '+91 9876543210', 'rohan.sharma@gmail.com', '123456789012', 'High School CBSE', 92.40, 'OBC', 1, 'CONFIRMED', 'APEX-2026-CSE-109', 1, 'PAID'),
('Priya Nair', '2006-09-25', 'FEMALE', '54 Gandhi St, Bangalore', '+91 8765432109', 'priya.nair@gmail.com', '987654321098', 'State Board Karnataka', 88.50, 'GENERAL', 1, 'SUBMITTED', NULL, NULL, 'UNPAID'),
('Aditya Verma', '2005-11-05', 'MALE', '78 Nehru Road, Mumbai', '+91 7654321098', 'aditya.v@gmail.com', '456789012345', 'CBSE Class XII', 95.00, 'GENERAL', 2, 'REVIEW', NULL, NULL, 'PAID');

-- 19. SEED JOB OPENINGS
INSERT INTO public.tenant_job_openings (id, role_title, department_id, eligibility, salary_lpa, last_date, interview_mode)
VALUES
(1, 'LECTURER', 1, 'M.Tech in CS/IT with first-class grades. Teaching experience is optional.', 8.50, '2026-06-30', 'ONLINE'),
(2, 'ASSOCIATE_PROFESSOR', 1, 'Ph.D. in Computer Science with minimum 8 publications and 5 years experience.', 18.00, '2026-06-15', 'OFFLINE'),
(3, 'LIBRARIAN', 2, 'Masters in Library Science, well versed with digital barcode systems.', 6.00, '2026-07-10', 'OFFLINE');

-- 20. SEED JOB APPLICATIONS
INSERT INTO public.tenant_job_applications (id, job_opening_id, full_name, qualification, experience_years, email, phone, resume_url, status, remarks)
VALUES
(1, 1, 'Dr. Sarah Connor', 'Ph.D in AI/ML', 4, 'sarah.connor@gmail.com', '+1 (555) 901-2345', 'https://campusnex.fly.dev/uploads/resumes/sarah_resume.pdf', 'SHORTLISTED', 'Strong research background in deep learning models.'),
(2, 2, 'Prof. Alan Turing', 'Ph.D. in Computer Science', 12, 'alan.turing@gmail.com', '+1 (555) 890-1234', 'https://campusnex.fly.dev/uploads/resumes/alan_resume.pdf', 'INTERVIEWED', 'Pioneer in computing algorithms, excellent panel marks.'),
(3, 1, 'John Doe', 'B.Tech in CS', 1, 'john.recruits@gmail.com', '+1 (555) 789-0123', NULL, 'APPLIED', 'Entry level candidate.');

-- 21. SEED INTERVIEW PANEL SCORES
INSERT INTO public.tenant_interview_scores (application_id, interviewer_role, score, comments)
VALUES
(2, 'HOD', 10, 'Outstanding candidate. Incomparable experience.'),
(2, 'PRINCIPAL', 9, 'Highly recommended for immediate appointment.'),
(1, 'HOD', 8, 'Good coding ability, demonstrated solid AI knowledge.');

-- 22. SEED LEAVES
INSERT INTO public.tenant_leaves (id, user_id, dates, reason, status)
VALUES
(1, '44444444-4444-4444-4444-444444444444', 'May 26th - May 28th', 'Attending National Hackathon Championship', 'PENDING'),
(2, '33333333-3333-3333-3333-333333333333', 'June 2nd - June 3rd', 'Medical check-up & wellness rest', 'PENDING');

