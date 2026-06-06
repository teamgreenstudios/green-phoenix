@echo off
REM Green Phoenix - disk sync runner for the Windows scheduled task (BACKLOG.md s5/s6).
REM Mirrors Job Hunter jobs.json + each folder's BACKLOG.md checkboxes into Supabase.
REM Working dir is forced to the project root so .env.local (service-role key) loads.
REM Appends output to sync.log at the project root (gitignored).
cd /d "%~dp0.."
echo.>> sync.log
echo [%date% %time%] sync start>> sync.log
node "%~dp0sync-from-disk.mjs" >> sync.log 2>&1
echo [%date% %time%] sync exit %errorlevel%>> sync.log
