# Script PowerShell pour tester l'application Android sans Android Studio
# Nécessite : Android SDK avec ADB dans le PATH

Write-Host "🔨 Building Android app..." -ForegroundColor Cyan

# Build l'application
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Synchroniser Capacitor
Write-Host "🔄 Syncing Capacitor..." -ForegroundColor Cyan
npx cap sync
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Sync failed!" -ForegroundColor Red
    exit 1
}

# Vérifier si ADB est disponible
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "❌ ADB not found in PATH!" -ForegroundColor Red
    Write-Host "Please install Android SDK Platform Tools and add to PATH" -ForegroundColor Yellow
    Write-Host "Download: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Yellow
    exit 1
}

# Vérifier les appareils connectés
Write-Host "📱 Checking connected devices..." -ForegroundColor Cyan
$devices = adb devices
$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count

if ($deviceCount -eq 0) {
    Write-Host "❌ No Android device/emulator connected!" -ForegroundColor Red
    Write-Host "Please connect a device via USB or start an emulator" -ForegroundColor Yellow
    Write-Host "To start emulator: emulator -avd <avd_name>" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found $deviceCount device(s)" -ForegroundColor Green

# Build l'APK debug
Write-Host "🔨 Building debug APK..." -ForegroundColor Cyan
Set-Location android
& .\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Gradle build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Installer sur l'appareil
Write-Host "📲 Installing APK on device..." -ForegroundColor Cyan
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    adb install -r $apkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ App installed successfully!" -ForegroundColor Green
        Write-Host "🚀 Launching app..." -ForegroundColor Cyan
        adb shell am start -n com.ringarecord.app/.MainActivity
    } else {
        Write-Host "❌ Installation failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ APK not found at: $apkPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Done! App should be running on your device." -ForegroundColor Green

