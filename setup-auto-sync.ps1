# 以管理员身份创建计划任务
$taskName = "彩票数据自动同步"
$taskCommand = "C:\Users\boloor\Desktop\彩票\sync-draws-manual.bat"
$taskTime = "21:45"

# 检查是否已存在
$existing = schtasks /query /tn $taskName 2>$null
if ($existing) {
    Write-Host "任务已存在，正在删除..." -ForegroundColor Yellow
    schtasks /delete /tn $taskName /f | Out-Null
}

# 创建新任务
Write-Host "正在创建计划任务..." -ForegroundColor Cyan
$result = schtasks /create /tn $taskName /tr $taskCommand /sc daily /st $taskTime /rl highest /f 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ 计划任务创建成功！" -ForegroundColor Green
    Write-Host "`n任务详情：" -ForegroundColor Cyan
    Write-Host "  名称：$taskName"
    Write-Host "  执行时间：每天 $taskTime"
    Write-Host "  执行内容：同步最新开奖数据并推送到GitHub"
    Write-Host "`n如需修改或删除：" -ForegroundColor Yellow
    Write-Host "  1. 打开'任务计划程序'"
    Write-Host "  2. 找到'$taskName'任务"
    Write-Host "  3. 右键编辑或删除"
} else {
    Write-Host "`n❌ 创建失败：" -ForegroundColor Red
    Write-Host $result
    Write-Host "`n请确保以管理员身份运行此脚本" -ForegroundColor Yellow
}

Write-Host "`n按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
