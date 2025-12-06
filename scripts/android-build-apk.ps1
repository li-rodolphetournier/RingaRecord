# Script de build Android APK pour installation directe (PowerShell)
# Génère un APK signé pour installation directe sur appareil Android

$ErrorActionPreference = "Stop"

Write-Host "🚀 Build Android APK pour installation directe" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour afficher les erreurs
function Show-Error {
  param([string]$Message)
  Write-Host "❌ $Message" -ForegroundColor Red
  exit 1
}

# Fonction pour afficher les succès
function Show-Success {
  param([string]$Message)
  Write-Host "✅ $Message" -ForegroundColor Green
}

# Fonction pour afficher les warnings
function Show-Warning {
  param([string]$Message)
  Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# 1. Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
  Show-Error "Ce script doit être exécuté depuis la racine du projet"
}

# 2. Vérifier que Node.js est installé
Write-Host "📦 Vérification de Node.js..." -ForegroundColor Cyan
try {
  $nodeVersion = node -v
  Show-Success "Node.js $nodeVersion détecté"
} catch {
  Show-Error "Node.js n'est pas installé"
}
Write-Host ""

# 3. Vérifier que le dossier android existe
if (-not (Test-Path "android")) {
  Show-Error "Le dossier android n'existe pas. Exécutez d'abord: npm run cap:add:android"
}

# 4. Demander le type de build
Write-Host "📱 Type de build APK:" -ForegroundColor Cyan
Write-Host "1. Debug (non signé, pour tests rapides)" -ForegroundColor White
Write-Host "2. Release (signé, pour distribution)" -ForegroundColor White
Write-Host ""
$buildType = Read-Host "Choisir le type (1 ou 2)"

if ($buildType -eq "1") {
  $buildVariant = "debug"
  $signed = $false
} elseif ($buildType -eq "2") {
  $buildVariant = "release"
  $signed = $true
  
  # Vérifier le keystore pour release
  Write-Host "🔐 Vérification du keystore..." -ForegroundColor Cyan
  $keystoreFile = "android/keystore.properties"
  if (-not (Test-Path $keystoreFile)) {
    Show-Warning "keystore.properties n'existe pas"
    Write-Host "Pour créer un keystore, exécutez: npm run android:generate-keystore" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continuer sans keystore? (l'APK ne sera pas signé) [y/N]"
    if ($continue -ne "y" -and $continue -ne "Y") {
      exit 1
    }
    $signed = $false
  } else {
    Show-Success "keystore.properties trouvé"
  }
} else {
  Show-Error "Choix invalide"
}
Write-Host ""

# 5. Build de l'application web
Write-Host "🔨 Build de l'application web..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Show-Error "Le build web a échoué"
}
Show-Success "Build web réussi"
Write-Host ""

# 6. Synchroniser Capacitor
Write-Host "🔄 Synchronisation Capacitor..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
  Show-Error "La synchronisation Capacitor a échoué"
}
Show-Success "Synchronisation Capacitor réussie"
Write-Host ""

# 7. Build APK
Write-Host "📦 Build APK ($buildVariant)..." -ForegroundColor Cyan
Set-Location android
if ($buildVariant -eq "debug") {
  ./gradlew assembleDebug
} else {
  ./gradlew assembleRelease
}
if ($LASTEXITCODE -ne 0) {
  Set-Location ..
  Show-Error "Le build APK a échoué"
}
Set-Location ..

# 8. Vérifier que le fichier APK existe
if ($buildVariant -eq "debug") {
  $apkPath = "android/app/build/outputs/apk/debug/app-debug.apk"
} else {
  $apkPath = "android/app/build/outputs/apk/release/app-release.apk"
}

if (Test-Path $apkPath) {
  $fileSize = (Get-Item $apkPath).Length / 1MB
  Show-Success "APK créé avec succès (taille: $([math]::Round($fileSize, 2)) MB)"
  Write-Host ""
  Write-Host "📁 Fichier APK: $apkPath" -ForegroundColor Green
  Write-Host ""
  
  if ($signed) {
    Write-Host "✅ APK signé prêt pour installation!" -ForegroundColor Green
  } else {
    Write-Host "⚠️  APK non signé (debug ou keystore manquant)" -ForegroundColor Yellow
  }
  
  Write-Host ""
  Write-Host "📱 Installation sur téléphone Android:" -ForegroundColor Cyan
  Write-Host "1. Transférer l'APK sur votre téléphone (USB, email, cloud)" -ForegroundColor White
  Write-Host "2. Activer 'Sources inconnues' dans les paramètres Android" -ForegroundColor White
  Write-Host "3. Ouvrir le fichier APK sur le téléphone" -ForegroundColor White
  Write-Host "4. Suivre les instructions d'installation" -ForegroundColor White
  Write-Host ""
  Write-Host "💡 Installation rapide via ADB:" -ForegroundColor Cyan
  Write-Host "   adb install $apkPath" -ForegroundColor White
  Write-Host ""
  
  # Proposer l'installation automatique si ADB est disponible
  try {
    $adbCheck = adb version 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "🔌 ADB détecté. Voulez-vous installer l'APK maintenant?" -ForegroundColor Cyan
      $install = Read-Host "Installer sur l'appareil connecté? [y/N]"
      if ($install -eq "y" -or $install -eq "Y") {
        Write-Host "📲 Installation en cours..." -ForegroundColor Cyan
        adb install -r $apkPath
        if ($LASTEXITCODE -eq 0) {
          Show-Success "Application installée avec succès!"
          Write-Host ""
          Write-Host "🚀 Lancer l'application:" -ForegroundColor Cyan
          Write-Host "   adb shell am start -n com.ringarecord.app/.MainActivity" -ForegroundColor White
        } else {
          Show-Warning "L'installation a échoué. Vérifiez que:"
          Write-Host "  - Un appareil Android est connecté" -ForegroundColor Yellow
          Write-Host "  - Le débogage USB est activé" -ForegroundColor Yellow
          Write-Host "  - Les autorisations sont accordées" -ForegroundColor Yellow
        }
      }
    }
  } catch {
    # ADB non disponible, pas grave
  }
} else {
  Show-Error "Le fichier APK n'a pas été créé"
}

