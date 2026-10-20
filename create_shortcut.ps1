$ws = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    "C:\Users\ENZO\Desktop",
    "C:\Users\ENZO\OneDrive\Desktop",
    [Environment]::GetFolderPath("Desktop")
) | Select-Object -Unique

foreach ($dir in $desktopPaths) {
    if (Test-Path $dir) {
        $shortcutPath = Join-Path $dir "FlexoERP.lnk"
        $shortcut = $ws.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
        $shortcut.Arguments = "`"E:\FlexoERP\run_server.vbs`""
        $shortcut.WorkingDirectory = "E:\FlexoERP"
        $shortcut.IconLocation = "E:\FlexoERP\logo.ico,0"
        $shortcut.Description = "FlexoERP - Sistema de Gestion"
        $shortcut.Save()
        Write-Host "Acceso directo actualizado en: $shortcutPath"
    }
}
