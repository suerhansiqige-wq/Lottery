@echo off
rem  Silent variant for Windows Task Scheduler.
rem  Difference from sync-push.bat: no "pause" (a scheduled task would otherwise hang
rem  forever waiting for a keypress), and all output is appended to sync-push.log.
rem  The script exit code is propagated so Task Scheduler history shows a real failure.
chcp 65001 >nul
cd /d "%~dp0"
>> sync-push.log echo.
>> sync-push.log echo ============================================================
>> sync-push.log echo Task Scheduler run   %DATE% %TIME%
>> sync-push.log echo ============================================================
node scripts\sync_and_push.mjs >> sync-push.log 2>&1
set RC=%ERRORLEVEL%
>> sync-push.log echo exit code = %RC%
exit /b %RC%
