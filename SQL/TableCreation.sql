-- SQL DOCUMENTATION BY JONATHAN LANCE MAYO --
-- Job Portal System: Table Creation and Sample Data

-- ============================================================
-- 1. DROP ALL TABLES (in dependency order)
-- ============================================================

DROP TABLE IF EXISTS employee_notifications CASCADE;
DROP TABLE IF EXISTS company_notifications CASCADE;
DROP TABLE IF EXISTS jobseeker_notifications CASCADE;
DROP TABLE IF EXISTS job_requests CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS job_category_list CASCADE;
DROP TABLE IF EXISTS saved_jobs CASCADE;
DROP TABLE IF EXISTS jobseeker_preference CASCADE;
DROP TABLE IF EXISTS jobseeker_field_preference CASCADE;
DROP TABLE IF EXISTS job CASCADE;
DROP TABLE IF EXISTS job_category CASCADE;
DROP TABLE IF EXISTS category_field CASCADE;
DROP TABLE IF EXISTS job_type CASCADE;
DROP TABLE IF EXISTS job_seeker CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS company CASCADE;
DROP TABLE IF EXISTS company_ratings CASCADE;
DROP TABLE IF EXISTS followed_companies CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS account_type CASCADE;
DROP TABLE IF EXISTS person_resume CASCADE;
DROP TABLE IF EXISTS person CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS nationality CASCADE;
DROP TABLE IF EXISTS job_seeker_experience_level CASCADE;
DROP TABLE IF EXISTS job_seeker_education_level CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS gender CASCADE;
DROP TABLE IF EXISTS application_progress CASCADE;

-- ============================================================
-- 2. CREATE SEQUENCES, TABLES, INDEXES, FUNCTIONS
-- ============================================================

-- Sequence for company_id (if needed)
CREATE SEQUENCE IF NOT EXISTS company_id_seq
START WITH 20250000
INCREMENT BY 1
CACHE 1;

-- Application Progress Table
CREATE TABLE IF NOT EXISTS application_progress (
  id SERIAL PRIMARY KEY,
  application_progress VARCHAR(50) NOT NULL UNIQUE
);

-- Nationality Table
CREATE TABLE nationality (
  nationality_id SERIAL PRIMARY KEY,
  nationality_name VARCHAR(50) NOT NULL UNIQUE
);

-- Address Table
CREATE TABLE address (
  address_id SERIAL PRIMARY KEY,
  premise_name VARCHAR(50),
  street_name VARCHAR(50),
  barangay_name VARCHAR(50),
  city_name VARCHAR(50)
);

-- Gender Table
CREATE TABLE gender (
  gender_id SERIAL PRIMARY KEY,
  gender_name VARCHAR(25) NOT NULL UNIQUE
);

-- Person Table
CREATE TABLE person (
  person_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  date_of_birth DATE NOT NULL,
  gender INTEGER NOT NULL REFERENCES gender(gender_id) ON DELETE CASCADE,
  address_id INTEGER NOT NULL REFERENCES address(address_id) ON DELETE CASCADE,
  nationality_id INTEGER NOT NULL REFERENCES nationality(nationality_id) ON DELETE CASCADE
);

-- Account Type Table
CREATE TABLE account_type (
  account_type_id SERIAL PRIMARY KEY,
  account_type_name VARCHAR(50) NOT NULL
);

-- Account Table
CREATE TABLE account (
  account_id SERIAL PRIMARY KEY,
  account_email VARCHAR(100) NOT NULL UNIQUE,
  account_username VARCHAR(50) NOT NULL UNIQUE,
  account_profile_photo VARCHAR(255),
  account_phone VARCHAR(20),
  account_number VARCHAR(30) NOT NULL UNIQUE,
  account_password VARCHAR(100) NOT NULL,
  account_type_id INTEGER NOT NULL REFERENCES account_type(account_type_id) ON DELETE CASCADE,
  account_is_verified BOOLEAN DEFAULT FALSE
);

-- Company Table
CREATE TABLE company (
  company_id INTEGER PRIMARY KEY DEFAULT nextval('company_id_seq'),
  company_name VARCHAR(100) NOT NULL,
  company_email VARCHAR(100) NOT NULL UNIQUE,
  company_phone VARCHAR(25),
  company_website VARCHAR(100),
  company_description TEXT,
  company_logo VARCHAR(255),
  company_nationality_id INTEGER NOT NULL REFERENCES nationality(nationality_id) ON DELETE CASCADE,
  address_id INTEGER NOT NULL REFERENCES address(address_id) ON DELETE CASCADE
);

-- Employee Table
CREATE TABLE employee (
  employee_id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES company(company_id) ON DELETE CASCADE,
  position_name VARCHAR(100)
);

-- Job Seeker Table
CREATE TABLE job_seeker (
  job_seeker_id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  job_seeker_resume VARCHAR(255),
  job_seeker_description TEXT,
  job_seeker_experience_level_id VARCHAR(255),
  job_seeker_education_level_id VARCHAR(255)
);

-- Job Seeker Experience Level Table
CREATE TABLE job_seeker_experience_level (
  job_seeker_experience_level_id SERIAL PRIMARY KEY,
  experience_level_name VARCHAR(50) NOT NULL UNIQUE
);

-- Job Seeker Education Level Table
CREATE TABLE job_seeker_education_level (
  job_seeker_education_level_id SERIAL PRIMARY KEY,
  education_level_name VARCHAR(50) NOT NULL UNIQUE
);

-- Job Type Table
CREATE TABLE job_type (
  job_type_id SERIAL PRIMARY KEY,
  job_type_name VARCHAR(50) NOT NULL
);

-- Category Field Table
CREATE TABLE category_field (
  category_field_id SERIAL PRIMARY KEY,
  category_field_name VARCHAR(50) NOT NULL UNIQUE
);

-- Job Category Table
CREATE TABLE job_category (
  job_category_id SERIAL PRIMARY KEY,
  job_category_name VARCHAR(50) NOT NULL,
  category_field_id INTEGER NOT NULL REFERENCES category_field(category_field_id) ON DELETE CASCADE
);

-- Job Table
CREATE TABLE job (
  job_id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES company(company_id) ON DELETE CASCADE,
  job_name VARCHAR(100) NOT NULL,
  job_description TEXT,
  job_location VARCHAR(100),
  job_quantity INTEGER DEFAULT 1,
  job_requirements TEXT,
  job_benefits TEXT,
  job_type_id INTEGER NOT NULL REFERENCES job_type(job_type_id) ON DELETE CASCADE,
  job_experience_level_id INTEGER REFERENCES job_seeker_experience_level(job_seeker_experience_level_id) ON DELETE SET NULL,
  job_salary NUMERIC(10, 2),
  job_time VARCHAR(50),
  job_posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  job_closing_date TIMESTAMP,
  job_is_active BOOLEAN DEFAULT TRUE
);

-- Job Category List Table
CREATE TABLE job_category_list (
  job_id INTEGER NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,
  job_category_id INTEGER NOT NULL REFERENCES job_category(job_category_id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, job_category_id)
);

-- Jobseeker Preference Table
CREATE TABLE jobseeker_preference (
  jobseeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  preferred_job_category_id INTEGER NOT NULL REFERENCES job_category(job_category_id) ON DELETE CASCADE
);

-- Jobseeker Field Preference Table
CREATE TABLE jobseeker_field_preference (
  jobseeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  preferred_job_field_id INTEGER NOT NULL REFERENCES category_field(category_field_id) ON DELETE CASCADE
);

-- Job Requests Table
CREATE TABLE job_requests (
  request_id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,
  job_seeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  request_status_id INTEGER NOT NULL REFERENCES application_progress(id) ON DELETE SET NULL,
  cover_letter TEXT,
  employee_response TEXT,
  response_date TIMESTAMP,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  UNIQUE(job_id, job_seeker_id, attempt_number)
);

-- Saved Jobs Table
CREATE TABLE saved_jobs (
  saved_job_id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,
  job_seeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  saved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company Ratings Table
CREATE TABLE company_ratings (
  rating_id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES company(company_id) ON DELETE CASCADE,
  job_seeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  rating_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, job_seeker_id)
);

-- Followed Companies Table
CREATE TABLE followed_companies (
  follow_id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES company(company_id) ON DELETE CASCADE,
  job_seeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  follow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, job_seeker_id)
);

-- Verification Codes Table
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id)
);


-- Notifications Table
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  notification_text TEXT NOT NULL,
  notification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sender_account_id INTEGER REFERENCES account(account_id) ON DELETE SET NULL
);

-- Jobseeker Notifications Table
CREATE TABLE jobseeker_notifications (
  notification_id INTEGER NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
  jobseeker_id INTEGER NOT NULL REFERENCES job_seeker(job_seeker_id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE
);

-- Company Notifications Table
CREATE TABLE company_notifications (
  company_notification_id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES company(company_id) ON DELETE CASCADE
);

-- Employee Notifications Table
CREATE TABLE employee_notifications (
  company_notification_id INTEGER NOT NULL REFERENCES company_notifications(company_notification_id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employee(employee_id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE
);


-- Indexes for verification_codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_account_id ON verification_codes(account_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. INSERT DROPBOX DATA (reference data for dropdowns, etc.)
-- ============================================================

-- Application Progress States
INSERT INTO application_progress (application_progress) VALUES
  ('Accepted'),
  ('In-progress'),
  ('Rejected')
ON CONFLICT DO NOTHING;

-- Gender
INSERT INTO gender(gender_name) VALUES
  ('male'),
  ('female'),
  ('other'),
  ('prefer not to say')
ON CONFLICT DO NOTHING;

-- Account Types
INSERT INTO account_type (account_type_id, account_type_name) 
VALUES (1, 'Company'), (2, 'Job Seeker')
ON CONFLICT (account_type_id) DO NOTHING;

-- Category Fields
INSERT INTO category_field (category_field_name) VALUES
  ('Healthcare'),
  ('Education'),
  ('Technology'),
  ('Business'),
  ('Arts and Entertainment'),
  ('Science'),
  ('Engineering'),
  ('Service Industry'),
  ('Legal Services')
ON CONFLICT DO NOTHING;

-- Job Categories (grouped by field)
-- Technology
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Information Technology', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Information Systems', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Software Development', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Data Science', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Cybersecurity', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Web Development', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Mobile Development', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Network Engineering', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Cloud Computing', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Artificial Intelligence', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Machine Learning', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('DevOps', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology')),
  ('Game Development', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Technology'))
ON CONFLICT DO NOTHING;

-- Business
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Business Intelligence', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Project Management', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Business Analyst', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Human Resources Management', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('E-commerce Management', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Digital Marketing', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Marketing', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Finance', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Accounting', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Sales', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business')),
  ('Human Resources', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Business'))
ON CONFLICT DO NOTHING;

-- Arts and Entertainment
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Graphic Design', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment')),
  ('Content Creation', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment')),
  ('Video Production', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment')),
  ('Photography', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment')),
  ('Music Production', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment')),
  ('Event Planning', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment')),
  ('Performing Arts', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Arts and Entertainment'))
ON CONFLICT DO NOTHING;

-- Healthcare
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Medical Laboratory', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare')),
  ('Nursing', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare')),
  ('Pharmacy', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare')),
  ('Healthcare Administration', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare')),
  ('Physical Therapy', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare')),
  ('Occupational Therapy', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare')),
  ('Medical Coding and Billing', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Healthcare'))
ON CONFLICT DO NOTHING;

-- Education
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Teaching', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education')),
  ('Educational Administration', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education')),
  ('Curriculum Development', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education')),
  ('Special Education', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education')),
  ('Tutoring', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education')),
  ('Training and Development', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education')),
  ('Education', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Education'))
ON CONFLICT DO NOTHING;

-- Engineering
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Foreman', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Construction Management', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Laborer', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Construction Site Manager', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Carpenter', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Electrician', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Plumber', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Heavy Equipment Operator', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Surveyor', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Welder', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Pipefitter', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Safety Inspector', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('Demolition Specialist', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering')),
  ('HVAC Technician', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Engineering'))
ON CONFLICT DO NOTHING;

-- Science
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Research Scientist', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science')),
  ('Laboratory Technician', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science')),
  ('Environmental Scientist', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science')),
  ('Biotechnology', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science')),
  ('Pharmaceuticals', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science')),
  ('Clinical Research', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science')),
  ('Data Analysis', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Science'))
ON CONFLICT DO NOTHING;

-- Legal Services
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Company_Lawyer', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services')),
  ('Legal Consultant', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services')),
  ('Litigation Support', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services')),
  ('Intellectual Property Lawyer', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services')),
  ('Family Lawyer', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services')),
  ('Criminal Defense Lawyer', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services')),
  ('Legal Researcher', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Legal Services'))
ON CONFLICT DO NOTHING;

-- Service Industry
INSERT INTO job_category (job_category_name, category_field_id) VALUES
  ('Customer Service Representative', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry')),
  ('Call Center Agent', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry')),
  ('Hospitality Management', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry')),
  ('Food Service', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry')),
  ('Retail Management', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry')),
  ('Cleaning Services', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry')),
  ('Transportation Services', (SELECT category_field_id FROM category_field WHERE category_field_name = 'Service Industry'))
ON CONFLICT DO NOTHING;

-- Job Types
INSERT INTO job_type (job_type_name) VALUES
  ('Full-time'),
  ('Part-time'),
  ('Contract'),
  ('Freelance'),
  ('Internship'),
  ('Remote'),
  ('Hybrid'),
  ('Temporary')
ON CONFLICT DO NOTHING;

-- Job Seeker Experience Levels
INSERT INTO job_seeker_experience_level (experience_level_name) VALUES
  ('Entry Level'),
  ('Mid Level'),
  ('Senior Level'),
  ('Managerial Level'),
  ('Executive Level')
ON CONFLICT DO NOTHING;

-- Job Seeker Education Levels
INSERT INTO job_seeker_education_level (education_level_name) VALUES
  ('High School Diploma'),
  ('Associate Degree'),
  ('Bachelor''s Degree'),
  ('Master''s Degree'),
  ('Doctorate Degree'),
  ('PhD Degree'),
  ('Vocational Training')
ON CONFLICT DO NOTHING;

-- Nationality Data

-- SEA Countries
INSERT INTO nationality (nationality_name) VALUES
  ('Filipino'),
  ('Vietnamese'),
  ('Thai'),
  ('Indonesian'),
  ('Malaysian'),
  ('Singaporean'),
  ('Bruneian'),
  ('Cambodian'),
  ('Laotian')
ON CONFLICT DO NOTHING;

-- North Asia
INSERT INTO nationality (nationality_name) VALUES
  ('Chinese'),
  ('Japanese'),
  ('South Korean'),
  ('Mongolian'),
  ('Taiwanese')
ON CONFLICT DO NOTHING;

-- Central Asia
INSERT INTO nationality (nationality_name) VALUES
  ('Kazakh'),
  ('Uzbek'),
  ('Turkmen'),
  ('Kyrgyz'),
  ('Tajik')
ON CONFLICT DO NOTHING;

-- Western Asia
INSERT INTO nationality (nationality_name) VALUES
  ('Saudi'),
  ('Emirati'),
  ('Qatari'),
  ('Kuwaiti'),
  ('Omani'),
  ('Bahraini')
ON CONFLICT DO NOTHING;

-- South Asia
INSERT INTO nationality (nationality_name) VALUES
  ('Indian'),
  ('Pakistani'),
  ('Bangladeshi'),
  ('Sri Lankan'),
  ('Nepalese'),
  ('Bhutanese'),
  ('Maldivian')
ON CONFLICT DO NOTHING;

-- North America
INSERT INTO nationality (nationality_name) VALUES
  ('American'),
  ('Canadian'),
  ('Mexican')
ON CONFLICT DO NOTHING;

-- Central America
INSERT INTO nationality (nationality_name) VALUES
  ('Guatemalan'),
  ('Honduran'),
  ('Salvadoran'),
  ('Nicaraguan'),
  ('Costa Rican')
ON CONFLICT DO NOTHING;

-- South America
INSERT INTO nationality (nationality_name) VALUES
  ('Argentine'),
  ('Brazilian'),
  ('Chilean'),
  ('Colombian'),
  ('Peruvian')
ON CONFLICT DO NOTHING;

-- European
INSERT INTO nationality (nationality_name) VALUES
  ('German'),
  ('French'),
  ('British'),
  ('Italian'),
  ('Spanish')
ON CONFLICT DO NOTHING;

-- African
INSERT INTO nationality (nationality_name) VALUES
  ('Egyptian'),
  ('Nigerian'),
  ('South African'),
  ('Kenyan'),
  ('Ethiopian'),
  ('Ghanaian'),
  ('Moroccan')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. INSERT SAMPLE COMPANIES (Sample Data)
-- ============================================================

-- Namsung sample Company
INSERT INTO address (premise_name, street_name, barangay_name, city_name) VALUES
  ('Namsung Tower', 'Rizal St', 'Poblacion District', 'Davao City')
ON CONFLICT DO NOTHING;

INSERT INTO company (company_name, company_email, company_phone, company_website, company_description, address_id, company_nationality_id) VALUES
  ('Namsung Corporation', 'nathanmayo15@gmail.com', '09123456789', 'www.namsung.com', 'Leading electronics manufacturer',
  (SELECT address_id FROM address WHERE premise_name = 'Namsung Tower'),
  (SELECT nationality_id FROM nationality WHERE nationality_name = 'South Korean'))
ON CONFLICT DO NOTHING;

-- Pear sample Company
INSERT INTO address (premise_name, street_name, barangay_name, city_name) VALUES
  ('Pear HQ', 'Innovation Ave', 'Tech District', 'Cebu City')
ON CONFLICT DO NOTHING;

INSERT INTO company (company_name, company_email, company_phone, company_website, company_description, address_id, company_nationality_id) VALUES
  ('Pear Technologies', 'kun.ransu@gmail.com', '09234567890', 'www.peartech.com', 'Innovative software solutions provider',
  (SELECT address_id FROM address WHERE premise_name = 'Pear HQ'),
  (SELECT nationality_id FROM nationality WHERE nationality_name = 'Filipino'))
ON CONFLICT DO NOTHING;

-- AirTruck sample Company
INSERT INTO address (premise_name, street_name, barangay_name, city_name) VALUES
  ('AirTruck Logistics Center', 'Cargo St', 'Industrial Zone', 'Manila')
ON CONFLICT DO NOTHING;

INSERT INTO company (company_name, company_email, company_phone, company_website, company_description, address_id, company_nationality_id) VALUES
  ('AirTruck Logistics', 'not.an.idiot129@gmail.com', '09345678901', 'www.airtruck.com', 'Reliable logistics and transportation services',
  (SELECT address_id FROM address WHERE premise_name = 'AirTruck Logistics Center'),
  (SELECT nationality_id FROM nationality WHERE nationality_name = 'Filipino'))
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. INSERT SAMPLE Jobs (Sample Data)
-- ============================================================

-- End of SQL/TableCreation.sql


