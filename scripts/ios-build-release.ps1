# Script de build iOS pour App Store (PowerShell)
# NOTE: Nécessite macOS et Xcode (ne fonctionne pas sur Windows)
# Ce script est fourni pour référence mais doit être exécuté sur macOS

$ErrorActionPreference = "Stop"

Write-Host "🍎 Build iOS pour App Store" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  ATTENTION" -ForegroundColor Yellow
Write-Host "Ce script nécessite macOS et Xcode." -ForegroundColor Yellow
Write-Host "Il ne peut pas être exécuté sur Windows." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour build iOS, vous devez:" -ForegroundColor Cyan
Write-Host "1. Utiliser un Mac avec Xcode installé" -ForegroundColor White
Write-Host "2. Exécuter: bash scripts/ios-build-release.sh" -ForegroundColor White
Write-Host "3. Ou utiliser Xcode directement:" -ForegroundColor White
Write-Host "   - Ouvrir ios/App/App.xcworkspace" -ForegroundColor White
Write-Host "   - Product > Archive" -ForegroundColor White
Write-Host "   - Distribute App" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "Consultez docs/APP_STORE_BUILD_GUIDE.md pour les instructions complètes" -ForegroundColor White

exit 1

