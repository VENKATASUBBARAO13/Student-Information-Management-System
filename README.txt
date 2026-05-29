=======================================================
  ASISST SIMS — Setup Guide
  Amrita Sai Institute of Science and Technology
=======================================================

STEP 1 — Install MySQL
  Download: https://dev.mysql.com/downloads/installer/
  (Choose MySQL Installer for Windows)

STEP 2 — Create the Database
  Open MySQL Command Line or MySQL Workbench and run:
    mysql -u root -p < schema.sql
  This creates all tables automatically.

STEP 3 — Set Your MySQL Password
  Open config.py in VS Code
  Find:   "password": "",
  Change: "password": "your_mysql_password",
  Save the file.

STEP 4 — Install Python Packages
  Open VS Code terminal (Ctrl+`) and run:
    pip install flask mysql-connector-python

STEP 5 — Run the App
    python app.py

STEP 6 — Open in Browser
    http://localhost:5000

=======================================================
  DEFAULT LOGIN CREDENTIALS
=======================================================
  ADMIN:
    Username : admin
    Password : Admin@123

  STUDENT:
    First add a student via Admin Panel
    Then login with their Roll Number + Password

=======================================================
  IF ADMIN LOGIN FAILS
=======================================================
  Edit create_admin.py — set your MySQL password
  Then run:  python create_admin.py

=======================================================
  PROJECT FILES
=======================================================
  app.py          — Flask server (RUN THIS)
  database.py     — All MySQL queries
  config.py       — Settings (EDIT MySQL password here)
  schema.sql      — Run once in MySQL
  requirements.txt— pip install -r requirements.txt
  create_admin.py — Fix admin account if needed
  templates/
    index.html    — Frontend HTML
  static/
    css/style.css — All styles
    js/main.js    — All JavaScript
  uploads/
    certificates/ — PDF files stored here

=======================================================
  HOW TO ADD A STUDENT
=======================================================
  1. Login as Admin
  2. Click "All Students" in sidebar
  3. Click "+ Add Student"
  4. Fill Name, Roll Number, Email, Branch, Year, Sem
  5. Set a password (default: Student@123)
  6. Click "Add Student"
  7. A popup shows login credentials — share with student
  8. Student logs in at localhost:5000 using Student Portal
     Username = Roll Number  |  Password = what you set

=======================================================
  ROLE-BASED ACCESS
=======================================================
  ADMIN sees:  Dashboard, All Students, Upload Marks,
               Attendance, Certificates, Logs, Settings

  STUDENT sees: Dashboard, My Profile, My Marks,
                My Attendance, My Certificates, Settings
