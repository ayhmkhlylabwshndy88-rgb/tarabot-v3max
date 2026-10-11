@echo off
echo ============================================
echo   ترابط - تشغيل السيرفر
echo ============================================
echo.

REM التحقق من بايثون
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] بايثون غير مثبت!
    pause
    exit /b 1
)

REM تثبيت المكتبات إذا ما كانت مثبتة
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo [1/2] تثبيت المكتبات...
    pip install -r requirements.txt
)

echo.
echo [2/2] تشغيل السيرفر...
echo.
echo ============================================
echo   السيرفر: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ============================================
echo.

python main.py

pause