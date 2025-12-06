# Script de build Android pour Google Play Store (PowerShell)
# Génère un AAB (Android App Bundle) signé pour la production

$ErrorActionPreference = "Stop"

Write-Host "🚀 Build Android pour Google Play Store" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

# 4. Vérifier le keystore
Write-Host "🔐 Vérification du keystore..." -ForegroundColor Cyan
$keystoreFile = "android/keystore.properties"
if (-not (Test-Path $keystoreFile)) {
  Show-Warning "keystore.properties n'existe pas"
  Write-Host "Pour créer un keystore, exécutez: npm run android:generate-keystore" -ForegroundColor Yellow
  Write-Host "Ou créez manuellement android/keystore.properties avec:" -ForegroundColor Yellow
  Write-Host "  storeFile=../path/to/keystore.jks" -ForegroundColor Yellow
  Write-Host "  storePassword=your-store-password" -ForegroundColor Yellow
  Write-Host "  keyAlias=your-key-alias" -ForegroundColor Yellow
  Write-Host "  keyPassword=your-key-password" -ForegroundColor Yellow
  Write-Host ""
  $continue = Read-Host "Continuer sans keystore? (l'APK ne sera pas signé) [y/N]"
  if ($continue -ne "y" -and $continue -ne "Y") {
    exit 1
  }
} else {
  Show-Success "keystore.properties trouvé"
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

# 7. Build AAB (Android App Bundle)
Write-Host "📦 Build AAB (Android App Bundle)..." -ForegroundColor Cyan
Set-Location android
./gradlew bundleRelease
if ($LASTEXITCODE -ne 0) {
  Set-Location ..
  Show-Error "Le build AAB a échoué"
}
Set-Location ..

# 8. Vérifier que le fichier AAB existe
$aabPath = "android/app/build/outputs/bundle/release/app-release.aab"
if (Test-Path $aabPath) {
  $fileSize = (Get-Item $aabPath).Length / 1MB
  Show-Success "AAB créé avec succès (taille: $([math]::Round($fileSize, 2)) MB)"
  Write-Host ""
  Write-Host "📁 Fichier AAB: $aabPath" -ForegroundColor Green
  Write-Host ""
  Write-Host "✅ Build terminé avec succès!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Prochaines étapes:" -ForegroundColor Cyan
  Write-Host "1. Tester l'AAB sur un appareil Android" -ForegroundColor White
  Write-Host "2. Uploader l'AAB sur Google Play Console" -ForegroundColor White
  Write-Host "3. Remplir les métadonnées dans Google Play Console" -ForegroundColor White
  Write-Host "4. Soumettre pour review" -ForegroundColor White
} else {
  Show-Error "Le fichier AAB n'a pas été créé"
}

