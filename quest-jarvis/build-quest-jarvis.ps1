# Rebuild the signed debug APK. Requires Unity 6000.5.0f1 with Android support.
$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
$Unity = "C:\Program Files\Unity\Hub\Editor\6000.5.0f1\Editor\Unity.exe"
$Keytool = "C:\Program Files\Unity\Hub\Editor\6000.5.0f1\Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK\bin\keytool.exe"
$Signing = Join-Path $Project "Signing"
$Keystore = Join-Path $Signing "quest-jarvis-debug.keystore"
$PassFile = Join-Path $Signing "keystore.pass"
New-Item -ItemType Directory -Force -Path $Signing | Out-Null
if (-not (Test-Path $PassFile)) {
    if (Test-Path $Keystore) { throw "Signing/keystore.pass is missing. Keep it next to the keystore on this PC." }
    $bytes = New-Object byte[] 18
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    Set-Content -Path $PassFile -Value ([Convert]::ToBase64String($bytes)) -NoNewline
}
$pass = (Get-Content -Raw $PassFile).Trim()
if (-not (Test-Path $Keystore)) {
    & $Keytool -genkeypair -keystore $Keystore -storepass $pass -keypass $pass -alias jarvis -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Quest Jarvis, OU=Local, O=Alteoziel, C=US"
}
$Log = Join-Path $Project "Logs"
New-Item -ItemType Directory -Force -Path $Log | Out-Null
$logFile = Join-Path $Log "build.log"
$proc = Start-Process -FilePath $Unity -ArgumentList @(
    "-batchmode", "-quit", "-projectPath", $Project, "-buildTarget", "Android",
    "-executeMethod", "QuestJarvis.Editor.QuestJarvisBuild.BuildApk",
    "-logFile", $logFile
) -PassThru -Wait
if ($proc.ExitCode -ne 0) { throw "Unity build failed with $($proc.ExitCode). See Logs\build.log" }
Write-Host "APK: $Project\Builds\QuestJarvis-debug.apk"
