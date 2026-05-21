$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("C:\Users\ENZO\Desktop\FlexoERP.lnk")
$shortcut.TargetPath = "E:\FlexoERP\dist\FlexoERP.exe"
$shortcut.WorkingDirectory = "E:\FlexoERP"
$shortcut.IconLocation = "E:\FlexoERP\logo.ico,0"
$shortcut.Description = "FlexoERP - Sistema de Gestion"
$shortcut.Save()
Write-Host "Desktop shortcut created successfully!"
