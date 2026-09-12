<#
.SYNOPSIS
  注册/更新「开奖数据同步推送」的 Windows 计划任务（本机兜底通道）。

.DESCRIPTION
  GitHub Actions 的 cron 是共享队列，实测会延迟数小时甚至整天不触发（见 .github/workflows/sync-draws.yml
  顶部注释），因此本机需要一条准点的兜底通道：Windows 任务计划程序按精确钟点执行 sync-push-silent.bat。

  为什么用 PowerShell 而不是 schtasks /Create：
    - 重复触发（每 10 分钟一次、持续若干小时）在 schtasks 里是 /RI + /DU，与 /SC DAILY 组合时
      部分 Windows 版本会直接报「重复间隔对该计划类型无效」；
    - 电池策略、错过补跑、执行时限、失败重启这些开关 schtasks 根本没有对应参数。
    用 New-ScheduledTaskTrigger + New-ScheduledTaskSettingsSet 一次配齐，可复跑、可版本化。

  任务设置为「只使用交互方式」（LogonType=Interactive）：不存储任何密码，代价是电脑关机或
  用户未登录时不会运行 —— 这是 GitHub 侧通道存在的意义，两者互补。

.PARAMETER RemoveLegacy
  删除被本任务取代的旧计划任务（LotterySyncPush-2135 / LotterySyncPush-2210）。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-sync-task.ps1 -RemoveLegacy
#>
[CmdletBinding()]
param(
  [string]   $TaskName        = 'LotterySyncPush-Evening',
  [string]   $At              = '21:20',   # 福彩3D 21:15、排列三 21:25 开奖之后
  [int]      $IntervalMinutes = 10,        # 每 10 分钟重试一次
  [int]      $DurationMinutes = 140,       # 持续 140 分钟 → 最后一次 23:40
  [string[]] $LegacyTasks     = @('LotterySyncPush-2135', 'LotterySyncPush-2210'),
  [switch]   $RemoveLegacy
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bat  = Join-Path $root 'sync-push-silent.bat'
if (-not (Test-Path $bat)) { throw "找不到批处理：$bat" }

# ---- 动作：静默版批处理（无 pause，输出追加到 sync-push.log，透传退出码）----
$action = New-ScheduledTaskAction -Execute $bat -WorkingDirectory $root

# ---- 触发器：每天 $At 起，每 $IntervalMinutes 分钟一次，持续 $DurationMinutes 分钟 ----
#   Repetition 不能由 New-ScheduledTaskTrigger -Daily 直接给出，需从 -Once 触发器上摘下来挂过去。
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$once = New-ScheduledTaskTrigger -Once -At $At `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Minutes $DurationMinutes)
$trigger.Repetition = $once.Repetition

# ---- 设置：电池下也跑、错过尽快补跑、10 分钟时限、失败重试 2 次、已在跑就不叠加新实例 ----
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10) `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

$desc = "开奖数据同步推送：每天 $At 起每 $IntervalMinutes 分钟一次、持续 $DurationMinutes 分钟" +
        "（福彩3D 21:15、排列三 21:25 开奖）。执行 sync-push-silent.bat，日志追加到 sync-push.log。" +
        "仅在用户登录时运行，不存储密码。"

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Description $desc -Force | Out-Null

if ($RemoveLegacy) {
  foreach ($old in $LegacyTasks) {
    if (Get-ScheduledTask -TaskName $old -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $old -Confirm:$false
      Write-Output "已删除旧任务：$old（被 $TaskName 取代）"
    }
  }
}

# ---- 复查：注册成功不等于设置生效，逐项打印实际值 ----
$t = Get-ScheduledTask -TaskName $TaskName
$i = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Output ''
Write-Output "TaskName  : $TaskName"
Write-Output "State     : $($t.State)"
Write-Output "Trigger   : start=$($t.Triggers[0].StartBoundary) interval=$($t.Triggers[0].Repetition.Interval) duration=$($t.Triggers[0].Repetition.Duration) count=$($t.Triggers.Count)"
Write-Output "NextRun   : $($i.NextRunTime)"
Write-Output "Action    : $($t.Actions[0].Execute)  workdir=$($t.Actions[0].WorkingDirectory)  count=$($t.Actions.Count)"
Write-Output "Battery   : disallow=$($t.Settings.DisallowStartIfOnBatteries) stop=$($t.Settings.StopIfGoingOnBatteries)"
Write-Output "Settings  : StartWhenAvailable=$($t.Settings.StartWhenAvailable) Limit=$($t.Settings.ExecutionTimeLimit) Multi=$($t.Settings.MultipleInstancesPolicy) Restart=$($t.Settings.RestartCount)/$($t.Settings.RestartInterval)"
Write-Output "Principal : $($t.Principal.UserId) LogonType=$($t.Principal.LogonType) RunLevel=$($t.Principal.RunLevel)"
Write-Output ''
Write-Output '提示：手动验证可执行 schtasks /Run /TN "$TaskName"，随后看 sync-push.log 末尾与「上次结果」是否为 0。'
