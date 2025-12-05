# Script de vérification pré-déploiement Vercel (PowerShell)
# Simule le processus de build Vercel en local

$ErrorActionPreference = "Stop"

Write-Host "🚀 Simulation du processus de build Vercel" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
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

# 1. Vérifier que Node.js est installé
Write-Host "📦 Vérification de Node.js..." -ForegroundColor Cyan
try {
  $nodeVersion = node -v
  Show-Success "Node.js $nodeVersion détecté"
} catch {
  Show-Error "Node.js n'est pas installé"
}
Write-Host ""

# 2. Vérifier que npm est installé
Write-Host "📦 Vérification de npm..." -ForegroundColor Cyan
try {
  $npmVersion = npm -v
  Show-Success "npm $npmVersion détecté"
} catch {
  Show-Error "npm n'est pas installé"
}
Write-Host ""

# 3. Vérifier les variables d'environnement (optionnel)
Write-Host "🔐 Vérification des variables d'environnement..." -ForegroundColor Cyan
if (Test-Path ".env") {
  $envContent = Get-Content ".env" -Raw
  if ($envContent -match "VITE_SUPABASE_URL" -and $envContent -match "VITE_SUPABASE_ANON_KEY") {
    Show-Success "Variables d'environnement détectées dans .env"
  } else {
    Show-Warning "Certaines variables d'environnement peuvent manquer dans .env"
  }
} else {
  Show-Warning ".env n'existe pas (normal si les variables sont définies ailleurs)"
}
Write-Host ""

# 4. Installer les dépendances (si node_modules n'existe pas)
if (-not (Test-Path "node_modules")) {
  Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) {
    Show-Error "Installation des dépendances a échoué"
  }
  Show-Success "Dépendances installées"
  Write-Host ""
}

# 5. Lancer le lint
Write-Host "🔍 Exécution du lint..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) {
  Show-Error "Lint a échoué"
}
Show-Success "Lint réussi"
Write-Host ""

# 6. Lancer les tests
Write-Host "🧪 Exécution des tests..." -ForegroundColor Cyan
npm run test:run
if ($LASTEXITCODE -ne 0) {
  Show-Error "Tests ont échoué"
}
Show-Success "Tests réussis"
Write-Host ""

# 7. Build TypeScript
Write-Host "🔨 Compilation TypeScript..." -ForegroundColor Cyan
npx tsc -b --noEmit
if ($LASTEXITCODE -ne 0) {
  Show-Error "Compilation TypeScript a échoué"
}
Show-Success "Compilation TypeScript réussie"
Write-Host ""

# 8. Build Vite
Write-Host "📦 Build de production..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Show-Error "Build de production a échoué"
}
Show-Success "Build de production réussi"
Write-Host ""

# 9. Vérifier que le dossier dist existe et contient des fichiers
Write-Host "📁 Vérification du dossier dist..." -ForegroundColor Cyan
if (Test-Path "dist") {
  $distFiles = Get-ChildItem -Path "dist" -Recurse -File
  if ($distFiles.Count -gt 0) {
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Show-Success "Dossier dist créé avec succès (taille: $([math]::Round($distSize, 2)) MB)"
    
    # Vérifier les fichiers essentiels
    if (Test-Path "dist/index.html") {
      Show-Success "index.html présent"
    } else {
      Show-Warning "index.html manquant dans dist/"
    }
    
    if (Test-Path "dist/assets") {
      $assetCount = (Get-ChildItem -Path "dist/assets" -File).Count
      Show-Success "$assetCount fichier(s) dans dist/assets/"
    } else {
      Show-Warning "Aucun asset dans dist/assets/"
    }
  } else {
    Show-Error "Le dossier dist est vide"
  }
} else {
  Show-Error "Le dossier dist n'existe pas"
}
Write-Host ""

# 10. Résumé
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Tous les checks sont passés !" -ForegroundColor Green
Write-Host ""
Write-Host "Le build est prêt pour le déploiement sur Vercel."
Write-Host "Vous pouvez maintenant déployer avec confiance."
Write-Host ""

