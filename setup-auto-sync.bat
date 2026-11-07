@echo off
chcp 65001 >nul
echo ========================================
echo 设置每日自动同步开奖数据
echo ========================================
echo.
echo 将创建Windows计划任务：
echo - 每天21:45自动运行（开奖后30分钟）
echo - 同步最新数据到GitHub
echo.
set /p confirm=确认设置？(Y/N): 

if /i not "%confirm%"=="Y" (
    echo 已取消
    pause
    exit /b 0
)

cd /d "%~dp0"

:: 删除旧任务（如果存在）
schtasks /delete /tn "彩票数据自动同步" /f >nul 2>&1

:: 创建新任务
schtasks /create ^
    /tn "彩票数据自动同步" ^
    /tr "\"%~dp0sync-draws-manual.bat\"" ^
    /sc daily ^
    /st 21:45 ^
    /rl highest ^
    /f

if %errorlevel% neq 0 (
    echo.
    echo ❌ 创建失败，请以管理员身份运行此脚本
    pause
    exit /b 1
)

echo.
echo ✓ 计划任务创建成功！
echo.
echo 任务详情：
echo - 名称：彩票数据自动同步
echo - 执行时间：每天21:45
echo - 执行内容：同步最新开奖数据并推送到GitHub
echo.
echo 如需修改或删除：
echo 1. 打开"任务计划程序"
echo 2. 找到"彩票数据自动同步"任务
echo 3. 右键编辑或删除
echo.
pause
