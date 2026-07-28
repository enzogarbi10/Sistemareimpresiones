$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("C:\Users\ENZO\Desktop\FlexoERP - PRUEBAS.lnk")
$shortcut.TargetPath = "E:\FlexoERP_Test\dist\FlexoERP.exe"
$shortcut.Arguments = ""
$shortcut.WorkingDirectory = "E:\FlexoERP_Test"
$shortcut.IconLocation = "E:\FlexoERP_Test\logo.ico,0"
$shortcut.Description = "FlexoERP PRUEBAS - Entorno de Testing"
$shortcut.Save()
Write-Host "Desktop shortcut created successfully!"
