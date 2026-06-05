$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("C:\Users\ENZO\Desktop\FlexoERP.lnk")
$shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
$shortcut.Arguments = "`"E:\FlexoERP\run_server.vbs`""
$shortcut.WorkingDirectory = "E:\FlexoERP"
$shortcut.IconLocation = "E:\FlexoERP\logo.ico,0"
$shortcut.Description = "FlexoERP - Sistema de Gestion"
$shortcut.Save()
Write-Host "Desktop shortcut created successfully!"
