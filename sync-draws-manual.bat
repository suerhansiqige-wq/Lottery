@echo off
chcp 65001 >nul
echo ========================================
echo 彩票数据自动同步脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 同步最新开奖数据...
node scripts/gh_sync_draws.mjs
if %errorlevel% neq 0 (
    echo ❌ 同步失败
    pause
    exit /b 1
)

echo.
echo [2/3] 检查是否有新数据...
git status --porcelain | findstr "lotteryData.js" >nul
if %errorlevel% neq 0 (
    echo ✓ 数据已是最新，无需提交
    echo.
    echo [3/3] 推送到GitHub...
    git push
    if %errorlevel% neq 0 (
        echo ❌ 推送失败
        pause
        exit /b 1
    )
    echo ✓ 推送成功
    pause
    exit /b 0
)

echo ✓ 发现新数据
echo.
echo [3/3] 提交并推送到GitHub...
git add lottery-app/src/data/lotteryData.js pl3-app/src/data/lotteryData.js
git commit -m "chore(data): 手动同步最新开奖数据"
git push
if %errorlevel% neq 0 (
    echo ❌ 推送失败
    pause
    exit /b 1
)

echo.
echo ✓ 全部完成！
pause
