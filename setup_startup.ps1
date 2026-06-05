$ws = New-Object -ComObject WScript.Shell
$startupPath = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$shortcut = $ws.CreateShortcut([System.IO.Path]::Combine($startupPath, "FlexoERP.lnk"))
$shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
$shortcut.Arguments = "`"E:\FlexoERP\run_server.vbs`""
$shortcut.WorkingDirectory = "E:\FlexoERP"
$shortcut.IconLocation = "E:\FlexoERP\logo.ico,0"
$shortcut.Description = "FlexoERP - Auto Startup"
$shortcut.Save()
Write-Host "Startup shortcut created successfully in: $startupPath"
