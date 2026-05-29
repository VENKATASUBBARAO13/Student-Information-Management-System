"""
database.py — All MySQL queries for ASISST SIMS
"""
import mysql.connector
from mysql.connector import pooling, Error as MySQLError
import hashlib, hmac, secrets
from datetime import datetime, timedelta
from config import DB_CONFIG

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(pool_name="sims_pool",pool_size=10,pool_reset_session=True,**DB_CONFIG)
    return _pool

def get_db(): return get_pool().get_connection()

def hash_password(password):
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}:{h.hex()}"

def verify_password(password, stored):
    try:
        salt, h = stored.split(":",1)
        new_h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
        return hmac.compare_digest(h, new_h.hex())
    except: return False

def log_activity(user_id, action, description="", ip=None):
    try:
        conn=get_db(); cur=conn.cursor()
        cur.execute("INSERT INTO activity_logs (user_id,action,description,ip_address) VALUES (%s,%s,%s,%s)",(user_id,action,description,ip))
        conn.commit(); cur.close(); conn.close()
    except Exception as e: print(f"[LOG] {e}")

def get_user_by_username(username):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE username=%s AND is_active=1",(username,))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def get_user_by_email(email):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE email=%s",(email.lower(),))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def get_user_by_id(user_id):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE id=%s",(user_id,))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def update_last_login(user_id):
    conn=get_db(); cur=conn.cursor()
    cur.execute("UPDATE users SET last_login=NOW() WHERE id=%s",(user_id,))
    conn.commit(); cur.close(); conn.close()

def update_password(user_id, new_hash):
    conn=get_db(); cur=conn.cursor()
    cur.execute("UPDATE users SET password_hash=%s WHERE id=%s",(new_hash,user_id))
    conn.commit(); cur.close(); conn.close()

def create_reset_token(user_id):
    token=secrets.token_urlsafe(48)
    expires=datetime.utcnow()+timedelta(hours=1)
    conn=get_db(); cur=conn.cursor()
    cur.execute("INSERT INTO password_reset_tokens (user_id,token,expires_at) VALUES (%s,%s,%s)",(user_id,token,expires))
    conn.commit(); cur.close(); conn.close(); return token

def get_valid_reset_token(token):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT pr.*,u.username FROM password_reset_tokens pr JOIN users u ON u.id=pr.user_id WHERE pr.token=%s AND pr.used=0 AND pr.expires_at>NOW()",(token,))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def consume_reset_token(token_id):
    conn=get_db(); cur=conn.cursor()
    cur.execute("UPDATE password_reset_tokens SET used=1 WHERE id=%s",(token_id,))
    conn.commit(); cur.close(); conn.close()

def get_all_students(branch="",year="",search=""):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    q="SELECT s.*,u.email,u.is_active,u.last_login,u.username,u.id AS user_id FROM students s JOIN users u ON u.id=s.user_id WHERE 1=1"
    p=[]
    if branch: q+=" AND s.branch=%s"; p.append(branch)
    if year:   q+=" AND s.year=%s";   p.append(year)
    if search: q+=" AND (s.full_name LIKE %s OR s.roll_number LIKE %s)"; p+=[f"%{search}%",f"%{search}%"]
    q+=" ORDER BY s.roll_number"
    cur.execute(q,p); rows=cur.fetchall(); cur.close(); conn.close(); return rows

def get_student_by_user_id(user_id):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT s.*,u.email,u.last_login FROM students s JOIN users u ON u.id=s.user_id WHERE s.user_id=%s",(user_id,))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def get_student_by_id(student_id):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT s.*,u.email,u.last_login,u.is_active,u.id AS user_id FROM students s JOIN users u ON u.id=s.user_id WHERE s.id=%s",(student_id,))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def get_student_by_roll(roll):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT s.*,u.email,u.last_login FROM students s JOIN users u ON u.id=s.user_id WHERE s.roll_number=%s",(roll.upper(),))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def add_student(data):
    conn=get_db(); cur=conn.cursor()
    try:
        cur.execute("INSERT INTO users (username,email,password_hash,role) VALUES (%s,%s,%s,'student')",
            (data["roll_number"].upper(),data["email"],hash_password(data.get("password","Student@123"))))
        uid=cur.lastrowid
        cur.execute("INSERT INTO students (user_id,roll_number,full_name,branch,year,semester,phone,address,dob,guardian) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (uid,data["roll_number"].upper(),data["full_name"],data["branch"],data["year"],data["semester"],
             data.get("phone"),data.get("address"),data.get("dob") or None,data.get("guardian")))
        sid=cur.lastrowid; conn.commit(); return sid
    except MySQLError: conn.rollback(); raise
    finally: cur.close(); conn.close()

def update_student(student_id, data):
    conn=get_db(); cur=conn.cursor()
    try:
        cur.execute("UPDATE students SET full_name=%s,branch=%s,year=%s,semester=%s,phone=%s,address=%s,dob=%s,guardian=%s WHERE id=%s",
            (data.get("full_name"),data.get("branch"),data.get("year"),data.get("semester"),
             data.get("phone"),data.get("address"),data.get("dob") or None,data.get("guardian"),student_id))
        if data.get("email"):
            s=get_student_by_id(student_id)
            if s: cur.execute("UPDATE users SET email=%s WHERE id=%s",(data["email"],s["user_id"]))
        conn.commit()
    finally: cur.close(); conn.close()

def delete_student(student_id):
    s=get_student_by_id(student_id)
    if not s: return False
    conn=get_db(); cur=conn.cursor()
    try:
        cur.execute("DELETE FROM users WHERE id=%s",(s["user_id"],))
        conn.commit(); return True
    finally: cur.close(); conn.close()

def reset_student_password(student_id, new_password):
    s=get_student_by_id(student_id)
    if not s: return False
    update_password(s["user_id"],hash_password(new_password)); return True

def get_subjects(branch="",semester=""):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    q="SELECT * FROM subjects WHERE 1=1"; p=[]
    if branch:   q+=" AND branch=%s";   p.append(branch)
    if semester: q+=" AND semester=%s"; p.append(semester)
    cur.execute(q,p); rows=cur.fetchall(); cur.close(); conn.close(); return rows

def get_subject_by_code(code):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM subjects WHERE code=%s",(code.upper(),))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def get_marks(student_id, semester=None, academic_year="2025-26"):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    q="SELECT m.*,sub.code,sub.name,sub.credits,sub.faculty,(m.internal+m.external) AS total FROM marks m JOIN subjects sub ON sub.id=m.subject_id WHERE m.student_id=%s AND m.academic_year=%s"
    p=[student_id,academic_year]
    if semester: q+=" AND m.semester=%s"; p.append(semester)
    cur.execute(q,p); rows=cur.fetchall(); cur.close(); conn.close(); return rows

def upsert_marks(student_id,subject_id,internal,external,semester,academic_year,uploaded_by):
    conn=get_db(); cur=conn.cursor()
    try:
        cur.execute("INSERT INTO marks (student_id,subject_id,internal,external,semester,academic_year,uploaded_by) VALUES (%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE internal=VALUES(internal),external=VALUES(external),uploaded_by=VALUES(uploaded_by),uploaded_at=NOW()",
            (student_id,subject_id,internal,external,semester,academic_year,uploaded_by))
        conn.commit()
    finally: cur.close(); conn.close()

def get_attendance_summary(student_id):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT sub.code,sub.name,COUNT(*) AS total_classes,SUM(IF(a.status='present',1,0)) AS present_count,SUM(IF(a.status='absent',1,0)) AS absent_count,ROUND(SUM(IF(a.status='present',1,0))/COUNT(*)*100,1) AS percentage FROM attendance a JOIN subjects sub ON sub.id=a.subject_id WHERE a.student_id=%s GROUP BY a.subject_id ORDER BY sub.code",(student_id,))
    rows=cur.fetchall(); cur.close(); conn.close(); return rows

def upsert_attendance(student_id,subject_id,date,status,marked_by):
    conn=get_db(); cur=conn.cursor()
    try:
        cur.execute("INSERT INTO attendance (student_id,subject_id,date,status,marked_by) VALUES (%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE status=VALUES(status),marked_by=VALUES(marked_by),marked_at=NOW()",
            (student_id,subject_id,date,status,marked_by))
        conn.commit()
    finally: cur.close(); conn.close()

def get_certificates(student_id):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT c.*,u.username AS issued_by_name,dl.downloaded_at AS last_downloaded FROM certificates c LEFT JOIN users u ON u.id=c.issued_by LEFT JOIN (SELECT certificate_id,MAX(downloaded_at) AS downloaded_at FROM certificate_downloads GROUP BY certificate_id) dl ON dl.certificate_id=c.id WHERE c.student_id=%s ORDER BY c.issued_at DESC",(student_id,))
    rows=cur.fetchall(); cur.close(); conn.close(); return rows

def get_certificate_by_id(cert_id):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM certificates WHERE id=%s",(cert_id,))
    r=cur.fetchone(); cur.close(); conn.close(); return r

def add_certificate(student_id,cert_type,filename,file_path,issued_by):
    conn=get_db(); cur=conn.cursor()
    cur.execute("INSERT INTO certificates (student_id,cert_type,filename,file_path,issued_by) VALUES (%s,%s,%s,%s,%s)",(student_id,cert_type,filename,file_path,issued_by))
    conn.commit(); cid=cur.lastrowid; cur.close(); conn.close(); return cid

def log_certificate_download(cert_id,student_id,ip):
    conn=get_db(); cur=conn.cursor()
    cur.execute("INSERT INTO certificate_downloads (certificate_id,student_id,ip_address) VALUES (%s,%s,%s)",(cert_id,student_id,ip))
    conn.commit(); cur.close(); conn.close()

def get_activity_logs(limit=100,action_filter=""):
    conn=get_db(); cur=conn.cursor(dictionary=True)
    q="SELECT al.*,u.username,u.role FROM activity_logs al LEFT JOIN users u ON u.id=al.user_id WHERE 1=1"
    p=[]
    if action_filter: q+=" AND al.action=%s"; p.append(action_filter)
    q+=" ORDER BY al.logged_at DESC LIMIT %s"; p.append(limit)
    cur.execute(q,p); rows=cur.fetchall(); cur.close(); conn.close()
    for r in rows:
        for k,v in r.items():
            if isinstance(v,datetime): r[k]=v.strftime("%Y-%m-%d %H:%M:%S")
    return rows

def get_admin_stats():
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT COUNT(*) AS cnt FROM students");               ts=cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) AS cnt FROM certificates");           ci=cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) AS cnt FROM certificate_downloads");  cd=cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) AS cnt FROM activity_logs WHERE action='LOGIN' AND DATE(logged_at)=CURDATE()"); lt=cur.fetchone()["cnt"]
    cur.execute("SELECT branch,COUNT(*) AS count FROM students GROUP BY branch ORDER BY count DESC"); bb=cur.fetchall()
    cur.close(); conn.close()
    return {"total_students":ts,"certs_issued":ci,"certs_downloaded":cd,"logins_today":lt,"by_branch":bb}

def seed_admin():
    conn=get_db(); cur=conn.cursor()
    cur.execute("SELECT id FROM users WHERE username='admin'")
    if not cur.fetchone():
        cur.execute("INSERT INTO users (username,email,password_hash,role) VALUES (%s,%s,%s,'admin')",
            ("admin","admin@asisst.ac.in",hash_password("Admin@123")))
        conn.commit()
        print("[DB] Admin created → admin / Admin@123")
    else:
        print("[DB] Admin already exists.")
    cur.close(); conn.close()
