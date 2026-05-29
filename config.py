"""
config.py — Edit DB_CONFIG with your MySQL password before running.
"""
import os, secrets

SECRET_KEY = os.environ.get("SIMS_SECRET_KEY", secrets.token_hex(32))
DEBUG      = True
MAX_UPLOAD = 16 * 1024 * 1024
UPLOAD_DIR = "uploads/certificates"

DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",
    "password": "naren2003",        # <-- PUT YOUR MYSQL PASSWORD HERE (leave empty if none)
    "database": "asisst_sims",
    "charset":  "utf8mb4",
    "use_unicode":        True,
    "autocommit":         False,
    "connection_timeout": 30,
    "raise_on_warnings":  False,
}

GRADE_SCALE = [(90,"O"),(80,"A+"),(70,"A"),(60,"B+"),(50,"B"),(40,"C"),(0,"F")]

def get_grade(total: float) -> str:
    for t, g in GRADE_SCALE:
        if total >= t: return g
    return "F"
