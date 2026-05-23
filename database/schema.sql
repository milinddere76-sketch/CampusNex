-- ============================================================================
-- CAMPUSNEX DATABASE SCHEMA - PRODUCTION GRADE MULTI-TENANT ARCHITECTURE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- GLOBAL SaaS REGULATION (PUBLIC SCHEMA)
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.colleges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    branding_logo_url TEXT,
    branding_primary_color VARCHAR(10) DEFAULT '#4F46E5',
    branding_secondary_color VARCHAR(10) DEFAULT '#06B6D4',
    admin_email VARCHAR(255) NOT NULL,
    admin_phone VARCHAR(50),
    plan VARCHAR(50) DEFAULT 'FREE_TRIAL', -- FREE_TRIAL, BASIC, PREMIUM, ENTERPRISE
    billing_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, PAST_DUE, SUSPENDED
    requested_streams VARCHAR(255) DEFAULT '[]', -- JSON array of requested stream IDs
    assigned_streams VARCHAR(255) DEFAULT '[]', -- JSON array of active stream IDs approved by Super-Admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id SERIAL PRIMARY KEY,
    college_id INT REFERENCES public.colleges(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL, -- STRIPE, RAZORPAY
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id SERIAL PRIMARY KEY,
    college_id INT REFERENCES public.colleges(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES ON GLOBAL TABLES
CREATE INDEX IF NOT EXISTS idx_colleges_subdomain ON public.colleges(subdomain);

-- ----------------------------------------------------------------------------
-- TEMPLATE SCOPE - REPLICATED FOR tenant_<college_id> SCHEMAS
-- ----------------------------------------------------------------------------
-- Note: When a college onboard, Nginx + Node.js creates a schema like 'tenant_1' 
-- and initializes the following tables inside it.
-- ----------------------------------------------------------------------------

-- We present the tables below as conceptual schemas, but we create them 
-- as template structures for easy automation in our backend.

CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, 
    -- Roles: SUPER_ADMIN, COLLEGE_ADMIN, PRINCIPAL, HOD, FACULTY, STAFF, STUDENT, PARENT, PLACEMENT_OFFICER, LIBRARIAN, HOSTEL_WARDEN, TRANSPORT_MANAGER, ACCOUNTANT
    device_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    assigned_streams VARCHAR(255) DEFAULT '[]', -- JSON array of assigned stream IDs (e.g. for principal approval jurisdictions)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_streams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_departments (
    id SERIAL PRIMARY KEY,
    stream_id INT REFERENCES public.tenant_streams(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    hod_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_courses (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES public.tenant_departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    credits INT DEFAULT 4,
    degree_level VARCHAR(50) DEFAULT 'UG', -- UG, PG, PHD, DIPLOMA, CERTIFICATE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_subjects (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES public.tenant_courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    credits INT DEFAULT 4,
    units JSONB, -- JSON array of strings representing syllabus units
    faculty_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_semesters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.tenant_classes (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES public.tenant_courses(id) ON DELETE CASCADE,
    subject_id INT REFERENCES public.tenant_subjects(id) ON DELETE SET NULL,
    semester_id INT REFERENCES public.tenant_semesters(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    room_number VARCHAR(50),
    timetable_day VARCHAR(20), -- MONDAY, TUESDAY, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);


CREATE TABLE IF NOT EXISTS public.tenant_students (
    user_id UUID PRIMARY KEY REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    roll_number VARCHAR(100) UNIQUE NOT NULL,
    department_id INT REFERENCES public.tenant_departments(id),
    admission_year INT NOT NULL,
    current_semester_id INT REFERENCES public.tenant_semesters(id),
    parent_id UUID, -- References another user row (PARENT role)
    cgpa DECIMAL(3, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS public.tenant_attendance (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    class_id INT REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- PRESENT, ABSENT, LATE
    method VARCHAR(50) DEFAULT 'MANUAL', -- QR, NFC, FACE, MANUAL, GEOFENCE
    verified_by_faculty_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_class_date UNIQUE(student_id, class_id, date)
);

CREATE TABLE IF NOT EXISTS public.tenant_assignments (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_points INT DEFAULT 100,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES public.tenant_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_url TEXT NOT NULL,
    points_obtained INT,
    feedback TEXT,
    is_graded BOOLEAN DEFAULT FALSE,
    client_timestamp TIMESTAMP WITH TIME ZONE, -- For offline-sync tracking
    CONSTRAINT unique_student_assignment UNIQUE(student_id, assignment_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_exams (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    max_marks INT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public.tenant_exam_results (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES public.tenant_exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    marks_obtained INT NOT NULL,
    grade VARCHAR(5) NOT NULL,
    remarks TEXT,
    CONSTRAINT unique_student_exam UNIQUE(student_id, exam_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_fees (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount_due DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'UNPAID', -- PAID, PARTIAL, UNPAID
    billing_category VARCHAR(50) NOT NULL, -- TUITION, HOSTEL, TRANSPORT, LIBRARY
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_fee_payments (
    id SERIAL PRIMARY KEY,
    fee_id INT REFERENCES public.tenant_fees(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- STRIPE, RAZORPAY, UPI, CASH
    transaction_id VARCHAR(255) UNIQUE,
    amount_paid DECIMAL(12, 2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_library_books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    barcode_isbn VARCHAR(100) UNIQUE NOT NULL,
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.tenant_library_issues (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES public.tenant_library_books(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE,
    fine_amount DECIMAL(12, 2) DEFAULT 0.00,
    fine_status VARCHAR(50) DEFAULT 'NONE' -- NONE, UNPAID, PAID
);

CREATE TABLE IF NOT EXISTS public.tenant_hostel_rooms (
    id SERIAL PRIMARY KEY,
    block_name VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 4,
    occupied_count INT DEFAULT 0,
    fee_amount DECIMAL(12, 2) DEFAULT 0.00,
    CONSTRAINT unique_block_room UNIQUE(block_name, room_number)
);

CREATE TABLE IF NOT EXISTS public.tenant_hostel_allocations (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES public.tenant_hostel_rooms(id) ON DELETE CASCADE,
    student_id UUID UNIQUE REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    vacated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.tenant_hostel_visitors (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES public.tenant_hostel_rooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    relation VARCHAR(100),
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.tenant_transport_buses (
    id SERIAL PRIMARY KEY,
    bus_number VARCHAR(100) UNIQUE NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50),
    capacity INT DEFAULT 50,
    gps_latitude DECIMAL(9, 6),
    gps_longitude DECIMAL(9, 6)
);

CREATE TABLE IF NOT EXISTS public.tenant_transport_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    start_point VARCHAR(255) NOT NULL,
    end_point VARCHAR(255) NOT NULL,
    stops JSONB -- Array of stops with lat/long
);

CREATE TABLE IF NOT EXISTS public.tenant_transport_allocations (
    id SERIAL PRIMARY KEY,
    bus_id INT REFERENCES public.tenant_transport_buses(id) ON DELETE CASCADE,
    route_id INT REFERENCES public.tenant_transport_routes(id) ON DELETE CASCADE,
    student_id UUID UNIQUE REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    pickup_point VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_placements (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    eligibility_criteria_cgpa DECIMAL(3, 2) DEFAULT 6.00,
    package_lpa DECIMAL(5, 2) NOT NULL,
    interview_date DATE,
    eligibility_departments JSONB, -- Array of department IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_placement_applications (
    id SERIAL PRIMARY KEY,
    placement_id INT REFERENCES public.tenant_placements(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.tenant_students(user_id) ON DELETE CASCADE,
    resume_url TEXT,
    status VARCHAR(50) DEFAULT 'APPLIED', -- APPLIED, INTERVIEWING, SELECTED, REJECTED
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_placement_app UNIQUE(student_id, placement_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id UUID REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    message TEXT,
    file_url TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.tenant_notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    audience_roles JSONB, -- Array of strings e.g. ["STUDENT", "FACULTY"]
    attachment_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- THE SYNC MUTATION ENGINE TABLE
CREATE TABLE IF NOT EXISTS public.tenant_offline_sync_queue (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    target_table VARCHAR(100) NOT NULL,
    record_id VARCHAR(255), -- ID of the record locally
    payload JSONB NOT NULL,
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SUCCESS, CONFLICT
    conflict_resolution TEXT
);

CREATE TABLE IF NOT EXISTS public.tenant_admissions (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    aadhaar_id VARCHAR(50) NOT NULL,
    previous_education TEXT NOT NULL,
    marks_percentage DECIMAL(5, 2) NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',
    course_id INT REFERENCES public.tenant_courses(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'SUBMITTED', -- SUBMITTED, REVIEW, VERIFICATION, APPROVED, REJECTED, CONFIRMED
    roll_number VARCHAR(100) UNIQUE,
    class_id INT REFERENCES public.tenant_classes(id) ON DELETE SET NULL,
    payment_status VARCHAR(50) DEFAULT 'UNPAID', -- UNPAID, PAID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_job_openings (
    id SERIAL PRIMARY KEY,
    role_title VARCHAR(255) NOT NULL,
    department_id INT REFERENCES public.tenant_departments(id) ON DELETE CASCADE,
    eligibility TEXT NOT NULL,
    salary_lpa DECIMAL(5, 2) NOT NULL,
    last_date DATE NOT NULL,
    interview_mode VARCHAR(50) DEFAULT 'ONLINE', -- ONLINE, OFFLINE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_job_applications (
    id SERIAL PRIMARY KEY,
    job_opening_id INT REFERENCES public.tenant_job_openings(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255) NOT NULL,
    experience_years INT DEFAULT 0,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    resume_url TEXT,
    status VARCHAR(50) DEFAULT 'APPLIED', -- APPLIED, SHORTLISTED, INTERVIEWED, SELECTED, REJECTED, CONFIRMED
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_interview_scores (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES public.tenant_job_applications(id) ON DELETE CASCADE,
    interviewer_role VARCHAR(50) NOT NULL, -- PRINCIPAL, HOD, HR
    score INT NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tenant_leaves (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    dates VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE ESSENTIAL SCOPE INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON public.tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_students_parent ON public.tenant_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenant_attendance_date ON public.tenant_attendance(date, student_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sync_status ON public.tenant_offline_sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_tenant_chat_sender_receiver ON public.tenant_chat_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admissions_email ON public.tenant_admissions(email);
CREATE INDEX IF NOT EXISTS idx_tenant_job_apps_opening ON public.tenant_job_applications(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_tenant_leaves_user ON public.tenant_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_leaves_status ON public.tenant_leaves(status);


