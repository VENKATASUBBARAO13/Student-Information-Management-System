-- ============================================================
-- ASISST SIMS — MySQL Schema
-- Run once: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS asisst_sims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asisst_sims;

CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(300) NOT NULL,
    role          ENUM('admin','student') NOT NULL DEFAULT 'student',
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME     NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    token      VARCHAR(100) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL UNIQUE,
    roll_number VARCHAR(20)  NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    branch      VARCHAR(20)  NOT NULL,
    year        TINYINT      NOT NULL,
    semester    TINYINT      NOT NULL,
    phone       VARCHAR(15)  NULL,
    address     TEXT         NULL,
    dob         DATE         NULL,
    guardian    VARCHAR(100) NULL,
    photo_url   VARCHAR(255) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    code     VARCHAR(10)  NOT NULL UNIQUE,
    name     VARCHAR(120) NOT NULL,
    branch   VARCHAR(20)  NOT NULL,
    semester TINYINT      NOT NULL,
    credits  TINYINT      NOT NULL DEFAULT 3,
    faculty  VARCHAR(100) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS marks (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT          NOT NULL,
    subject_id    INT          NOT NULL,
    internal      DECIMAL(5,2) NOT NULL DEFAULT 0,
    external      DECIMAL(5,2) NOT NULL DEFAULT 0,
    semester      TINYINT      NOT NULL,
    academic_year VARCHAR(10)  NOT NULL DEFAULT '2025-26',
    uploaded_by   INT          NULL,
    uploaded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_marks (student_id, subject_id, semester, academic_year),
    FOREIGN KEY (student_id)  REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id)  REFERENCES subjects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT  NOT NULL,
    subject_id INT  NOT NULL,
    date       DATE NOT NULL,
    status     ENUM('present','absent') NOT NULL,
    marked_by  INT  NULL,
    marked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attendance (student_id, subject_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (marked_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS certificates (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT          NOT NULL,
    cert_type  VARCHAR(60)  NOT NULL,
    filename   VARCHAR(200) NOT NULL,
    file_path  VARCHAR(500) NOT NULL,
    issued_by  INT          NULL,
    issued_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS certificate_downloads (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    certificate_id INT         NOT NULL,
    student_id     INT         NOT NULL,
    downloaded_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address     VARCHAR(45) NULL,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)     REFERENCES students(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NULL,
    action      VARCHAR(60)  NOT NULL,
    description TEXT         NULL,
    ip_address  VARCHAR(45)  NULL,
    logged_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Seed subjects
INSERT IGNORE INTO subjects (code,name,branch,semester,credits,faculty) VALUES
('CS301','Data Structures & Algorithms','CSE',5,4,'Dr. R. Subramanyam'),
('CS302','Database Management Systems','CSE',5,4,'Prof. K. Lakshmi'),
('CS303','Computer Networks','CSE',5,3,'Dr. P. Narayana'),
('CS304','Machine Learning','CSE',5,3,'Dr. S. Rao'),
('CS305','Software Engineering','CSE',5,3,'Prof. V. Prasad'),
('CS306','Web Technologies Lab','CSE',5,2,'Mr. T. Kishore'),
('EC301','Digital Signal Processing','ECE',5,4,'Dr. M. Krishna'),
('EC302','VLSI Design','ECE',5,4,'Prof. S. Reddy'),
('EC303','Embedded Systems','ECE',5,3,'Dr. A. Sharma'),
('ME301','Thermodynamics','MECH',5,4,'Dr. B. Rao'),
('ME302','Fluid Mechanics','MECH',5,4,'Prof. C. Kumar'),
('IT301','Cloud Computing','IT',5,3,'Dr. D. Verma'),
('IT302','Cyber Security','IT',5,3,'Prof. E. Singh'),
('CV301','Structural Analysis','CIVIL',5,4,'Dr. F. Naidu'),
('CV302','Geotechnical Engineering','CIVIL',5,4,'Prof. G. Prasad');
