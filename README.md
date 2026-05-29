# 🎓 Student Information Management System

A full-stack Student Information Management System built using **Flask, MySQL, HTML, CSS, and JavaScript**. This application helps educational institutions manage student records, marks, attendance, certificates, and academic information through dedicated Admin and Student portals.

---

## 🚀 Features

### 👨‍💼 Admin Portal

* Add, update, search, and delete student records
* Manage student marks and attendance
* Upload and manage student certificates
* Reset student passwords
* View activity logs and dashboard statistics
* Filter students by branch and academic year

### 👨‍🎓 Student Portal

* View personal profile information
* Check marks, grades, and GPA
* Monitor attendance percentage
* Download uploaded certificates
* Change account password

### 🔒 Security Features

* Role-Based Access Control (RBAC)
* PBKDF2-SHA256 password hashing
* Secure session management
* Parameterized SQL queries
* PDF-only file uploads
* Password reset functionality

---

## 🛠️ Tech Stack

### Backend

* Python
* Flask
* MySQL
* mysql-connector-python

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Database

* MySQL 8.0

---

## 📂 Project Structure

```text
Student-Information-Management-System/
│
├── app.py
├── database.py
├── config.py
├── create_admin.py
├── schema.sql
├── requirements.txt
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── main.js
│
└── uploads/
    └── certificates/
```

---

## 🏗️ System Architecture

```text
Frontend (HTML/CSS/JavaScript)
            │
            ▼
      Flask Backend
            │
            ▼
      MySQL Database
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/VENKATASUBBARAO13/Student-Information-Management-System.git
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

### 3. Activate Virtual Environment

Windows:

```bash
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Setup MySQL Database

Run:

```bash
mysql -u root -p < schema.sql
```

### 6. Configure Database

Update database credentials in:

```python
config.py
```

### 7. Run Application

```bash
python app.py
```

Open:

```text
http://localhost:5000
```

---

## 🔑 Login Credentials

### Admin

```text
Username: admin
Password: Admin@123
```

### Student

```text
Username: Roll Number
Password: Assigned by Admin
```

---

## 📊 Core Modules

### Student Management

* Student registration
* Student profile management
* Search and filtering

### Marks Management

* Internal marks
* External marks
* GPA calculation
* Grade generation

### Attendance Management

* Daily attendance tracking
* Subject-wise attendance
* Percentage calculation

### Certificate Management

* PDF upload
* Certificate download
* Download tracking

### Activity Logging

* User activity records
* Audit trail
* Dashboard analytics

---

## 📸 Screenshots

Add screenshots here:

* Login Page
* Admin Dashboard
* Student Dashboard
* Student Management
* Marks Module
* Attendance Module
* Certificate Module

---

## 🎯 Learning Outcomes

This project helped me gain hands-on experience in:

* Flask Web Development
* REST API Development
* MySQL Database Design
* Authentication & Authorization
* Session Management
* File Upload Handling
* Frontend Development
* Database Integration
* Git & GitHub Version Control

---

## 🔮 Future Enhancements

* Email Notifications
* Bulk Marks Upload
* Timetable Management
* Exam Scheduling
* Parent Portal
* Student Photo Upload
* PDF & Excel Report Generation
* Docker Deployment
* PostgreSQL Support

---

## 👨‍💻 Author

**Venkata Subbarao**

Aspiring Cloud Engineer | Python Developer

GitHub: https://github.com/VENKATASUBBARAO13

LinkedIn: https://www.linkedin.com/in/venkatasubbarao13

---

## ⭐ Support

If you found this project useful, please consider giving it a ⭐ on GitHub.

---

## 📄 License

This project is licensed under the MIT License.
