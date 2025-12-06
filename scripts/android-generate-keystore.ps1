# Script pour générer un keystore Android (PowerShell)
# Utilise keytool (inclus avec JDK)

$ErrorActionPreference = "Stop"

Write-Host "🔐 Génération du keystore Android" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
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

# 1. Vérifier que keytool est disponible
Write-Host "🔍 Vérification de keytool..." -ForegroundColor Cyan
try {
  $keytoolVersion = keytool -help 2>&1 | Select-Object -First 1
  Show-Success "keytool détecté"
} catch {
  Show-Error "keytool n'est pas disponible. Assurez-vous que le JDK est installé et dans le PATH"
}
Write-Host ""

# 2. Demander les informations pour le keystore
Write-Host "📝 Informations requises pour le keystore:" -ForegroundColor Cyan
Write-Host ""

$keystorePath = Read-Host "Chemin du keystore (ex: android/ringarecord-release.jks)"
$keystorePassword = Read-Host "Mot de passe du keystore" -AsSecureString
$keyAlias = Read-Host "Alias de la clé (ex: ringarecord-key)"
$keyPassword = Read-Host "Mot de passe de la clé" -AsSecureString
$validity = Read-Host "Validité en années (ex: 25)"
$firstName = Read-Host "Prénom"
$lastName = Read-Host "Nom"
$orgUnit = Read-Host "Unité organisationnelle (ex: Development)"
$organization = Read-Host "Organisation (ex: RingaRecord)"
$city = Read-Host "Ville"
$state = Read-Host "État/Province"
$country = Read-Host "Code pays (2 lettres, ex: FR)"

# Convertir les SecureString en String
$keystorePasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keystorePassword)
)
$keyPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassword)
)

Write-Host ""
Write-Host "🔨 Génération du keystore..." -ForegroundColor Cyan

# Créer le dossier parent si nécessaire
$keystoreDir = Split-Path -Parent $keystorePath
if ($keystoreDir -and -not (Test-Path $keystoreDir)) {
  New-Item -ItemType Directory -Path $keystoreDir -Force | Out-Null
}

# Générer le keystore
$validityDays = [int]$validity * 365
$dname = "CN=$firstName $lastName, OU=$orgUnit, O=$organization, L=$city, ST=$state, C=$country"

keytool -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore $keystorePath `
  -alias $keyAlias `
  -keyalg RSA `
  -keysize 2048 `
  -validity $validityDays `
  -storepass $keystorePasswordPlain `
  -keypass $keyPasswordPlain `
  -dname $dname

if ($LASTEXITCODE -ne 0) {
  Show-Error "La génération du keystore a échoué"
}

Show-Success "Keystore généré avec succès"
Write-Host ""

# 3. Créer le fichier keystore.properties
Write-Host "📝 Création de keystore.properties..." -ForegroundColor Cyan

$keystorePropertiesPath = "android/keystore.properties"
$keystoreRelativePath = Resolve-Path -Relative $keystorePath

$propertiesContent = @"
storeFile=$keystoreRelativePath
storePassword=$keystorePasswordPlain
keyAlias=$keyAlias
keyPassword=$keyPasswordPlain
"@

# Créer le dossier android s'il n'existe pas
if (-not (Test-Path "android")) {
  New-Item -ItemType Directory -Path "android" -Force | Out-Null
}

$propertiesContent | Out-File -FilePath $keystorePropertiesPath -Encoding UTF8

Show-Success "keystore.properties créé"
Write-Host ""

# 4. Avertissements de sécurité
Write-Host "⚠️  IMPORTANT - Sécurité:" -ForegroundColor Yellow
Write-Host "1. Ne partagez JAMAIS le keystore ou ses mots de passe" -ForegroundColor Yellow
Write-Host "2. Faites une sauvegarde sécurisée du keystore" -ForegroundColor Yellow
Write-Host "3. Si vous perdez le keystore, vous ne pourrez plus mettre à jour l'application sur Google Play" -ForegroundColor Yellow
Write-Host "4. Ajoutez keystore.properties et *.jks au .gitignore" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Keystore prêt pour la production!" -ForegroundColor Green

