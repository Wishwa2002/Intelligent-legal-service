$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

while ($true) {
    try {
        & $adb reverse tcp:5000 tcp:5000 2>$null
        & $adb reverse tcp:8001 tcp:8001 2>$null
    } catch {
        # ignore errors when device is momentarily unplugged
    }
    Start-Sleep -Seconds 3
}
