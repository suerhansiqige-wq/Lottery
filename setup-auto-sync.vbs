Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell -Command ""Start-Process schtasks -ArgumentList '/create /tn ""彩票数据自动同步"" /tr ""C:\Users\boloor\Desktop\彩票\sync-draws-manual.bat"" /sc daily /st 21:45 /rl highest /f' -Verb RunAs""", 0
WScript.Sleep 2000
MsgBox "计划任务创建完成！" & vbCrLf & vbCrLf & _
       "任务名称：彩票数据自动同步" & vbCrLf & _
       "执行时间：每天 21:45" & vbCrLf & _
       "执行内容：同步最新开奖数据并推送到GitHub", vbInformation, "设置成功"
