@echo off
rem  Double-click this file to sync latest draw results and push to GitHub Pages.
rem  双击本文件：拉取最新开奖数据 -> 提交 -> 推送 -> GitHub Pages 自动重新发布（约 1~2 分钟生效）
chcp 65001 >nul
cd /d "%~dp0"
node scripts\sync_and_push.mjs
set RC=%ERRORLEVEL%
echo.
echo ============================================
if "%RC%"=="0" (
  echo   OK  -  exit code 0
) else (
  echo   WARN -  exit code %RC%, see messages above
)
echo ============================================
echo.
pause
