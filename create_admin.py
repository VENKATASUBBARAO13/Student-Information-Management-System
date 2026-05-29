"""
create_admin.py
Run this once if admin login doesn't work:  python create_admin.py
"""
import hashlib, hmac, secrets, mysql.connector

# ── CHANGE PASSWORD TO MATCH YOUR config.py ──
DB = {
    "host":     "localhost",
    "user":     "root",
    "password": "",          # <-- Your MySQL password
    "database": "asisst_sims",
}

def hash_password(pw):
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 260000)
    return f"{salt}:{h.hex()}"

try:
    conn = mysql.connector.connect(**DB)
    cur  = conn.cursor()
    cur.execute("DELETE FROM users WHERE username='admin'")
    cur.execute(
        "INSERT INTO users (username,email,password_hash,role,is_active) VALUES (%s,%s,%s,'admin',1)",
        ("admin","admin@asisst.ac.in", hash_password("Admin@123"))
    )
    conn.commit()
    print("✅ Admin account created!")
    print("   Username : admin")
    print("   Password : Admin@123")
    cur.close(); conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
    print("   Make sure MySQL is running and password in this file is correct.")
