"""
ترابط - منصة إدارة الشهادات
Backend API - FastAPI + SQLite
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from pathlib import Path
from datetime import datetime
import base64
import sqlite3
import json
import time
import os

# ============================================================
# الإعدادات
# ============================================================

# مسار قاعدة البيانات (في مجلد دائم)
DATA_DIR = Path("/data") if os.path.exists("/data") else Path(__file__).parent
DB_PATH = DATA_DIR / "tarabot.db"
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
CERT_IMAGE_PATH = UPLOAD_DIR / "certificate.jpg"

print(f"📁 Database path: {DB_PATH}")
print(f"📁 Uploads path: {UPLOAD_DIR}")


# ============================================================
# قاعدة البيانات
# ============================================================

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    # جدول المشاركين
    c.execute('''
        CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            added_at TEXT NOT NULL
        )
    ''')

    # جدول الإعدادات
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')

    # جدول النشاطات
    c.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            icon TEXT DEFAULT 'info',
            time TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    print("✅ Database initialized")


init_db()


# ============================================================
# FastAPI
# ============================================================

app = FastAPI(
    title="Tarabot API",
    version="3.0.0",
    description="منصة ترابط - API"
)

# CORS - للسماح بالاتصال من أي مكان
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# النماذج
# ============================================================

class ParticipantIn(BaseModel):
    name: str

class BulkIn(BaseModel):
    names: List[str]

class SettingsIn(BaseModel):
    coordX: Optional[int] = None
    coordY: Optional[int] = None
    fontSize: Optional[int] = None
    textColor: Optional[str] = None
    fontFamily: Optional[str] = None

class ImageIn(BaseModel):
    dataUrl: str

class ActivityIn(BaseModel):
    text: str
    icon: Optional[str] = "info"

class BackupIn(BaseModel):
    version: Optional[str] = None
    participants: Optional[List[Dict[str, Any]]] = None
    settings: Optional[Dict[str, Any]] = None
    activities: Optional[List[Dict[str, Any]]] = None


# ============================================================
# الجذر
# ============================================================

@app.get("/")
def root():
    return {
        "name": "Tarabot API",
        "version": "3.0.0",
        "status": "running"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ============================================================
# المشاركون
# ============================================================

@app.get("/api/participants")
def get_participants():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT id, name, added_at FROM participants ORDER BY added_at ASC")
    rows = c.fetchall()
    conn.close()

    return [
        {"id": r["id"], "name": r["name"], "addedAt": r["added_at"]}
        for r in rows
    ]


@app.post("/api/participants")
def add_participant(data: ParticipantIn):
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "الاسم فارغ")

    conn = get_conn()
    c = conn.cursor()

    # التحقق من التكرار
    c.execute("SELECT id FROM participants WHERE name = ?", (name,))
    if c.fetchone():
        conn.close()
        raise HTTPException(400, f'"{name}" موجود مسبقاً')

    pid = f"p_{int(time.time() * 1000)}"
    added_at = datetime.now().isoformat()

    c.execute("INSERT INTO participants VALUES (?, ?, ?)", (pid, name, added_at))

    # إضافة نشاط
    c.execute(
        "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
        (f'إضافة "{name}"', "user-plus", added_at)
    )

    conn.commit()
    conn.close()

    return {"id": pid, "name": name, "addedAt": added_at}


@app.post("/api/participants/bulk")
def add_bulk(data: BulkIn):
    if not data.names:
        raise HTTPException(400, "لا توجد أسماء")

    added = []
    skipped = []

    conn = get_conn()
    c = conn.cursor()

    for i, raw in enumerate(data.names):
        name = str(raw).strip()
        if not name:
            continue

        c.execute("SELECT id FROM participants WHERE name = ?", (name,))
        if c.fetchone():
            skipped.append(name)
            continue

        pid = f"p_{int(time.time() * 1000)}_{i}"
        added_at = datetime.now().isoformat()

        c.execute("INSERT INTO participants VALUES (?, ?, ?)", (pid, name, added_at))
        added.append({"id": pid, "name": name, "addedAt": added_at})

    # نشاط
    if added:
        c.execute(
            "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
            (f"إضافة {len(added)} اسم دفعة واحدة", "users", datetime.now().isoformat())
        )

    conn.commit()
    conn.close()

    return {
        "added": added,
        "skipped": skipped,
        "total": len(data.names)
    }


@app.delete("/api/participants/{pid}")
def delete_participant(pid: str):
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT name FROM participants WHERE id = ?", (pid,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "المشارك غير موجود")

    name = row["name"]
    c.execute("DELETE FROM participants WHERE id = ?", (pid,))

    c.execute(
        "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
        (f'حذف "{name}"', "user-minus", datetime.now().isoformat())
    )

    conn.commit()
    conn.close()

    return {"ok": True}


@app.delete("/api/participants")
def clear_participants():
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM participants")
    count = c.fetchone()[0]

    c.execute("DELETE FROM participants")

    if count > 0:
        c.execute(
            "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
            (f"حذف {count} اسم", "trash", datetime.now().isoformat())
        )

    conn.commit()
    conn.close()

    return {"deleted": count}


# ============================================================
# الإعدادات
# ============================================================

DEFAULT_SETTINGS = {
    "coordX": 600,
    "coordY": 425,
    "fontSize": 60,
    "textColor": "#1a1208",
    "fontFamily": "Cairo"
}


@app.get("/api/settings")
def get_settings():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT value FROM settings WHERE key = 'cert'")
    row = c.fetchone()
    conn.close()

    if row:
        try:
            saved = json.loads(row["value"])
            return {**DEFAULT_SETTINGS, **saved}
        except:
            pass

    return DEFAULT_SETTINGS


@app.post("/api/settings")
def save_settings(data: SettingsIn):
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT value FROM settings WHERE key = 'cert'")
    row = c.fetchone()
    current = json.loads(row["value"]) if row else {}

    # تحديث الحقول
    if data.coordX is not None:
        current["coordX"] = data.coordX
    if data.coordY is not None:
        current["coordY"] = data.coordY
    if data.fontSize is not None:
        current["fontSize"] = data.fontSize
    if data.textColor is not None:
        current["textColor"] = data.textColor
    if data.fontFamily is not None:
        current["fontFamily"] = data.fontFamily

    c.execute(
        "INSERT OR REPLACE INTO settings VALUES ('cert', ?)",
        (json.dumps(current),)
    )

    conn.commit()
    conn.close()

    return {**DEFAULT_SETTINGS, **current}


# ============================================================
# صورة الشهادة
# ============================================================

@app.get("/api/certificate-image")
def get_image():
    if not CERT_IMAGE_PATH.exists():
        return {"exists": False, "dataUrl": None}

    with open(CERT_IMAGE_PATH, "rb") as f:
        data = f.read()

    b64 = base64.b64encode(data).decode()
    return {
        "exists": True,
        "dataUrl": f"data:image/jpeg;base64,{b64}"
    }


@app.post("/api/certificate-image")
def upload_image(data: ImageIn):
    try:
        d = data.dataUrl
        if "," in d:
            d = d.split(",", 1)[1]

        img = base64.b64decode(d)

        with open(CERT_IMAGE_PATH, "wb") as f:
            f.write(img)

        # نشاط
        conn = get_conn()
        c = conn.cursor()
        c.execute(
            "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
            ("رفع صورة الشهادة", "image", datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        return {"ok": True, "size": len(img)}
    except Exception as e:
        raise HTTPException(400, f"فشل حفظ الصورة: {e}")


@app.delete("/api/certificate-image")
def delete_image():
    if CERT_IMAGE_PATH.exists():
        CERT_IMAGE_PATH.unlink()
        return {"ok": True}
    return {"ok": False}


# ============================================================
# النشاطات
# ============================================================

@app.get("/api/activities")
def get_activities():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT text, icon, time FROM activities ORDER BY id DESC LIMIT 30")
    rows = c.fetchall()
    conn.close()

    return [
        {"text": r["text"], "icon": r["icon"], "time": r["time"]}
        for r in rows
    ]


@app.post("/api/activities")
def add_activity(data: ActivityIn):
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
        (data.text, data.icon or "info", datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/api/activities")
def clear_activities():
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM activities")
    conn.commit()
    conn.close()
    return {"ok": True}


# ============================================================
# نسخ احتياطي
# ============================================================

@app.get("/api/backup")
def backup():
    conn = get_conn()
    c = conn.cursor()

    # المشاركون
    c.execute("SELECT id, name, added_at FROM participants")
    parts = [
        {"id": r["id"], "name": r["name"], "addedAt": r["added_at"]}
        for r in c.fetchall()
    ]

    # الإعدادات
    c.execute("SELECT value FROM settings WHERE key = 'cert'")
    row = c.fetchone()
    settings = json.loads(row["value"]) if row else DEFAULT_SETTINGS

    # النشاطات
    c.execute("SELECT text, icon, time FROM activities ORDER BY id DESC LIMIT 100")
    acts = [
        {"text": r["text"], "icon": r["icon"], "time": r["time"]}
        for r in c.fetchall()
    ]

    conn.close()

    return {
        "version": "3.0.0",
        "participants": parts,
        "settings": settings,
        "activities": acts,
        "exportedAt": datetime.now().isoformat()
    }


@app.post("/api/backup/import")
def import_backup(data: BackupIn):
    try:
        conn = get_conn()
        c = conn.cursor()

        # المشاركون
        if data.participants:
            c.execute("DELETE FROM participants")
            for p in data.participants:
                if "id" in p and "name" in p:
                    c.execute(
                        "INSERT OR IGNORE INTO participants VALUES (?, ?, ?)",
                        (p["id"], p["name"], p.get("addedAt", datetime.now().isoformat()))
                    )

        # الإعدادات
        if data.settings:
            c.execute(
                "INSERT OR REPLACE INTO settings VALUES ('cert', ?)",
                (json.dumps(data.settings),)
            )

        # النشاطات
        if data.activities:
            for a in data.activities:
                c.execute(
                    "INSERT INTO activities (text, icon, time) VALUES (?, ?, ?)",
                    (
                        a.get("text", ""),
                        a.get("icon", "info"),
                        a.get("time", datetime.now().isoformat())
                    )
                )

        conn.commit()
        conn.close()

        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))


# ============================================================
# حذف كل شيء
# ============================================================

@app.delete("/api/clear-all")
def clear_all():
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM participants")
    c.execute("DELETE FROM settings")
    c.execute("DELETE FROM activities")
    conn.commit()
    conn.close()

    if CERT_IMAGE_PATH.exists():
        CERT_IMAGE_PATH.unlink()

    return {"ok": True}


# ============================================================
# تشغيل
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)