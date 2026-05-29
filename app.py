"""
app.py — ASISST SIMS Flask Application
Run: python app.py
"""
import os
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, send_from_directory, abort
import config
import database as db
from config import get_grade

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = config.MAX_UPLOAD
os.makedirs(config.UPLOAD_DIR, exist_ok=True)

def login_required(f):
    @wraps(f)
    def w(*a,**k):
        if "user_id" not in session: return jsonify({"error":"Unauthorized"}),401
        return f(*a,**k)
    return w

def admin_required(f):
    @wraps(f)
    def w(*a,**k):
        if "user_id" not in session or session.get("role")!="admin": return jsonify({"error":"Admin only"}),403
        return f(*a,**k)
    return w

def _dt(v): return v.strftime("%Y-%m-%d %H:%M:%S") if isinstance(v,datetime) else v
def _safe(row): return {k:_dt(v) for k,v in row.items()} if row else {}

@app.route("/")
def index(): return render_template("index.html")

@app.route("/api/session")
def get_session():
    if "user_id" in session:
        return jsonify({"logged_in":True,"user_id":session["user_id"],"username":session["username"],"role":session["role"],"email":session["email"]})
    return jsonify({"logged_in":False})

@app.route("/api/login",methods=["POST"])
def login():
    data=request.get_json() or {}
    username=data.get("username","").strip()
    password=data.get("password","")
    role_req=data.get("role","")
    if not username or not password: return jsonify({"success":False,"error":"Username and password required"}),400
    user=db.get_user_by_username(username)
    if not user or not db.verify_password(password,user["password_hash"]): return jsonify({"success":False,"error":"Invalid username or password"}),401
    if role_req and user["role"]!=role_req: return jsonify({"success":False,"error":f"Not a {role_req} account"}),403
    db.update_last_login(user["id"])
    session["user_id"]=user["id"]; session["username"]=user["username"]
    session["role"]=user["role"];  session["email"]=user["email"]
    db.log_activity(user["id"],"LOGIN",f"{user['username']} logged in",request.remote_addr)
    return jsonify({"success":True,"role":user["role"],"username":user["username"]})

@app.route("/api/logout",methods=["POST"])
def logout():
    uid=session.get("user_id"); un=session.get("username","")
    db.log_activity(uid,"LOGOUT",f"{un} logged out",request.remote_addr)
    session.clear()
    return jsonify({"success":True})

@app.route("/api/forgot-password",methods=["POST"])
def forgot_password():
    data=request.get_json() or {}
    email=data.get("email","").strip().lower()
    user=db.get_user_by_email(email)
    if not user: return jsonify({"success":True,"message":"If that email is registered you will receive a reset token."})
    token=db.create_reset_token(user["id"])
    db.log_activity(user["id"],"PASSWORD_RESET_REQUESTED",f"Reset for {email}",request.remote_addr)
    return jsonify({"success":True,"message":"Reset token generated!","demo_token":token})

@app.route("/api/reset-password",methods=["POST"])
def reset_password():
    data=request.get_json() or {}
    token=data.get("token",""); new_pw=data.get("password","")
    if len(new_pw)<8: return jsonify({"success":False,"error":"Password must be at least 8 characters"}),400
    rec=db.get_valid_reset_token(token)
    if not rec: return jsonify({"success":False,"error":"Invalid or expired token"}),400
    db.update_password(rec["user_id"],db.hash_password(new_pw))
    db.consume_reset_token(rec["id"])
    db.log_activity(rec["user_id"],"PASSWORD_RESET",f"Password reset for {rec['username']}",request.remote_addr)
    return jsonify({"success":True,"message":"Password reset! You can now log in."})

@app.route("/api/change-password",methods=["POST"])
@login_required
def change_password():
    data=request.get_json() or {}
    cur_pw=data.get("current_password",""); new_pw=data.get("new_password","")
    if len(new_pw)<8: return jsonify({"success":False,"error":"New password must be at least 8 characters"}),400
    user=db.get_user_by_id(session["user_id"])
    if not db.verify_password(cur_pw,user["password_hash"]): return jsonify({"success":False,"error":"Current password is incorrect"}),400
    db.update_password(session["user_id"],db.hash_password(new_pw))
    db.log_activity(session["user_id"],"PASSWORD_CHANGED","Password changed",request.remote_addr)
    return jsonify({"success":True,"message":"Password changed successfully!"})

@app.route("/api/student/profile")
@login_required
def student_profile():
    if session["role"]=="student": s=db.get_student_by_user_id(session["user_id"])
    else: s=db.get_student_by_roll(request.args.get("roll",""))
    if not s: return jsonify({"error":"Student not found"}),404
    return jsonify(_safe(s))

@app.route("/api/student/marks")
@login_required
def student_marks():
    if session["role"]=="student":
        s=db.get_student_by_user_id(session["user_id"]); sid=s["id"] if s else None
    else: sid=request.args.get("student_id")
    if not sid: return jsonify({"marks":[],"percentage":0,"gpa":0})
    marks=db.get_marks(sid,request.args.get("semester"),request.args.get("ay","2025-26"))
    result=[]
    for m in marks:
        total=float(m["total"] or 0)
        result.append({**_safe(m),"grade":get_grade(total),"pass":total>=40})
    total_marks=sum(r["total"] for r in result); total_max=len(result)*100
    percentage=round(total_marks/total_max*100,2) if total_max else 0
    total_credits=sum(r["credits"] for r in result)
    gpa=round(sum(r["credits"]*(10-max(0,(100-r["total"])/10)) for r in result)/total_credits,2) if total_credits else 0
    return jsonify({"marks":result,"percentage":percentage,"gpa":gpa})

@app.route("/api/student/attendance")
@login_required
def student_attendance():
    if session["role"]=="student":
        s=db.get_student_by_user_id(session["user_id"]); sid=s["id"] if s else None
    else: sid=request.args.get("student_id")
    if not sid: return jsonify({"subjects":[],"overall":0})
    rows=db.get_attendance_summary(sid)
    result=[{**r,"status":"Good" if float(r["percentage"] or 0)>=75 else "Low"} for r in rows]
    overall=round(sum(float(r["percentage"] or 0) for r in result)/len(result),1) if result else 0
    return jsonify({"subjects":result,"overall":overall})

@app.route("/api/student/certificates")
@login_required
def student_certificates():
    if session["role"]=="student":
        s=db.get_student_by_user_id(session["user_id"]); sid=s["id"] if s else None
    else: sid=request.args.get("student_id")
    if not sid: return jsonify([])
    certs=db.get_certificates(sid)
    return jsonify([_safe(c) for c in certs])

@app.route("/api/student/certificate/download/<int:cert_id>")
@login_required
def download_certificate(cert_id):
    cert=db.get_certificate_by_id(cert_id)
    if not cert: abort(404)
    if session["role"]=="student":
        s=db.get_student_by_user_id(session["user_id"])
        if not s or s["id"]!=cert["student_id"]: abort(403)
        sid=s["id"]
    else: sid=cert["student_id"]
    db.log_certificate_download(cert_id,sid,request.remote_addr)
    db.log_activity(session["user_id"],"CERTIFICATE_DOWNLOAD",f"Downloaded cert ID:{cert_id}",request.remote_addr)
    return send_from_directory(os.path.abspath(config.UPLOAD_DIR),cert["filename"],as_attachment=True)

@app.route("/api/admin/students")
@admin_required
def admin_students():
    students=db.get_all_students(request.args.get("branch",""),request.args.get("year",""),request.args.get("search",""))
    return jsonify([_safe(s) for s in students])

@app.route("/api/admin/students",methods=["POST"])
@admin_required
def admin_add_student():
    data=request.get_json() or {}
    for f in ("roll_number","full_name","branch","year","semester","email"):
        if not data.get(f): return jsonify({"success":False,"error":f"'{f}' is required"}),400
    try:
        db.add_student(data)
        db.log_activity(session["user_id"],"STUDENT_ADDED",f"Added {data['roll_number'].upper()}",request.remote_addr)
        return jsonify({"success":True,"message":f"Student {data['roll_number'].upper()} added successfully!"})
    except: return jsonify({"success":False,"error":"Roll number or email already exists"}),409

@app.route("/api/admin/students/<int:student_id>",methods=["PUT"])
@admin_required
def admin_update_student(student_id):
    data=request.get_json() or {}
    db.update_student(student_id,data)
    db.log_activity(session["user_id"],"STUDENT_UPDATED",f"Updated student ID:{student_id}",request.remote_addr)
    return jsonify({"success":True,"message":"Student updated!"})

@app.route("/api/admin/students/<int:student_id>",methods=["DELETE"])
@admin_required
def admin_delete_student(student_id):
    s=db.get_student_by_id(student_id)
    if not s: return jsonify({"success":False,"error":"Not found"}),404
    db.delete_student(student_id)
    db.log_activity(session["user_id"],"STUDENT_DELETED",f"Deleted {s['roll_number']}",request.remote_addr)
    return jsonify({"success":True,"message":f"Student {s['roll_number']} deleted!"})

@app.route("/api/admin/reset-student-password",methods=["POST"])
@admin_required
def admin_reset_student_password():
    data=request.get_json() or {}
    sid=data.get("student_id"); pw=data.get("password","Student@123")
    s=db.get_student_by_id(sid)
    if not s: return jsonify({"success":False,"error":"Student not found"}),404
    db.reset_student_password(sid,pw)
    db.log_activity(session["user_id"],"PASSWORD_RESET_BY_ADMIN",f"Reset password for {s['roll_number']}",request.remote_addr)
    return jsonify({"success":True,"message":f"Password reset for {s['roll_number']}!"})

@app.route("/api/admin/marks",methods=["POST"])
@admin_required
def admin_upload_marks():
    data=request.get_json() or {}
    subj=db.get_subject_by_code(data.get("subject_code",""))
    if not subj: return jsonify({"success":False,"error":"Subject code not found"}),404
    try:
        db.upsert_marks(data["student_id"],subj["id"],float(data["internal"]),float(data["external"]),int(data["semester"]),data.get("academic_year","2025-26"),session["user_id"])
        db.log_activity(session["user_id"],"MARKS_UPLOADED",f"Marks for student {data['student_id']}, {subj['code']}",request.remote_addr)
        return jsonify({"success":True,"message":"Marks saved successfully!"})
    except Exception as e: return jsonify({"success":False,"error":str(e)}),400

@app.route("/api/admin/attendance",methods=["POST"])
@admin_required
def admin_mark_attendance():
    data=request.get_json() or {}
    subj=db.get_subject_by_code(data.get("subject_code",""))
    if not subj: return jsonify({"success":False,"error":"Subject not found"}),404
    db.upsert_attendance(data["student_id"],subj["id"],data["date"],data["status"],session["user_id"])
    db.log_activity(session["user_id"],"ATTENDANCE_MARKED",f"{data['status']} for student {data['student_id']} on {data['date']}",request.remote_addr)
    return jsonify({"success":True,"message":"Attendance recorded!"})

@app.route("/api/admin/certificates",methods=["POST"])
@admin_required
def admin_upload_certificate():
    if "file" not in request.files: return jsonify({"success":False,"error":"No file"}),400
    f=request.files["file"]; sid=request.form.get("student_id"); cert_type=request.form.get("cert_type","General")
    if not f.filename.lower().endswith(".pdf"): return jsonify({"success":False,"error":"Only PDF files allowed"}),400
    timestamp=datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename=f"cert_{sid}_{cert_type.replace(' ','_')}_{timestamp}.pdf"
    file_path=os.path.join(config.UPLOAD_DIR,filename)
    f.save(file_path)
    db.add_certificate(int(sid),cert_type,filename,file_path,session["user_id"])
    db.log_activity(session["user_id"],"CERTIFICATE_UPLOADED",f"Uploaded {cert_type} for student {sid}",request.remote_addr)
    return jsonify({"success":True,"message":f"{cert_type} uploaded successfully!"})

@app.route("/api/admin/logs")
@admin_required
def admin_logs():
    return jsonify(db.get_activity_logs(int(request.args.get("limit",100)),request.args.get("action","")))

@app.route("/api/admin/stats")
@admin_required
def admin_stats():
    return jsonify(db.get_admin_stats())

@app.route("/api/subjects")
@login_required
def get_subjects():
    return jsonify(db.get_subjects(request.args.get("branch",""),request.args.get("semester","")))

if __name__=="__main__":
    print("\n" + "="*55)
    print("  ASISST — Student Information Management System")
    print("="*55)
    print("  Make sure you ran: mysql -u root -p < schema.sql")
    print("  Make sure config.py has your MySQL password")
    print("  URL: http://localhost:5000")
    print("="*55+"\n")
    try: db.seed_admin()
    except Exception as e: print(f"[WARN] DB not connected: {e}\n  → Check config.py MySQL password")
    app.run(debug=True, port=5000, host="0.0.0.0")
